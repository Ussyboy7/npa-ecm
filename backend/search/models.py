"""Search models for saved searches and search history."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class SavedSearch(UUIDModel, TimeStampedModel):
    """User's saved search queries."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_searches",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Search query
    query = models.CharField(
        max_length=500,
        help_text="Search query text",
    )
    filters = models.JSONField(
        default=dict,
        blank=True,
        help_text="Search filters (document_type, status, author, etc.)",
    )

    # Sharing
    is_shared = models.BooleanField(
        default=False,
        help_text="Whether this search is shared with others",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.user.email})"


class SearchHistory(UUIDModel, TimeStampedModel):
    """Track user search history for suggestions."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="search_history",
    )
    query = models.CharField(max_length=500)
    result_count = models.IntegerField(default=0)
    filters = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]
        verbose_name_plural = "Search Histories"

    def __str__(self) -> str:
        return f"{self.query} ({self.result_count} results)"
