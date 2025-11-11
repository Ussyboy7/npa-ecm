"""Support content and ticketing models."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class HelpGuide(UUIDModel, TimeStampedModel):
    """Curated help guide content for the application."""

    CATEGORY_CHOICES = [
        ("dms", "Document Management"),
        ("correspondence", "Correspondence"),
        ("workflow", "Workflow"),
        ("admin", "Administration"),
    ]

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    audience = models.CharField(max_length=100, blank=True)
    summary = models.TextField(blank=True)
    content = models.TextField()
    tags = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["title"]


class FaqEntry(UUIDModel, TimeStampedModel):
    """Frequently asked questions."""

    question = models.CharField(max_length=500)
    answer = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "question"]


class SupportTicket(UUIDModel, TimeStampedModel):
    """Internal ticket for support or feedback."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in-progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets_created",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets_assigned",
    )
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
