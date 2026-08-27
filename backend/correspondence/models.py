"""Correspondence and minutes models."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from common.grade_utils import get_grade_level
from common.models import SoftDeleteModel, TimeStampedModel, UUIDModel
from dms.models import Document


class Correspondence(UUIDModel, SoftDeleteModel, TimeStampedModel):
    """
    Represents an incoming or outgoing correspondence item.
    
    CORRESPONDENCE ROUTING CONCEPT:
    ===============================
    
    Minutes = Routes: Minutes are like routes - short forms of sending correspondence 
    to other offices/users. Like physical documents with handwritten minutes.
    
    Flow Types:
    -----------
    1. INWARD - Coming INTO your office:
       - Internal: From another NPA office (minuted to you) → Office Inbox
       - External: From external org (physical copy received, registered) → Office Inbox
    
    2. OUTWARD - Going OUT OF your office:
       - Internal: To another NPA office (you minute it out) → Office Sent
       - External: To external org (registered, printed, mailed) → Office Sent
    
    Source & Direction:
    -------------------
    - source: INTERNAL (within NPA) or EXTERNAL (outside NPA)
    - direction: UPWARD (inward) or DOWNWARD (outward)
    
    Physical vs Digital:
    --------------------
    - Internal (NPA to NPA): Digital routing via minutes
    - External (NPA ↔ External): Physical copies, but system tracks digitally
    """

    class Source(models.TextChoices):
        INTERNAL = "internal", "Internal"
        EXTERNAL = "external", "External"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in-progress", "In Progress"
        COMPLETED = "completed", "Completed"
        DISPATCHED = "dispatched", "Dispatched"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        ARCHIVED = "archived", "Archived"
        WITHDRAWN = "withdrawn", "Withdrawn"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Direction(models.TextChoices):
        UPWARD = "upward", "Upward"
        DOWNWARD = "downward", "Downward"
        LATERAL = "lateral", "Lateral"

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

    class RequiredApprovalLevel(models.TextChoices):
        NONE = "none", "None"
        DEPARTMENTAL = "departmental", "Departmental"
        EXECUTIVE = "executive", "Executive"

    reference_number = models.CharField(max_length=100, unique=True, blank=True)
    subject = models.CharField(max_length=500)
    treatment_response = models.TextField(blank=True, default="")
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
    acknowledged_date = models.DateField(null=True, blank=True)
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
    acting_appointment = models.ForeignKey(
        "organization.ActingAppointment",
        related_name="transferred_items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Active acting appointment that transferred this item's seat ownership.",
    )
    acting_original_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="acting_original_approver_items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Principal who owned this item before acting reassignment.",
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
    archived_at = models.DateTimeField(null=True, blank=True)
    is_on_legal_hold = models.BooleanField(default=False, db_index=True)
    retention_schedule = models.ForeignKey(
        "records.RetentionSchedule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="correspondence_items",
    )
    disposed_at = models.DateTimeField(null=True, blank=True)
    # Withdrawal tracking (similar to recall in minutes)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    withdraw_reason = models.TextField(null=True, blank=True)
    withdrawn_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="correspondence_withdrawn",
        help_text="User who withdrew this correspondence",
    )
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
    # Parent correspondence for responses (RE: correspondence)
    parent_correspondence = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="response_correspondence",
        help_text="Parent correspondence this is responding to (for RE: correspondence)",
    )
    # Case/File Management
    case = models.ForeignKey(
        "Case",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="correspondence",
        help_text="Case/File this correspondence belongs to",
    )
    # Physical document tracking
    has_physical_copy = models.BooleanField(
        default=False,
        help_text="Whether a physical (paper) original exists for this correspondence",
    )
    # Approval / classification audit fields
    required_approval_level = models.CharField(
        max_length=16,
        choices=RequiredApprovalLevel.choices,
        default=RequiredApprovalLevel.DEPARTMENTAL,
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    strategic_flag = models.BooleanField(default=False)
    classified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="correspondence_classified",
    )
    classified_at = models.DateTimeField(null=True, blank=True)
    classification_reason = models.TextField(blank=True, default="")

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
    
    # Routing concept helper methods
    def is_inward(self) -> bool:
        """
        Check if correspondence is INWARD (coming INTO office).
        
        Returns:
            True if direction is UPWARD (inward), False otherwise
        """
        return self.direction == self.Direction.UPWARD
    
    def is_outward(self) -> bool:
        """
        Check if correspondence is OUTWARD (going OUT OF office).
        
        Returns:
            True if direction is DOWNWARD (outward), False otherwise
        """
        return self.direction == self.Direction.DOWNWARD
    
    def is_internal(self) -> bool:
        """
        Check if correspondence is INTERNAL (within NPA).
        
        Returns:
            True if source is INTERNAL, False if EXTERNAL
        """
        return self.source == self.Source.INTERNAL
    
    def is_external(self) -> bool:
        """
        Check if correspondence is EXTERNAL (outside NPA).
        
        Returns:
            True if source is EXTERNAL, False if INTERNAL
        """
        return self.source == self.Source.EXTERNAL
    
    def get_flow_type(self) -> str:
        """
        Get the flow type based on routing concept.
        
        Returns:
            One of: 'inward-internal', 'inward-external', 'outward-internal', 'outward-external'
        """
        if self.is_inward():
            return 'inward-internal' if self.is_internal() else 'inward-external'
        else:
            return 'outward-internal' if self.is_internal() else 'outward-external'
    
    def should_appear_in_office_inbox(self) -> bool:
        """
        Check if correspondence should appear in Office Inbox.
        
        Office Inbox shows INWARD correspondence (coming INTO office):
        - Inward-Internal: Minuted to your office
        - Inward-External: Physical copy received, registered
        
        Returns:
            True if inward (direction=UPWARD), False otherwise
        """
        return self.is_inward()

    def get_lifecycle_stage(self) -> int:
        """Return the lifecycle progress stage for the progress bar."""
        if self.is_outward():
            stage_map = {
                self.Status.PENDING: 0,
                self.Status.IN_PROGRESS: 1,
                self.Status.COMPLETED: 2,
                self.Status.DISPATCHED: 3,
                self.Status.ACKNOWLEDGED: 3,  # same stage as dispatched (receipt badge)
                self.Status.ARCHIVED: 4,
                self.Status.WITHDRAWN: -1,
            }
        else:
            # Inward: no dispatch stage — completed then archive
            stage_map = {
                self.Status.PENDING: 0,
                self.Status.IN_PROGRESS: 1,
                self.Status.COMPLETED: 2,
                self.Status.DISPATCHED: 2,  # legacy/mis-set; treat as completed
                self.Status.ACKNOWLEDGED: 2,
                self.Status.ARCHIVED: 3,
                self.Status.WITHDRAWN: -1,
            }
        return stage_map.get(self.status, 0)

    @property
    def lifecycle_stages(self) -> list[dict]:
        """Return flow-aware lifecycle stages with timestamps for the progress bar UI."""
        if self.is_outward():
            stages = [
                {"key": "pending", "label": "Pending", "index": 0},
                {"key": "in_progress", "label": "In Progress", "index": 1},
                {"key": "completed", "label": "Completed", "index": 2},
                {"key": "dispatched", "label": "Dispatched", "index": 3},
                {"key": "archived", "label": "Archived", "index": 4},
            ]
        else:
            stages = [
                {"key": "pending", "label": "Pending", "index": 0},
                {"key": "in_progress", "label": "In Progress", "index": 1},
                {"key": "completed", "label": "Completed", "index": 2},
                {"key": "archived", "label": "Archived", "index": 3},
            ]

        post_complete = {
            self.Status.COMPLETED,
            self.Status.DISPATCHED,
            self.Status.ACKNOWLEDGED,
            self.Status.ARCHIVED,
        }
        timestamps = {
            "pending": self.created_at,
            "in_progress": self.created_at,
            "completed": self.completed_at
            or (self.created_at if self.status in post_complete else None),
            "dispatched": self.dispatch_date,
            "acknowledged": self.acknowledged_date,
            "archived": self.archived_at,
        }
        current = self.get_lifecycle_stage()
        for stage in stages:
            stage["completed"] = stage["index"] <= current if current >= 0 else False
            stage["timestamp"] = timestamps.get(stage["key"])
        return stages


class DispatchRecord(UUIDModel, TimeStampedModel):
    """Tracks dispatch and acknowledgment of correspondence."""

    class DispatchMode(models.TextChoices):
        EMAIL = "email", "Email"
        COURIER = "courier", "Courier"
        HAND_DELIVERY = "hand_delivery", "Hand Delivery"
        POSTAL = "postal", "Postal Service"
        INTERNAL = "internal", "Internal Routing"

    correspondence = models.ForeignKey(
        Correspondence,
        on_delete=models.CASCADE,
        related_name="dispatch_records",
    )
    dispatch_mode = models.CharField(max_length=20, choices=DispatchMode.choices)
    dispatched_date = models.DateField()
    dispatched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="dispatch_records",
    )
    tracking_number = models.CharField(max_length=255, blank=True)
    courier_name = models.CharField(max_length=255, blank=True)
    recipient_name = models.CharField(max_length=255, blank=True)
    recipient_address = models.TextField(blank=True)
    acknowledged_date = models.DateField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_records",
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-dispatched_date"]


class CorrespondenceDocumentLink(UUIDModel, TimeStampedModel):
    """Link between correspondence and DMS documents."""

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="document_links")
    document = models.ForeignKey("dms.Document", on_delete=models.CASCADE, related_name="correspondence_links")
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("correspondence", "document")


class CorrespondenceDistribution(UUIDModel, TimeStampedModel):
    """
    Distribution list for correspondence recipients (CC).
    
    DISTRIBUTION CONCEPT:
    ====================
    
    Distribution is like routing but for information sharing:
    - Distribution recipients see correspondence in their Office Inbox
    - Distribution can be "For Information", "For Action", or "For Comment"
    - Distribution items can be further minuted down (acted upon)
    - Everything is tracked and recorded
    
    Key Points:
    - Distribution items appear in Office Inbox/Sent
    - Distribution recipients can take action (minute, forward, etc.)
    - Distribution is tracked for audit purposes
    - Distribution is separate from direct routing but still visible
    """

    class RecipientType(models.TextChoices):
        OFFICE = "office", "Office"
        DIVISION = "division", "Division"
        DEPARTMENT = "department", "Department"
        DIRECTORATE = "directorate", "Directorate"
        USER = "user", "User"

    class Purpose(models.TextChoices):
        INFORMATION = "information", "For Information"
        ACTION = "action", "For Action"
        # COMMENT removed - streamlined to 2 purposes

    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="distribution")
    recipient_type = models.CharField(max_length=20, choices=RecipientType.choices)
    directorate = models.ForeignKey(
        "organization.Directorate",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="directorate_distribution_entries",
    )
    office = models.ForeignKey(
        "organization.Office",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="office_distribution_entries",
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
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="user_distribution_entries",
        help_text="User recipient (for parallel routing)",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="distribution_added",
    )
    minute = models.ForeignKey(
        "Minute",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="distribution_entries",
        help_text="The minute that added this distribution entry (if added via minute)",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this distribution entry is active. Set to False when the linked minute is recalled.",
    )
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.INFORMATION)
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this distribution entry was marked as read by the recipient",
    )
    read_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="read_distributions",
        help_text="User who marked this distribution entry as read",
    )

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
    """
    Minutes, forwards, and approvals taken on correspondence.
    
    MINUTES = ROUTES CONCEPT:
    ========================
    
    Minutes are like routes - they're short forms of using correspondence to send 
    to other offices/users. Like physical documents with handwritten minutes.
    
    When you minute correspondence:
    - You're routing it from your office to another office/user
    - It appears in your Office Sent (outward)
    - Recipient receives it in their Office Inbox (inward)
    
    Minute Flow:
    ------------
    - Minute Inward (Received): Someone minutes to you → You receive in Office Inbox
    - Minute Outward (Sent): You minute to others → Appears in your Office Sent
    
    Physical Concept:
    ----------------
    Minutes are like physical annotations on documents - they route correspondence
    between offices/users, similar to how handwritten minutes route physical documents.
    """

    class ActionType(models.TextChoices):
        MINUTE = "minute", "Minute"
        FORWARD = "forward", "Forward"
        APPROVE = "approve", "Approve"
        REJECT = "reject", "Reject"
        TREAT = "treat", "Treat"

    class Direction(models.TextChoices):
        UPWARD = "upward", "Upward"
        DOWNWARD = "downward", "Downward"
        LATERAL = "lateral", "Lateral"

    class AssistantType(models.TextChoices):
        TA = "TA", "Technical Assistant"
        PA = "PA", "Personal Assistant"

    class ApprovalLevel(models.TextChoices):
        DEPARTMENTAL = "departmental", "Departmental"
        DIVISIONAL = "divisional", "Divisional"
        EXECUTIVE = "executive", "Executive"

    class ApprovalRole(models.TextChoices):
        ENDORSEMENT = "endorsement", "Endorsement"
        APPROVAL = "approval", "Approval"

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
    # Per-minute dispatch/acknowledge lifecycle
    dispatched_at = models.DateTimeField(null=True, blank=True, help_text="When minute left sender's office")
    acknowledged_at = models.DateTimeField(null=True, blank=True, help_text="When recipient opened/viewed the minute")
    # Purpose-based routing
    purpose = models.CharField(
        max_length=20,
        choices=[
            ("action", "For Action"),
            ("information", "For Information"),
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
    # When a parallel branch is force-completed (e.g. non-response escalation),
    # this is stamped so check_and_update_completion counts it as done even
    # though the recipient never created a response minute.
    branch_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Set when a parallel branch is force-completed via escalation/non-response handling",
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
    # Approval level actually exercised by this minute
    approval_level = models.CharField(
        max_length=16,
        choices=ApprovalLevel.choices,
        null=True,
        blank=True,
    )
    approval_role = models.CharField(
        max_length=16,
        choices=ApprovalRole.choices,
        null=True,
        blank=True,
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

    @property
    def is_dispatched(self):
        """Check if minute has been dispatched (left sender's office)."""
        return self.dispatched_at is not None

    @property
    def is_acknowledged(self):
        """Check if minute has been acknowledged (recipient opened/viewed)."""
        return self.acknowledged_at is not None

    def can_be_recalled(self):
        """
        Recall window: 1 hour or before the next person acts.
        - Block if already recalled
        - Block if acknowledged/dispatched (next office opened it)
        - Block if 1-hour window expired
        - Block if downstream non-recalled minute exists (next person acted)
        MD/superuser bypass is handled in the view.
        """
        if self.is_recalled:
            return False
        if self.acknowledged_at or self.dispatched_at:
            return False
        if self.edit_window_expires_at and timezone.now() > self.edit_window_expires_at:
            return False
        # If anyone downstream has acted (non-recalled minute after this one), block regular recall
        if self.correspondence_id and self.timestamp:
            from django.db.models import Q

            has_downstream = type(self).objects.filter(
                correspondence_id=self.correspondence_id,
                timestamp__gt=self.timestamp,
                is_recalled=False,
            ).exists()
            if has_downstream:
                return False
        return True

    def save(self, *args, **kwargs):
        """Auto-set edit window expiration on creation."""
        if not self.pk and not self.edit_window_expires_at:
            # Recall/edit window is 1 hour, or until next person acts
            self.edit_window_expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)
    
    # Routing concept helper methods
    def routes_correspondence(self) -> bool:
        """
        Check if this minute routes correspondence to another office/user.
        
        Minutes = Routes: When you minute correspondence, you're routing it.
        
        Returns:
            True if minute has a recipient (to_office or to_user), False otherwise
        """
        return bool(self.to_office or self.to_user)
    
    def is_routing_inward(self) -> bool:
        """
        Check if this minute routes correspondence INWARD (to recipient).
        
        When someone minutes to you, it's routing inward (you receive it).
        
        Returns:
            True if direction is UPWARD (inward routing), False otherwise
        """
        return self.direction == self.Direction.UPWARD
    
    def is_routing_outward(self) -> bool:
        """
        Check if this minute routes correspondence OUTWARD (from sender).
        
        When you minute to others, it's routing outward (you send it).
        
        Returns:
            True if direction is DOWNWARD (outward routing), False otherwise
        """
        return self.direction == self.Direction.DOWNWARD


