"""Admin registrations for support models."""

from django.contrib import admin

from .models import FaqEntry, HelpGuide, SupportTicket


@admin.register(HelpGuide)
class HelpGuideAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "is_published")
    list_filter = ("category", "is_published")
    search_fields = ("title", "summary", "content")


@admin.register(FaqEntry)
class FaqEntryAdmin(admin.ModelAdmin):
    list_display = ("question", "category", "order", "is_active")
    list_filter = ("category", "is_active")
    ordering = ("order",)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("subject", "status", "priority", "created_by", "assigned_to", "created_at")
    list_filter = ("status", "priority")
    search_fields = ("subject", "description")
