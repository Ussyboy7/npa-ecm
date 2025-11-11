"""Serializers for workflow templates and tasks."""

from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer
from organization.models import Department, Division

from .models import ApprovalTask, TaskAction, WorkflowStep, WorkflowTemplate


class WorkflowStepSerializer(serializers.ModelSerializer):
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.all(), allow_null=True, required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=True, required=False)

    class Meta:
        model = WorkflowStep
        fields = [
            "id",
            "template",
            "order",
            "title",
            "required_role",
            "required_grade_level",
            "division",
            "department",
            "requires_all_assistants",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        source="created_by",
        queryset=WorkflowTemplate._meta.get_field("created_by").remote_field.model.objects.all(),
        write_only=True,
        required=False,
    )
    steps = WorkflowStepSerializer(many=True, read_only=True)

    class Meta:
        model = WorkflowTemplate
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "applies_to",
            "is_active",
            "created_by",
            "created_by_id",
            "steps",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "steps", "created_at", "updated_at"]


class TaskActionSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    actor_id = serializers.PrimaryKeyRelatedField(
        source="actor",
        queryset=TaskAction._meta.get_field("actor").remote_field.model.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = TaskAction
        fields = [
            "id",
            "task",
            "actor",
            "actor_id",
            "action",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "actor", "created_at", "updated_at"]


class ApprovalTaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        source="assignee",
        queryset=ApprovalTask._meta.get_field("assignee").remote_field.model.objects.all(),
        write_only=True,
    )
    actions = TaskActionSerializer(many=True, read_only=True)

    class Meta:
        model = ApprovalTask
        fields = [
            "id",
            "template",
            "step",
            "document",
            "correspondence",
            "assignee",
            "assignee_id",
            "status",
            "due_date",
            "completed_at",
            "remarks",
            "actions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "assignee", "actions", "created_at", "updated_at"]
