"""Serializers for records governance."""

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import DisposalRequest, LegalHold, RetentionSchedule


class RetentionScheduleSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    retention_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = RetentionSchedule
        fields = [
            "id",
            "name",
            "description",
            "record_type",
            "archive_level",
            "directorate",
            "division",
            "retention_years",
            "retention_months",
            "retention_days",
            "disposition_action",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "retention_days"]


class LegalHoldSerializer(serializers.ModelSerializer):
    placed_by = UserSerializer(read_only=True)
    released_by = UserSerializer(read_only=True)
    correspondence_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )
    correspondence_count = serializers.SerializerMethodField()

    class Meta:
        model = LegalHold
        fields = [
            "id",
            "name",
            "matter_reference",
            "description",
            "placed_by",
            "released_by",
            "released_at",
            "is_active",
            "correspondence_ids",
            "correspondence_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "placed_by", "released_by", "released_at", "created_at", "updated_at"]

    def get_correspondence_count(self, obj) -> int:
        return obj.correspondence_items.count()

    def create(self, validated_data):
        correspondence_ids = validated_data.pop("correspondence_ids", [])
        hold = LegalHold.objects.create(**validated_data)
        if correspondence_ids:
            hold.correspondence_items.set(correspondence_ids)
            from .services import refresh_legal_hold_flags_for_hold

            refresh_legal_hold_flags_for_hold(hold)
        return hold

    def update(self, instance, validated_data):
        correspondence_ids = validated_data.pop("correspondence_ids", None)
        hold = super().update(instance, validated_data)
        if correspondence_ids is not None:
            hold.correspondence_items.set(correspondence_ids)
            from .services import refresh_legal_hold_flags_for_hold

            refresh_legal_hold_flags_for_hold(hold)
        return hold


class DisposalRequestSerializer(serializers.ModelSerializer):
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    correspondence_reference = serializers.SerializerMethodField()
    correspondence_subject = serializers.SerializerMethodField()

    class Meta:
        model = DisposalRequest
        fields = [
            "id",
            "correspondence",
            "correspondence_reference",
            "correspondence_subject",
            "document",
            "retention_schedule",
            "status",
            "reason",
            "rejection_reason",
            "scheduled_disposal_date",
            "requested_by",
            "reviewed_by",
            "reviewed_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "reviewed_by",
            "reviewed_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def get_correspondence_reference(self, obj) -> str:
        if obj.correspondence:
            return obj.correspondence.reference_number or ""
        return ""

    def get_correspondence_subject(self, obj) -> str:
        if obj.correspondence:
            return obj.correspondence.subject or ""
        return ""
