"""Records management models for retention policies, legal holds, and disposition."""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from common.models import TimeStampedModel, UUIDModel


class RetentionPolicy(UUIDModel, TimeStampedModel):
    """Defines retention policies for documents and correspondence."""

    class TriggerEvent(models.TextChoices):
        CREATION = "creation", "Document Creation"
        COMPLETION = "completion", "Workflow Completion"
        LAST_ACCESS = "last_access", "Last Access Date"
        LAST_MODIFIED = "last_modified", "Last Modified Date"

    class DispositionAction(models.TextChoices):
        ARCHIVE = "archive", "Archive"
        DELETE = "delete", "Delete"
        REVIEW = "review", "Review Required"
        TRANSFER = "transfer", "Transfer to Archive"

    class AppliesTo(models.TextChoices):
        DOCUMENT = "document", "Documents Only"
        CORRESPONDENCE = "correspondence", "Correspondence Only"
        ALL = "all", "All Records"

    # Policy metadata
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # Retention configuration
    retention_period_days = models.IntegerField(help_text="Number of days to retain before disposition")
    trigger_event = models.CharField(
        max_length=20,
        choices=TriggerEvent.choices,
        default=TriggerEvent.CREATION,
        help_text="Event that starts the retention period",
    )

    # Scope
    applies_to = models.CharField(
        max_length=20,
        choices=AppliesTo.choices,
        default=AppliesTo.ALL,
    )

    # Filters (optional - if empty, applies to all)
    document_types = models.JSONField(
        default=list,
        blank=True,
        help_text="List of document types this policy applies to (empty = all)",
    )
    sensitivity_levels = models.JSONField(
        default=list,
        blank=True,
        help_text="List of sensitivity levels this policy applies to (empty = all)",
    )
    division_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="List of division IDs this policy applies to (empty = all)",
    )

    # Disposition
    disposition_action = models.CharField(
        max_length=20,
        choices=DispositionAction.choices,
        default=DispositionAction.ARCHIVE,
    )
    requires_approval = models.BooleanField(
        default=False,
        help_text="Whether disposition requires manual approval",
    )
    approval_role = models.CharField(
        max_length=100,
        blank=True,
        help_text="Role required to approve disposition (if requires_approval=True)",
    )

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_retention_policies",
    )

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Retention Policies"
        indexes = [
            models.Index(fields=["is_active", "applies_to"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.retention_period_days} days)"


class LegalHold(UUIDModel, TimeStampedModel):
    """Legal hold to prevent deletion/archival of records."""

    name = models.CharField(max_length=255)
    reason = models.TextField(help_text="Reason for legal hold")
    case_number = models.CharField(max_length=100, blank=True)
    case_description = models.TextField(blank=True)

    # Hold period
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="End date of legal hold (null = indefinite)",
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Scope - which records are on hold
    documents = models.ManyToManyField(
        "dms.Document",
        blank=True,
        related_name="legal_holds",
    )
    correspondences = models.ManyToManyField(
        "correspondence.Correspondence",
        blank=True,
        related_name="legal_holds",
    )

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_legal_holds",
    )

    class Meta:
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["is_active", "start_date"]),
        ]

    def __str__(self) -> str:
        status = "Active" if self.is_active else "Inactive"
        return f"{self.name} ({status})"

    def is_currently_active(self) -> bool:
        """Check if legal hold is currently active."""
        if not self.is_active:
            return False
        now = timezone.now()
        if now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True


class Disposition(UUIDModel, TimeStampedModel):
    """Tracks disposition actions for records."""

    class DispositionStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SCHEDULED = "scheduled", "Scheduled"
        APPROVED = "approved", "Approved"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        BLOCKED = "blocked", "Blocked by Legal Hold"

    class RecordType(models.TextChoices):
        DOCUMENT = "document", "Document"
        CORRESPONDENCE = "correspondence", "Correspondence"

    # Record reference
    record_type = models.CharField(max_length=20, choices=RecordType.choices)
    record_id = models.UUIDField(help_text="ID of the document or correspondence")

    # Policy reference
    policy = models.ForeignKey(
        RetentionPolicy,
        on_delete=models.SET_NULL,
        null=True,
        related_name="dispositions",
    )

    # Disposition details
    action = models.CharField(
        max_length=20,
        choices=RetentionPolicy.DispositionAction.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=DispositionStatus.choices,
        default=DispositionStatus.PENDING,
    )

    # Dates
    retention_start_date = models.DateTimeField(
        help_text="Date when retention period started",
    )
    scheduled_date = models.DateTimeField(
        help_text="Date when disposition should occur",
    )
    completed_date = models.DateTimeField(null=True, blank=True)

    # Approval
    requires_approval = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_dispositions",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Execution
    executed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="executed_dispositions",
    )
    execution_notes = models.TextField(blank=True)

    # Blocking
    blocked_by_legal_hold = models.BooleanField(default=False)
    blocking_legal_holds = models.ManyToManyField(
        LegalHold,
        blank=True,
        related_name="blocked_dispositions",
    )

    class Meta:
        ordering = ["scheduled_date"]
        indexes = [
            models.Index(fields=["status", "scheduled_date"]),
            models.Index(fields=["record_type", "record_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_record_type_display()} {self.record_id} - {self.get_status_display()}"

    def can_execute(self) -> bool:
        """Check if disposition can be executed."""
        if self.status != Disposition.DispositionStatus.APPROVED:
            return False
        if self.blocked_by_legal_hold:
            return False
        if self.requires_approval and not self.approved_by:
            return False
        return True


class RetentionSchedule(UUIDModel, TimeStampedModel):
    """Stores calculated retention schedules for records."""

    class RecordType(models.TextChoices):
        DOCUMENT = "document", "Document"
        CORRESPONDENCE = "correspondence", "Correspondence"

    record_type = models.CharField(max_length=20, choices=RecordType.choices)
    record_id = models.UUIDField()

    # Policy applied
    policy = models.ForeignKey(
        RetentionPolicy,
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    # Dates
    retention_start_date = models.DateTimeField()
    retention_end_date = models.DateTimeField(
        help_text="Date when retention period ends",
    )
    disposition_date = models.DateTimeField(
        help_text="Date when disposition should occur",
    )

    # Status
    is_active = models.BooleanField(default=True)
    disposition_created = models.BooleanField(
        default=False,
        help_text="Whether a Disposition record has been created",
    )

    class Meta:
        unique_together = [("record_type", "record_id", "policy")]
        indexes = [
            models.Index(fields=["record_type", "record_id"]),
            models.Index(fields=["retention_end_date", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_record_type_display()} {self.record_id} - {self.policy.name}"
