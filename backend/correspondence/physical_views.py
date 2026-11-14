"""API endpoints for physical document tracking."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from common.pagination import CatalogPageNumberPagination, StandardPageNumberPagination
from audit.services import AuditService
from organization.models import Office, OfficeMembership
from .models import Location, PhysicalDocument, PhysicalHandover, CheckOutEvent
from .physical_serializers import (
    LocationSerializer,
    PhysicalDocumentSerializer,
    PhysicalDocumentDetailSerializer,
    PhysicalHandoverSerializer,
    CheckOutEventSerializer,
)

User = get_user_model()


def _require_physical_records_access(user):
    from organization.permission_utils import require_page_access

    require_page_access(user, "physical_records")


def _require_active_office_member(user, office):
    if not office or not OfficeMembership.objects.filter(
        user=user, office=office, is_active=True
    ).exists():
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied("An active membership in this office is required.")


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.filter(is_active=True)
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["building", "floor"]

    def get_queryset(self):
        _require_physical_records_access(self.request.user)
        return super().get_queryset()

    def perform_create(self, serializer):
        _require_physical_records_access(self.request.user)
        serializer.save()


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
        _require_physical_records_access(user)
        if getattr(user, "is_superuser", False):
            return qs
        role_name = (getattr(getattr(user, "system_role", None), "name", "") or "").lower()
        if role_name == "managing director":
            return qs
        # Office-scoped: include own checked-out docs always, plus org scope
        base_q = Q(checked_out_to=user) | Q(current_office__memberships__user=user, current_office__memberships__is_active=True)
        # A destination office must be able to see an incoming copy before its
        # correspondence organization scope changes (it may never change).
        base_q |= Q(handover_events__to_office__memberships__user=user, handover_events__to_office__memberships__is_active=True)
        base_q |= Q(handover_events__from_office__memberships__user=user, handover_events__from_office__memberships__is_active=True)
        if getattr(user, "department_id", None):
            base_q |= Q(correspondence__department_id=user.department_id) | Q(correspondence__owning_office__department_id=user.department_id)
            return qs.filter(base_q).distinct()
        if getattr(user, "division_id", None):
            base_q |= Q(correspondence__division_id=user.division_id) | Q(correspondence__owning_office__division_id=user.division_id)
            return qs.filter(base_q).distinct()
        if getattr(user, "directorate_id", None):
            base_q |= Q(correspondence__owning_office__directorate_id=user.directorate_id) | Q(correspondence__division__directorate_id=user.directorate_id)
            return qs.filter(base_q).distinct()
        # No org — own records, active custodian-office records, and incoming handovers.
        return qs.filter(base_q | Q(correspondence__created_by=user)).distinct()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PhysicalDocumentDetailSerializer
        return PhysicalDocumentSerializer

    def perform_create(self, serializer):
        _require_physical_records_access(self.request.user)
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

    def perform_update(self, serializer):
        _require_physical_records_access(self.request.user)
        doc = self.get_object()
        if doc.handover_events.filter(received_at__isnull=True).exists():
            raise ValidationError({"detail": "A pending handover must be confirmed before editing this physical record."})
        if "current_office" in serializer.validated_data and serializer.validated_data["current_office"].id != doc.current_office_id:
            raise ValidationError({"current_office": "Custody can only be changed by a confirmed handover."})
        if doc.current_office_id:
            _require_active_office_member(self.request.user, doc.current_office)
        serializer.save()

    @action(detail=True, methods=["post"], url_path="handover")
    def handover(self, request, pk=None):
        doc = self.get_object()
        if doc.status != PhysicalDocument.Status.FILED:
            return Response(
                {"detail": "Only filed physical documents can be handed over."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not doc.current_office_id:
            return Response(
                {"detail": "Assign a current custodian office before handing over this document."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _require_active_office_member(request.user, doc.current_office)
        to_office_id = request.data.get("to_office")
        try:
            to_office = Office.objects.get(pk=to_office_id, is_active=True)
        except (Office.DoesNotExist, ValueError, TypeError):
            return Response({"to_office": "Select an active destination office."}, status=status.HTTP_400_BAD_REQUEST)
        if to_office.id == doc.current_office_id:
            return Response({"to_office": "Destination must differ from the current custodian office."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                handover = PhysicalHandover.objects.create(
                    physical_document=doc,
                    from_office=doc.current_office,
                    to_office=to_office,
                    sent_by=request.user,
                    notes=str(request.data.get("notes", ""))[:5000],
                )
                doc.status = PhysicalDocument.Status.IN_TRANSIT
                doc.save(update_fields=["status", "updated_at"])
        except IntegrityError:
            return Response(
                {"detail": "A physical handover is already awaiting receipt."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        AuditService.log_activity(
            user=request.user,
            action="PHYSICAL_DOCUMENT_HANDOVER_STARTED",
            module="physical_tracking",
            description=f"Sent {doc.tracking_number} from {handover.from_office.name} to {to_office.name}",
            object_type="physicaldocument",
            object_id=str(doc.id),
            object_repr=doc.tracking_number,
            request=request,
        )
        return Response(PhysicalHandoverSerializer(handover).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="confirm-receipt")
    def confirm_receipt(self, request, pk=None):
        with transaction.atomic():
            _require_physical_records_access(request.user)
            if not self.get_queryset().filter(pk=pk).exists():
                return Response({"detail": "Physical document not found."}, status=status.HTTP_404_NOT_FOUND)
            try:
                doc = PhysicalDocument.objects.select_for_update().get(pk=pk)
            except PhysicalDocument.DoesNotExist:
                return Response({"detail": "Physical document not found."}, status=status.HTTP_404_NOT_FOUND)
            if doc.status != PhysicalDocument.Status.IN_TRANSIT:
                return Response({"detail": "This physical document is not in transit."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                handover = PhysicalHandover.objects.select_for_update().get(
                    physical_document=doc, received_at__isnull=True
                )
            except PhysicalHandover.DoesNotExist:
                return Response({"detail": "No pending handover exists."}, status=status.HTTP_400_BAD_REQUEST)
            _require_active_office_member(request.user, handover.to_office)
            location_id = request.data.get("location")
            try:
                location = Location.objects.get(pk=location_id, is_active=True)
            except (Location.DoesNotExist, ValueError, TypeError):
                return Response({"location": "Select an active location where the document was received."}, status=status.HTTP_400_BAD_REQUEST)
            handover.received_by = request.user
            handover.received_at = timezone.now()
            handover.receipt_notes = str(request.data.get("notes", ""))[:5000]
            handover.save(update_fields=["received_by", "received_at", "receipt_notes", "updated_at"])
            doc.current_office = handover.to_office
            doc.location = location
            doc.status = PhysicalDocument.Status.FILED
            doc.save(update_fields=["current_office", "location", "status", "updated_at"])

        AuditService.log_activity(
            user=request.user,
            action="PHYSICAL_DOCUMENT_HANDOVER_RECEIVED",
            module="physical_tracking",
            description=f"Received {doc.tracking_number} at {handover.to_office.name}",
            object_type="physicaldocument",
            object_id=str(doc.id),
            object_repr=doc.tracking_number,
            request=request,
        )
        return Response(PhysicalHandoverSerializer(handover).data)

    @action(detail=False, methods=["get"], url_path="my-handover")
    def my_handover(self, request):
        _require_physical_records_access(request.user)
        membership_office_ids = OfficeMembership.objects.filter(
            user=request.user, is_active=True
        ).values_list("office_id", flat=True)
        pending = PhysicalHandover.objects.filter(
            to_office_id__in=membership_office_ids,
            received_at__isnull=True,
        ).select_related("physical_document")
        return Response({
            "physical_document_ids": [str(item.physical_document_id) for item in pending],
        })

    @action(detail=True, methods=["get"], url_path="handover-events")
    def handover_events(self, request, pk=None):
        doc = self.get_object()
        if not OfficeMembership.objects.filter(
            user=request.user,
            is_active=True,
        ).filter(
            Q(office_id__in=doc.handover_events.values_list("from_office_id", flat=True))
            | Q(office_id__in=doc.handover_events.values_list("to_office_id", flat=True))
        ).exists():
            _require_active_office_member(request.user, doc.current_office)
        events = doc.handover_events.select_related(
            "from_office", "to_office", "sent_by", "received_by"
        ).order_by("-sent_at")[:50]
        return Response(PhysicalHandoverSerializer(events, many=True).data)

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request, pk=None):
        doc = self.get_object()
        if doc.status != PhysicalDocument.Status.FILED:
            return Response(
                {"detail": "Only filed physical documents can be checked out."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if doc.current_office_id:
            _require_active_office_member(request.user, doc.current_office)
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
        if doc.current_office_id:
            _require_active_office_member(request.user, doc.current_office)

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
        if doc.current_office_id:
            _require_active_office_member(request.user, doc.current_office)
        new_status = request.data.get("status")
        if doc.handover_events.filter(received_at__isnull=True).exists():
            return Response(
                {"detail": "A pending handover must be confirmed before changing document status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valid_statuses = [s.value for s in PhysicalDocument.Status if s != PhysicalDocument.Status.IN_TRANSIT]
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

    def get_queryset(self):
        user = self.request.user
        _require_physical_records_access(user)
        queryset = super().get_queryset()
        if user.is_superuser or (
            (getattr(getattr(user, "system_role", None), "name", "") or "").lower()
            == "managing director"
        ):
            return queryset

        from django.db.models import Q

        visible_documents = (
            Q(physical_document__current_office__memberships__user=user, physical_document__current_office__memberships__is_active=True)
            | Q(physical_document__handover_events__to_office__memberships__user=user, physical_document__handover_events__to_office__memberships__is_active=True)
            | Q(physical_document__handover_events__from_office__memberships__user=user, physical_document__handover_events__from_office__memberships__is_active=True)
        )
        visible_documents |= Q(physical_document__checked_out_to=user)
        if user.department_id:
            visible_documents |= (
                Q(physical_document__correspondence__department_id=user.department_id)
                | Q(physical_document__correspondence__owning_office__department_id=user.department_id)
            )
        elif user.division_id:
            visible_documents |= (
                Q(physical_document__correspondence__division_id=user.division_id)
                | Q(physical_document__correspondence__owning_office__division_id=user.division_id)
            )
        elif user.directorate_id:
            visible_documents |= (
                Q(physical_document__correspondence__owning_office__directorate_id=user.directorate_id)
                | Q(physical_document__correspondence__division__directorate_id=user.directorate_id)
            )
        else:
            visible_documents |= Q(physical_document__correspondence__created_by=user)
        return queryset.filter(visible_documents).distinct()
