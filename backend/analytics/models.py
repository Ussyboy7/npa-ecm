"""Analytics and reporting data models."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class ReportSnapshot(UUIDModel, TimeStampedModel):
    """Cached analytics report payload for dashboards or exports."""

    slug = models.SlugField()
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    generated_for = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_snapshots",
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    filters = models.JSONField(blank=True, null=True)
    data = models.JSONField()

    class Meta:
        ordering = ["-generated_at"]
        unique_together = ("slug", "generated_at")


class UsageMetric(UUIDModel, TimeStampedModel):
    """Time-series metric for usage or operational KPIs."""

    metric = models.CharField(max_length=255)
    value = models.FloatField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["metric", "recorded_at"])]
