"""Admin configuration for search module."""

from django.contrib import admin

from search.models import SavedSearch, SearchHistory


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    """Admin interface for SavedSearch."""

    list_display = [
        "name",
        "user",
        "query",
        "is_shared",
        "created_at",
    ]
    list_filter = ["is_shared", "created_at"]
    search_fields = ["name", "query", "user__email"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    """Admin interface for SearchHistory."""

    list_display = [
        "user",
        "query",
        "result_count",
        "created_at",
    ]
    list_filter = ["created_at"]
    search_fields = ["query", "user__email"]
    readonly_fields = ["id", "created_at"]
    date_hierarchy = "created_at"
