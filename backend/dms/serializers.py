"""Serializers for the document management system."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from organization.models import Department, Division

from .models import (
    Document,
    DocumentAccessLog,
    DocumentComment,
    DocumentDiscussionMessage,
    DocumentEditorSession,
    DocumentPermission,
    DocumentVersion,
    DocumentWorkspace,
)


class DocumentWorkspaceSerializer(serializers.ModelSerializer):
    member_ids = serializers.PrimaryKeyRelatedField(
        source="members",
        many=True,
        queryset=DocumentWorkspace._meta.get_field("members").remote_field.model.objects.all(),
        required=False,
    )

    class Meta:
        model = DocumentWorkspace
        fields = ["id", "slug", "name", "description", "color", "member_ids", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    uploaded_by_id = serializers.PrimaryKeyRelatedField(
        source="uploaded_by",
        queryset=DocumentVersion._meta.get_field("uploaded_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = DocumentVersion
        fields = [
            "id",
            "document",
            "version_number",
            "file_name",
            "file_type",
            "file_size",
            "file_url",
            "content_html",
            "content_json",
            "content_text",
            "ocr_text",
            "summary",
            "uploaded_by",
            "uploaded_by_id",
            "uploaded_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "version_number",
            "uploaded_by",
            "uploaded_at",
            "content_text",
            "summary",
            "created_at",
            "updated_at",
        ]


class DocumentPermissionSerializer(serializers.ModelSerializer):
    division_ids = serializers.PrimaryKeyRelatedField(
        source="divisions",
        many=True,
        queryset=Division.objects.all(),
        required=False,
    )
    department_ids = serializers.PrimaryKeyRelatedField(
        source="departments",
        many=True,
        queryset=Department.objects.all(),
        required=False,
    )
    user_ids = serializers.PrimaryKeyRelatedField(
        source="users",
        many=True,
        queryset=DocumentPermission._meta.get_field("users").remote_field.model.objects.all(),
        required=False,
    )

    class Meta:
        model = DocumentPermission
        fields = [
            "id",
            "document",
            "access",
            "division_ids",
            "department_ids",
            "grade_levels",
            "user_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DocumentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        source="author",
        queryset=Document._meta.get_field("author").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    permissions = DocumentPermissionSerializer(many=True, read_only=True)
    workspace_ids = serializers.PrimaryKeyRelatedField(
        source="workspaces",
        many=True,
        queryset=DocumentWorkspace.objects.all(),
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "description",
            "document_type",
            "reference_number",
            "status",
            "sensitivity",
            "author",
            "author_id",
            "division",
            "department",
            "tags",
            "workspace_ids",
            "versions",
            "permissions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "versions", "permissions", "created_at", "updated_at"]


class DocumentCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        source="author",
        queryset=DocumentComment._meta.get_field("author").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = DocumentComment
        fields = [
            "id",
            "document",
            "version",
            "parent",
            "author",
            "author_id",
            "content",
            "resolved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class DocumentDiscussionMessageSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        source="author",
        queryset=DocumentDiscussionMessage._meta.get_field("author").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = DocumentDiscussionMessage
        fields = [
            "id",
            "document",
            "author",
            "author_id",
            "message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class DocumentAccessLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=DocumentAccessLog._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = DocumentAccessLog
        fields = [
            "id",
            "document",
            "user",
            "user_id",
            "action",
            "sensitivity",
            "timestamp",
        ]
        read_only_fields = ["id", "user", "timestamp"]


class DocumentEditorSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=DocumentEditorSession._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = DocumentEditorSession
        fields = [
            "id",
            "document",
            "user",
            "user_id",
            "since",
            "note",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "since", "created_at", "updated_at"]
