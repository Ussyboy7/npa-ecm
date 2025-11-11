"""Serializers for analytics data."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import ReportSnapshot, UsageMetric


class ReportSnapshotSerializer(serializers.ModelSerializer):
    generated_for = UserSerializer(read_only=True)
    generated_for_id = serializers.PrimaryKeyRelatedField(
        source="generated_for",
        queryset=ReportSnapshot._meta.get_field("generated_for").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = ReportSnapshot
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "generated_for",
            "generated_for_id",
            "generated_at",
            "filters",
            "data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "generated_for", "generated_at", "created_at", "updated_at"]


class UsageMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageMetric
        fields = ["id", "metric", "value", "recorded_at", "metadata", "created_at", "updated_at"]
        read_only_fields = ["id", "recorded_at", "created_at", "updated_at"]
