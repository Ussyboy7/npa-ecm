"""Correspondence and minutes models."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import SoftDeleteModel, TimeStampedModel, UUIDModel


class Correspondence(UUIDModel, SoftDeleteModel, TimeStampedModel):
    """Represents an incoming or outgoing correspondence item."""

    class Source(models.TextChoices):
        INTERNAL = "internal", "Internal"
        EXTERNAL = "external", "External"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in-progress", "In Progress"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Direction(models.TextChoices):
        UPWARD = "upward", "Upward"
        DOWNWARD = "downward", "Downward"

    class ArchiveLevel(models.TextChoices):
        DEPARTMENT = "department", "Department"
        DIVISION = "division", "Division"
        DIRECTORATE = "directorate", "Directorate"

    class DocumentType(models.TextChoices):
        LETTER = "letter", "Letter"
        REQUEST = "request", "Request"
        COMPLAINT = "complaint", "Complaint"
        INQUIRY = "inquiry", "Inquiry"
        REPORT = "report", "Report"
        DIRECTIVE = "directive", "Directive"
        OTHER = "other", "Other"

    reference_number = models.CharField(max_length=100, unique=True, blank=True)
    subject = models.CharField(max_length=500)
    summary = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.INTERNAL)
    received_date = models.DateField(null=True, blank=True)
    sender_name = models.CharField(max_length=255, blank=True)
    sender_organization = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    direction = models.CharField(max_length=20, choices=Direction.choices, default=Direction.UPWARD)
    archive_level = models.CharField(max_length=20, choices=ArchiveLevel.choices, blank=True)
    division = models.ForeignKey(
        "organization.Division",
        related_name="correspondence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    department = models.ForeignKey(
        "organization.Department",
        related_name="correspondence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    tags = models.JSONField(default=list, blank=True)
    sender_reference = models.CharField(max_length=255, blank=True)
    letter_date = models.DateField(null=True, blank=True)
    dispatch_date = models.DateField(null=True, blank=True)
    recipient_name = models.CharField(max_length=255, blank=True)
    remarks = models.TextField(blank=True)
    document_type = models.CharField(
        max_length=32,
        choices=DocumentType.choices,
        default=DocumentType.LETTER,
    )
    owning_office = models.ForeignKey(
        "organization.Office",
        related_name="owned_correspondence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    current_office = models.ForeignKey(
        "organization.Office",
        related_name="inbox_correspondence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="correspondence_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    current_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="correspondence_pending",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    linked_documents = models.ManyToManyField(
        "dms.Document",
        through="CorrespondenceDocumentLink",
        blank=True,
        related_name="correspondence_items",
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.reference_number} - {self.subject}"


class CorrespondenceDocumentLink(UUIDModel, TimeStampedModel):
    """Link between correspondence and DMS documents."""

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="document_links")
    document = models.ForeignKey("dms.Document", on_delete=models.CASCADE, related_name="correspondence_links")
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("correspondence", "document")


class CorrespondenceDistribution(UUIDModel, TimeStampedModel):
    """Distribution list for correspondence recipients."""

    class RecipientType(models.TextChoices):
        DIVISION = "division", "Division"
        DEPARTMENT = "department", "Department"
        DIRECTORATE = "directorate", "Directorate"

    class Purpose(models.TextChoices):
        INFORMATION = "information", "For Information"
        ACTION = "action", "For Action"
        COMMENT = "comment", "For Comment"

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="distribution")
    recipient_type = models.CharField(max_length=20, choices=RecipientType.choices)
    directorate = models.ForeignKey(
        "organization.Directorate",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="directorate_distribution_entries",
    )
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="division_distribution_entries",
    )
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="department_distribution_entries",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="distribution_added",
    )
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.INFORMATION)

    class Meta:
        ordering = ["created_at"]


class CorrespondenceAttachment(UUIDModel, TimeStampedModel):
    """File attachments associated with correspondence."""

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="attachments")
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField(help_text="Size in bytes")
    file_url = models.URLField(blank=True)


class Minute(UUIDModel, TimeStampedModel):
    """Minutes, forwards, and approvals taken on correspondence."""

    class ActionType(models.TextChoices):
        MINUTE = "minute", "Minute"
        FORWARD = "forward", "Forward"
        APPROVE = "approve", "Approve"
        REJECT = "reject", "Reject"
        TREAT = "treat", "Treat"

    class Direction(models.TextChoices):
        UPWARD = "upward", "Upward"
        DOWNWARD = "downward", "Downward"

    class AssistantType(models.TextChoices):
        TA = "TA", "Technical Assistant"
        PA = "PA", "Personal Assistant"

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="minutes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="minutes")
    grade_level = models.CharField(max_length=50, blank=True)
    action_type = models.CharField(max_length=20, choices=ActionType.choices, default=ActionType.MINUTE)
    minute_text = models.TextField()
    direction = models.CharField(max_length=20, choices=Direction.choices, default=Direction.DOWNWARD)
    step_number = models.PositiveIntegerField(default=1)
    timestamp = models.DateTimeField(auto_now_add=True)
    acted_by_secretary = models.BooleanField(default=False)
    acted_by_assistant = models.BooleanField(default=False)
    assistant_type = models.CharField(max_length=5, choices=AssistantType.choices, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    mentions = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="mentioned_in_minutes")
    signature_payload = models.JSONField(blank=True, null=True)
    from_office = models.ForeignKey(
        "organization.Office",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="minutes_from_office",
    )
    to_office = models.ForeignKey(
        "organization.Office",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="minutes_to_office",
    )

    class Meta:
        ordering = ["timestamp"]


class Delegation(UUIDModel, TimeStampedModel):
    """Delegation assignments allowing assistants to act for principals."""

    principal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="delegations_given",
        on_delete=models.CASCADE,
    )
    assistant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="delegations_received",
        on_delete=models.CASCADE,
    )
    can_approve = models.BooleanField(default=False)
    can_minute = models.BooleanField(default=True)
    can_forward = models.BooleanField(default=True)
    active = models.BooleanField(default=True)
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("principal", "assistant")
