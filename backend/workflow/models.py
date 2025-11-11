"""Workflow and approval models."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class WorkflowTemplate(UUIDModel, TimeStampedModel):
    """Reusable workflow definition for documents or correspondence."""

    class AppliesTo(models.TextChoices):
        DOCUMENT = "document", "Document"
        CORRESPONDENCE = "correspondence", "Correspondence"

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    applies_to = models.CharField(max_length=32, choices=AppliesTo.choices)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="workflow_templates_created",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class WorkflowStep(UUIDModel, TimeStampedModel):
    """Individual approval or review step within a template."""

    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    required_role = models.CharField(max_length=100, blank=True)
    required_grade_level = models.CharField(max_length=50, blank=True)
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workflow_steps",
    )
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workflow_steps",
    )
    requires_all_assistants = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        unique_together = ("template", "order")

    def __str__(self) -> str:
        return f"{self.template.name} - Step {self.order}"


class ApprovalTask(UUIDModel, TimeStampedModel):
    """Actionable task assigned to a user as part of a workflow."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in-progress", "In Progress"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"

    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )
    step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )
    document = models.ForeignKey(
        "dms.Document",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="approval_tasks",
    )
    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="approval_tasks",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_tasks",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]


class TaskAction(UUIDModel, TimeStampedModel):
    """Audit trail for actions taken on a task."""

    class Action(models.TextChoices):
        ASSIGNED = "assigned", "Assigned"
        STARTED = "started", "Started"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"
        COMMENTED = "commented", "Commented"

    task = models.ForeignKey(ApprovalTask, on_delete=models.CASCADE, related_name="actions")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="task_actions",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
