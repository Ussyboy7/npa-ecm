# Manually written — strip HTML from existing Document descriptions

import re

from django.db import migrations
from django.utils.html import strip_tags


def strip_html_from_descriptions(apps, schema_editor):
    Document = apps.get_model("dms", "Document")
    for doc in Document.objects.iterator(chunk_size=500):
        if not doc.description:
            continue
        stripped = strip_tags(doc.description).strip()[:500]
        if stripped != doc.description:
            doc.description = stripped
            doc.save(update_fields=["description"])


class Migration(migrations.Migration):

    dependencies = [
        ("dms", "0016_document_role"),
    ]

    operations = [
        migrations.RunPython(strip_html_from_descriptions, reverse_code=migrations.RunPython.noop),
    ]