class ReadReceipt(UUIDModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    correspondence = models.ForeignKey(
        'Correspondence', on_delete=models.CASCADE, related_name='read_receipts'
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'correspondence')
        verbose_name = "Read Receipt"
        verbose_name_plural = "Read Receipts"


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

        # Get the *top-level* branch minutes in this parallel group. Subsequent
        # minutes created while acting within a branch (sub-routing / responses)
        # also carry is_parallel_branch=True via inheritance, but they are not
        # independent branches and must not be counted as such.
        # Identify the *top-level* branch minutes. Sub-routing / response minutes
        # also carry is_parallel_branch=True (via inheritance) and share the group
        # id, but they are not independent branches. A branch is defined by its
        # original target office/user; the earliest minute for each distinct target
        # is the top-level branch. (Replies do not set parent_minute_id, so parent
        # linkage alone is not enough to distinguish them.)
        parallel_minutes = Minute.objects.filter(
            parallel_group_id=self.id,
            is_parallel_branch=True,
        ).select_related('to_office', 'correspondence').order_by('timestamp')

        top_level_branches = []
        seen_targets = set()
        for m in parallel_minutes:
            target = m.to_office_id or m.to_user_id
            if not target or target in seen_targets:
                continue
            seen_targets.add(target)
            top_level_branches.append(m)

        # Recount total branches dynamically. Frontend-initiated parallel routes
        # create branch minutes with a shared parallel_group_id but do not always
        # persist a ParallelRoutingGroup row with total_branches populated.
        self.total_branches = len(top_level_branches)

        # Count completed branches (branches where recipient has acted)
        # A branch is complete if:
        # 1. Correspondence is completed (all branches implicitly complete), OR
        # 2. The recipient has created a subsequent minute/response
        completed_branch_ids = set()
        for minute in top_level_branches:
            # Check if correspondence is completed (all branches implicitly complete)
            if self.correspondence.status == Correspondence.Status.COMPLETED:
                completed_branch_ids.add(minute.id)
                continue

            # Force-completed branch (non-response escalation) counts as done.
            if minute.branch_completed_at:
                completed_branch_ids.add(minute.id)
                continue

            # Determine the recipient user
            # Priority: to_user (if set) > office principal > acting > highest grade
            recipient_user_id = None

            # First, check if to_user is explicitly set (for parallel routing or direct user routing)
            if minute.to_user_id:
                recipient_user_id = minute.to_user_id
                recipient_acted = Minute.objects.filter(
                    correspondence=self.correspondence,
                    user_id=recipient_user_id,
                    timestamp__gt=minute.timestamp,
                ).exists()
                if recipient_acted:
                    completed_branch_ids.add(minute.id)
            elif minute.to_office:
                # Office-routed branch: the branch is complete once ANY active member of
                # the target office has responded (created a subsequent minute). This
                # supports office-level parallel routing where to_user is not set.
                member_ids = list(
                    OfficeMembership.objects.filter(
                        office=minute.to_office,
                        is_active=True,
                    ).values_list("user_id", flat=True)
                )
                if member_ids:
                    acted = Minute.objects.filter(
                        correspondence=self.correspondence,
                        user_id__in=member_ids,
                        timestamp__gt=minute.timestamp,
                    ).exists()
                    if acted:
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

        self.save(update_fields=["completed_branches", "is_complete", "completed_at", "total_branches"])


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


class Case(UUIDModel, SoftDeleteModel, TimeStampedModel):
    """
    Unified Case/File entity that groups related correspondence, documents, forms, and actions.
    
    This is the foundation of the ECM vision: "correspondence triggers cases, documents are evidence,
    workflow is control, and the case file is the truth."
    """
    
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"
        ARCHIVED = "archived", "Archived"
    
    class CaseType(models.TextChoices):
        COMPLAINT = "complaint", "Complaint"
        REQUEST = "request", "Request"
        INQUIRY = "inquiry", "Inquiry"
        PROJECT = "project", "Project"
        LEGAL = "legal", "Legal"
        AUDIT = "audit", "Audit"
        GENERAL = "general", "General"
    
    # Case identification
    case_number = models.CharField(max_length=100, unique=True, db_index=True, help_text="Unique case reference number")
    title = models.CharField(max_length=500, help_text="Case title/summary")
    description = models.TextField(blank=True, help_text="Detailed case description")
    case_type = models.CharField(max_length=32, choices=CaseType.choices, default=CaseType.GENERAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    
    # Organization
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases",
    )
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases",
    )
    owning_office = models.ForeignKey(
        "organization.Office",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_cases",
    )
    
    # Ownership and assignment
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases_created",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases_assigned",
    )
    current_office = models.ForeignKey(
        "organization.Office",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_cases",
    )
    
    # Dates
    opened_at = models.DateTimeField(auto_now_add=True, help_text="When case was opened")
    resolved_at = models.DateTimeField(null=True, blank=True, help_text="When case was resolved")
    closed_at = models.DateTimeField(null=True, blank=True, help_text="When case was closed")
    
    # Priority
    priority = models.CharField(
        max_length=20,
        choices=Correspondence.Priority.choices,
        default=Correspondence.Priority.MEDIUM,
    )
    
    # Tags and metadata
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional case metadata")
    
    # Completion package
    completion_package = models.ForeignKey(
        "dms.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_completion_packages",
        help_text="Auto-generated completion package document",
    )
    completion_package_generated_at = models.DateTimeField(null=True, blank=True)
    
    # Template reference (if created from template)
    template = models.ForeignKey(
        "CaseTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases",
        help_text="Case template used to create this case",
    )
    
    class Meta:
        ordering = ["-opened_at"]
        indexes = [
            models.Index(fields=["case_number"]),
            models.Index(fields=["status", "-opened_at"]),
            models.Index(fields=["case_type", "status"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["owning_office", "status"]),
            models.Index(fields=["is_deleted", "-opened_at"]),
        ]
        verbose_name = "Case"
        verbose_name_plural = "Cases"
    
    def __str__(self) -> str:
        return f"{self.case_number} - {self.title}"
    
    def get_related_correspondence(self):
        """Get all correspondence linked to this case."""
        return self.correspondence.all()
    
    def get_related_documents(self):
        """Get all documents linked to this case."""
        return [link.document for link in self.document_links.select_related('document').all()]
    
    def get_related_forms(self):
        """Get all forms linked to this case."""
        return [link.form_document for link in self.form_links.select_related('form_document', 'form_document__document').all()]
    
    def get_all_activities(self):
        """Get all activities (minutes, approvals, etc.) related to this case."""
        from correspondence.models import Minute
        correspondence_ids = self.correspondence.values_list('id', flat=True)
        return Minute.objects.filter(correspondence_id__in=correspondence_ids).order_by('timestamp')


class CaseCorrespondenceLink(UUIDModel, TimeStampedModel):
    """Link between a Case and Correspondence."""
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="correspondence_links")
    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE, related_name="case_links")
    is_primary = models.BooleanField(default=False, help_text="True if this is the correspondence that triggered the case")
    notes = models.TextField(blank=True, help_text="Notes about this link")
    
    class Meta:
        unique_together = ("case", "correspondence")
        indexes = [
            models.Index(fields=["case", "is_primary"]),
        ]


