"""Serializers for executive calendar events."""

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import ExecutiveCalendarEvent


class ExecutiveCalendarEventSerializer(serializers.ModelSerializer):
    executive_name = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = ExecutiveCalendarEvent
        fields = [
            "id",
            "title",
            "description",
            "location",
            "event_type",
            "starts_at",
            "ends_at",
            "executive",
            "executive_name",
            "correspondence",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "executive_name"]

    def get_executive_name(self, obj) -> str:
        if obj.executive:
            return obj.executive.get_full_name() or obj.executive.username
        return ""

    def validate(self, attrs):
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts_at and ends_at and ends_at < starts_at:
            raise serializers.ValidationError({"ends_at": "End time must be after start time."})
        return attrs
