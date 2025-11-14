"""Admin configuration for audit logs."""

from django.contrib import admin

from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ["action", "user", "object_type", "object_repr", "severity", "success", "timestamp"]
    list_filter = ["action", "severity", "success", "module", "timestamp"]
    search_fields = ["description", "object_repr", "user__username", "user__email", "ip_address"]
    readonly_fields = ["id", "timestamp"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]

    def has_add_permission(self, request):
        """Prevent manual creation of audit logs."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent modification of audit logs."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete audit logs."""
        return request.user.is_superuser