class CaseDocumentLink(UUIDModel, TimeStampedModel):
    """Link between a Case and DMS Document."""
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="document_links")
    document = models.ForeignKey("dms.Document", on_delete=models.CASCADE, related_name="case_links")
    notes = models.TextField(blank=True, help_text="Notes about this link")
    
    class Meta:
        unique_together = ("case", "document")
        indexes = [
            models.Index(fields=["case"]),
        ]


class CaseFormLink(UUIDModel, TimeStampedModel):
    """Link between a Case and Form Document."""
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="form_links")
    form_document = models.ForeignKey("dms.FormDocument", on_delete=models.CASCADE, related_name="case_links")
    notes = models.TextField(blank=True, help_text="Notes about this link")
    
    class Meta:
        unique_together = ("case", "form_document")
        indexes = [
            models.Index(fields=["case"]),
        ]


class CaseTemplate(UUIDModel, SoftDeleteModel, TimeStampedModel):
    """Template for creating cases with pre-configured structures."""
    
    class CaseType(models.TextChoices):
        COMPLAINT = "complaint", "Complaint"
        REQUEST = "request", "Request"
        INQUIRY = "inquiry", "Inquiry"
        PROJECT = "project", "Project"
        LEGAL = "legal", "Legal"
        AUDIT = "audit", "Audit"
        GENERAL = "general", "General"
    
    name = models.CharField(max_length=255, help_text="Template name")
    slug = models.SlugField(max_length=255, unique=True, help_text="Unique template identifier")
    description = models.TextField(blank=True, help_text="Template description")
    case_type = models.CharField(
        max_length=32,
        choices=CaseType.choices,
        default=CaseType.GENERAL,
        help_text="Default case type for this template"
    )
    is_active = models.BooleanField(default=True, help_text="Whether this template is active")
    
    # Default values for cases created from this template
    default_priority = models.CharField(
        max_length=20,
        default="medium",
        help_text="Default priority for cases created from this template"
    )
    
    # JSON field storing template configuration
    structure = models.JSONField(
        default=dict,
        help_text="Template structure and configuration"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_case_templates",
    )
    
    usage_count = models.IntegerField(default=0, help_text="Number of times this template has been used")
    
    class Meta:
        ordering = ["case_type", "name"]
        indexes = [
            models.Index(fields=["case_type", "is_active"]),
            models.Index(fields=["slug"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_case_type_display()})"
    
    def increment_usage(self):
        """Increment usage count."""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])


