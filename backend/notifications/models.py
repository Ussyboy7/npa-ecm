"""Notification models for in-app and email notifications."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class Notification(UUIDModel, TimeStampedModel):
    """In-app notification for users."""

    class NotificationType(models.TextChoices):
        WORKFLOW = "workflow", "Workflow"
        DOCUMENT = "document", "Document"
        CORRESPONDENCE = "correspondence", "Correspondence"
        SYSTEM = "system", "System"
        ALERT = "alert", "Alert"
        REMINDER = "reminder", "Reminder"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Status(models.TextChoices):
        UNREAD = "unread", "Unread"
        READ = "read", "Read"
        ARCHIVED = "archived", "Archived"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_notifications",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UNREAD)

    # Context fields
    module = models.CharField(max_length=50, blank=True)  # dms, correspondence, workflow, etc.
    related_object_type = models.CharField(max_length=50, blank=True)  # document, correspondence, etc.
    related_object_id = models.CharField(max_length=255, blank=True)
    action_url = models.URLField(blank=True)
    action_required = models.BooleanField(default=False)

    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "status", "-created_at"]),
            models.Index(fields=["recipient", "notification_type", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} - {self.recipient}"

    def mark_as_read(self):
        """Mark notification as read."""
        from django.utils import timezone

        if self.status == self.Status.UNREAD:
            self.status = self.Status.READ
            self.read_at = timezone.now()
            self.save(update_fields=["status", "read_at"])

    def mark_as_archived(self):
        """Mark notification as archived."""
        self.status = self.Status.ARCHIVED
        self.save(update_fields=["status"])


class NotificationPreferences(UUIDModel, TimeStampedModel):
    """User preferences for notification delivery."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )

    # In-app notifications
    in_app_enabled = models.BooleanField(default=True)
    in_app_urgent_only = models.BooleanField(default=False)

    # Email notifications
    email_enabled = models.BooleanField(default=True)
    email_urgent_only = models.BooleanField(default=False)
    email_digest = models.BooleanField(default=False)  # Daily digest instead of individual emails
    email_digest_time = models.TimeField(null=True, blank=True, default="09:00")  # When to send digest

    # Module filters
    module_dms = models.BooleanField(default=True)
    module_correspondence = models.BooleanField(default=True)
    module_workflow = models.BooleanField(default=True)
    module_system = models.BooleanField(default=True)

    # Priority filters
    priority_low = models.BooleanField(default=True)
    priority_normal = models.BooleanField(default=True)
    priority_high = models.BooleanField(default=True)
    priority_urgent = models.BooleanField(default=True)

    # Type filters
    type_workflow = models.BooleanField(default=True)
    type_document = models.BooleanField(default=True)
    type_correspondence = models.BooleanField(default=True)
    type_system = models.BooleanField(default=True)
    type_alert = models.BooleanField(default=True)
    type_reminder = models.BooleanField(default=True)

    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True, default="22:00")
    quiet_hours_end = models.TimeField(null=True, blank=True, default="07:00")

    # Auto-archive
    auto_archive_days = models.IntegerField(default=30)

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self) -> str:
        return f"Preferences for {self.user}"
