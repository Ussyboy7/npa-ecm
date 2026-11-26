"""Acknowledge legacy additional minutes.

Additional minutes ("notes") were recipient-less rows: nothing ever marked them
opened, so ``acknowledged_at`` stayed null and they permanently blocked
``complete`` (every active minute must be acknowledged). The feature is gone;
these rows stay in the trail, but they no longer gate completion.
"""

from django.db import migrations
from django.db.models import F


def acknowledge_notes(apps, schema_editor):
    Minute = apps.get_model("correspondence", "Minute")
    (
        Minute.objects.filter(is_recalled=False, is_additional=True)
        .filter(acknowledged_at__isnull=True)
        .update(acknowledged_at=F("timestamp"))
    )


def unacknowledge_notes(apps, schema_editor):
    # Not reversible: rows acknowledged before this migration cannot be told
    # apart from rows it stamped.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0079_merge_0076_0078"),
    ]

    operations = [
        migrations.RunPython(acknowledge_notes, unacknowledge_notes),
    ]
