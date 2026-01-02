# Generated manually for DocumentTemplate model

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organization", "0001_initial"),
        ("dms", "0011_add_parent_document"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentTemplate",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="Template name",
                        max_length=255,
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        blank=True,
                        help_text="Template description",
                    ),
                ),
                (
                    "document_type",
                    models.CharField(
                        choices=[
                            ("letter", "Letter"),
                            ("memo", "Memo"),
                            ("circular", "Circular"),
                            ("policy", "Policy"),
                            ("report", "Report"),
                            ("form", "Form"),
                            ("other", "Other"),
                        ],
                        help_text="Default document type for this template",
                        max_length=32,
                    ),
                ),
                (
                    "default_status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("published", "Published"),
                            ("archived", "Archived"),
                        ],
                        default="draft",
                        help_text="Default status for documents created from this template",
                        max_length=32,
                    ),
                ),
                (
                    "default_sensitivity",
                    models.CharField(
                        choices=[
                            ("public", "Public"),
                            ("internal", "Internal"),
                            ("confidential", "Confidential"),
                            ("restricted", "Restricted"),
                        ],
                        default="internal",
                        help_text="Default sensitivity level for documents created from this template",
                        max_length=32,
                    ),
                ),
                (
                    "default_tags",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Default tags to apply to documents created from this template",
                    ),
                ),
                (
                    "template_content",
                    models.TextField(
                        blank=True,
                        help_text="Template content/structure (can be HTML, markdown, or plain text)",
                    ),
                ),
                (
                    "template_metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Additional template metadata (custom fields, placeholders, etc.)",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this template is active and available for use",
                    ),
                ),
                (
                    "usage_count",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Number of times this template has been used",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        help_text="User who created this template",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="document_templates_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "default_department",
                    models.ForeignKey(
                        blank=True,
                        help_text="Default department for documents created from this template",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="organization.department",
                    ),
                ),
                (
                    "default_division",
                    models.ForeignKey(
                        blank=True,
                        help_text="Default division for documents created from this template",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="organization.division",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
                "indexes": [
                    models.Index(
                        fields=["is_active", "document_type"],
                        name="dms_doctempl_is_acti_123abc_idx",
                    ),
                    models.Index(
                        fields=["created_by"],
                        name="dms_doctempl_created_456def_idx",
                    ),
                ],
            },
        ),
    ]


