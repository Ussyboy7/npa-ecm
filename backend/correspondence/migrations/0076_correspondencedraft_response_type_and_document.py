from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0075_correspondencedraft_routing_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="correspondencedraft",
            name="response_type",
            field=models.CharField(
                blank=True,
                help_text="Response type for treatment drafts (memo or existing document)",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="correspondencedraft",
            name="selected_document_id",
            field=models.CharField(
                blank=True,
                help_text="Existing DMS document selected for the response draft",
                max_length=64,
            ),
        ),
    ]
