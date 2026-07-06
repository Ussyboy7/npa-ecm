# Generated manually for Phase 3 records governance

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0044_alter_foiarequest_received_date"),
        ("records", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="correspondence",
            name="disposed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="correspondence",
            name="is_on_legal_hold",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="correspondence",
            name="retention_schedule",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="correspondence_items",
                to="records.retentionschedule",
            ),
        ),
    ]
