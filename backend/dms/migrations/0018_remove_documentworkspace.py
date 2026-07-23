# Manually written — remove DocumentWorkspace model and workspaces M2M field

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dms", "0017_strip_html_from_descriptions"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="document",
            name="workspaces",
        ),
        migrations.DeleteModel(
            name="DocumentWorkspace",
        ),
    ]
