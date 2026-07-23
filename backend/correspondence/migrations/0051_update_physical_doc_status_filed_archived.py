# Generated manually

from django.db import migrations


def update_in_storage_to_filed(apps, schema_editor):
    PhysicalDocument = apps.get_model("correspondence", "PhysicalDocument")
    PhysicalDocument.objects.filter(status="in_storage").update(status="filed")


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0050_remove_shelf_cabinet_from_location"),
    ]

    operations = [
        migrations.RunPython(update_in_storage_to_filed, migrations.RunPython.noop),
    ]
