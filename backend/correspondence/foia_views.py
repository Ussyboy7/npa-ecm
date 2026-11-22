"""API endpoints for FOIA request management."""

import logging

from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError, PermissionDenied

from audit.services import AuditService
from common.pagination import StandardPageNumberPagination
from organization.permission_utils import user_has_permission
from .foia_models import FOIARequest, FOIARequestDocument, FOIANote
from .foia_serializers import (
    FOIARequestListSerializer,
    FOIARequestDetailSerializer,
    FOIARequestDocumentSerializer,
    FOIANoteSerializer,
)

logger = logging.getLogger(__name__)

_OVERDUE_EXCLUDED_STATUSES = (
    FOIARequest.Status.RESPONDED,
    FOIARequest.Status.CLOSED,
    FOIARequest.Status.APPEALED,
)


def _filter_overdue_queryset(qs):
    today = timezone.now().date()
    return qs.filter(deadline_date__lt=today).exclude(status__in=_OVERDUE_EXCLUDED_STATUSES)


def _can_view_all_foia(user):
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (
            getattr(user, "is_superuser", False)
            or user_has_permission(user, "can_view_all_correspondence")
        )
    )


def _foia_queryset_for_user(user):
    """Requests visible to the caller: their assignments, or all for global roles."""
    queryset = FOIARequest.objects.select_related("assigned_to").prefetch_related(
        "documents", "notes_entries"
    )
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    if _can_view_all_foia(user):
        return queryset
    return queryset.filter(assigned_to=user)


def _ensure_foia_request_access(user, foia_request):
    if foia_request and not _foia_queryset_for_user(user).filter(pk=foia_request.pk).exists():
        raise PermissionDenied({"detail": "You do not have access to this FOIA request."})


class FOIARequestViewSet(viewsets.ModelViewSet):
    queryset = FOIARequest.objects.select_related("assigned_to").prefetch_related(
        "documents", "notes_entries"
    )
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "assigned_to"]
    search_fields = ["request_number", "requester_name", "requester_email", "organization", "description"]
    ordering_fields = ["received_date", "deadline", "created_at"]
    ordering = ["-received_date"]

    def get_queryset(self):
        qs = _foia_queryset_for_user(self.request.user)
        overdue_raw = self.request.query_params.get("overdue", "").lower()
        if overdue_raw in ("1", "true", "yes"):
            qs = _filter_overdue_queryset(qs)
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return FOIARequestDetailSerializer
        return FOIARequestListSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        AuditService.log_activity(
            user=self.request.user,
            action="FOIA_REQUEST_CREATED",
            module="foia",
            description=f"FOIA request created: {instance.request_number}",
            object_type="foiarequest",
            object_id=str(instance.id),
            object_repr=instance.request_number,
            request=self.request,
        )

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        foia = self.get_object()
        if foia.status not in (FOIARequest.Status.SUBMITTED,):
            raise ValidationError({"detail": "Only submitted requests can be acknowledged."})
        foia.status = FOIARequest.Status.ACKNOWLEDGED
        foia.acknowledged_date = timezone.now().date()
        foia.save()
        AuditService.log_activity(
            user=request.user, action="FOIA_REQUEST_ACKNOWLEDGED",
            module="foia", description=f"FOIA {foia.request_number} acknowledged",
            object_type="foiarequest", object_id=str(foia.id),
            object_repr=foia.request_number, request=request,
        )
        return Response(FOIARequestDetailSerializer(foia, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="respond")
    def respond(self, request, pk=None):
        foia = self.get_object()
        if foia.status in (FOIARequest.Status.RESPONDED, FOIARequest.Status.CLOSED):
            raise ValidationError({"detail": "Request has already been responded to."})

        outcome = request.data.get("outcome", "approved")
        if outcome == "approved":
            foia.status = FOIARequest.Status.APPROVED
        elif outcome == "partial":
            foia.status = FOIARequest.Status.PARTIALLY_GRANTED
        elif outcome == "denied":
            foia.status = FOIARequest.Status.DENIED
        else:
            raise ValidationError({"detail": "Invalid outcome. Must be approved, partial, or denied."})

        foia.response_date = timezone.now().date()
        foia.exemption_reason = request.data.get("exemption_reason", foia.exemption_reason)
        foia.save()

        AuditService.log_activity(
            user=request.user, action="FOIA_REQUEST_RESPONDED",
            module="foia",
            description=f"FOIA {foia.request_number} responded with status: {outcome}",
            object_type="foiarequest", object_id=str(foia.id),
            object_repr=foia.request_number, request=request,
        )
        return Response(FOIARequestDetailSerializer(foia, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        foia = self.get_object()
        foia.status = FOIARequest.Status.CLOSED
        foia.save()
        return Response(FOIARequestDetailSerializer(foia, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        """Paginated overdue list (prefer ?overdue=true on the list endpoint)."""
        qs = self.filter_queryset(
            _filter_overdue_queryset(_foia_queryset_for_user(request.user))
        )
        page = self.paginate_queryset(qs)
        serializer = FOIARequestListSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        base = _foia_queryset_for_user(request.user)
        return Response({
            "total": base.count(),
            "submitted": base.filter(status=FOIARequest.Status.SUBMITTED).count(),
            "in_processing": base.filter(
                status__in=[FOIARequest.Status.IN_PROCESSING, FOIARequest.Status.REVIEW]
            ).count(),
            "overdue": _filter_overdue_queryset(base).count(),
            "closed_this_month": base.filter(
                status=FOIARequest.Status.CLOSED,
                updated_at__month=timezone.now().month,
            ).count(),
        })


class FOIARequestDocumentViewSet(viewsets.ModelViewSet):
    queryset = FOIARequestDocument.objects.select_related("added_by", "document")
    serializer_class = FOIARequestDocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["foia_request", "is_response"]

    def get_queryset(self):
        return super().get_queryset().filter(
            foia_request__in=_foia_queryset_for_user(self.request.user).values("id")
        )

    def _ensure_parent_access(self, serializer):
        _ensure_foia_request_access(
            self.request.user,
            serializer.validated_data.get("foia_request"),
        )

    def perform_create(self, serializer):
        self._ensure_parent_access(serializer)
        serializer.save(added_by=self.request.user)

    def perform_update(self, serializer):
        self._ensure_parent_access(serializer)
        serializer.save()


class FOIANoteViewSet(viewsets.ModelViewSet):
    queryset = FOIANote.objects.select_related("user")
    serializer_class = FOIANoteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["foia_request", "is_internal"]

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            foia_request__in=_foia_queryset_for_user(self.request.user).values("id")
        )
        user = self.request.user
        if user and getattr(user, "is_authenticated", False) and user.is_staff:
            return queryset
        return queryset.filter(is_internal=False)

    def _ensure_parent_access(self, serializer):
        _ensure_foia_request_access(
            self.request.user,
            serializer.validated_data.get("foia_request"),
        )

    def perform_create(self, serializer):
        self._ensure_parent_access(serializer)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        self._ensure_parent_access(serializer)
        serializer.save()
