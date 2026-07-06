# Generated manually for Phase 7 external entity directory

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0045_correspondence_records_governance"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExternalEntity",
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
                ("name", models.CharField(db_index=True, max_length=255, unique=True)),
                ("acronym", models.CharField(blank=True, max_length=32)),
                (
                    "entity_type",
                    models.CharField(
                        choices=[
                            ("ministry", "Ministry"),
                            ("agency", "Agency / Parastatal"),
                            ("company", "Private Company"),
                            ("individual", "Individual"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="other",
                        max_length=20,
                    ),
                ),
                ("contact_email", models.EmailField(blank=True, max_length=254)),
                ("contact_phone", models.CharField(blank=True, max_length=32)),
                ("address", models.TextField(blank=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
            ],
            options={
                "verbose_name_plural": "external entities",
                "ordering": ["name"],
            },
        ),
    ]
