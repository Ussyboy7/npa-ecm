"""Admin registrations for correspondence models."""

from django.contrib import admin

from .models import (
    Case,
    CaseCorrespondenceLink,
    CaseDocumentLink,
    CaseFormLink,
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    Minute,
)


class CorrespondenceAttachmentInline(admin.TabularInline):
    model = CorrespondenceAttachment
    extra = 0


class CorrespondenceDistributionInline(admin.TabularInline):
    model = CorrespondenceDistribution
    extra = 0


class MinuteInline(admin.StackedInline):
    model = Minute
    extra = 0
    readonly_fields = ("timestamp",)


@admin.register(Correspondence)
class CorrespondenceAdmin(admin.ModelAdmin):
    list_display = (
        "reference_number",
        "subject",
        "status",
        "priority",
        "division",
        "department",
        "created_at",
    )
    list_filter = ("status", "priority", "source", "direction", "division", "department")
    search_fields = ("reference_number", "subject", "summary")
    inlines = [CorrespondenceAttachmentInline, CorrespondenceDistributionInline, MinuteInline]


@admin.register(CorrespondenceDocumentLink)
class CorrespondenceDocumentLinkAdmin(admin.ModelAdmin):
    list_display = ("correspondence", "document", "created_at")
    search_fields = ("correspondence__reference_number", "document__title")


@admin.register(CorrespondenceAttachment)
class CorrespondenceAttachmentAdmin(admin.ModelAdmin):
    list_display = ("correspondence", "file_name", "file_type", "file_size")
    search_fields = ("file_name",)


@admin.register(CorrespondenceDistribution)
class CorrespondenceDistributionAdmin(admin.ModelAdmin):
    list_display = ("correspondence", "recipient_type", "division", "department", "purpose", "added_by")
    list_filter = ("recipient_type", "purpose")


@admin.register(Minute)
class MinuteAdmin(admin.ModelAdmin):
    list_display = ("correspondence", "user", "action_type", "step_number", "timestamp")
    list_filter = ("action_type", "direction")
    search_fields = ("minute_text",)


@admin.register(Delegation)
class DelegationAdmin(admin.ModelAdmin):
    list_display = ("principal", "assistant", "can_approve", "can_minute", "can_forward", "active")
    list_filter = ("active",)


# =============================================================================
# CASE/FILE MANAGEMENT ADMIN
# =============================================================================

class CaseCorrespondenceLinkInline(admin.TabularInline):
    model = CaseCorrespondenceLink
    extra = 0
    readonly_fields = ("created_at", "updated_at")


class CaseDocumentLinkInline(admin.TabularInline):
    model = CaseDocumentLink
    extra = 0
    readonly_fields = ("created_at", "updated_at")


class CaseFormLinkInline(admin.TabularInline):
    model = CaseFormLink
    extra = 0
    readonly_fields = ("created_at", "updated_at")


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        "case_number",
        "title",
        "case_type",
        "status",
        "priority",
        "division",
        "department",
        "assigned_to",
        "opened_at",
    )
    list_filter = ("status", "case_type", "priority", "division", "department", "owning_office")
    search_fields = ("case_number", "title", "description")
    readonly_fields = ("case_number", "opened_at", "resolved_at", "closed_at", "completion_package_generated_at")
    inlines = [CaseCorrespondenceLinkInline, CaseDocumentLinkInline, CaseFormLinkInline]
    date_hierarchy = "opened_at"


@admin.register(CaseCorrespondenceLink)
class CaseCorrespondenceLinkAdmin(admin.ModelAdmin):
    list_display = ("case", "correspondence", "is_primary", "created_at")
    list_filter = ("is_primary",)
    search_fields = ("case__case_number", "correspondence__reference_number", "correspondence__subject")


@admin.register(CaseDocumentLink)
class CaseDocumentLinkAdmin(admin.ModelAdmin):
    list_display = ("case", "document", "created_at")
    search_fields = ("case__case_number", "document__title")


@admin.register(CaseFormLink)
class CaseFormLinkAdmin(admin.ModelAdmin):
    list_display = ("case", "form_document", "created_at")
    search_fields = ("case__case_number", "form_document__document__title")
