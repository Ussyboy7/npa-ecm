"""Admin registrations for analytics models."""

from django.contrib import admin

from .models import (
    DivisionPerformanceSnapshot,
    Escalation,
    EscalationRule,
    ReportSnapshot,
    SLAConfiguration,
    StaffPerformanceSnapshot,
    UsageMetric,
)


@admin.register(ReportSnapshot)
class ReportSnapshotAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "generated_for", "generated_at")
    search_fields = ("title", "slug")
    list_filter = ("slug",)


@admin.register(UsageMetric)
class UsageMetricAdmin(admin.ModelAdmin):
    list_display = ("metric", "value", "recorded_at")
    list_filter = ("metric",)


@admin.register(SLAConfiguration)
class SLAConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "priority",
        "correspondence_type",
        "target_days",
        "warning_threshold_percent",
        "division",
        "is_active",
    )
    list_filter = ("priority", "correspondence_type", "is_active", "division")
    search_fields = ("name", "description")
    ordering = ("priority", "correspondence_type")
    fieldsets = (
        (None, {
            "fields": ("name", "description", "is_active")
        }),
        ("SLA Settings", {
            "fields": ("priority", "correspondence_type", "target_days")
        }),
        ("Thresholds", {
            "fields": ("warning_threshold_percent", "critical_threshold_percent")
        }),
        ("Scope", {
            "fields": ("division",),
            "description": "Leave blank for global SLA, or select a division for division-specific SLA."
        }),
    )


@admin.register(EscalationRule)
class EscalationRuleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "trigger_type",
        "action_type",
        "priority_order",
        "is_active",
    )
    list_filter = ("trigger_type", "action_type", "is_active")
    search_fields = ("name", "description")
    ordering = ("priority_order", "name")
    filter_horizontal = ("divisions",)
    fieldsets = (
        (None, {
            "fields": ("name", "description", "is_active", "priority_order")
        }),
        ("Trigger", {
            "fields": ("trigger_type", "trigger_conditions")
        }),
        ("Action", {
            "fields": ("action_type", "action_config", "cooldown_hours")
        }),
        ("Email Templates", {
            "fields": ("email_subject_template", "email_body_template"),
            "classes": ("collapse",)
        }),
        ("Scope", {
            "fields": ("divisions",),
            "description": "Leave blank to apply to all divisions."
        }),
    )


@admin.register(Escalation)
class EscalationAdmin(admin.ModelAdmin):
    list_display = (
        "correspondence",
        "rule",
        "status",
        "triggered_at",
        "acknowledged_at",
        "resolved_at",
    )
    list_filter = ("status", "rule", "triggered_at")
    search_fields = ("correspondence__reference_number", "correspondence__subject", "trigger_reason")
    ordering = ("-triggered_at",)
    readonly_fields = (
        "triggered_at",
        "action_taken",
        "action_details",
        "notified_emails",
        "error_message",
    )
    filter_horizontal = ("notified_users",)
    fieldsets = (
        (None, {
            "fields": ("correspondence", "rule", "status")
        }),
        ("Trigger Details", {
            "fields": ("triggered_at", "trigger_reason", "action_taken", "action_details")
        }),
        ("Notifications", {
            "fields": ("notified_users", "notified_emails")
        }),
        ("Resolution", {
            "fields": ("acknowledged_at", "acknowledged_by", "resolved_at", "resolved_by", "resolution_notes")
        }),
        ("Errors", {
            "fields": ("error_message",),
            "classes": ("collapse",)
        }),
    )


@admin.register(DivisionPerformanceSnapshot)
class DivisionPerformanceSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "division",
        "snapshot_date",
        "total_items",
        "completed_items",
        "sla_compliance_rate",
        "efficiency_score",
    )
    list_filter = ("division", "snapshot_date")
    ordering = ("-snapshot_date", "division")
    date_hierarchy = "snapshot_date"


@admin.register(StaffPerformanceSnapshot)
class StaffPerformanceSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "week_start",
        "week_end",
        "items_completed",
        "sla_compliance_rate",
    )
    list_filter = ("week_start",)
    search_fields = ("user__username", "user__first_name", "user__last_name")
    ordering = ("-week_start", "user")
    date_hierarchy = "week_start"
