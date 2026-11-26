"""Repair stored version search text once, on every environment.

Editor-composed versions carry their prose in ``content_html``; rows written
before that text was derived on save kept layout non-breaking spaces (U+00A0),
``&nbsp;`` entities — and, before the extractor learned to drop ``<style>``
blocks, the CSS body of the memo template — in ``content_text``. The memo then
reads correctly on screen but a phrase search misses it.

``manage.py clean_version_text --apply`` does the same repair ad hoc; this
migration is what staging and production apply through ``manage.py migrate``
during a deploy, so those databases get the treatment without anyone
remembering to run the command. It is idempotent and batched: a rerun after an
interruption recalculates from the same rules, and no single query holds the
whole table.
"""

from __future__ import annotations

from django.db import migrations

BATCH_SIZE = 500


def _version_text_changes(version, to_plain_text, normalize_text_spacing) -> dict[str, str]:
    """Fields to rewrite for one version, using the same rules as the command."""
    changes: dict[str, str] = {}
    content_text = version.content_text or ""
    ocr_text = version.ocr_text or ""

    if (version.content_html or "").strip():
        derived = to_plain_text(version.content_html)
        if derived and derived != content_text:
            changes["content_text"] = derived
    elif content_text:
        cleaned = normalize_text_spacing(content_text)
        if cleaned != content_text:
            changes["content_text"] = cleaned

    if ocr_text:
        cleaned_ocr = normalize_text_spacing(ocr_text)
        if cleaned_ocr != ocr_text:
            changes["ocr_text"] = cleaned_ocr

    return changes


def backfill_version_text(apps, schema_editor):
    # Imported here so the historical models stay the only schema authority.
    from common.plain_text import normalize_text_spacing, to_plain_text

    DocumentVersion = apps.get_model("dms", "DocumentVersion")
    versions = DocumentVersion.objects.only(
        "id", "content_html", "content_text", "ocr_text"
    ).order_by("id")

    pending: list = []
    for version in versions.iterator(chunk_size=BATCH_SIZE):
        changes = _version_text_changes(version, to_plain_text, normalize_text_spacing)
        if not changes:
            continue
        for field, value in changes.items():
            setattr(version, field, value)
        pending.append(version)
        if len(pending) >= BATCH_SIZE:
            DocumentVersion.objects.bulk_update(pending, ["content_text", "ocr_text"])
            pending.clear()

    if pending:
        DocumentVersion.objects.bulk_update(pending, ["content_text", "ocr_text"])


class Migration(migrations.Migration):
    # Commits per batch; the rewrite is a data repair rather than a schema change.
    atomic = False

    dependencies = [
        ("dms", "0022_documentpermission_directorates"),
    ]

    operations = [
        migrations.RunPython(
            backfill_version_text,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
