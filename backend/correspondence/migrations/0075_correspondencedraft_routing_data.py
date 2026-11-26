from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0074_memo_templates_spaced_headers"),
    ]

    operations = [
        migrations.AddField(
            model_name="correspondencedraft",
            name="routing_data",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Routing choices for treatment drafts (route type, office, "
                    "parallel assignments, purpose)"
                ),
            ),
        ),
    ]
