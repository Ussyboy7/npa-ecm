# Generated manually for print access-log actions

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("dms", "0018_remove_documentworkspace"),
    ]

    operations = [
        migrations.AlterField(
            model_name="documentaccesslog",
            name="action",
            field=models.CharField(
                choices=[
                    ("view", "View"),
                    ("download", "Download"),
                    ("attempted-download", "Attempted Download"),
                    ("print", "Print"),
                    ("attempted-print", "Attempted Print"),
                ],
                max_length=32,
            ),
        ),
    ]
