"""Use the printed SA&DM unit segment for the software department scheme."""

from django.db import migrations


def use_sa_dm_segment(apps, schema_editor):
    ReferenceScheme = apps.get_model("organization", "ReferenceScheme")
    ReferenceScheme.objects.filter(
        scope_type="department",
        unit_code="ICTSOFTWARE",
        department__name__icontains="Software Applications",
    ).update(unit_code="SA&DM")


class Migration(migrations.Migration):
    dependencies = [
        ("organization", "0015_optional_reference_unit_segment"),
    ]

    operations = [
        migrations.RunPython(use_sa_dm_segment, migrations.RunPython.noop),
    ]
