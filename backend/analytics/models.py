"""Analytics and reporting data models."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class ReportSnapshot(UUIDModel, TimeStampedModel):
    """Cached analytics report payload for dashboards or exports."""

    slug = models.SlugField()
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    generated_for = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_snapshots",
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    filters = models.JSONField(blank=True, null=True)
    data = models.JSONField()

    class Meta:
        ordering = ["-generated_at"]
        unique_together = ("slug", "generated_at")


class UsageMetric(UUIDModel, TimeStampedModel):
    """Time-series metric for usage or operational KPIs."""

    metric = models.CharField(max_length=255)
    value = models.FloatField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["metric", "recorded_at"])]


# =============================================================================
# SLA Configuration Models
# =============================================================================


class SLAConfiguration(UUIDModel, TimeStampedModel):
    """
    Configurable SLA targets for correspondence based on priority,
    optionally scoped to specific correspondence types or divisions.
    """

    class Priority(models.TextChoices):
        URGENT = "urgent", "Urgent"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    class CorrespondenceType(models.TextChoices):
        ALL = "all", "All Types"
        INCOMING = "incoming", "Incoming"
        OUTGOING = "outgoing", "Outgoing"
        INTERNAL = "internal", "Internal"
        MEMO = "memo", "Memo"

    name = models.CharField(max_length=255, help_text="Descriptive name for this SLA rule")
    priority = models.CharField(max_length=20, choices=Priority.choices)
    correspondence_type = models.CharField(
        max_length=20,
        choices=CorrespondenceType.choices,
        default=CorrespondenceType.ALL,
        help_text="Apply to specific correspondence type or all",
    )
    target_days = models.PositiveIntegerField(
        help_text="Number of days to complete within SLA"
    )
    warning_threshold_percent = models.PositiveIntegerField(
        default=75,
        help_text="Percentage of SLA time elapsed to trigger warning (e.g., 75 = warn at 75%)",
    )
    critical_threshold_percent = models.PositiveIntegerField(
        default=90,
        help_text="Percentage of SLA time elapsed to trigger critical alert (e.g., 90 = critical at 90%)",
    )
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sla_configurations",
        help_text="Optional: Apply only to this division (leave blank for global)",
    )
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["priority", "correspondence_type", "-created_at"]
        verbose_name = "SLA Configuration"
        verbose_name_plural = "SLA Configurations"
        # Ensure unique SLA per priority/type/division combination
        constraints = [
            models.UniqueConstraint(
                fields=["priority", "correspondence_type", "division"],
                name="unique_sla_config",
            )
        ]

    def __str__(self):
        scope = self.division.name if self.division else "Global"
        return f"{self.name} - {self.get_priority_display()} ({scope})"

    @classmethod
    def get_sla_for_correspondence(cls, priority: str, correspondence_type: str = None, division_id=None):
        """
        Get the most specific SLA configuration for given parameters.
        Priority order: Division-specific > Type-specific > Global
        """
        # Try division + type specific
        if division_id and correspondence_type:
            sla = cls.objects.filter(
                priority=priority,
                correspondence_type=correspondence_type,
                division_id=division_id,
                is_active=True,
            ).first()
            if sla:
                return sla

        # Try division + all types
        if division_id:
            sla = cls.objects.filter(
                priority=priority,
                correspondence_type=cls.CorrespondenceType.ALL,
                division_id=division_id,
                is_active=True,
            ).first()
            if sla:
                return sla

        # Try global + type specific
        if correspondence_type:
            sla = cls.objects.filter(
                priority=priority,
                correspondence_type=correspondence_type,
                division__isnull=True,
                is_active=True,
            ).first()
            if sla:
                return sla

        # Fall back to global + all types
        return cls.objects.filter(
            priority=priority,
            correspondence_type=cls.CorrespondenceType.ALL,
            division__isnull=True,
            is_active=True,
        ).first()

    @classmethod
    def get_default_sla_targets(cls) -> dict[str, int]:
        """Return a dict of priority -> target_days for global SLAs."""
        defaults = {
            cls.Priority.URGENT: 2,
            cls.Priority.HIGH: 3,
            cls.Priority.MEDIUM: 5,
            cls.Priority.LOW: 7,
        }
        
        for priority in cls.Priority.values:
            sla = cls.objects.filter(
                priority=priority,
                correspondence_type=cls.CorrespondenceType.ALL,
                division__isnull=True,
                is_active=True,
            ).first()
            if sla:
                defaults[priority] = sla.target_days
        
        return defaults


# =============================================================================
# Escalation Rules Models
# =============================================================================


class EscalationRule(UUIDModel, TimeStampedModel):
    """
    Defines when and how to escalate correspondence items.
    """

    class TriggerType(models.TextChoices):
        SLA_WARNING = "sla_warning", "SLA Warning (Approaching)"
        SLA_BREACH = "sla_breach", "SLA Breach"
        SLA_CRITICAL = "sla_critical", "SLA Critical"
        STALE = "stale", "Stale (No Activity)"
        PRIORITY_URGENT = "priority_urgent", "Urgent Priority Assigned"
        REASSIGNED = "reassigned", "Item Reassigned"

    class ActionType(models.TextChoices):
        EMAIL_ASSIGNEE = "email_assignee", "Email Assignee"
        EMAIL_MANAGER = "email_manager", "Email Manager"
        EMAIL_DIVISION_HEAD = "email_division_head", "Email Division Head"
        EMAIL_CUSTOM = "email_custom", "Email Custom Recipients"
        IN_APP_NOTIFICATION = "notification", "In-App Notification"
        AUTO_ESCALATE = "auto_escalate", "Auto-Escalate to Manager"
        DAILY_DIGEST = "daily_digest", "Include in Daily Digest"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=30, choices=TriggerType.choices)
    
    # Trigger conditions (JSON for flexibility)
    trigger_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        JSON conditions for triggering. Examples:
        - {"priorities": ["urgent", "high"]} - only for these priorities
        - {"min_days_pending": 3} - only if pending for 3+ days
        - {"divisions": ["uuid1", "uuid2"]} - only for specific divisions
        """,
    )
    
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    
    # Action configuration (JSON for flexibility)
    action_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        JSON config for the action. Examples:
        - {"email_template": "sla_warning"} - use specific email template
        - {"recipients": ["email@example.com"]} - custom recipients
        - {"escalate_to_role": "division_head"} - role to escalate to
        """,
    )
    
    # Notification templates
    email_subject_template = models.CharField(
        max_length=500,
        blank=True,
        default="[{priority}] SLA Alert: {subject}",
        help_text="Subject template. Variables: {priority}, {subject}, {reference}, {days_pending}",
    )
    email_body_template = models.TextField(
        blank=True,
        help_text="Email body template (HTML). Variables: {priority}, {subject}, {reference}, {days_pending}, {sla_target}, {link}",
    )
    
    # Execution settings
    is_active = models.BooleanField(default=True)
    priority_order = models.PositiveIntegerField(
        default=100,
        help_text="Lower numbers execute first",
    )
    cooldown_hours = models.PositiveIntegerField(
        default=24,
        help_text="Hours before this rule can fire again for the same item",
    )
    
    # Optional: Limit to specific divisions
    divisions = models.ManyToManyField(
        "organization.Division",
        blank=True,
        related_name="escalation_rules",
        help_text="Leave empty to apply to all divisions",
    )

    class Meta:
        ordering = ["priority_order", "name"]
        verbose_name = "Escalation Rule"
        verbose_name_plural = "Escalation Rules"

    def __str__(self):
        return f"{self.name} ({self.get_trigger_type_display()})"

    def matches_correspondence(self, correspondence) -> bool:
        """Check if this rule should apply to the given correspondence."""
        conditions = self.trigger_conditions or {}
        
        # Check priority filter
        if "priorities" in conditions:
            if correspondence.priority not in conditions["priorities"]:
                return False
        
        # Check division filter (from rule's M2M field)
        if self.divisions.exists():
            if not correspondence.division_id or str(correspondence.division_id) not in [
                str(d.id) for d in self.divisions.all()
            ]:
                return False
        
        # Check division filter (from conditions JSON)
        if "divisions" in conditions:
            if not correspondence.division_id or str(correspondence.division_id) not in conditions["divisions"]:
                return False
        
        # Check minimum days pending
        if "min_days_pending" in conditions:
            from django.utils import timezone
            if correspondence.received_date:
                days_pending = (timezone.now().date() - correspondence.received_date).days
                if days_pending < conditions["min_days_pending"]:
                    return False
        
        return True


class Escalation(UUIDModel, TimeStampedModel):
    """
    Record of an escalation that was triggered for a correspondence item.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        RESOLVED = "resolved", "Resolved"
        FAILED = "failed", "Failed"

    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.CASCADE,
        related_name="escalations",
    )
    rule = models.ForeignKey(
        EscalationRule,
        on_delete=models.SET_NULL,
        null=True,
        related_name="escalations",
    )
    triggered_at = models.DateTimeField(auto_now_add=True)
    trigger_reason = models.TextField(blank=True)
    
    # Action taken
    action_taken = models.CharField(max_length=50, blank=True)
    action_details = models.JSONField(default=dict, blank=True)
    
    # Recipients
    notified_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="received_escalations",
    )
    notified_emails = models.JSONField(default=list, blank=True)
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    
    # Resolution
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_escalations",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_escalations",
    )
    resolution_notes = models.TextField(blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-triggered_at"]
        verbose_name = "Escalation"
        verbose_name_plural = "Escalations"
        indexes = [
            models.Index(fields=["correspondence", "status"]),
            models.Index(fields=["triggered_at"]),
        ]

    def __str__(self):
        return f"Escalation for {self.correspondence.reference_number} at {self.triggered_at}"


# =============================================================================
# Performance Metrics Models (for caching/trending)
# =============================================================================


class DivisionPerformanceSnapshot(UUIDModel, TimeStampedModel):
    """
    Daily snapshot of division performance metrics for trending and historical analysis.
    """

    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.CASCADE,
        related_name="performance_snapshots",
    )
    snapshot_date = models.DateField()
    
    # Volume metrics
    total_items = models.PositiveIntegerField(default=0)
    completed_items = models.PositiveIntegerField(default=0)
    pending_items = models.PositiveIntegerField(default=0)
    new_items = models.PositiveIntegerField(default=0, help_text="Items received on this day")
    
    # SLA metrics
    sla_compliant = models.PositiveIntegerField(default=0)
    sla_breached = models.PositiveIntegerField(default=0)
    sla_at_risk = models.PositiveIntegerField(default=0, help_text="Approaching SLA deadline")
    sla_compliance_rate = models.FloatField(default=0.0)
    
    # Turnaround metrics
    avg_turnaround_days = models.FloatField(default=0.0)
    min_turnaround_days = models.FloatField(default=0.0)
    max_turnaround_days = models.FloatField(default=0.0)
    p50_turnaround_days = models.FloatField(default=0.0, help_text="Median")
    p90_turnaround_days = models.FloatField(default=0.0, help_text="90th percentile")
    
    # Efficiency metrics
    efficiency_score = models.FloatField(default=0.0)
    throughput = models.FloatField(default=0.0, help_text="Items completed per day")
    backlog_age_days = models.FloatField(default=0.0, help_text="Average age of pending items")
    
    # Priority breakdown
    urgent_count = models.PositiveIntegerField(default=0)
    high_count = models.PositiveIntegerField(default=0)
    medium_count = models.PositiveIntegerField(default=0)
    low_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-snapshot_date", "division"]
        verbose_name = "Division Performance Snapshot"
        verbose_name_plural = "Division Performance Snapshots"
        unique_together = ("division", "snapshot_date")
        indexes = [
            models.Index(fields=["snapshot_date"]),
            models.Index(fields=["division", "snapshot_date"]),
        ]

    def __str__(self):
        return f"{self.division.name} - {self.snapshot_date}"


