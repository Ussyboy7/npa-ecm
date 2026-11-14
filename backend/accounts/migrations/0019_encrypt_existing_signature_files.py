"""Encrypt signature files written before encrypted storage was introduced."""

from django.db import migrations


def encrypt_existing_files(apps, schema_editor):
    fields = (
        ("ExecutiveSignature", "signature_image"),
        ("DocumentSeal", "signature_image_snapshot"),
    )
    for model_name, field_name in fields:
        model = apps.get_model("accounts", model_name)
        for obj in model.objects.all().iterator():
            image = getattr(obj, field_name)
            if not image or not image.name:
                continue
            try:
                # The migration keeps the same name and atomically replaces
                # the file, so a failed conversion leaves the original intact.
                image.storage.encrypt_in_place(image.name)
            except FileNotFoundError:
                # There is no plaintext left to protect when the file is gone.
                continue


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0018_alter_documentseal_signature_image_snapshot_and_more"),
    ]

    operations = [
        migrations.RunPython(encrypt_existing_files, migrations.RunPython.noop),
    ]
