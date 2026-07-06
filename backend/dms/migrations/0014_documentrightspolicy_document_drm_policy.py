# Generated manually for DRM policies

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("dms", "0013_rename_dms_doctempl_is_acti_123abc_idx_dms_documen_is_acti_f6c74a_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentRightsPolicy",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("allow_download", models.BooleanField(default=True)),
                ("allow_print", models.BooleanField(default=True)),
                ("allow_external_share", models.BooleanField(default=False)),
                ("view_only", models.BooleanField(default=False)),
                ("watermark_text", models.CharField(blank=True, max_length=255)),
                ("expires_after_days", models.PositiveIntegerField(blank=True, null=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
            ],
            options={
                "verbose_name_plural": "Document rights policies",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="document",
            name="drm_policy",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="documents",
                to="dms.documentrightspolicy",
            ),
        ),
    ]
