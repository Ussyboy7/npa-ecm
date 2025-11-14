"""Viewsets for workflow management."""

from __future__ import annotations

from django.utils.text import slugify
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from audit.services import AuditService
from notifications.models import Notification
from notifications.services import NotificationService

from .models import ApprovalTask, TaskAction, WorkflowStep, WorkflowTemplate
from .serializers import (
    ApprovalTaskSerializer,
    TaskActionSerializer,
    WorkflowStepSerializer,
    WorkflowTemplateSerializer,
)


class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    queryset = WorkflowTemplate.objects.prefetch_related("steps")
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["applies_to", "is_active"]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        slug = serializer.validated_data.get("slug")
        if not slug:
            base = slugify(serializer.validated_data.get("name", "workflow")) or "workflow"
            slug = base
            idx = 1
            while WorkflowTemplate.objects.filter(slug=slug).exists():
                slug = f"{base}-{idx}"
                idx += 1
        creator = serializer.validated_data.get("created_by") or self.request.user
        serializer.save(created_by=creator, slug=slug)


class WorkflowStepViewSet(viewsets.ModelViewSet):
    queryset = WorkflowStep.objects.select_related("template", "division", "department")
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["template", "division", "department"]
    ordering_fields = ["order"]
    ordering = ["order"]


class ApprovalTaskViewSet(viewsets.ModelViewSet):
    queryset = ApprovalTask.objects.select_related(
        "template",
        "step",
        "document",
        "correspondence",
        "assignee",
    ).prefetch_related("actions")
    serializer_class = ApprovalTaskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "assignee", "document", "correspondence"]
    ordering_fields = ["created_at", "due_date"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        serializer.save(assignee=self.request.user)


class TaskActionViewSet(viewsets.ModelViewSet):
    queryset = TaskAction.objects.select_related("task", "actor")
    serializer_class = TaskActionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["task", "action"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        action = serializer.save(actor=self.request.user)
        task = action.task
        
        # Create audit log
        from audit.models import ActivityLog
        action_type = ActivityLog.ActionType.WORKFLOW_APPROVED if action.action == TaskAction.Action.APPROVE else ActivityLog.ActionType.WORKFLOW_REJECTED
        AuditService.log_activity(
            user=self.request.user,
            action=action_type,
            object_type="workflow_task",
            object_id=str(task.id),
            object_repr=f"Task {task.id}",
            module="workflow",
            description=f"{action.get_action_display()} workflow task",
            request=self.request,
            metadata={"task_id": str(task.id), "action": action.action},
        )
        
        # Send notification to task assignee if different from actor
        if task.assignee and task.assignee.id != self.request.user.id:
            NotificationService.create_notification(
                recipient=task.assignee,
                title=f"Workflow Task {action.get_action_display()}",
                message=f"{self.request.user.get_full_name() or self.request.user.username} {action.get_action_display().lower()}d a workflow task assigned to you.",
                notification_type=Notification.NotificationType.WORKFLOW,
                priority=Notification.Priority.HIGH if action.action == TaskAction.Action.REJECT else Notification.Priority.NORMAL,
                sender=self.request.user,
                module="workflow",
                related_object_type="workflow_task",
                related_object_id=str(task.id),
                action_url=f"/workflows/tasks/{task.id}",
                action_required=action.action == TaskAction.Action.APPROVE,
            )
