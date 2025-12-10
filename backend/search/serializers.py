"""Serializers for search module."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from correspondence.serializers import CorrespondenceSerializer
from dms.serializers import DocumentSerializer

from .models import SavedSearch, SearchHistory


class SavedSearchSerializer(serializers.ModelSerializer):
    """Serializer for SavedSearch model."""

    user = UserSerializer(read_only=True)

    class Meta:
        model = SavedSearch
        fields = [
            "id",
            "user",
            "name",
            "description",
            "query",
            "filters",
            "is_shared",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class SearchHistorySerializer(serializers.ModelSerializer):
    """Serializer for SearchHistory model."""

    user = UserSerializer(read_only=True)

    class Meta:
        model = SearchHistory
        fields = [
            "id",
            "user",
            "query",
            "result_count",
            "filters",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]


class SearchRequestSerializer(serializers.Serializer):
    """Serializer for search requests."""

    query = serializers.CharField(required=False, allow_blank=True)
    filters = serializers.JSONField(required=False, default=dict)
    limit = serializers.IntegerField(default=50, min_value=1, max_value=100)
    offset = serializers.IntegerField(default=0, min_value=0)
    search_type = serializers.ChoiceField(
        choices=["documents", "correspondence", "all"],
        default="documents",
    )


class SearchSuggestionRequestSerializer(serializers.Serializer):
    """Serializer for search suggestion requests."""

    query = serializers.CharField(required=True)
    limit = serializers.IntegerField(default=10, min_value=1, max_value=50)

