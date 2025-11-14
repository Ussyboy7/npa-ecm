"""Admin configuration for notifications."""

from django.contrib import admin

from .models import Notification, NotificationPreferences


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "recipient", "notification_type", "priority", "status", "created_at"]
    list_filter = ["status", "notification_type", "priority", "created_at"]
    search_fields = ["title", "message", "recipient__username", "recipient__email"]
    readonly_fields = ["id", "created_at", "updated_at", "read_at", "email_sent_at"]
    date_hierarchy = "created_at"


@admin.register(NotificationPreferences)
class NotificationPreferencesAdmin(admin.ModelAdmin):
    list_display = ["user", "email_enabled", "in_app_enabled", "email_digest"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = ["id", "created_at", "updated_at"]
