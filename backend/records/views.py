"""API views for records governance."""

from __future__ import annotations

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.services import AuditService
from common.pagination import CatalogPageNumberPagination

from .models import DisposalRequest, LegalHold, RetentionSchedule
from .serializers import (
    DisposalRequestSerializer,
    LegalHoldSerializer,
    RetentionScheduleSerializer,
)
from .ediscovery_export import build_ediscovery_bundle
from .services import (
    complete_disposal,
    correspondence_due_for_disposal,
    refresh_legal_hold_flags_for_hold,
)


class RecordsAdminMixin:
    def _ensure_records_admin(self):
        from organization.permission_utils import require_permission

        require_permission(self.request.user, "can_access_records_governance")


class RetentionScheduleViewSet(RecordsAdminMixin, viewsets.ModelViewSet):
    queryset = RetentionSchedule.objects.select_related("directorate", "division", "created_by")
    serializer_class = RetentionScheduleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active_only") == "true":
            qs = qs.filter(is_active=True)
        return qs.order_by("name")

    def perform_create(self, serializer):
        self._ensure_records_admin()
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        self._ensure_records_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_records_admin()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class LegalHoldViewSet(RecordsAdminMixin, viewsets.ModelViewSet):
    queryset = LegalHold.objects.select_related("placed_by", "released_by").prefetch_related(
        "correspondence_items"
    )
    serializer_class = LegalHoldSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active_only") == "true":
            qs = qs.filter(is_active=True)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        self._ensure_records_admin()
        serializer.save(placed_by=self.request.user)

    def perform_update(self, serializer):
        self._ensure_records_admin()
        serializer.save()

    @action(detail=True, methods=["post"], url_path="release")
    def release(self, request, pk=None):
        self._ensure_records_admin()
        hold = self.get_object()
        if not hold.is_active:
            raise ValidationError({"detail": "Legal hold is already released."})
        hold.is_active = False
        hold.released_at = timezone.now()
        hold.released_by = request.user
        hold.save(update_fields=["is_active", "released_at", "released_by", "updated_at"])
        refresh_legal_hold_flags_for_hold(hold)
        return Response(LegalHoldSerializer(hold).data)

    @action(detail=True, methods=["get"], url_path="ediscovery-export")
    def ediscovery_export(self, request, pk=None):
        """Download tamper-evident eDiscovery bundle for this legal hold."""
        self._ensure_records_admin()
        hold = self.get_object()
        zip_bytes, manifest = build_ediscovery_bundle(hold, exported_by=request.user)

        response = HttpResponse(zip_bytes, content_type="application/zip")
        stamp = manifest["exported_at"][:10]
        safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in hold.name[:40])
        response["Content-Disposition"] = (
            f'attachment; filename="ediscovery-{safe_name}-{stamp}.zip"'
        )
        response["X-EDiscovery-Correspondence-Count"] = str(manifest["correspondence_count"])
        response["X-EDiscovery-Document-Count"] = str(manifest["document_count"])
        response["X-EDiscovery-SHA256"] = manifest["bundle_sha256"]
        return response


class DisposalRequestViewSet(RecordsAdminMixin, viewsets.ModelViewSet):
    queryset = DisposalRequest.objects.select_related(
        "correspondence",
        "retention_schedule",
        "requested_by",
        "reviewed_by",
    )
    serializer_class = DisposalRequestSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CatalogPageNumberPagination
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        self._ensure_records_admin()
        correspondence_id = request.data.get("correspondence")
        if not correspondence_id:
            raise ValidationError({"correspondence": "Correspondence ID is required."})

        from correspondence.models import Correspondence
        from .services import assert_not_on_legal_hold, find_retention_schedule

        try:
            correspondence = Correspondence.objects.get(pk=correspondence_id)
        except Correspondence.DoesNotExist as exc:
            raise ValidationError({"correspondence": "Correspondence not found."}) from exc

        assert_not_on_legal_hold(correspondence)
        schedule = find_retention_schedule(correspondence)

        disposal = DisposalRequest.objects.create(
            correspondence=correspondence,
            retention_schedule=schedule,
            reason=request.data.get("reason", ""),
            scheduled_disposal_date=request.data.get("scheduled_disposal_date"),
            requested_by=request.user,
        )

        from audit.models import ActivityLog

        AuditService.log_correspondence_activity(
            user=request.user,
            action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
            correspondence=correspondence,
            request=request,
            description=f"Disposal request created for {correspondence.reference_number}",
            metadata={"disposal_request_id": str(disposal.id)},
        )

        return Response(DisposalRequestSerializer(disposal).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        self._ensure_records_admin()
        disposal = self.get_object()
        if disposal.status != DisposalRequest.Status.PENDING:
            raise ValidationError({"detail": "Only pending disposal requests can be approved."})
        disposal.status = DisposalRequest.Status.APPROVED
        disposal.reviewed_by = request.user
        disposal.reviewed_at = timezone.now()
        disposal.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
        return Response(DisposalRequestSerializer(disposal).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        self._ensure_records_admin()
        disposal = self.get_object()
        if disposal.status != DisposalRequest.Status.APPROVED:
            raise ValidationError({"detail": "Only approved disposal requests can be completed."})
        from .services import assert_not_on_legal_hold

        if disposal.correspondence_id:
            assert_not_on_legal_hold(disposal.correspondence)
        complete_disposal(disposal, request.user)
        return Response(DisposalRequestSerializer(disposal).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        self._ensure_records_admin()
        disposal = self.get_object()
        if disposal.status != DisposalRequest.Status.PENDING:
            raise ValidationError({"detail": "Only pending disposal requests can be rejected."})
        disposal.status = DisposalRequest.Status.REJECTED
        disposal.rejection_reason = request.data.get("reason", "")
        disposal.reviewed_by = request.user
        disposal.reviewed_at = timezone.now()
        disposal.save(
            update_fields=[
                "status",
                "rejection_reason",
                "reviewed_by",
                "reviewed_at",
                "updated_at",
            ]
        )
        return Response(DisposalRequestSerializer(disposal).data)

    @action(detail=False, methods=["post"], url_path="generate-due")
    def generate_due(self, request):
        """Create disposal requests for all correspondence past retention."""
        self._ensure_records_admin()
        created = 0
        for corr in correspondence_due_for_disposal():
            exists = DisposalRequest.objects.filter(
                correspondence=corr,
                status__in=[
                    DisposalRequest.Status.PENDING,
                    DisposalRequest.Status.APPROVED,
                ],
            ).exists()
            if exists:
                continue
            from .services import find_retention_schedule

            DisposalRequest.objects.create(
                correspondence=corr,
                retention_schedule=find_retention_schedule(corr),
                reason="Auto-generated: retention period elapsed",
                requested_by=request.user,
            )
            created += 1
        return Response({"created": created})


class RecordsReportViewSet(RecordsAdminMixin, viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        self._ensure_records_admin()
        from correspondence.models import Correspondence

        due_count = correspondence_due_for_disposal().count()
        return Response(
            {
                "active_retention_schedules": RetentionSchedule.objects.filter(is_active=True).count(),
                "active_legal_holds": LegalHold.objects.filter(is_active=True).count(),
                "correspondence_on_legal_hold": Correspondence.objects.filter(
                    is_on_legal_hold=True
                ).count(),
                "pending_disposal_requests": DisposalRequest.objects.filter(
                    status=DisposalRequest.Status.PENDING
                ).count(),
                "correspondence_due_for_disposal": due_count,
                "archived_correspondence": Correspondence.objects.filter(
                    status=Correspondence.Status.ARCHIVED,
                    disposed_at__isnull=True,
                ).count(),
            }
        )
