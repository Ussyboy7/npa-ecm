from django.core.files.base import ContentFile
from django.db import migrations
from django.db.models import Q


def backfill_signature_snapshots(apps, schema_editor):
    DocumentSeal = apps.get_model("accounts", "DocumentSeal")

    seals = DocumentSeal.objects.select_related("signature_used").filter(
        Q(signature_image_snapshot="") | Q(signature_image_snapshot__isnull=True)
    )
    for seal in seals.iterator():
        signature = seal.signature_used
        if signature is None or not signature.signature_image:
            continue
        try:
            with signature.signature_image.open("rb") as source:
                seal.signature_image_snapshot.save(
                    f"{seal.serial_number}-signature.png",
                    ContentFile(source.read()),
                    save=True,
                )
        except (OSError, ValueError):
            # A missing source file must not block the migration; the seal
            # endpoint will fall back to the live signature where available.
            continue


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0016_alter_executivesignature_signature_image"),
    ]

    operations = [
        migrations.RunPython(backfill_signature_snapshots, migrations.RunPython.noop),
    ]
