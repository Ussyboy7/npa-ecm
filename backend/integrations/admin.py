"""Admin configuration for integrations module."""

from django.contrib import admin

from integrations.models import (
    EmailConnector,
    ERPConnector,
    IntegrationLog,
    Webhook,
    WebhookEvent,
)


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    """Admin interface for Webhook."""

    list_display = [
        "name",
        "url",
        "is_active",
        "created_by",
        "created_at",
    ]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "url"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    """Admin interface for WebhookEvent."""

    list_display = [
        "id",
        "webhook",
        "event_type",
        "status",
        "response_code",
        "attempt_count",
        "created_at",
    ]
    list_filter = ["status", "event_type", "created_at"]
    search_fields = ["event_type", "webhook__name"]
    readonly_fields = [
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
    date_hierarchy = "created_at"


@admin.register(EmailConnector)
class EmailConnectorAdmin(admin.ModelAdmin):
    """Admin interface for EmailConnector."""

    list_display = [
        "name",
        "connector_type",
        "host",
        "port",
        "is_active",
        "is_incoming",
        "is_outgoing",
        "created_at",
    ]
    list_filter = ["is_active", "connector_type", "is_incoming", "is_outgoing"]
    search_fields = ["name", "host"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(ERPConnector)
class ERPConnectorAdmin(admin.ModelAdmin):
    """Admin interface for ERPConnector."""

    list_display = [
        "name",
        "erp_type",
        "base_url",
        "is_active",
        "sync_enabled",
        "created_at",
    ]
    list_filter = ["is_active", "erp_type", "sync_enabled"]
    search_fields = ["name", "base_url"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(IntegrationLog)
class IntegrationLogAdmin(admin.ModelAdmin):
    """Admin interface for IntegrationLog."""

    list_display = [
        "id",
        "log_type",
        "status",
        "message",
        "duration_ms",
        "created_at",
    ]
    list_filter = ["log_type", "status", "created_at"]
    search_fields = ["message", "error_message"]
    readonly_fields = ["id", "created_at"]
    date_hierarchy = "created_at"
