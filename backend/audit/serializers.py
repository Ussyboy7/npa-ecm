"""Serializers for audit logs."""

from rest_framework import serializers

from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "ip_address",
            "user_agent",
            "action",
            "action_display",
            "severity",
            "severity_display",
            "object_type",
            "object_id",
            "object_repr",
            "module",
            "description",
            "metadata",
            "success",
            "error_message",
            "timestamp",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "ip_address",
            "user_agent",
            "action",
            "action_display",
            "severity",
            "severity_display",
            "object_type",
            "object_id",
            "object_repr",
            "module",
            "description",
            "metadata",
            "success",
            "error_message",
            "timestamp",
        ]

