"""Admin registrations for workflow models."""

from django.contrib import admin

from .models import ApprovalTask, TaskAction, WorkflowStep, WorkflowTemplate


class WorkflowStepInline(admin.TabularInline):
    model = WorkflowStep
    extra = 0


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "applies_to", "is_active")
    list_filter = ("applies_to", "is_active")
    search_fields = ("name", "slug")
    inlines = [WorkflowStepInline]


@admin.register(WorkflowStep)
class WorkflowStepAdmin(admin.ModelAdmin):
    list_display = ("template", "order", "title", "required_role")
    list_filter = ("template",)
    ordering = ("template", "order")


class TaskActionInline(admin.TabularInline):
    model = TaskAction
    extra = 0


@admin.register(ApprovalTask)
class ApprovalTaskAdmin(admin.ModelAdmin):
    list_display = ("assignee", "status", "document", "correspondence", "due_date")
    list_filter = ("status",)
    inlines = [TaskActionInline]


@admin.register(TaskAction)
class TaskActionAdmin(admin.ModelAdmin):
    list_display = ("task", "actor", "action", "created_at")
