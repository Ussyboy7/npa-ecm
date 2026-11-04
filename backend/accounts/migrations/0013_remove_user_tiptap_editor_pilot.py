# Generated for TipTap Phase 5 cleanup — pilot flag no longer used

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0012_user_tiptap_editor_pilot"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="tiptap_editor_pilot",
        ),
    ]
