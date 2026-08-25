"""API endpoints for physical document tracking."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from common.pagination import CatalogPageNumberPagination, StandardPageNumberPagination
from audit.services import AuditService
from .models import Location, PhysicalDocument, CheckOutEvent
from .physical_serializers import (
    LocationSerializer,
    PhysicalDocumentSerializer,
    PhysicalDocumentDetailSerializer,
    CheckOutEventSerializer,
)

User = get_user_model()


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.filter(is_active=True)
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["building", "floor"]


class PhysicalDocumentViewSet(viewsets.ModelViewSet):
    queryset = PhysicalDocument.objects.select_related(
        "location", "correspondence", "checked_out_to", "correspondence__owning_office"
    )
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["status", "correspondence", "location"]
    search_fields = ["description", "tracking_number", "barcode"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return qs.none()
        if getattr(user, "is_superuser", False):
            return qs
        role_name = (getattr(getattr(user, "system_role", None), "name", "") or "").lower()
        if role_name == "managing director":
            return qs
        # Office-scoped: include own checked-out docs always, plus org scope
        from django.db.models import Q

        base_q = Q(checked_out_to=user)
        if getattr(user, "department_id", None):
            base_q |= Q(correspondence__department_id=user.department_id) | Q(correspondence__owning_office__department_id=user.department_id)
            return qs.filter(base_q).distinct()
        if getattr(user, "division_id", None):
            base_q |= Q(correspondence__division_id=user.division_id) | Q(correspondence__owning_office__division_id=user.division_id)
            return qs.filter(base_q).distinct()
        if getattr(user, "directorate_id", None):
            base_q |= Q(correspondence__owning_office__directorate_id=user.directorate_id) | Q(correspondence__division__directorate_id=user.directorate_id)
            return qs.filter(base_q).distinct()
        # No org — only own checked-out + created
        return qs.filter(Q(checked_out_to=user) | Q(correspondence__created_by=user)).distinct()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PhysicalDocumentDetailSerializer
        return PhysicalDocumentSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        AuditService.log_activity(
            user=self.request.user,
            action="PHYSICAL_DOCUMENT_CREATED",
            module="physical_tracking",
            description=f"Created physical document: {instance.tracking_number}",
            object_type="physicaldocument",
            object_id=str(instance.id),
            object_repr=instance.tracking_number,
            request=self.request,
        )

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request, pk=None):
        doc = self.get_object()
        if doc.status == PhysicalDocument.Status.CHECKED_OUT:
            return Response(
                {"detail": "Document is already checked out."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user_id = request.data.get("user_id")
        purpose = request.data.get("purpose", "")
        expected_return = request.data.get("expected_return_at")

        try:
            checked_out_to = User.objects.get(id=user_id) if user_id else request.user
        except User.DoesNotExist:
            checked_out_to = request.user

        doc.status = PhysicalDocument.Status.CHECKED_OUT
        doc.checked_out_to = checked_out_to
        doc.checked_out_at = timezone.now()
        if expected_return:
            doc.expected_return_at = expected_return
        doc.save()

        CheckOutEvent.objects.create(
            physical_document=doc,
            user=checked_out_to,
            action=CheckOutEvent.Action.CHECKED_OUT,
            purpose=purpose,
        )

        AuditService.log_activity(
            user=request.user,
            action="PHYSICAL_DOCUMENT_CHECKED_OUT",
            module="physical_tracking",
            description=f"Checked out {doc.tracking_number} to {checked_out_to.get_full_name()}",
            object_type="physicaldocument",
            object_id=str(doc.id),
            object_repr=doc.tracking_number,
            request=request,
        )

        serializer = self.get_serializer(doc)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        doc = self.get_object()
        if doc.status != PhysicalDocument.Status.CHECKED_OUT:
            return Response(
                {"detail": "Document is not checked out."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get("notes", "")
        location_id = request.data.get("location_id")

        doc.status = PhysicalDocument.Status.FILED
        doc.checked_out_to = None
        doc.checked_out_at = None
        doc.expected_return_at = None
        if location_id:
            try:
                doc.location = Location.objects.get(id=location_id)
            except Location.DoesNotExist:
                pass
        doc.save()

        CheckOutEvent.objects.create(
            physical_document=doc,
            user=request.user,
            action=CheckOutEvent.Action.RETURNED,
            notes=notes,
        )

        AuditService.log_activity(
            user=request.user,
            action="PHYSICAL_DOCUMENT_RETURNED",
            module="physical_tracking",
            description=f"Checked in {doc.tracking_number}",
            object_type="physicaldocument",
            object_id=str(doc.id),
            object_repr=doc.tracking_number,
            request=request,
        )

        serializer = self.get_serializer(doc)
        return Response(serializer.data)


    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        doc = self.get_object()
        new_status = request.data.get("status")
        valid_statuses = [s.value for s in PhysicalDocument.Status]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Valid options: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        doc.status = new_status
        if new_status == PhysicalDocument.Status.FILED:
            doc.checked_out_to = None
            doc.checked_out_at = None
            doc.expected_return_at = None
        doc.save()

        AuditService.log_activity(
            user=request.user,
            action="PHYSICAL_DOCUMENT_STATUS_UPDATED",
            module="physical_tracking",
            description=f"Updated {doc.tracking_number} status to {new_status}",
            object_type="physicaldocument",
            object_id=str(doc.id),
            object_repr=doc.tracking_number,
            request=request,
        )

        serializer = self.get_serializer(doc)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="checkout-events")
    def checkout_events(self, request, pk=None):
        doc = self.get_object()
        events = doc.checkout_events.select_related("user").order_by("-created_at")[:50]
        serializer = CheckOutEventSerializer(events, many=True)
        return Response(serializer.data)


class CheckOutEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CheckOutEvent.objects.select_related("physical_document", "user").order_by("-created_at")
    serializer_class = CheckOutEventSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["physical_document", "action", "user"]
