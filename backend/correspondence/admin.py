"""Admin registrations for correspondence models."""

from django.contrib import admin

from .models import (
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
