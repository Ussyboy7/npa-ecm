# Generated manually for TipTap Phase 3 pilot assignment

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_add_employee_id_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="tiptap_editor_pilot",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "When the editor engine mode is auto, allow this user TipTap. "
                    "Forced deployment modes (legacy/tiptap) take precedence."
                ),
            ),
        ),
    ]
