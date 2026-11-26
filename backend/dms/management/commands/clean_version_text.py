"""Rewrite stored version text so layout spaces cannot hide memos from search.

Editor HTML keeps typed spacing as non-breaking spaces (U+00A0) and the same
markup carries `&nbsp;` entities. Versions written before text was derived on
save hold those characters in ``content_text`` / ``ocr_text``, which can make a
phrase search miss a memo that reads perfectly on screen.

Dry run by default; pass ``--apply`` to write. Editor-composed versions whose
``content_text`` is empty are filled at the same time, so they become
searchable without anyone pressing Run OCR.
"""

from __future__ import annotations

import uuid

from django.core.management.base import BaseCommand, CommandError

from common.plain_text import normalize_text_spacing, to_plain_text
from dms.models import Document, DocumentVersion


class Command(BaseCommand):
    help = (
        "Normalise DocumentVersion content_text/ocr_text: stored non-breaking "
        "spaces and &nbsp; entities become ordinary spaces, and editor-composed "
        "versions get their content_text derived from content_html. "
        "Dry run unless --apply is given."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write the cleaned text. Without this the command only reports.",
        )
        parser.add_argument(
            "--document",
            default="",
            help="Limit to one document, by UUID or reference number.",
        )

    def handle(self, *args, **options):
        versions = DocumentVersion.objects.only(
            "id", "document_id", "content_html", "content_text", "ocr_text"
        ).order_by("id")
        document_key = (options.get("document") or "").strip()
        if document_key:
            versions = versions.filter(document=self._resolve_document(document_key))

        dry_run = not options["apply"]
        from_html = content_clean = ocr_clean = 0
        pending: list[tuple[str, dict]] = []

        for version in versions.iterator(chunk_size=500):
            content_text = version.content_text or ""
            ocr_text = version.ocr_text or ""
            changes: dict[str, str] = {}

            if (version.content_html or "").strip():
                derived = to_plain_text(version.content_html)
                if derived and derived != content_text:
                    changes["content_text"] = derived
                    from_html += 1
            elif content_text:
                cleaned = normalize_text_spacing(content_text)
                if cleaned != content_text:
                    changes["content_text"] = cleaned
                    content_clean += 1

            if ocr_text:
                cleaned_ocr = normalize_text_spacing(ocr_text)
                if cleaned_ocr != ocr_text:
                    changes["ocr_text"] = cleaned_ocr
                    ocr_clean += 1

            if changes:
                pending.append((str(version.id), changes))

        if pending and not dry_run:
            for version_id, changes in pending:
                DocumentVersion.objects.filter(pk=version_id).update(**changes)

        total = len(pending)
        if not total:
            self.stdout.write(self.style.SUCCESS("Nothing to clean: all version text is normal."))
            return

        verb = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} {total} version(s): "
                f"content_text from HTML={from_html}, "
                f"content_text spacing={content_clean}, "
                f"ocr_text spacing={ocr_clean}."
            )
        )
        if dry_run:
            for version_id, changes in pending[:10]:
                self.stdout.write(f"  {version_id}: {', '.join(sorted(changes))}")
            if total > 10:
                self.stdout.write(f"  … and {total - 10} more")
            self.stdout.write("Dry run: nothing was written. Re-run with --apply to save.")

    def _resolve_document(self, key: str) -> Document:
        if self._is_uuid(key):
            matches = Document.objects.filter(id=key)
        else:
            matches = Document.objects.filter(reference_number__iexact=key)
        count = matches.count()
        if count == 0:
            raise CommandError(f"No document matches {key!r}")
        if count > 1:
            raise CommandError(
                f"{count} documents share reference {key!r}; pass the document UUID instead."
            )
        return matches.first()

    @staticmethod
    def _is_uuid(value: str) -> bool:
        try:
            uuid.UUID(value)
        except (ValueError, AttributeError, TypeError):
            return False
        return True
