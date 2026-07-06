"""Import legacy correspondence or document metadata from CSV."""

from __future__ import annotations

import csv
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from correspondence.models import Correspondence
from dms.models import Document

User = get_user_model()

CORRESPONDENCE_HEADERS = (
    "reference_number",
    "subject",
    "status",
    "source",
    "direction",
    "sender_name",
    "sender_organization",
    "received_date",
    "archive_level",
)

DOCUMENT_HEADERS = (
    "title",
    "reference_number",
    "document_type",
    "status",
    "sensitivity",
    "description",
    "author_username",
)


class Command(BaseCommand):
    help = "Import legacy correspondence or document metadata from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Path to CSV file")
        parser.add_argument(
            "--type",
            choices=["correspondence", "documents"],
            required=True,
            help="Record type to import",
        )
        parser.add_argument("--dry-run", action="store_true", help="Validate only; do not write")
        parser.add_argument(
            "--created-by",
            default="",
            help="Username to set as created_by/author when row omits author",
        )

    def handle(self, *args, **options):
        path = Path(options["file"])
        if not path.exists():
            raise CommandError(f"File not found: {path}")

        created_by = None
        if options["created_by"]:
            created_by = User.objects.filter(username=options["created_by"]).first()
            if not created_by:
                raise CommandError(f"User not found: {options['created_by']}")

        with path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)

        if options["type"] == "correspondence":
            created, skipped = self._import_correspondence(rows, created_by, options["dry_run"])
        else:
            created, skipped = self._import_documents(rows, created_by, options["dry_run"])

        prefix = "[DRY RUN] " if options["dry_run"] else ""
        self.stdout.write(self.style.SUCCESS(f"{prefix}Created {created}, skipped {skipped}"))

    def _import_correspondence(self, rows, default_user, dry_run: bool) -> tuple[int, int]:
        created = skipped = 0
        with transaction.atomic():
            for row in rows:
                reference = (row.get("reference_number") or "").strip()
                subject = (row.get("subject") or "").strip()
                if not subject:
                    skipped += 1
                    continue
                if reference and Correspondence.objects.filter(reference_number=reference).exists():
                    skipped += 1
                    continue
                if not reference:
                    reference = f"LEGACY-IMPORT-{created + skipped + 1:06d}"
                payload = {
                    "reference_number": reference,
                    "subject": subject,
                    "status": row.get("status") or Correspondence.Status.ARCHIVED,
                    "source": row.get("source") or Correspondence.Source.EXTERNAL,
                    "direction": row.get("direction") or Correspondence.Direction.UPWARD,
                    "sender_name": row.get("sender_name") or "",
                    "sender_organization": row.get("sender_organization") or "",
                    "archive_level": row.get("archive_level") or "",
                    "created_by": default_user,
                }
                received = row.get("received_date")
                if received:
                    payload["received_date"] = received
                if not dry_run:
                    Correspondence.objects.create(**payload)
                created += 1
            if dry_run:
                transaction.set_rollback(True)
        return created, skipped

    def _import_documents(self, rows, default_user, dry_run: bool) -> tuple[int, int]:
        created = skipped = 0
        with transaction.atomic():
            for row in rows:
                title = (row.get("title") or "").strip()
                if not title:
                    skipped += 1
                    continue
                reference = (row.get("reference_number") or "").strip()
                if reference and Document.objects.filter(reference_number=reference).exists():
                    skipped += 1
                    continue
                author = default_user
                username = (row.get("author_username") or "").strip()
                if username:
                    author = User.objects.filter(username=username).first() or default_user
                if not author:
                    skipped += 1
                    continue
                if not dry_run:
                    Document.objects.create(
                        title=title,
                        reference_number=reference,
                        document_type=row.get("document_type") or Document.DocumentType.OTHER,
                        status=row.get("status") or Document.DocumentStatus.ARCHIVED,
                        sensitivity=row.get("sensitivity") or Document.Sensitivity.INTERNAL,
                        description=row.get("description") or "",
                        author=author,
                    )
                created += 1
            if dry_run:
                transaction.set_rollback(True)
        return created, skipped
