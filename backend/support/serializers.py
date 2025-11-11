"""Serializers for support content and tickets."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import FaqEntry, HelpGuide, SupportTicket


class HelpGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpGuide
        fields = [
            "id",
            "slug",
            "title",
            "category",
            "audience",
            "summary",
            "content",
            "tags",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class FaqEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqEntry
        fields = [
            "id",
            "question",
            "answer",
            "category",
            "order",
            "tags",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SupportTicketSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        source="created_by",
        queryset=SupportTicket._meta.get_field("created_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=SupportTicket._meta.get_field("assigned_to").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "subject",
            "description",
            "status",
            "priority",
            "created_by",
            "created_by_id",
            "assigned_to",
            "assigned_to_id",
            "resolution_notes",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "assigned_to", "resolved_at", "created_at", "updated_at"]
