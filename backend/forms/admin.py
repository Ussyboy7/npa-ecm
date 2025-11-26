"""Admin configuration for forms app."""

from django.contrib import admin
from forms.models import FormTemplate, FormSubmission
from forms.signature_models import FormSignatureWorkflow, FormSignature


@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "is_active", "created_by", "created_at"]
    list_filter = ["category", "is_active", "created_at"]
    search_fields = ["name", "slug", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ["template", "correspondence", "is_draft", "submitted_by", "submitted_at", "created_at"]
    list_filter = ["is_draft", "submitted_at", "created_at"]
    search_fields = ["template__name", "correspondence__reference_number"]
    readonly_fields = ["id", "created_at", "updated_at", "submitted_at"]


@admin.register(FormSignatureWorkflow)
class FormSignatureWorkflowAdmin(admin.ModelAdmin):
    list_display = ["submission", "status", "routing_mode", "current_step", "total_steps", "initiated_by", "created_at"]
    list_filter = ["status", "routing_mode", "created_at"]
    search_fields = ["submission__template__name"]
    readonly_fields = ["id", "created_at", "updated_at", "completed_at"]


@admin.register(FormSignature)
class FormSignatureAdmin(admin.ModelAdmin):
    list_display = ["workflow", "field_label", "status", "assigned_to_office", "assigned_to_department", "order", "signed_at"]
    list_filter = ["status", "assigned_to_office", "assigned_to_department", "created_at"]
    search_fields = ["field_label", "signer_name", "signer_pn"]
    readonly_fields = ["id", "created_at", "updated_at", "signed_at"]
