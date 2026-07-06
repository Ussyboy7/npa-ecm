"""Serializers for integrations module."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from common.field_encryption import decrypt_value, encrypt_value

from .models import (
    EmailConnector,
    ERPConnector,
    HRMSConnector,
    IntegrationLog,
    Webhook,
    WebhookEvent,
)


class WebhookSerializer(serializers.ModelSerializer):
    """Serializer for Webhook model."""

    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Webhook
        fields = [
            "id",
            "name",
            "description",
            "url",
            "events",
            "secret",
            "is_active",
            "retry_count",
            "timeout_seconds",
            "headers",
            "created_by",
            "created_by_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
        extra_kwargs = {
            "secret": {"write_only": True},
        }


class WebhookEventSerializer(serializers.ModelSerializer):
    """Serializer for WebhookEvent model."""

    webhook = WebhookSerializer(read_only=True)

    class Meta:
        model = WebhookEvent
        fields = [
            "id",
            "webhook",
            "event_type",
            "payload",
            "status",
            "response_code",
            "response_body",
            "error_message",
            "attempt_count",
            "last_attempt_at",
            "next_retry_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "webhook",
            "status",
            "response_code",
            "response_body",
            "error_message",
            "attempt_count",
            "last_attempt_at",
            "next_retry_at",
            "created_at",
            "updated_at",
        ]


class EmailConnectorSerializer(serializers.ModelSerializer):
    """Serializer for EmailConnector model."""

    class Meta:
        model = EmailConnector
        fields = [
            "id",
            "name",
            "connector_type",
            "host",
            "port",
            "use_tls",
            "use_ssl",
            "username",
            "password",
            "is_active",
            "is_incoming",
            "is_outgoing",
            "auto_create_correspondence",
            "default_division_id",
            "default_department_id",
            "imap_folder",
            "last_synced_uid",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_synced_uid", "created_at", "updated_at"]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def create(self, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = encrypt_value(password)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = encrypt_value(password)
        else:
            validated_data.pop("password", None)
        return super().update(instance, validated_data)


class ERPConnectorSerializer(serializers.ModelSerializer):
    """Serializer for ERPConnector model."""

    class Meta:
        model = ERPConnector
        fields = [
            "id",
            "name",
            "erp_type",
            "base_url",
            "api_key",
            "username",
            "password",
            "is_active",
            "sync_enabled",
            "sync_interval_minutes",
            "field_mappings",
            "last_synced_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_synced_at", "created_at", "updated_at"]
        extra_kwargs = {
            "password": {"write_only": True},
            "api_key": {"write_only": True},
        }

    def create(self, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = encrypt_value(password)
        api_key = validated_data.get("api_key")
        if api_key:
            validated_data["api_key"] = encrypt_value(api_key)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = encrypt_value(password)
        else:
            validated_data.pop("password", None)
        api_key = validated_data.get("api_key")
        if api_key:
            validated_data["api_key"] = encrypt_value(api_key)
        else:
            validated_data.pop("api_key", None)
        return super().update(instance, validated_data)


class IntegrationLogSerializer(serializers.ModelSerializer):
    """Serializer for IntegrationLog model."""

    class Meta:
        model = IntegrationLog
        fields = [
            "id",
            "log_type",
            "integration_id",
            "status",
            "message",
            "details",
            "error_message",
            "duration_ms",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SendEmailRequestSerializer(serializers.Serializer):
    """Serializer for sending email."""

    to = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
    )
    subject = serializers.CharField(required=True)
    body = serializers.CharField(required=True)
    html_body = serializers.CharField(required=False, allow_blank=True)
    connector_id = serializers.UUIDField(required=False, allow_null=True)


class ERPSyncRequestSerializer(serializers.Serializer):
    """Serializer for ERP sync request."""

    connector_id = serializers.UUIDField(required=True)


class HRMSSyncRequestSerializer(serializers.Serializer):
    """Serializer for HRMS sync request."""

    connector_id = serializers.UUIDField(required=True)


class HRMSConnectorSerializer(serializers.ModelSerializer):
    """Serializer for HRMSConnector model."""

    class Meta:
        model = HRMSConnector
        fields = [
            "id",
            "name",
            "base_url",
            "api_key",
            "username",
            "password",
            "staff_endpoint",
            "org_endpoint",
            "is_active",
            "sync_enabled",
            "sync_interval_minutes",
            "deactivate_exited_staff",
            "field_mappings",
            "last_synced_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_synced_at", "created_at", "updated_at"]
        extra_kwargs = {
            "password": {"write_only": True},
            "api_key": {"write_only": True},
        }

    def create(self, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = encrypt_value(password)
        api_key = validated_data.get("api_key")
        if api_key:
            validated_data["api_key"] = encrypt_value(api_key)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = encrypt_value(password)
        else:
            validated_data.pop("password", None)
        api_key = validated_data.get("api_key")
        if api_key:
            validated_data["api_key"] = encrypt_value(api_key)
        else:
            validated_data.pop("api_key", None)
        return super().update(instance, validated_data)

