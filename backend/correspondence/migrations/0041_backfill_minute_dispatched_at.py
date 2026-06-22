from django.db import migrations


def backfill_dispatched_at(apps, schema_editor):
    """Set dispatched_at = timestamp for all minutes that don't have it."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE correspondence_minute SET dispatched_at = timestamp WHERE dispatched_at IS NULL"
        )


def reverse_backfill(apps, schema_editor):
    """Reverse migration."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE correspondence_minute SET dispatched_at = NULL"
        )


class Migration(migrations.Migration):

    dependencies = [
        ('correspondence', '0040_minute_dispatch_ack_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_dispatched_at, reverse_backfill),
    ]
