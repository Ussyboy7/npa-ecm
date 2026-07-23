# Generated manually for Document.role

from django.db import migrations, models


def backfill_roles(apps, schema_editor):
    """Backfill existing documents linked to correspondence as PRIMARY."""
    Document = apps.get_model("dms", "Document")
    Document.objects.all().update(role="primary")


class Migration(migrations.Migration):

    dependencies = [
        ("dms", "0015_alter_documentrightspolicy_view_only"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="role",
            field=models.CharField(
                choices=[("primary", "Primary"), ("attachment", "Attachment")],
                default="primary",
                max_length=32,
            ),
        ),
        migrations.RunPython(backfill_roles, reverse_code=migrations.RunPython.noop),
    ]
