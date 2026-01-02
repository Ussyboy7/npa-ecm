# Generated migration for Case/File Management module

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0017_add_parent_correspondence"),
        ("organization", "0001_initial"),  # Adjust if needed
        ("dms", "0001_initial"),  # Adjust if needed
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Create Case model
        migrations.CreateModel(
            name="Case",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("case_number", models.CharField(db_index=True, help_text="Unique case reference number", max_length=100, unique=True)),
                ("title", models.CharField(help_text="Case title/summary", max_length=500)),
                ("description", models.TextField(blank=True, help_text="Detailed case description")),
                ("case_type", models.CharField(choices=[("complaint", "Complaint"), ("request", "Request"), ("inquiry", "Inquiry"), ("project", "Project"), ("legal", "Legal"), ("audit", "Audit"), ("general", "General")], default="general", max_length=32)),
                ("status", models.CharField(choices=[("open", "Open"), ("in_progress", "In Progress"), ("resolved", "Resolved"), ("closed", "Closed"), ("archived", "Archived")], default="open", max_length=20)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("urgent", "Urgent")], default="medium", max_length=20)),
                ("tags", models.JSONField(blank=True, default=list)),
                ("metadata", models.JSONField(blank=True, default=dict, help_text="Additional case metadata")),
                ("opened_at", models.DateTimeField(auto_now_add=True, help_text="When case was opened")),
                ("resolved_at", models.DateTimeField(blank=True, help_text="When case was resolved", null=True)),
                ("closed_at", models.DateTimeField(blank=True, help_text="When case was closed", null=True)),
                ("completion_package_generated_at", models.DateTimeField(blank=True, null=True)),
                ("department", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cases", to="organization.department")),
                ("division", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cases", to="organization.division")),
                ("owning_office", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="owned_cases", to="organization.office")),
                ("current_office", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="active_cases", to="organization.office")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cases_created", to=settings.AUTH_USER_MODEL)),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cases_assigned", to=settings.AUTH_USER_MODEL)),
                ("completion_package", models.ForeignKey(blank=True, help_text="Auto-generated completion package document", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="case_completion_packages", to="dms.document")),
            ],
            options={
                "verbose_name": "Case",
                "verbose_name_plural": "Cases",
                "ordering": ["-opened_at"],
            },
        ),
        # Create indexes for Case
        migrations.AddIndex(
            model_name="case",
            index=models.Index(fields=["case_number"], name="correspondence_case_number_idx"),
        ),
        migrations.AddIndex(
            model_name="case",
            index=models.Index(fields=["status", "-opened_at"], name="correspondence_case_status_opened_idx"),
        ),
        migrations.AddIndex(
            model_name="case",
            index=models.Index(fields=["case_type", "status"], name="correspondence_case_type_status_idx"),
        ),
        migrations.AddIndex(
            model_name="case",
            index=models.Index(fields=["assigned_to", "status"], name="correspondence_case_assigned_status_idx"),
        ),
        migrations.AddIndex(
            model_name="case",
            index=models.Index(fields=["owning_office", "status"], name="correspondence_case_owning_office_status_idx"),
        ),
        migrations.AddIndex(
            model_name="case",
            index=models.Index(fields=["is_deleted", "-opened_at"], name="correspondence_case_is_deleted_opened_idx"),
        ),
        # Create CaseCorrespondenceLink model
        migrations.CreateModel(
            name="CaseCorrespondenceLink",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_primary", models.BooleanField(default=False, help_text="True if this is the correspondence that triggered the case")),
                ("notes", models.TextField(blank=True, help_text="Notes about this link")),
                ("case", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="correspondence_links", to="correspondence.case")),
                ("correspondence", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="case_links", to="correspondence.correspondence")),
            ],
        ),
        migrations.AddIndex(
            model_name="casecorrespondencelink",
            index=models.Index(fields=["case", "is_primary"], name="correspondence_case_corr_case_primary_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="casecorrespondencelink",
            unique_together={("case", "correspondence")},
        ),
        # Create CaseDocumentLink model
        migrations.CreateModel(
            name="CaseDocumentLink",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("notes", models.TextField(blank=True, help_text="Notes about this link")),
                ("case", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="document_links", to="correspondence.case")),
                ("document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="case_links", to="dms.document")),
            ],
        ),
        migrations.AddIndex(
            model_name="casedocumentlink",
            index=models.Index(fields=["case"], name="correspondence_case_doc_case_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="casedocumentlink",
            unique_together={("case", "document")},
        ),
        # Create CaseFormLink model
        migrations.CreateModel(
            name="CaseFormLink",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("notes", models.TextField(blank=True, help_text="Notes about this link")),
                ("case", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="form_links", to="correspondence.case")),
                ("form_document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="case_links", to="dms.formdocument")),
            ],
        ),
        migrations.AddIndex(
            model_name="caseformlink",
            index=models.Index(fields=["case"], name="correspondence_case_form_case_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="caseformlink",
            unique_together={("case", "form_document")},
        ),
        # Add case field to Correspondence
        migrations.AddField(
            model_name="correspondence",
            name="case",
            field=models.ForeignKey(
                blank=True,
                help_text="Case/File this correspondence belongs to",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="correspondence",
                to="correspondence.case",
            ),
        ),
    ]

