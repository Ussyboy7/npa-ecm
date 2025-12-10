"""Views for records management module."""

from __future__ import annotations

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from correspondence.models import Correspondence
from dms.models import Document

from records.models import Disposition, LegalHold, RetentionPolicy, RetentionSchedule
from records.serializers import (
    ApplyPolicyRequestSerializer,
    DispositionSerializer,
    ExecuteDispositionRequestSerializer,
    LegalHoldSerializer,
    RetentionPolicySerializer,
    RetentionScheduleSerializer,
)
from records.services import (
    DispositionService,
    LegalHoldService,
    RetentionService,
)


class RetentionPolicyViewSet(viewsets.ModelViewSet):
    """ViewSet for managing retention policies."""

    queryset = RetentionPolicy.objects.all()
    serializer_class = RetentionPolicySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter policies."""
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset.order_by("name")

    def perform_create(self, serializer):
        """Set the creator when creating a policy."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def apply_to_records(self, request, pk=None):
        """Apply this policy to specific records."""
        policy = self.get_object()
        serializer = ApplyPolicyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record_type = serializer.validated_data["record_type"]
        record_ids = serializer.validated_data["record_ids"]

        applied_count = 0
        errors = []

        for record_id in record_ids:
            try:
                if record_type == "document":
                    record = Document.objects.get(id=record_id)
                else:
                    record = Correspondence.objects.get(id=record_id)

                schedule = RetentionService.apply_policy_to_record(policy, record)
                if schedule:
                    applied_count += 1
            except (Document.DoesNotExist, Correspondence.DoesNotExist):
                errors.append(f"Record {record_id} not found")
            except Exception as e:
                errors.append(f"Error applying to {record_id}: {str(e)}")

        return Response(
            {
                "applied": applied_count,
                "total": len(record_ids),
                "errors": errors,
            }
        )


class LegalHoldViewSet(viewsets.ModelViewSet):
    """ViewSet for managing legal holds."""

    queryset = LegalHold.objects.all()
    serializer_class = LegalHoldSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter holds."""
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset.order_by("-start_date")

    def perform_create(self, serializer):
        """Set the creator when creating a legal hold."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["post"])
    def check_record(self, request):
        """Check if a record is on legal hold."""
        record_type = request.data.get("record_type")
        record_id = request.data.get("record_id")

        if not record_type or not record_id:
            return Response(
                {"error": "record_type and record_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if record_type == "document":
                record = Document.objects.get(id=record_id)
            else:
                record = Correspondence.objects.get(id=record_id)

            holds = LegalHoldService.check_legal_hold(record)
            can_delete = LegalHoldService.can_delete(record)
            can_archive = LegalHoldService.can_archive(record)

            return Response(
                {
                    "on_hold": len(holds) > 0,
                    "legal_holds": LegalHoldSerializer(holds, many=True).data,
                    "can_delete": can_delete,
                    "can_archive": can_archive,
                }
            )
        except (Document.DoesNotExist, Correspondence.DoesNotExist):
            return Response(
                {"error": "Record not found"},
                status=status.HTTP_404_NOT_FOUND,
            )


class DispositionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing dispositions."""

    queryset = Disposition.objects.all()
    serializer_class = DispositionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter dispositions."""
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by("scheduled_date")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a disposition."""
        disposition = self.get_object()

        if not disposition.requires_approval:
            return Response(
                {"error": "This disposition does not require approval"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if disposition.status != Disposition.DispositionStatus.SCHEDULED:
            return Response(
                {"error": "Only scheduled dispositions can be approved"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        disposition.status = Disposition.DispositionStatus.APPROVED
        disposition.approved_by = request.user
        disposition.approved_at = timezone.now()
        disposition.save()

        return Response(DispositionSerializer(disposition).data)

    @action(detail=True, methods=["post"])
    def execute(self, request, pk=None):
        """Execute a disposition."""
        disposition = self.get_object()
        serializer = ExecuteDispositionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not disposition.can_execute():
            return Response(
                {"error": "Disposition cannot be executed in current state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = serializer.validated_data.get("notes", "")

        success = DispositionService.execute_disposition(
            disposition, executed_by=request.user, notes=notes
        )

        if success:
            return Response(DispositionSerializer(disposition).data)
        else:
            return Response(
                {"error": "Failed to execute disposition"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RetentionScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing retention schedules."""

    queryset = RetentionSchedule.objects.all()
    serializer_class = RetentionScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter schedules."""
        queryset = super().get_queryset()
        record_type = self.request.query_params.get("record_type")
        record_id = self.request.query_params.get("record_id")
        if record_type and record_id:
            queryset = queryset.filter(record_type=record_type, record_id=record_id)
        return queryset.order_by("disposition_date")
