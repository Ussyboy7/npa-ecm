# Generated manually — adds form_data JSONField, makes correspondence nullable,
# and adds REGISTRATION draft type to CorrespondenceDraft.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0051_update_physical_doc_status_filed_archived"),
    ]

    operations = [
        migrations.AlterField(
            model_name="correspondencedraft",
            name="draft_type",
            field=models.CharField(
                choices=[
                    ("minute", "Minute"),
                    ("treatment", "Treatment"),
                    ("registration", "Registration"),
                ],
                help_text="Type of draft (minute, treatment, or registration)",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="correspondencedraft",
            name="correspondence",
            field=models.ForeignKey(
                blank=True,
                help_text="The correspondence this draft is for (nullable for registration drafts)",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="drafts",
                to="correspondence.correspondence",
            ),
        ),
        migrations.AddField(
            model_name="correspondencedraft",
            name="form_data",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="JSON form data for registration drafts",
            ),
        ),
    ]
