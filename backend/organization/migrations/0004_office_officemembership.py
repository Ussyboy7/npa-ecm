# Generated manually to introduce Office and OfficeMembership models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("organization", "0003_role"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Office",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                ("code", models.CharField(max_length=64, unique=True)),
                (
                    "office_type",
                    models.CharField(
                        choices=[
                            ("md", "Managing Director"),
                            ("ed", "Executive Director"),
                            ("gm", "General Manager"),
                            ("agm", "Assistant General Manager"),
                            ("directorate", "Directorate Office"),
                            ("division", "Division Office"),
                            ("department", "Department Office"),
                            ("unit", "Unit / Section"),
                            ("registry", "Registry / Secretariat"),
                            ("project", "Programme / Project Office"),
                            ("custom", "Custom Office"),
                        ],
                        default="custom",
                        max_length=32,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "allow_external_intake",
                    models.BooleanField(
                        default=True,
                        help_text="If disabled, registry cannot register inbound correspondence directly to this office.",
                    ),
                ),
                (
                    "allow_lateral_routing",
                    models.BooleanField(
                        default=True,
                        help_text="Controls whether this office can route items to peer offices at the same tier.",
                    ),
                ),
                (
                    "department",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="offices",
                        to="organization.department",
                    ),
                ),
                (
                    "directorate",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="offices",
                        to="organization.directorate",
                    ),
                ),
                (
                    "division",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="offices",
                        to="organization.division",
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="children",
                        to="organization.office",
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="OfficeMembership",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "assignment_role",
                    models.CharField(
                        choices=[
                            ("principal", "Principal / Office Head"),
                            ("acting", "Acting Head"),
                            ("staff", "Staff Officer"),
                            ("secretariat", "Secretariat / PA / TA"),
                            ("registry", "Registry"),
                            ("support", "Support"),
                        ],
                        default="staff",
                        max_length=20,
                    ),
                ),
                ("is_primary", models.BooleanField(default=False, help_text="True when this membership is the user's primary posting.")),
                ("can_register", models.BooleanField(default=False)),
                ("can_route", models.BooleanField(default=True)),
                ("can_approve", models.BooleanField(default=False)),
                ("starts_at", models.DateField(blank=True, null=True)),
                ("ends_at", models.DateField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "office",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="organization.office",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="office_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["office__name", "user__username"]},
        ),
        migrations.AlterUniqueTogether(
            name="officemembership",
            unique_together={("office", "user", "assignment_role")},
        ),
    ]
