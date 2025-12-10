"""Serializers for records management module."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Disposition, LegalHold, RetentionPolicy, RetentionSchedule


class RetentionPolicySerializer(serializers.ModelSerializer):
    """Serializer for RetentionPolicy model."""

    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = RetentionPolicy
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "retention_period_days",
            "trigger_event",
            "applies_to",
            "document_types",
            "sensitivity_levels",
            "division_ids",
            "disposition_action",
            "requires_approval",
            "approval_role",
            "created_by",
            "created_by_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class LegalHoldSerializer(serializers.ModelSerializer):
    """Serializer for LegalHold model."""

    created_by = UserSerializer(read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set querysets dynamically to avoid circular imports
        from correspondence.models import Correspondence
        from dms.models import Document

        self.fields["documents"] = serializers.PrimaryKeyRelatedField(
            many=True,
            queryset=Document.objects.all(),
            required=False,
        )
        self.fields["correspondences"] = serializers.PrimaryKeyRelatedField(
            many=True,
            queryset=Correspondence.objects.all(),
            required=False,
        )

    class Meta:
        model = LegalHold
        fields = [
            "id",
            "name",
            "reason",
            "case_number",
            "case_description",
            "start_date",
            "end_date",
            "is_active",
            "documents",
            "correspondences",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class DispositionSerializer(serializers.ModelSerializer):
    """Serializer for Disposition model."""

    policy = RetentionPolicySerializer(read_only=True)
    policy_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    approved_by = UserSerializer(read_only=True)
    executed_by = UserSerializer(read_only=True)
    blocking_legal_holds = LegalHoldSerializer(many=True, read_only=True)

    class Meta:
        model = Disposition
        fields = [
            "id",
            "record_type",
            "record_id",
            "policy",
            "policy_id",
            "action",
            "status",
            "retention_start_date",
            "scheduled_date",
            "completed_date",
            "requires_approval",
            "approved_by",
            "approved_at",
            "executed_by",
            "execution_notes",
            "blocked_by_legal_hold",
            "blocking_legal_holds",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "approved_by",
            "approved_at",
            "executed_by",
            "completed_date",
            "blocking_legal_holds",
            "created_at",
            "updated_at",
        ]


class RetentionScheduleSerializer(serializers.ModelSerializer):
    """Serializer for RetentionSchedule model."""

    policy = RetentionPolicySerializer(read_only=True)

    class Meta:
        model = RetentionSchedule
        fields = [
            "id",
            "record_type",
            "record_id",
            "policy",
            "retention_start_date",
            "retention_end_date",
            "disposition_date",
            "is_active",
            "disposition_created",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ApplyPolicyRequestSerializer(serializers.Serializer):
    """Serializer for applying policy to records."""

    policy_id = serializers.UUIDField(required=True)
    record_type = serializers.ChoiceField(
        choices=["document", "correspondence"],
        required=True,
    )
    record_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        required=True,
    )


class ExecuteDispositionRequestSerializer(serializers.Serializer):
    """Serializer for executing a disposition."""

    notes = serializers.CharField(required=False, allow_blank=True)

