"""Admin configuration for organization models."""

from django.contrib import admin

from .models import (
    ActingAppointment,
    ActingRequest,
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    Role,
)


@admin.register(Directorate)
class DirectorateAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "executive_director")
    search_fields = ("name", "code")


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "directorate", "general_manager")
    list_filter = ("directorate",)
    search_fields = ("name", "code")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "division", "head_of_department")
    list_filter = ("division",)
    search_fields = ("name", "code")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")


@admin.register(Office)
class OfficeAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "office_type", "directorate", "division", "department", "is_active")
    list_filter = ("office_type", "directorate", "division", "department", "is_active")
    search_fields = ("name", "code", "description")


@admin.register(OfficeMembership)
class OfficeMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "office",
        "user",
        "assignment_role",
        "is_primary",
        "can_register",
        "can_route",
        "can_approve",
        "is_active",
    )
    list_filter = ("assignment_role", "is_primary", "can_register", "can_route", "can_approve", "is_active")
    search_fields = ("office__name", "office__code", "user__username", "user__first_name", "user__last_name")


@admin.register(ActingAppointment)
class ActingAppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "office",
        "principal",
        "acting_user",
        "starts_at",
        "ends_at",
        "is_active",
        "items_transferred",
        "items_reclaimed",
    )
    list_filter = ("is_active", "office")
    search_fields = (
        "office__name",
        "principal__username",
        "acting_user__username",
        "reason",
    )
    raw_id_fields = ("office", "principal", "acting_user", "appointed_by", "ended_by", "membership")

@admin.register(ActingRequest)
class ActingRequestAdmin(admin.ModelAdmin):
    list_display = (
        "office",
        "principal",
        "requested_by",
        "status",
        "pending_item_count",
        "created_at",
    )
    list_filter = ("status", "office")
    search_fields = ("office__name", "reason", "requested_by__username")
    raw_id_fields = (
        "office",
        "principal",
        "requested_by",
        "suggested_acting_user",
        "resolved_by",
        "appointment",
    )
