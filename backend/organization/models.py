"""Models representing the NPA organizational hierarchy."""

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class Directorate(UUIDModel, TimeStampedModel):
    """Top-level organizational unit led by an Executive Director."""

    name = models.CharField(max_length=255, unique=True, db_index=True)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    executive_director = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="directorates_led",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return self.name


class Division(UUIDModel, TimeStampedModel):
    """Division that belongs to a directorate."""

    directorate = models.ForeignKey(
        Directorate,
        on_delete=models.CASCADE,
        related_name="divisions",
    )
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    general_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="divisions_led",
    )

    class Meta:
        unique_together = ("directorate", "name")
        ordering = ["directorate__name", "name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["directorate", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.directorate.code})"


class Department(UUIDModel, TimeStampedModel):
    """Department that belongs to a division."""

    division = models.ForeignKey(
        Division,
        on_delete=models.CASCADE,
        related_name="departments",
    )
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    head_of_department = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="departments_led",
    )

    class Meta:
        unique_together = ("division", "name")
        ordering = ["division__name", "name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["division", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.division.code})"


class Role(UUIDModel, TimeStampedModel):
    """System role that can be assigned to users."""

    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON object defining role permissions"
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return self.name


class Office(UUIDModel, TimeStampedModel):
    """Represents an operational office (MD, ED, GM, AGM, departments, registry, etc.)."""

    class OfficeTier(models.TextChoices):
        MANAGING_DIRECTOR = "md", "Managing Director"
        EXECUTIVE_DIRECTOR = "ed", "Executive Director"
        GENERAL_MANAGER = "gm", "General Manager"
        ASSISTANT_GENERAL_MANAGER = "agm", "Assistant General Manager"
        DIRECTORATE = "directorate", "Directorate Office"
        DIVISION = "division", "Division Office"
        DEPARTMENT = "department", "Department Office"
        UNIT = "unit", "Unit / Section"
        REGISTRY = "registry", "Registry / Secretariat"
        PROJECT = "project", "Programme / Project Office"
        CUSTOM = "custom", "Custom Office"

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64, unique=True)
    office_type = models.CharField(max_length=32, choices=OfficeTier.choices, default=OfficeTier.CUSTOM)
    directorate = models.ForeignKey(
        Directorate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="offices",
    )
    division = models.ForeignKey(
        Division,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="offices",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="offices",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    allow_external_intake = models.BooleanField(
        default=True,
        help_text="If disabled, registry cannot register inbound correspondence directly to this office.",
    )
    allow_lateral_routing = models.BooleanField(
        default=True,
        help_text="Controls whether this office can route items to peer offices at the same tier.",
    )

    location = models.ForeignKey(
        "correspondence.Location",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="offices",
        help_text="Physical location of this office.",
    )

    # =============================================================================
    # DELEGATION FIELDS - COMMENTED OUT FOR FUTURE USE
    # Uncomment these fields and run migrations to enable office delegation
    # =============================================================================
    # is_away = models.BooleanField(
    #     default=False,
    #     help_text="When True, delegate can access this office's inbox instead of the office head.",
    # )
    # away_start_date = models.DateTimeField(null=True, blank=True, help_text="When away period starts.")
    # away_end_date = models.DateTimeField(null=True, blank=True, help_text="When away period ends.")
    # delegate_user = models.ForeignKey(
    #     'accounts.User',
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='delegated_offices',
    #     help_text="User who can act on behalf of this office when away.",
    # )
    # delegate_role = models.CharField(
    #     max_length=64,
    #     blank=True,
    #     help_text="Role title for the delegate (e.g., 'GM MDS Officer').",
    # )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class OfficeMembership(UUIDModel, TimeStampedModel):
    """Links users to offices with acting/assistant metadata."""

    class AssignmentRole(models.TextChoices):
        PRINCIPAL = "principal", "Principal / Office Head"
        ACTING = "acting", "Acting Head"
        STAFF = "staff", "Staff Officer"
        SECRETARIAT = "secretariat", "Secretariat / PA / TA"
        REGISTRY = "registry", "Registry"
        SUPPORT = "support", "Support"

    office = models.ForeignKey(
        Office,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="office_memberships",
    )
    assignment_role = models.CharField(
        max_length=20,
        choices=AssignmentRole.choices,
        default=AssignmentRole.STAFF,
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="True when this membership is the user's primary posting.",
    )
    can_register = models.BooleanField(default=False)
    can_route = models.BooleanField(default=True)
    can_approve = models.BooleanField(default=False)
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["office__name", "user__username"]
        unique_together = ("office", "user", "assignment_role")

    def __str__(self) -> str:
        return f"{self.user} → {self.office} ({self.assignment_role})"


class ExecutiveCalendarEvent(UUIDModel, TimeStampedModel):
    """Calendar events for executives and their assistants."""

    class EventType(models.TextChoices):
        MEETING = "meeting", "Meeting"
        REMINDER = "reminder", "Reminder"
        DEADLINE = "deadline", "Deadline"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.MEETING,
    )
    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField()
    executive = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="executive_calendar_events",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calendar_events_created",
    )
    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calendar_events",
    )

    class Meta:
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["executive", "starts_at"], name="org_cal_exec_start_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.executive})"


