"""Correspondence and minutes models."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from common.models import SoftDeleteModel, TimeStampedModel, UUIDModel
from dms.models import Document


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
    completion_package = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completion_packages",
    )
    completion_summary_generated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # Parallel routing fields
    workflow_state = models.CharField(
        max_length=20,
        choices=[
            ("sequential", "Sequential Processing"),
            ("parallel", "Parallel Processing"),
            ("merged", "Branches Merged"),
            ("waiting_merge", "Waiting for Parallel Branches"),
        ],
        default="sequential",
    )
    active_parallel_branches = models.IntegerField(default=0)
    completed_parallel_branches = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["priority", "-created_at"]),
            models.Index(fields=["current_office", "status", "-created_at"]),
            models.Index(fields=["created_by", "-created_at"]),
            models.Index(fields=["received_date"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["is_deleted", "-created_at"]),
        ]

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
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="minutes_performed",
        help_text="Actual user who performed this action (for delegation audit trail)",
    )
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
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="minutes_received",
        help_text="Specific user recipient (for parallel routing or direct user routing)",
    )
    # Recall/Edit fields
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    edit_window_expires_at = models.DateTimeField(null=True, blank=True)  # 30 min from creation
    is_opened = models.BooleanField(default=False)  # Track if recipient opened
    opened_at = models.DateTimeField(null=True, blank=True)
    original_minute_text = models.TextField(null=True, blank=True)  # Store original
    edit_history = models.JSONField(default=list)  # Track all edits
    is_recalled = models.BooleanField(default=False)  # Track if minute was recalled/withdrawn
    recalled_at = models.DateTimeField(null=True, blank=True)
    recall_reason = models.TextField(null=True, blank=True)  # Optional reason for recall
    # Purpose-based routing
    purpose = models.CharField(
        max_length=20,
        choices=[
            ("action", "For Action"),
            ("information", "For Information"),
            ("comment", "For Comment"),
            ("approval", "For Approval"),
        ],
        default="action",
    )
    requires_response = models.BooleanField(default=True)  # For action/approval
    response_deadline = models.DateTimeField(null=True, blank=True)
    # Parallel routing fields
    routing_type = models.CharField(
        max_length=20,
        choices=[
            ("sequential", "Sequential"),
            ("parallel", "Parallel"),
            ("broadcast", "Broadcast"),
        ],
        default="sequential",
    )
    parallel_group_id = models.UUIDField(null=True, blank=True)  # Group parallel minutes
    is_parallel_branch = models.BooleanField(default=False)
    parent_minute = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="parallel_branches",
    )
    merge_strategy = models.CharField(
        max_length=20,
        choices=[
            ("all", "Wait for all"),
            ("independent", "Independent"),
            ("any", "Any one completes"),
            ("majority", "Majority completes"),
        ],
        default="all",
    )
    # Branch originator tracking (for parallel routing)
    branch_originator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parallel_branches_originated",
        help_text="The user who originally received this parallel branch (for routing back up hierarchy)",
    )
    # Consultation routing (for lateral input requests)
    is_consultation = models.BooleanField(
        default=False,
        help_text="True if this is a consultation request from another branch",
    )
    consultation_from_branch = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_requests",
        help_text="The minute/branch that requested this consultation",
    )
    consultation_to_branch = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_responses",
        help_text="The minute/branch that this consultation responds to",
    )
    # Additional minutes/instructions
    minute_type = models.CharField(
        max_length=20,
        choices=[
            ("routing", "Routing Minute"),
            ("instruction", "Additional Instruction"),
            ("clarification", "Clarification"),
            ("addendum", "Addendum"),
        ],
        default="routing",
    )
    is_additional = models.BooleanField(default=False)
    relates_to_minute = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="related_minutes",
    )
    # Digital seal applied during executive approval
    seal_applied = models.ForeignKey(
        "accounts.DocumentSeal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="minutes",
        help_text="Digital seal applied when this minute was an executive approval",
    )

    class Meta:
        ordering = ["timestamp"]

    def can_be_edited(self):
        """Check if minute can still be edited."""
        if self.is_recalled:
            return False  # Recalled minutes cannot be edited
        if self.is_opened:
            return False  # Once opened, cannot edit
        if self.edit_window_expires_at and timezone.now() > self.edit_window_expires_at:
            return False  # Window expired
        return True

    def can_be_recalled(self):
        """Check if minute can still be recalled."""
        if self.is_recalled:
            return False  # Already recalled
        if self.is_opened:
            return False  # Once opened, cannot recall
        if self.edit_window_expires_at and timezone.now() > self.edit_window_expires_at:
            return False  # Window expired
        return True

    def save(self, *args, **kwargs):
        """Auto-set edit window expiration on creation."""
        if not self.pk and not self.edit_window_expires_at:
            # Set 30-minute window from creation
            self.edit_window_expires_at = timezone.now() + timedelta(minutes=30)
        super().save(*args, **kwargs)


class ParallelRoutingGroup(UUIDModel, TimeStampedModel):
    """Groups minutes that are part of a parallel routing."""

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="parallel_routing_groups")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="parallel_routes_created")
    merge_strategy = models.CharField(
        max_length=20,
        choices=[
            ("all", "Wait for all"),
            ("independent", "Independent"),
            ("any", "Any one completes"),
            ("majority", "Majority completes"),
        ],
        default="all",
    )
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_branches = models.IntegerField(default=0)
    completed_branches = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Parallel Route {self.id} - {self.correspondence.reference_number}"

    def check_and_update_completion(self):
        """Check if parallel routing group should be marked as complete based on merge strategy."""
        from django.utils import timezone
        from organization.models import OfficeMembership

        # Get all minutes in this parallel group
        parallel_minutes = Minute.objects.filter(
            parallel_group_id=self.id,
            is_parallel_branch=True
        ).select_related('to_office', 'correspondence')

        # Count completed branches (branches where recipient has acted)
        # A branch is complete if:
        # 1. Correspondence is completed (all branches implicitly complete), OR
        # 2. The recipient has created a subsequent minute/response
        completed_branch_ids = set()
        for minute in parallel_minutes:
            # Check if correspondence is completed (all branches implicitly complete)
            if self.correspondence.status == Correspondence.Status.COMPLETED:
                completed_branch_ids.add(minute.id)
                continue

            # Determine the recipient user
            # Priority: to_user (if set) > office principal > acting > highest grade
            recipient_user_id = None
            
            # First, check if to_user is explicitly set (for parallel routing or direct user routing)
            if minute.to_user_id:
                recipient_user_id = minute.to_user_id
            elif minute.to_office:
                # Find office head with hierarchy fallback
                # 1. Try principal
                office_head = OfficeMembership.objects.filter(
                    office=minute.to_office,
                    is_active=True,
                    assignment_role='principal'
                ).select_related('user').first()
                
                if office_head:
                    recipient_user_id = office_head.user_id
                else:
                    # 2. Try acting head
                    acting = OfficeMembership.objects.filter(
                        office=minute.to_office,
                        is_active=True,
                        assignment_role='acting'
                    ).select_related('user').order_by('-starts_at').first()
                    
                    if acting:
                        recipient_user_id = acting.user_id
                    else:
                        # 3. Find highest grade staff member
                        memberships = OfficeMembership.objects.filter(
                            office=minute.to_office,
                            is_active=True
                        ).select_related('user').all()
                        
                        if memberships.exists():
                            # Sort by grade level (simplified - you may want to use a proper grade level model)
                            grade_order = ['MDCS', 'EDCS', 'GMCS', 'AGMCS', 'MSS1', 'MSS2', 'MSS3', 'MSS4', 'MSS5', 
                                          'SSS1', 'SSS2', 'SSS3', 'SSS4', 'JSS1', 'JSS2', 'JSS3']
                            
                            def get_grade_level(user):
                                grade = getattr(user, 'grade_level', '')
                                try:
                                    return grade_order.index(grade) if grade in grade_order else 999
                                except (ValueError, AttributeError):
                                    return 999
                            
                            sorted_memberships = sorted(memberships, key=lambda m: get_grade_level(m.user), reverse=True)
                            recipient_user_id = sorted_memberships[0].user_id

            # If we have a recipient, check if they've created a subsequent minute (completed their action)
            if recipient_user_id:
                recipient_acted = Minute.objects.filter(
                    correspondence=self.correspondence,
                    user_id=recipient_user_id,
                    timestamp__gt=minute.timestamp
                ).exists()
                if recipient_acted:
                    completed_branch_ids.add(minute.id)

        completed_count = len(completed_branch_ids)
        self.completed_branches = completed_count

        # Check if group should be marked complete based on merge strategy
        should_complete = False
        if self.merge_strategy == "all":
            should_complete = completed_count >= self.total_branches
        elif self.merge_strategy == "any":
            should_complete = completed_count >= 1
        elif self.merge_strategy == "majority":
            majority_threshold = (self.total_branches // 2) + 1
            should_complete = completed_count >= majority_threshold
        elif self.merge_strategy == "independent":
            # Independent branches don't block each other, so we don't mark as complete
            # The workflow can continue regardless
            should_complete = False

        if should_complete and not self.is_complete:
            self.is_complete = True
            self.completed_at = timezone.now()
            # Update correspondence workflow state
            if self.correspondence.workflow_state == "parallel":
                self.correspondence.workflow_state = "merged"
                self.correspondence.completed_parallel_branches = completed_count
                self.correspondence.save(update_fields=["workflow_state", "completed_parallel_branches"])

        self.save(update_fields=["completed_branches", "is_complete", "completed_at"])


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


class CorrespondenceDelegation(UUIDModel, TimeStampedModel):
    """
    Per-correspondence delegation record.
    Tracks when a specific correspondence is delegated from an executive to their assistant.
    """
    
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        REVOKED = "revoked", "Revoked"
        EXPIRED = "expired", "Expired"
    
    correspondence = models.ForeignKey(
        "Correspondence",
        related_name="correspondence_delegations",
        on_delete=models.CASCADE,
    )
    principal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="correspondence_delegations_given",
        on_delete=models.CASCADE,
        help_text="The executive who delegated the correspondence",
    )
    assistant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="correspondence_delegations_received",
        on_delete=models.CASCADE,
        help_text="The assistant who received the delegation",
    )
    delegation = models.ForeignKey(
        Delegation,
        related_name="correspondence_delegations",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Reference to the general delegation assignment",
    )
    notes = models.TextField(blank=True, help_text="Instructions from the executive")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    delegated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ["-delegated_at"]
        # Only one active delegation per correspondence per principal
        constraints = [
            models.UniqueConstraint(
                fields=["correspondence", "principal"],
                condition=models.Q(status="active"),
                name="unique_active_delegation_per_correspondence",
            )
        ]
    
    def __str__(self):
        return f"Delegation: {self.correspondence.reference_number} from {self.principal} to {self.assistant}"
    
    def revoke(self):
        """Revoke this delegation."""
        from django.utils import timezone
        self.status = self.Status.REVOKED
        self.revoked_at = timezone.now()
        self.save(update_fields=["status", "revoked_at"])
    
    def complete(self):
        """Mark delegation as completed (usually when correspondence is completed)."""
        from django.utils import timezone
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])
    
    def is_active(self):
        """Check if delegation is still active."""
        from django.utils import timezone
        if self.status != self.Status.ACTIVE:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            self.status = self.Status.EXPIRED
            self.save(update_fields=["status"])
            return False
        return True
