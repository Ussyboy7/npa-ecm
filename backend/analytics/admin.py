"""Admin registrations for analytics models."""

from django.contrib import admin

from .models import ReportSnapshot, UsageMetric


@admin.register(ReportSnapshot)
class ReportSnapshotAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "generated_for", "generated_at")
    search_fields = ("title", "slug")
    list_filter = ("slug",)


@admin.register(UsageMetric)
class UsageMetricAdmin(admin.ModelAdmin):
    list_display = ("metric", "value", "recorded_at")
    list_filter = ("metric",)