class ActingAppointment(UUIDModel, TimeStampedModel):
    """Temporary office-seat succession: acting user holds the principal's seat."""

    office = models.ForeignKey(
        Office,
        on_delete=models.CASCADE,
        related_name="acting_appointments",
    )
    principal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="acting_appointments_as_principal",
        help_text="The office holder who is absent.",
    )
    acting_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="acting_appointments_as_acting",
        help_text="The officer temporarily holding the seat.",
    )
    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    reason = models.TextField(blank=True)
    appointed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acting_appointments_created",
    )
    ended_at = models.DateTimeField(null=True, blank=True)
    ended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acting_appointments_ended",
    )
    membership = models.ForeignKey(
        OfficeMembership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acting_appointments",
        help_text="OfficeMembership(role=acting) created or activated for this appointment.",
    )
    items_transferred = models.PositiveIntegerField(default=0)
    items_reclaimed = models.PositiveIntegerField(default=0)
    transfer_applied = models.BooleanField(
        default=False,
        help_text="True after the initial seat-item transfer has been attempted.",
    )

    class Meta:
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["office", "is_active"]),
            models.Index(fields=["acting_user", "is_active"]),
            models.Index(fields=["principal", "is_active"]),
            models.Index(fields=["ends_at", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["office"],
                condition=models.Q(is_active=True),
                name="unique_active_acting_appointment_per_office",
            ),
        ]

    def __str__(self) -> str:
        return f"Acting: {self.acting_user} for {self.principal} @ {self.office}"

    def is_currently_effective(self) -> bool:
        from django.utils import timezone

        if not self.is_active:
            return False
        now = timezone.now()
        if self.starts_at and self.starts_at > now:
            return False
        if self.ends_at and self.ends_at < now:
            return False
        return True


class ActingRequest(UUIDModel, TimeStampedModel):
    """Plan C: office member asks Super Admin to appoint an acting officer."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        FULFILLED = "fulfilled", "Fulfilled"
        DISMISSED = "dismissed", "Dismissed"

    office = models.ForeignKey(
        Office,
        on_delete=models.CASCADE,
        related_name="acting_requests",
    )
    principal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="acting_requests_as_principal",
        help_text="The absent seat holder this request is about.",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="acting_requests_submitted",
    )
    suggested_acting_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acting_requests_suggested",
        help_text="Optional suggested successor.",
    )
    reason = models.TextField(
        help_text="Why an acting appointment is needed (unreachable, leave, backlog, etc.).",
    )
    pending_item_count = models.PositiveIntegerField(
        default=0,
        help_text="Open seat items counted when the request was filed.",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acting_requests_resolved",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)
    appointment = models.ForeignKey(
        ActingAppointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_requests",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["office", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["office"],
                condition=models.Q(status="pending"),
                name="unique_pending_acting_request_per_office",
            ),
        ]

    def __str__(self) -> str:
        return f"ActingRequest {self.office} by {self.requested_by} ({self.status})"
