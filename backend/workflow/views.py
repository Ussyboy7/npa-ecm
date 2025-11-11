"""Viewsets for workflow management."""

from __future__ import annotations

from django.utils.text import slugify
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

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
        serializer.save(actor=self.request.user)
