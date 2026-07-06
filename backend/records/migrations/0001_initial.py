# Generated manually for Phase 3 records governance

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("correspondence", "0044_alter_foiarequest_received_date"),
        ("dms", "0001_initial"),
        ("organization", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RetentionSchedule",
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
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "record_type",
                    models.CharField(
                        choices=[
                            ("correspondence", "Correspondence"),
                            ("document", "Document"),
                            ("all", "All Record Types"),
                        ],
                        default="correspondence",
                        max_length=32,
                    ),
                ),
                ("archive_level", models.CharField(blank=True, max_length=32)),
                ("retention_years", models.PositiveIntegerField(default=7)),
                ("retention_months", models.PositiveIntegerField(default=0)),
                (
                    "disposition_action",
                    models.CharField(
                        choices=[
                            ("review", "Review before disposal"),
                            ("archive", "Permanent archive"),
                            ("delete", "Secure disposal"),
                        ],
                        default="review",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="retention_schedules_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "directorate",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="retention_schedules",
                        to="organization.directorate",
                    ),
                ),
                (
                    "division",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="retention_schedules",
                        to="organization.division",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="LegalHold",
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
                ("name", models.CharField(max_length=255)),
                ("matter_reference", models.CharField(blank=True, max_length=128)),
                ("description", models.TextField(blank=True)),
                ("released_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                (
                    "correspondence_items",
                    models.ManyToManyField(
                        blank=True,
                        related_name="legal_holds",
                        to="correspondence.correspondence",
                    ),
                ),
                (
                    "documents",
                    models.ManyToManyField(
                        blank=True,
                        related_name="legal_holds",
                        to="dms.document",
                    ),
                ),
                (
                    "placed_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="legal_holds_placed",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "released_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="legal_holds_released",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="DisposalRequest",
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
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending Approval"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("completed", "Completed"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("reason", models.TextField(blank=True)),
                ("rejection_reason", models.TextField(blank=True)),
                ("scheduled_disposal_date", models.DateField(blank=True, null=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "correspondence",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="disposal_requests",
                        to="correspondence.correspondence",
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="disposal_requests",
                        to="dms.document",
                    ),
                ),
                (
                    "requested_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="disposal_requests_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="disposal_requests_reviewed",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "retention_schedule",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="disposal_requests",
                        to="records.retentionschedule",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="retentionschedule",
            index=models.Index(
                fields=["is_active", "record_type"],
                name="records_ret_is_acti_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="disposalrequest",
            index=models.Index(
                fields=["status", "created_at"],
                name="records_dis_status_idx",
            ),
        ),
    ]
