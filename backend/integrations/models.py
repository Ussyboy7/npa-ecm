"""Integration models for webhooks, email, and external system connectors."""

from __future__ import annotations

import hashlib
import hmac

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class Webhook(UUIDModel, TimeStampedModel):
    """Webhook configuration for external system notifications."""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    url = models.URLField(help_text="Webhook endpoint URL")
    
    # Events to subscribe to
    events = models.JSONField(
        default=list,
        help_text="List of event types to subscribe to (e.g., ['document.created', 'correspondence.completed'])",
    )
    
    # Security
    secret = models.CharField(
        max_length=255,
        help_text="Secret key for webhook signature validation",
    )
    
    # Configuration
    is_active = models.BooleanField(default=True)
    retry_count = models.IntegerField(
        default=3,
        help_text="Number of retry attempts on failure",
    )
    timeout_seconds = models.IntegerField(
        default=30,
        help_text="Request timeout in seconds",
    )
    
    # Headers (optional custom headers)
    headers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom headers to include in webhook requests",
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_webhooks",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.url})"

    def generate_signature(self, payload: str) -> str:
        """Generate HMAC signature for webhook payload."""
        return hmac.new(
            self.secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()


class WebhookEvent(UUIDModel, TimeStampedModel):
    """Tracks webhook delivery attempts and results."""

    class EventStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        RETRYING = "retrying", "Retrying"

    webhook = models.ForeignKey(
        Webhook,
        on_delete=models.CASCADE,
        related_name="webhook_events",
    )
    event_type = models.CharField(
        max_length=100,
        help_text="Event type (e.g., 'document.created')",
    )
    payload = models.JSONField(help_text="Event payload data")
    
    # Delivery status
    status = models.CharField(
        max_length=20,
        choices=EventStatus.choices,
        default=EventStatus.PENDING,
    )
    
    # Response
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    
    # Retry tracking
    attempt_count = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["webhook", "status", "created_at"]),
            models.Index(fields=["event_type", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} - {self.get_status_display()}"


class EmailConnector(UUIDModel, TimeStampedModel):
    """Email gateway configuration for sending/receiving emails."""

    class ConnectorType(models.TextChoices):
        SMTP = "smtp", "SMTP"
        IMAP = "imap", "IMAP"
        POP3 = "pop3", "POP3"

    name = models.CharField(max_length=255)
    connector_type = models.CharField(
        max_length=20,
        choices=ConnectorType.choices,
        default=ConnectorType.SMTP,
    )
    
    # Server configuration
    host = models.CharField(max_length=255)
    port = models.IntegerField()
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    
    # Authentication
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255)  # Should be encrypted in production
    
    # Configuration
    is_active = models.BooleanField(default=True)
    is_incoming = models.BooleanField(
        default=False,
        help_text="Whether this connector is for incoming emails",
    )
    is_outgoing = models.BooleanField(
        default=True,
        help_text="Whether this connector is for outgoing emails",
    )
    
    # Email processing
    auto_create_correspondence = models.BooleanField(
        default=False,
        help_text="Automatically create correspondence from incoming emails",
    )
    default_division_id = models.UUIDField(null=True, blank=True)
    default_department_id = models.UUIDField(null=True, blank=True)
    imap_folder = models.CharField(max_length=128, default="INBOX", blank=True)
    last_synced_uid = models.PositiveIntegerField(default=0)
    sync_state = models.JSONField(
        default=dict,
        blank=True,
        help_text="Tracks processed Message-IDs and last poll metadata",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_connector_type_display()})"


class ERPConnector(UUIDModel, TimeStampedModel):
    """ERP system connector configuration (Oracle, SAP, etc.)."""

    class ERPType(models.TextChoices):
        ORACLE = "oracle", "Oracle ERP"
        SAP = "sap", "SAP"
        CUSTOM = "custom", "Custom API"

    name = models.CharField(max_length=255)
    erp_type = models.CharField(
        max_length=20,
        choices=ERPType.choices,
        default=ERPType.ORACLE,
    )
    
    # Connection configuration
    base_url = models.URLField(help_text="ERP API base URL")
    api_key = models.CharField(
        max_length=255,
        blank=True,
        help_text="API key for authentication",
    )
    username = models.CharField(max_length=255, blank=True)
    password = models.CharField(max_length=255, blank=True)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    sync_enabled = models.BooleanField(
        default=False,
        help_text="Enable automatic synchronization",
    )
    sync_interval_minutes = models.IntegerField(
        default=60,
        help_text="Synchronization interval in minutes",
    )
    
    # Mapping configuration
    field_mappings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Field mappings between ECM and ERP",
    )
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_erp_type_display()})"


class HRMSConnector(UUIDModel, TimeStampedModel):
    """NPA HRMS integration for staff and org structure sync."""

    name = models.CharField(max_length=255)
    base_url = models.URLField(help_text="HRMS API base URL")
    api_key = models.CharField(max_length=255, blank=True)
    username = models.CharField(max_length=255, blank=True)
    password = models.CharField(max_length=255, blank=True)
    staff_endpoint = models.CharField(
        max_length=255,
        default="/api/staff",
        help_text="Relative path for staff roster",
    )
    org_endpoint = models.CharField(
        max_length=255,
        default="/api/organization",
        blank=True,
        help_text="Optional path for directorate/division/department sync",
    )
    is_active = models.BooleanField(default=True)
    sync_enabled = models.BooleanField(default=False)
    sync_interval_minutes = models.IntegerField(default=360)
    deactivate_exited_staff = models.BooleanField(
        default=True,
        help_text="Set is_active=False when HRMS reports exited/terminated staff",
    )
    field_mappings = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ERPSyncRecord(UUIDModel, TimeStampedModel):
    """Tracks ERP objects synced into ECM."""

    connector = models.ForeignKey(
        ERPConnector,
        on_delete=models.CASCADE,
        related_name="sync_records",
    )
    external_id = models.CharField(max_length=255, db_index=True)
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erp_sync_records",
    )
    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erp_sync_records",
    )
    payload_snapshot = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("connector", "external_id")
        ordering = ["-last_synced_at"]

    def __str__(self) -> str:
        return f"{self.connector.name} — {self.external_id}"


class IntegrationLog(UUIDModel, TimeStampedModel):
    """Logs all integration activities."""

    class LogType(models.TextChoices):
        WEBHOOK = "webhook", "Webhook"
        EMAIL = "email", "Email"
        ERP = "erp", "ERP"
        HRMS = "hrms", "HRMS"
        SSO = "sso", "SSO"

    class LogStatus(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        PENDING = "pending", "Pending"

    log_type = models.CharField(max_length=20, choices=LogType.choices)
    integration_id = models.UUIDField(
        help_text="ID of the webhook, connector, etc.",
    )
    status = models.CharField(
        max_length=20,
        choices=LogStatus.choices,
        default=LogStatus.PENDING,
    )
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["log_type", "status", "created_at"]),
            models.Index(fields=["integration_id", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_log_type_display()} - {self.get_status_display()}"
