"""Audit trail models for comprehensive activity logging."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import UUIDModel


class ActivityLog(UUIDModel):
    """Comprehensive audit log for all system activities."""

    class ActionType(models.TextChoices):
        # Document actions
        DOCUMENT_CREATED = "document_created", "Document Created"
        DOCUMENT_UPDATED = "document_updated", "Document Updated"
        DOCUMENT_DELETED = "document_deleted", "Document Deleted"
        DOCUMENT_VIEWED = "document_viewed", "Document Viewed"
        DOCUMENT_DOWNLOADED = "document_downloaded", "Document Downloaded"
        DOCUMENT_SHARED = "document_shared", "Document Shared"
        DOCUMENT_VERSION_UPLOADED = "document_version_uploaded", "Document Version Uploaded"
        DOCUMENT_COMMENT_ADDED = "document_comment_added", "Document Comment Added"
        DOCUMENT_COMMENT_RESOLVED = "document_comment_resolved", "Document Comment Resolved"

        # Correspondence actions
        CORRESPONDENCE_CREATED = "correspondence_created", "Correspondence Created"
        CORRESPONDENCE_UPDATED = "correspondence_updated", "Correspondence Updated"
        CORRESPONDENCE_ROUTED = "correspondence_routed", "Correspondence Routed"
        CORRESPONDENCE_MINUTED = "correspondence_minuted", "Correspondence Minuted"
        CORRESPONDENCE_APPROVED = "correspondence_approved", "Correspondence Approved"
        CORRESPONDENCE_REJECTED = "correspondence_rejected", "Correspondence Rejected"
        CORRESPONDENCE_COMPLETED = "correspondence_completed", "Correspondence Completed"

        # User actions
        USER_LOGIN = "user_login", "User Login"
        USER_LOGOUT = "user_logout", "User Logout"
        USER_IMPERSONATED = "user_impersonated", "User Impersonated"
        USER_CREATED = "user_created", "User Created"
        USER_UPDATED = "user_updated", "User Updated"
        USER_DELETED = "user_deleted", "User Deleted"

        # Permission actions
        PERMISSION_GRANTED = "permission_granted", "Permission Granted"
        PERMISSION_REVOKED = "permission_revoked", "Permission Revoked"

        # Workflow actions
        WORKFLOW_STARTED = "workflow_started", "Workflow Started"
        WORKFLOW_COMPLETED = "workflow_completed", "Workflow Completed"
        WORKFLOW_APPROVED = "workflow_approved", "Workflow Approved"
        WORKFLOW_REJECTED = "workflow_rejected", "Workflow Rejected"

        # System actions
        SYSTEM_CONFIG_CHANGED = "system_config_changed", "System Configuration Changed"
        SYSTEM_BACKUP = "system_backup", "System Backup"
        SYSTEM_RESTORE = "system_restore", "System Restore"

    class Severity(models.TextChoices):
        INFO = "info", "Information"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        CRITICAL = "critical", "Critical"

    # Actor
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    # Action details
    action = models.CharField(max_length=50, choices=ActionType.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.INFO)

    # Target object
    object_type = models.CharField(max_length=50, blank=True)  # document, correspondence, user, etc.
    object_id = models.CharField(max_length=255, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)  # Human-readable representation

    # Context
    module = models.CharField(max_length=50, blank=True)  # dms, correspondence, accounts, etc.
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)  # Additional context data

    # Result
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["action", "-timestamp"]),
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["module", "-timestamp"]),
            models.Index(fields=["severity", "-timestamp"]),
        ]
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"

    def __str__(self) -> str:
        user_str = self.user.username if self.user else "System"
        return f"{user_str} - {self.get_action_display()} - {self.timestamp}"