class CaseComment(UUIDModel, TimeStampedModel):
    """Comments and discussions on cases."""
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="comments",
        help_text="Case this comment belongs to"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_comments",
        help_text="User who wrote this comment"
    )
    content = models.TextField(help_text="Comment content")
    
    # Threading support
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
        help_text="Parent comment if this is a reply"
    )
    
    # Mentions support
    mentions = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="mentioned_in_case_comments",
        blank=True,
        help_text="Users mentioned in this comment"
    )
    
    # Status
    is_resolved = models.BooleanField(default=False, help_text="Whether this comment/thread is resolved")
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_case_comments",
    )
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["case", "created_at"]),
            models.Index(fields=["parent"]),
        ]
    
    def __str__(self):
        return f"Comment on {self.case.case_number} by {self.author}"
    
    def resolve(self, user):
        """Mark this comment as resolved."""
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.resolved_by = user
        self.save(update_fields=['is_resolved', 'resolved_at', 'resolved_by'])
    
    def unresolve(self):
        """Mark this comment as unresolved."""
        self.is_resolved = False
        self.resolved_at = None
        self.resolved_by = None
        self.save(update_fields=['is_resolved', 'resolved_at', 'resolved_by'])


class CaseWorkflowRule(UUIDModel, TimeStampedModel):
    """Workflow rules for automated case status transitions and SLA tracking."""
    
    class TriggerType(models.TextChoices):
        STATUS_CHANGE = "status_change", "Status Change"
        TIME_ELAPSED = "time_elapsed", "Time Elapsed"
        PRIORITY_CHANGE = "priority_change", "Priority Change"
        ASSIGNMENT_CHANGE = "assignment_change", "Assignment Change"
        LINK_ADDED = "link_added", "Link Added"
        FORM_COMPLETED = "form_completed", "Form Completed"
    
    class ActionType(models.TextChoices):
        CHANGE_STATUS = "change_status", "Change Status"
        ASSIGN_TO = "assign_to", "Assign To"
        SEND_NOTIFICATION = "send_notification", "Send Notification"
        ESCALATE = "escalate", "Escalate"
        AUTO_CLOSE = "auto_close", "Auto Close"
    
    name = models.CharField(max_length=255, help_text="Rule name")
    description = models.TextField(blank=True, help_text="Rule description")
    case_type = models.CharField(
        max_length=32,
        choices=Case.CaseType.choices,
        null=True,
        blank=True,
        help_text="Apply to specific case type (leave blank for all)"
    )
    priority = models.CharField(
        max_length=20,
        choices=Correspondence.Priority.choices,
        null=True,
        blank=True,
        help_text="Apply to specific priority (leave blank for all)"
    )
    trigger_type = models.CharField(max_length=30, choices=TriggerType.choices)
    trigger_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON conditions for triggering (e.g., {'days': 7, 'status': 'open'})"
    )
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    action_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON configuration for action (e.g., {'status': 'in_progress', 'assign_to_role': 'manager'})"
    )
    is_active = models.BooleanField(default=True, help_text="Whether this rule is active")
    priority_order = models.IntegerField(default=0, help_text="Order for rule evaluation (lower = higher priority)")
    
    class Meta:
        ordering = ["priority_order", "name"]
        indexes = [
            models.Index(fields=["case_type", "is_active"]),
            models.Index(fields=["trigger_type", "is_active"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_trigger_type_display()})"
    
    def matches_case(self, case: Case) -> bool:
        """Check if this rule matches a case."""
        if self.case_type and case.case_type != self.case_type:
            return False
        if self.priority and case.priority != self.priority:
            return False
        return True


class CaseSLA(UUIDModel, TimeStampedModel):
    """SLA tracking for cases."""
    
    case = models.OneToOneField(
        Case,
        on_delete=models.CASCADE,
        related_name="sla",
        help_text="Case this SLA applies to"
    )
    target_days = models.PositiveIntegerField(help_text="Target days to resolve")
    target_date = models.DateTimeField(help_text="Target resolution date")
    warning_threshold_percent = models.PositiveIntegerField(
        default=75,
        help_text="Percentage of SLA time elapsed to trigger warning"
    )
    critical_threshold_percent = models.PositiveIntegerField(
        default=90,
        help_text="Percentage of SLA time elapsed to trigger critical alert"
    )
    warning_sent = models.BooleanField(default=False, help_text="Whether warning notification was sent")
    critical_sent = models.BooleanField(default=False, help_text="Whether critical notification was sent")
    breached = models.BooleanField(default=False, help_text="Whether SLA was breached")
    breached_at = models.DateTimeField(null=True, blank=True, help_text="When SLA was breached")
    
    class Meta:
        indexes = [
            models.Index(fields=["case", "target_date"]),
            models.Index(fields=["breached", "target_date"]),
        ]
    
    def __str__(self):
        return f"SLA for {self.case.case_number}"
    
    def check_status(self) -> str:
        """Check current SLA status: 'ok', 'warning', 'critical', 'breach'."""
        from django.utils import timezone
        now = timezone.now()
        
        if self.target_date <= now:
            if not self.breached:
                self.breached = True
                self.breached_at = now
                self.save(update_fields=['breached', 'breached_at'])
            return "breach"
        
        elapsed = (now - self.case.opened_at).total_seconds()
        total = (self.target_date - self.case.opened_at).total_seconds()
        percent_elapsed = (elapsed / total) * 100 if total > 0 else 0
        
        if percent_elapsed >= self.critical_threshold_percent:
            return "critical"
        elif percent_elapsed >= self.warning_threshold_percent:
            return "warning"
        else:
            return "ok"


class CorrespondenceTemplate(UUIDModel, TimeStampedModel):
    """Template for correspondence and minute content with scope-based access."""

    class TemplateScope(models.TextChoices):
        ORGANIZATION = "organization", "Organization"
        DIRECTORATE = "directorate", "Directorate"
        DIVISION = "division", "Division"
        DEPARTMENT = "department", "Department"
        USER = "user", "User"

    class TemplateType(models.TextChoices):
        DOCUMENT = "document", "Document"
        MINUTE = "minute", "Minute"
        TREATMENT = "treatment", "Treatment"

    class ActionType(models.TextChoices):
        MINUTE = "minute", "Minute"
        APPROVE = "approve", "Approve"
        ANY = "any", "Any"

    title = models.CharField(max_length=255, help_text="Template title")
    description = models.TextField(blank=True, help_text="Template description")
    scope = models.CharField(
        max_length=32,
        choices=TemplateScope.choices,
        help_text="Scope level for template access",
    )
    scope_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID of the scope entity (directorate, division, department, or user ID)",
    )
    template_type = models.CharField(
        max_length=32,
        choices=TemplateType.choices,
        default=TemplateType.DOCUMENT,
        help_text="Type of template",
    )
    action_type = models.CharField(
        max_length=32,
        choices=ActionType.choices,
        null=True,
        blank=True,
        help_text="Action type for minute templates",
    )
    content_html = models.TextField(help_text="HTML content of the template")
    content_text = models.TextField(
        blank=True,
        help_text="Plain text version of the template",
    )
    is_default = models.BooleanField(
        default=True,
        help_text="Whether this is the default template for its scope",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this template is active",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_correspondence_templates",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_correspondence_templates",
    )

    class Meta:
        ordering = ["scope", "scope_id", "template_type", "title"]
        indexes = [
            models.Index(fields=["scope", "scope_id", "template_type"]),
            models.Index(fields=["is_active", "is_default"]),
        ]
        constraints = [
            # NULL scope_id (organization) needs a separate constraint — Postgres
            # treats NULLs as distinct in ordinary unique indexes.
            models.UniqueConstraint(
                fields=["title", "scope", "template_type"],
                condition=models.Q(scope_id__isnull=True),
                name="uniq_corr_template_null_scope",
            ),
            models.UniqueConstraint(
                fields=["title", "scope", "scope_id", "template_type"],
                condition=models.Q(scope_id__isnull=False),
                name="uniq_corr_template_scoped",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.get_scope_display()})"


