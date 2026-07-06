# Generated manually for Phase 5 enterprise connectors

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0045_correspondence_records_governance"),
        ("dms", "0001_initial"),
        ("integrations", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailconnector",
            name="imap_folder",
            field=models.CharField(blank=True, default="INBOX", max_length=128),
        ),
        migrations.AddField(
            model_name="emailconnector",
            name="last_synced_uid",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="emailconnector",
            name="sync_state",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Tracks processed Message-IDs and last poll metadata",
            ),
        ),
        migrations.AddField(
            model_name="erpconnector",
            name="last_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="integrationlog",
            name="log_type",
            field=models.CharField(
                choices=[
                    ("webhook", "Webhook"),
                    ("email", "Email"),
                    ("erp", "ERP"),
                    ("hrms", "HRMS"),
                    ("sso", "SSO"),
                ],
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="HRMSConnector",
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
                ("base_url", models.URLField(help_text="HRMS API base URL")),
                ("api_key", models.CharField(blank=True, max_length=255)),
                ("username", models.CharField(blank=True, max_length=255)),
                ("password", models.CharField(blank=True, max_length=255)),
                (
                    "staff_endpoint",
                    models.CharField(
                        default="/api/staff",
                        help_text="Relative path for staff roster",
                        max_length=255,
                    ),
                ),
                (
                    "org_endpoint",
                    models.CharField(
                        blank=True,
                        default="/api/organization",
                        help_text="Optional path for directorate/division/department sync",
                        max_length=255,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("sync_enabled", models.BooleanField(default=False)),
                ("sync_interval_minutes", models.IntegerField(default=360)),
                (
                    "deactivate_exited_staff",
                    models.BooleanField(
                        default=True,
                        help_text="Set is_active=False when HRMS reports exited/terminated staff",
                    ),
                ),
                ("field_mappings", models.JSONField(blank=True, default=dict)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="ERPSyncRecord",
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
                ("external_id", models.CharField(db_index=True, max_length=255)),
                ("payload_snapshot", models.JSONField(blank=True, default=dict)),
                ("last_synced_at", models.DateTimeField(auto_now=True)),
                (
                    "connector",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sync_records",
                        to="integrations.erpconnector",
                    ),
                ),
                (
                    "correspondence",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="erp_sync_records",
                        to="correspondence.correspondence",
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="erp_sync_records",
                        to="dms.document",
                    ),
                ),
            ],
            options={
                "ordering": ["-last_synced_at"],
                "unique_together": {("connector", "external_id")},
            },
        ),
    ]
