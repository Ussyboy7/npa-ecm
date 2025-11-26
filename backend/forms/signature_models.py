"""Models for form signature workflow."""

from __future__ import annotations

from django.db import models
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone

from common.models import SoftDeleteModel, TimeStampedModel, UUIDModel
from organization.models import Office, Department, Division


class FormSignatureWorkflow(UUIDModel, TimeStampedModel):
    """Workflow for routing form to departments for signatures."""
    
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"
    
    submission = models.ForeignKey(
        "forms.FormSubmission",
        on_delete=models.CASCADE,
        related_name="signature_workflows",
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    
    # Routing information
    current_step = models.IntegerField(default=0)
    total_steps = models.IntegerField(default=0)
    
    # Routing mode: sequential (one after another) or parallel (all at once)
    routing_mode = models.CharField(
        max_length=20,
        choices=[
            ("sequential", "Sequential - One department at a time"),
            ("parallel", "Parallel - All departments simultaneously"),
        ],
        default="sequential",
    )
    
    initiated_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="initiated_signature_workflows",
    )
    
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["submission", "status"]),
            models.Index(fields=["status", "current_step"]),
        ]
    
    def __str__(self):
        return f"Signature Workflow for {self.submission.template.name} - {self.get_status_display()}"
    
    def complete(self):
        """Mark workflow as completed."""
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save()
    
    def get_next_pending_signature(self):
        """Get the next pending signature in sequential mode."""
        if self.routing_mode == "parallel":
            return None
        return self.signatures.filter(status=FormSignature.Status.PENDING).order_by("order").first()
    
    def is_complete(self):
        """Check if all signatures are completed."""
        return self.signatures.filter(status=FormSignature.Status.PENDING).count() == 0


class FormSignature(UUIDModel, TimeStampedModel):
    """Individual signature entry for a form submission."""
    
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SIGNED = "signed", "Signed"
        REJECTED = "rejected", "Rejected"
        SKIPPED = "skipped", "Skipped"
    
    workflow = models.ForeignKey(
        FormSignatureWorkflow,
        on_delete=models.CASCADE,
        related_name="signatures",
    )
    
    # Signature field identifier from the form template
    field_name = models.CharField(max_length=100)  # e.g., "pm_signature", "procurement_signature"
    field_label = models.CharField(max_length=255)  # e.g., "Project Manager/Engineer - Signature"
    
    # Assignment
    assigned_to_office = models.ForeignKey(
        Office,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_form_signatures",
    )
    assigned_to_department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_form_signatures",
    )
    assigned_to_division = models.ForeignKey(
        Division,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_form_signatures",
    )
    
    # Signature data
    signer_name = models.CharField(max_length=255, blank=True)
    signer_pn = models.CharField(max_length=50, blank=True)  # Personnel Number
    signer_designation = models.CharField(max_length=255, blank=True)
    signature_file = models.FileField(
        upload_to="form_signatures/%Y/%m/",
        null=True,
        blank=True,
    )
    signed_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    
    # Order for sequential routing
    order = models.IntegerField(default=0)
    
    # Tracking
    assigned_to_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_form_signatures",
    )
    signed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="signed_form_signatures",
    )
    signed_at = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["workflow", "status"]),
            models.Index(fields=["assigned_to_office", "status"]),
            models.Index(fields=["assigned_to_department", "status"]),
        ]
    
    def __str__(self):
        return f"{self.field_label} - {self.get_status_display()}"
    
    def sign(self, user, signature_file=None, signer_name="", signer_pn="", signer_designation="", signed_date=None):
        """Mark signature as signed."""
        from django.utils import timezone
        
        self.status = self.Status.SIGNED
        self.signed_by = user
        self.signed_at = timezone.now()
        
        if signature_file:
            self.signature_file = signature_file
        
        if signer_name:
            self.signer_name = signer_name
        if signer_pn:
            self.signer_pn = signer_pn
        if signer_designation:
            self.signer_designation = signer_designation
        if signed_date:
            self.signed_date = signed_date
        
        self.save()
    
    def reject(self, user, reason=""):
        """Reject the signature request."""
        from django.utils import timezone
        
        self.status = self.Status.REJECTED
        self.signed_by = user
        self.signed_at = timezone.now()
        self.rejection_reason = reason
        self.save()