class CorrespondenceDraft(UUIDModel, TimeStampedModel):
    """Draft for minute or treatment that can be saved and resumed later."""

    class DraftType(models.TextChoices):
        MINUTE = "minute", "Minute"
        TREATMENT = "treatment", "Treatment"
        REGISTRATION = "registration", "Registration"

    class ActionType(models.TextChoices):
        MINUTE = "minute", "Minute"
        APPROVE = "approve", "Approve"

    correspondence = models.ForeignKey(
        Correspondence,
        on_delete=models.CASCADE,
        related_name="drafts",
        null=True,
        blank=True,
        help_text="The correspondence this draft is for (nullable for registration drafts)",
    )
    form_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON form data for registration drafts",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="correspondence_drafts",
        help_text="User who created this draft",
    )
    draft_type = models.CharField(
        max_length=20,
        choices=DraftType.choices,
        help_text="Type of draft (minute or treatment)",
    )
    content = models.TextField(help_text="Draft content")
    subject = models.CharField(max_length=255, blank=True, help_text="Optional subject")
    forward_to = models.CharField(
        max_length=255, blank=True, help_text="Optional forward to recipient"
    )
    on_behalf_of = models.CharField(
        max_length=255, blank=True, help_text="Optional on behalf of user"
    )
    action_type = models.CharField(
        max_length=20,
        choices=ActionType.choices,
        blank=True,
        null=True,
        help_text="Action type for minute drafts",
    )
    files_metadata = models.JSONField(
        default=list,
        blank=True,
        help_text="File metadata for uploaded files",
    )

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["correspondence", "user", "draft_type"]),
            models.Index(fields=["user", "-updated_at"]),
        ]
        unique_together = [
            ("correspondence", "user", "draft_type"),
        ]

    def __str__(self) -> str:
        return f"Draft for {self.correspondence.reference_number} by {self.user.username}"


