"""Serializers for correspondence workflows."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from organization.models import Department, Division, Directorate

from .models import (
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    Delegation,
    Minute,
)


class CorrespondenceDocumentLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrespondenceDocumentLink
        fields = ["id", "correspondence", "document", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CorrespondenceAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrespondenceAttachment
        fields = [
            "id",
            "correspondence",
            "file_name",
            "file_type",
            "file_size",
            "file_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CorrespondenceDistributionSerializer(serializers.ModelSerializer):
    directorate = serializers.PrimaryKeyRelatedField(
        queryset=Directorate.objects.all(), allow_null=True, required=False
    )
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    added_by = UserSerializer(read_only=True)
    directorate_name = serializers.CharField(source="directorate.name", read_only=True)
    division_name = serializers.CharField(source="division.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    added_by_id = serializers.PrimaryKeyRelatedField(
        source="added_by",
        queryset=CorrespondenceDistribution._meta.get_field("added_by").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = CorrespondenceDistribution
        fields = [
            "id",
            "correspondence",
            "recipient_type",
            "directorate",
            "division",
            "department",
            "added_by",
            "added_by_id",
            "purpose",
            "directorate_name",
            "division_name",
            "department_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "added_by", "created_at", "updated_at"]


class MinuteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=Minute._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
    )
    mentions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Minute._meta.get_field("mentions").remote_field.model.objects.all(),
        required=False,
    )

    class Meta:
        model = Minute
        fields = [
            "id",
            "correspondence",
            "user",
            "user_id",
            "grade_level",
            "action_type",
            "minute_text",
            "direction",
            "step_number",
            "timestamp",
            "acted_by_secretary",
            "acted_by_assistant",
            "assistant_type",
            "read_at",
            "mentions",
            "signature_payload",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "timestamp", "created_at", "updated_at"]


class CorrespondenceSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        source="created_by",
        queryset=Correspondence._meta.get_field("created_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    current_approver = UserSerializer(read_only=True)
    current_approver_id = serializers.PrimaryKeyRelatedField(
        source="current_approver",
        queryset=Correspondence._meta.get_field("current_approver").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    attachments = CorrespondenceAttachmentSerializer(many=True, read_only=True)
    distribution = CorrespondenceDistributionSerializer(many=True, read_only=True)
    minutes = MinuteSerializer(many=True, read_only=True)
    linked_document_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        source="linked_documents",
        queryset=Correspondence._meta.get_field("linked_documents").remote_field.model.objects.all(),
        required=False,
    )

    class Meta:
        model = Correspondence
        fields = [
            "id",
            "reference_number",
            "subject",
            "summary",
            "body_html",
            "source",
            "received_date",
            "sender_name",
            "sender_organization",
            "status",
            "priority",
            "direction",
            "archive_level",
            "division",
            "department",
            "tags",
            "created_by",
            "created_by_id",
            "current_approver",
            "current_approver_id",
            "linked_document_ids",
            "attachments",
            "distribution",
            "minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "current_approver",
            "attachments",
            "distribution",
            "minutes",
            "created_at",
            "updated_at",
        ]


class DelegationSerializer(serializers.ModelSerializer):
    principal = UserSerializer(read_only=True)
    principal_id = serializers.PrimaryKeyRelatedField(
        source="principal",
        queryset=Delegation._meta.get_field("principal").remote_field.model.objects.all(),
        write_only=True,
    )
    assistant = UserSerializer(read_only=True)
    assistant_id = serializers.PrimaryKeyRelatedField(
        source="assistant",
        queryset=Delegation._meta.get_field("assistant").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Delegation
        fields = [
            "id",
            "principal",
            "principal_id",
            "assistant",
            "assistant_id",
            "can_approve",
            "can_minute",
            "can_forward",
            "active",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "principal", "assistant", "created_at", "updated_at"]
