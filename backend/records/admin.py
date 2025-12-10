"""Admin configuration for records management module."""

from django.contrib import admin

from records.models import Disposition, LegalHold, RetentionPolicy, RetentionSchedule


@admin.register(RetentionPolicy)
class RetentionPolicyAdmin(admin.ModelAdmin):
    """Admin interface for RetentionPolicy."""

    list_display = [
        "name",
        "retention_period_days",
        "trigger_event",
        "applies_to",
        "disposition_action",
        "is_active",
        "created_by",
        "created_at",
    ]
    list_filter = ["is_active", "applies_to", "disposition_action", "trigger_event"]
    search_fields = ["name", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(LegalHold)
class LegalHoldAdmin(admin.ModelAdmin):
    """Admin interface for LegalHold."""

    list_display = [
        "name",
        "case_number",
        "start_date",
        "end_date",
        "is_active",
        "created_by",
        "created_at",
    ]
    list_filter = ["is_active", "start_date"]
    search_fields = ["name", "case_number", "reason"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "start_date"
    filter_horizontal = ["documents", "correspondences"]


@admin.register(Disposition)
class DispositionAdmin(admin.ModelAdmin):
    """Admin interface for Disposition."""

    list_display = [
        "id",
        "record_type",
        "action",
        "status",
        "scheduled_date",
        "blocked_by_legal_hold",
        "policy",
        "created_at",
    ]
    list_filter = ["status", "action", "record_type", "blocked_by_legal_hold"]
    search_fields = ["id", "record_id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "scheduled_date"
    filter_horizontal = ["blocking_legal_holds"]


@admin.register(RetentionSchedule)
class RetentionScheduleAdmin(admin.ModelAdmin):
    """Admin interface for RetentionSchedule."""

    list_display = [
        "id",
        "record_type",
        "policy",
        "retention_start_date",
        "retention_end_date",
        "disposition_date",
        "is_active",
        "disposition_created",
        "created_at",
    ]
    list_filter = ["is_active", "disposition_created", "record_type"]
    search_fields = ["record_id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "disposition_date"
