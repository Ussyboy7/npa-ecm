# Generated manually for executive calendar events

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0046_externalentity"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organization", "0008_rename_org_dept_name_idx_organizatio_name_93bf26_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExecutiveCalendarEvent",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("location", models.CharField(blank=True, max_length=255)),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("meeting", "Meeting"),
                            ("reminder", "Reminder"),
                            ("deadline", "Deadline"),
                        ],
                        default="meeting",
                        max_length=20,
                    ),
                ),
                ("starts_at", models.DateTimeField(db_index=True)),
                ("ends_at", models.DateTimeField()),
                (
                    "correspondence",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="calendar_events",
                        to="correspondence.correspondence",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="calendar_events_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "executive",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="executive_calendar_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["starts_at"],
            },
        ),
        migrations.AddIndex(
            model_name="executivecalendarevent",
            index=models.Index(fields=["executive", "starts_at"], name="org_cal_exec_start_idx"),
        ),
    ]
