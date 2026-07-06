"""Records retention, legal hold, and disposal models."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class RetentionSchedule(UUIDModel, TimeStampedModel):
    """Defines how long records are kept before review or disposal."""

    class RecordType(models.TextChoices):
        CORRESPONDENCE = "correspondence", "Correspondence"
        DOCUMENT = "document", "Document"
        ALL = "all", "All Record Types"

    class DispositionAction(models.TextChoices):
        REVIEW = "review", "Review before disposal"
        ARCHIVE = "archive", "Permanent archive"
        DELETE = "delete", "Secure disposal"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    record_type = models.CharField(
        max_length=32,
        choices=RecordType.choices,
        default=RecordType.CORRESPONDENCE,
    )
    archive_level = models.CharField(max_length=32, blank=True)
    directorate = models.ForeignKey(
        "organization.Directorate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retention_schedules",
    )
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retention_schedules",
    )
    retention_years = models.PositiveIntegerField(default=7)
    retention_months = models.PositiveIntegerField(default=0)
    disposition_action = models.CharField(
        max_length=20,
        choices=DispositionAction.choices,
        default=DispositionAction.REVIEW,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retention_schedules_created",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "record_type"], name="records_ret_is_acti_idx"),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def retention_days(self) -> int:
        return (self.retention_years * 365) + (self.retention_months * 30)


class LegalHold(UUIDModel, TimeStampedModel):
    """Litigation or audit hold that blocks disposal."""

    name = models.CharField(max_length=255)
    matter_reference = models.CharField(max_length=128, blank=True)
    description = models.TextField(blank=True)
    placed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="legal_holds_placed",
    )
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legal_holds_released",
    )
    released_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    correspondence_items = models.ManyToManyField(
        "correspondence.Correspondence",
        blank=True,
        related_name="legal_holds",
    )
    documents = models.ManyToManyField(
        "dms.Document",
        blank=True,
        related_name="legal_holds",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class DisposalRequest(UUIDModel, TimeStampedModel):
    """Approval workflow before records are disposed."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        COMPLETED = "completed", "Completed"

    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="disposal_requests",
    )
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="disposal_requests",
    )
    retention_schedule = models.ForeignKey(
        RetentionSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disposal_requests",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    reason = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    scheduled_disposal_date = models.DateField(null=True, blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="disposal_requests_created",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disposal_requests_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="records_dis_status_idx"),
        ]

    def __str__(self) -> str:
        target = self.correspondence_id or self.document_id
        return f"Disposal {self.status} — {target}"
