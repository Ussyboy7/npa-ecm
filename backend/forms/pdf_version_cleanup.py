"""Helpers for form-document generated PDF versions."""

from __future__ import annotations

COMPLETE_PDF_MIN_BYTES = 50_000


def supersede_incomplete_generated_pdfs(document, *, keep_version_id=None) -> int:
    """
    Mark tiny auto-generated PDF stubs as superseded so the UI ignores them.

    Returns the number of versions updated.
    """
    if document is None:
        return 0

    updated = 0
    qs = document.versions.filter(file_type="application/pdf", file_size__lt=COMPLETE_PDF_MIN_BYTES)
    for version in qs:
        if keep_version_id and str(version.id) == str(keep_version_id):
            continue
        notes = version.notes or ""
        notes_l = notes.lower()
        if "superseded" in notes_l:
            continue
        if not any(token in notes_l for token in ("generated", "regenerated", "auto-generated")):
            continue
        suffix = "[superseded — incomplete render]"
        version.notes = f"{notes} {suffix}".strip() if notes else suffix
        version.save(update_fields=["notes", "updated_at"])
        updated += 1
    return updated
