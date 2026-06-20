"""API endpoints for FOIA request management."""

import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError, PermissionDenied

from audit.services import AuditService
from .foia_models import FOIARequest, FOIARequestDocument, FOIANote
from .foia_serializers import (
    FOIARequestListSerializer,
    FOIARequestDetailSerializer,
    FOIARequestDocumentSerializer,
    FOIANoteSerializer,
)

logger = logging.getLogger(__name__)


class FOIARequestViewSet(viewsets.ModelViewSet):
    queryset = FOIARequest.objects.select_related("assigned_to").prefetch_related(
        "documents", "notes_entries"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "assigned_to"]

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
        qs = self.get_queryset().filter(
            deadline_date__lt=timezone.now().date(),
        ).exclude(
            status__in=[FOIARequest.Status.RESPONDED, FOIARequest.Status.CLOSED]
        )
        page = self.paginate_queryset(qs)
        serializer = FOIARequestListSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        base = FOIARequest.objects.all()
        return Response({
            "total": base.count(),
            "submitted": base.filter(status=FOIARequest.Status.SUBMITTED).count(),
            "in_processing": base.filter(
                status__in=[FOIARequest.Status.IN_PROCESSING, FOIARequest.Status.REVIEW]
            ).count(),
            "overdue": base.filter(
                deadline_date__lt=timezone.now().date(),
            ).exclude(
                status__in=[FOIARequest.Status.RESPONDED, FOIARequest.Status.CLOSED]
            ).count(),
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

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)


class FOIANoteViewSet(viewsets.ModelViewSet):
    queryset = FOIANote.objects.select_related("user")
    serializer_class = FOIANoteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["foia_request", "is_internal"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