class Location(UUIDModel, TimeStampedModel):
    """Physical location within NPA buildings for storing physical documents."""

    building = models.CharField(max_length=255)
    floor = models.CharField(max_length=255, blank=True)
    room = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["building", "floor", "room"]
        ordering = ["building", "floor", "room"]

    def __str__(self) -> str:
        return " / ".join(p for p in [self.building, self.floor, self.room] if p)

    def display_name(self) -> str:
        return str(self)


class PhysicalDocument(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """Tracks physical (paper) documents alongside their digital records."""

    class Status(models.TextChoices):
        FILED = "filed", "Filed"
        CHECKED_OUT = "checked_out", "Checked Out"
        ARCHIVED = "archived", "Archived"
        DESTROYED = "destroyed", "Destroyed"
        MISSING = "missing", "Missing"

    tracking_number = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=255, blank=True)
    correspondence = models.ForeignKey(
        Correspondence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="physical_documents",
    )
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="physical_documents",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="physical_documents",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.FILED,
    )
    description = models.CharField(max_length=500, blank=True)
    checked_out_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_out_documents",
    )
    checked_out_at = models.DateTimeField(null=True, blank=True)
    expected_return_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tracking_number"]),
            models.Index(fields=["correspondence"]),
            models.Index(fields=["status"]),
            models.Index(fields=["location"]),
        ]

    def __str__(self) -> str:
        name = self.description or f"Physical Doc #{self.tracking_number}"
        return f"{name} ({self.get_status_display()})"