class StaffPerformanceSnapshot(UUIDModel, TimeStampedModel):
    """
    Weekly snapshot of individual staff performance metrics.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="performance_snapshots",
    )
    week_start = models.DateField()
    week_end = models.DateField()
    
    # Activity metrics
    items_handled = models.PositiveIntegerField(default=0)
    items_completed = models.PositiveIntegerField(default=0)
    items_forwarded = models.PositiveIntegerField(default=0)
    items_returned = models.PositiveIntegerField(default=0)
    
    # Response metrics
    avg_response_time_hours = models.FloatField(default=0.0)
    avg_resolution_time_days = models.FloatField(default=0.0)
    
    # SLA metrics
    sla_compliance_rate = models.FloatField(default=0.0)
    sla_breaches = models.PositiveIntegerField(default=0)
    
    # Quality metrics
    rework_count = models.PositiveIntegerField(default=0, help_text="Items returned for rework")
    first_touch_resolution_rate = models.FloatField(default=0.0)

    class Meta:
        ordering = ["-week_start", "user"]
        verbose_name = "Staff Performance Snapshot"
        verbose_name_plural = "Staff Performance Snapshots"
        unique_together = ("user", "week_start")
        indexes = [
            models.Index(fields=["week_start"]),
            models.Index(fields=["user", "week_start"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - Week of {self.week_start}"
