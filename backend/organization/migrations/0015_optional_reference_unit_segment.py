"""Allow four-part references by making the unit segment optional.

The MD directorate issues ``HQ/MD/AD/001``: its authority segment already
identifies the unit, so repeating ``MD`` as the unit segment was redundant.
"""

from django.db import migrations, models


def clear_duplicate_md_unit(apps, schema_editor):
    ReferenceScheme = apps.get_model("organization", "ReferenceScheme")
    ReferenceScheme.objects.filter(
        scope_type="directorate",
        authority_code="MD",
        unit_code="MD",
    ).update(unit_code="")


class Migration(migrations.Migration):
    dependencies = [
        ("organization", "0014_seed_reference_schemes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="referencescheme",
            name="unit_code",
            field=models.CharField(
                blank=True,
                help_text="Unit segment, e.g. ICT, SA&DM. Leave blank to omit it (e.g. HQ/MD/AD/001).",
                max_length=32,
            ),
        ),
        migrations.RunPython(clear_duplicate_md_unit, migrations.RunPython.noop),
    ]