class ExternalEntity(UUIDModel, TimeStampedModel):
    """Directory of external ministries, agencies, and organizations for correspondence registration."""

    class EntityType(models.TextChoices):
        MINISTRY = "ministry", "Ministry"
        AGENCY = "agency", "Agency / Parastatal"
        COMPANY = "company", "Private Company"
        INDIVIDUAL = "individual", "Individual"
        OTHER = "other", "Other"

    name = models.CharField(max_length=255, unique=True, db_index=True)
    acronym = models.CharField(max_length=32, blank=True)
    entity_type = models.CharField(
        max_length=20,
        choices=EntityType.choices,
        default=EntityType.OTHER,
        db_index=True,
    )
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "external entities"

    def __str__(self) -> str:
        return self.acronym or self.name


class CheckOutEvent(UUIDModel, TimeStampedModel):
    """Audit trail for physical document check-in/check-out."""

    class Action(models.TextChoices):
        CHECKED_OUT = "checked_out", "Checked Out"
        RETURNED = "returned", "Returned"

    physical_document = models.ForeignKey(
        PhysicalDocument,
        on_delete=models.CASCADE,
        related_name="checkout_events",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="physical_checkout_events",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    purpose = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]


# Register FOIA models with the correspondence app so migrations stay in sync.
from .foia_models import FOIANote, FOIARequest, FOIARequestDocument  # noqa: E402,F401
