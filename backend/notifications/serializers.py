"""Serializers for notifications."""

from rest_framework import serializers

from .models import Notification, NotificationPreferences


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True)
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    recipient_name = serializers.CharField(source="recipient.get_full_name", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "recipient_name",
            "sender",
            "sender_name",
            "sender_email",
            "title",
            "message",
            "notification_type",
            "priority",
            "status",
            "module",
            "related_object_type",
            "related_object_id",
            "action_url",
            "action_required",
            "email_sent",
            "email_sent_at",
            "read_at",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email_sent",
            "email_sent_at",
            "read_at",
            "created_at",
            "updated_at",
        ]


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferences
        fields = [
            "id",
            "user",
            "in_app_enabled",
            "in_app_urgent_only",
            "email_enabled",
            "email_urgent_only",
            "email_digest",
            "email_digest_time",
            "module_dms",
            "module_correspondence",
            "module_workflow",
            "module_system",
            "priority_low",
            "priority_normal",
            "priority_high",
            "priority_urgent",
            "type_workflow",
            "type_document",
            "type_correspondence",
            "type_system",
            "type_alert",
            "type_reminder",
            "quiet_hours_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
            "auto_archive_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

