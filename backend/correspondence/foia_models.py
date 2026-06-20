"""FOIA (Freedom of Information Act) request models for NPA."""

from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from common.models import SoftDeleteModel, TimeStampedModel, UUIDModel


class FOIARequest(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """Tracks FOIA requests with legal timeline enforcement."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        IN_PROCESSING = "in_processing", "In Processing"
        AWAITING_CLARIFICATION = "awaiting_clarification", "Awaiting Clarification"
        REVIEW = "review", "Under Review"
        APPROVED = "approved", "Approved"
        PARTIALLY_GRANTED = "partially_granted", "Partially Granted"
        DENIED = "denied", "Denied"
        RESPONDED = "responded", "Responded"
        CLOSED = "closed", "Closed"
        APPEALED = "appealed", "Appealed"

    class FormatPreference(models.TextChoices):
        ELECTRONIC = "electronic", "Electronic"
        HARDCOPY = "hardcopy", "Hard Copy"
        INSPECTION = "inspection", "On-Site Inspection"

    request_number = models.CharField(max_length=100, unique=True)
    requester_name = models.CharField(max_length=255)
    requester_email = models.EmailField(blank=True)
    requester_phone = models.CharField(max_length=50, blank=True)
    requester_address = models.TextField(blank=True)
    organization = models.CharField(max_length=255, blank=True)
    description_of_documents = models.TextField(
        help_text="Description of the records/documents being requested"
    )
    request_details = models.TextField(blank=True)
    format_preference = models.CharField(
        max_length=20,
        choices=FormatPreference.choices,
        default=FormatPreference.ELECTRONIC,
    )
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )
    received_date = models.DateField(default=timezone.now)
    deadline_date = models.DateField(null=True, blank=True)
    acknowledged_date = models.DateField(null=True, blank=True)
    response_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_foia_requests",
    )
    exemption_reason = models.TextField(
        blank=True,
        help_text="Legal basis for any exemption/denial",
    )
    fees_assessed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fees_waived = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-received_date"]
        indexes = [
            models.Index(fields=["status", "-received_date"]),
            models.Index(fields=["request_number"]),
            models.Index(fields=["deadline_date"]),
        ]

    def __str__(self) -> str:
        return f"FOIA #{self.request_number} - {self.requester_name}"

    def save(self, *args, **kwargs):
        if not self.deadline_date and self.received_date:
            # 7-day legal timeline for FOIA acknowledgment + response
            self.deadline_date = self.received_date + timedelta(days=7)
        super().save(*args, **kwargs)

    def days_remaining(self) -> int:
        if not self.deadline_date:
            return 0
        remaining = (self.deadline_date - timezone.now().date()).days
        return max(remaining, 0)

    def is_overdue(self) -> bool:
        if not self.deadline_date:
            return False
        return (
            self.deadline_date < timezone.now().date()
            and self.status not in (
                self.Status.RESPONDED,
                self.Status.CLOSED,
                self.Status.APPEALED,
            )
        )


class FOIARequestDocument(UUIDModel, TimeStampedModel):
    """Documents linked to a FOIA request (submissions or responses)."""

    foia_request = models.ForeignKey(
        FOIARequest,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.CASCADE,
        related_name="foia_documents",
    )
    is_response = models.BooleanField(
        default=False,
        help_text="Whether this is a response document (vs a submission attachment)",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="foia_document_additions",
    )

    class Meta:
        ordering = ["-created_at"]


class FOIANote(UUIDModel, TimeStampedModel):
    """Internal or public notes on a FOIA request."""

    foia_request = models.ForeignKey(
        FOIARequest,
        on_delete=models.CASCADE,
        related_name="notes_entries",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    note = models.TextField()
    is_internal = models.BooleanField(
        default=True,
        help_text="Internal notes are not visible to the requester",
    )

    class Meta:
        ordering = ["-created_at"]
