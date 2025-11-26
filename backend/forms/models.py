"""Forms and templates models."""

from __future__ import annotations

import json

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from common.models import SoftDeleteModel, TimeStampedModel, UUIDModel


class FormTemplate(UUIDModel, SoftDeleteModel, TimeStampedModel):
    """Template definition for reusable forms."""

    class Category(models.TextChoices):
        PROCUREMENT = "procurement", "Procurement"
        AUDIT = "audit", "Audit"
        FINANCE = "finance", "Finance"
        GENERAL = "general", "General"

    class FieldType(models.TextChoices):
        TEXT = "text", "Text"
        TEXTAREA = "textarea", "Textarea"
        NUMBER = "number", "Number"
        DATE = "date", "Date"
        DATETIME = "datetime", "DateTime"
        SELECT = "select", "Select"
        MULTISELECT = "multiselect", "Multi-Select"
        CHECKBOX = "checkbox", "Checkbox"
        RADIO = "radio", "Radio"
        FILE = "file", "File"
        EMAIL = "email", "Email"
        URL = "url", "URL"
        CURRENCY = "currency", "Currency"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.GENERAL)
    is_active = models.BooleanField(default=True)
    
    # JSON field storing the form structure (fields, validation rules, etc.)
    # Structure: {
    #   "fields": [
    #     {
    #       "id": "field_1",
    #       "name": "field_name",
    #       "label": "Field Label",
    #       "type": "text",
    #       "required": true,
    #       "placeholder": "Enter value...",
    #       "validation": {...},
    #       "options": [...]  # for select/radio/multiselect
    #     }
    #   ],
    #   "sections": [...],  # optional grouping
    #   "layout": "single" | "multi-column"
    # }
    structure = models.JSONField(default=dict)
    
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_form_templates",
    )

    class Meta:
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class FormSubmission(UUIDModel, TimeStampedModel):
    """A submitted form instance linked to a correspondence."""

    template = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    correspondence = models.ForeignKey(
        "correspondence.Correspondence",
        on_delete=models.CASCADE,
        related_name="form_submissions",
        null=True,
        blank=True,
    )
    
    # JSON field storing the submitted form data
    # Structure matches the template's field structure:
    # {
    #   "field_1": "value",
    #   "field_2": ["option1", "option2"],
    #   ...
    # }
    data = models.JSONField(default=dict)
    
    # Status tracking
    is_draft = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    submitted_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="form_submissions",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["correspondence", "template"]),
            models.Index(fields=["is_draft", "submitted_at"]),
        ]

    def __str__(self):
        status = "Draft" if self.is_draft else "Submitted"
        return f"{self.template.name} - {status}"

    def submit(self, user=None):
        """Mark the form as submitted."""
        from django.utils import timezone
        
        self.is_draft = False
        self.submitted_at = timezone.now()
        if user:
            self.submitted_by = user
        self.save()
    
    def get_signature_workflow(self):
        """Get the active signature workflow for this submission."""
        return self.signature_workflows.filter(
            status__in=["pending", "in_progress"]
        ).first()
    
    def requires_signatures(self):
        """Check if this form template requires signatures."""
        structure = self.template.structure or {}
        fields = structure.get("fields", [])
        return any(field.get("type") == "file" and "signature" in field.get("name", "").lower() for field in fields)
