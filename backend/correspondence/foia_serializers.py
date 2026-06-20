"""Serializers for FOIA request management."""

from rest_framework import serializers
from django.contrib.auth import get_user_model

from accounts.serializers import UserSerializer
from .foia_models import FOIARequest, FOIARequestDocument, FOIANote

User = get_user_model()


class FOIANoteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = FOIANote
        fields = [
            "id", "foia_request", "user", "user_id",
            "note", "is_internal", "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]


class FOIARequestDocumentSerializer(serializers.ModelSerializer):
    added_by = UserSerializer(read_only=True)

    class Meta:
        model = FOIARequestDocument
        fields = [
            "id", "foia_request", "document", "is_response",
            "added_by", "created_at",
        ]
        read_only_fields = ["id", "added_by", "created_at"]


class FOIARequestListSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    days_remaining = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = FOIARequest
        fields = [
            "id", "request_number", "requester_name",
            "requester_email", "status", "received_date",
            "deadline_date", "acknowledged_date", "response_date",
            "assigned_to", "assigned_to_id",
            "description_of_documents", "format_preference",
            "fees_assessed", "fees_waived",
            "days_remaining", "is_overdue",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "request_number", "created_at",
            "updated_at", "days_remaining", "is_overdue",
        ]


class FOIARequestDetailSerializer(FOIARequestListSerializer):
    documents = FOIARequestDocumentSerializer(many=True, read_only=True)
    notes_entries = serializers.SerializerMethodField()

    class Meta(FOIARequestListSerializer.Meta):
        fields = FOIARequestListSerializer.Meta.fields + [
            "requester_phone", "requester_address", "organization",
            "request_details", "exemption_reason", "notes",
            "documents", "notes_entries",
        ]

    def get_notes_entries(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        qs = obj.notes_entries.select_related("user").order_by("-created_at")[:50]
        if user and user.is_staff:
            return FOIANoteSerializer(qs, many=True, context=self.context).data
        return FOIANoteSerializer(
            qs.filter(is_internal=False), many=True, context=self.context
        ).data
