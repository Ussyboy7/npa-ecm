"""Correct identity values on an issued approval record and re-issue its PDF.

Approval snapshots are immutable by design. This command exists so a recorded
office or designation can be corrected deliberately -- with a stated reason, an
audit entry, and a re-issued approved copy -- instead of by editing rows by hand
or by loosening the model's immutability guard.
"""

from __future__ import annotations

import hashlib

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from audit.models import ActivityLog
from audit.services import AuditService
from correspondence.models import ApprovalSnapshot
from correspondence.services import ExecutiveApprovalPDFService
from correspondence.services.approval_pdf import (
    _media_storage_path,
    rebuild_approval_record_pdf,
)


class Command(BaseCommand):
    help = (
        "Correct the recorded office and/or designation on an approval record, "
        "re-issue its approved copy, and write an audit entry."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reference",
            required=True,
            help="Correspondence reference number of the approval record.",
        )
        parser.add_argument(
            "--office",
            action="append",
            default=[],
            metavar="OFFICER=OFFICE",
            help="Set the recorded office for one officer. Repeatable.",
        )
        parser.add_argument(
            "--designation",
            action="append",
            default=[],
            metavar="OFFICER=DESIGNATION",
            help=(
                "Set a confirmed designation for one officer; OFFICER= clears it "
                "back to 'Not recorded'. Repeatable."
            ),
        )
        parser.add_argument(
            "--reason",
            required=True,
            help="Why the record is being corrected; stored in the audit entry.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write the correction. Without it the changes are only listed.",
        )
        parser.add_argument(
            "--reissue",
            action="store_true",
            help=(
                "Re-render the approved copy even when no recorded value changes, "
                "for example after a layout fix."
            ),
        )

    def handle(self, *args, **options):
        reason = (options["reason"] or "").strip()
        if not reason:
            raise CommandError("--reason must not be empty.")

        offices = self._parse_pairs(options["office"], "--office")
        designations = self._parse_pairs(
            options["designation"], "--designation", allow_empty=True
        )
        if not offices and not designations and not options["reissue"]:
            raise CommandError(
                "Nothing to correct: pass --office, --designation and/or --reissue."
            )

        snapshot = (
            ApprovalSnapshot.objects.select_related(
                "correspondence", "minute", "approved_document"
            )
            .filter(correspondence__reference_number=options["reference"])
            .order_by("-created_at")
            .first()
        )
        if snapshot is None:
            raise CommandError(
                f"No approval record found for {options['reference']}."
            )

        rows = [dict(row) for row in (snapshot.minutes or [])]
        changes = []
        for row in rows:
            officer = str(row.get("by") or "")
            if officer in offices and row.get("office") != offices[officer]:
                changes.append(
                    (officer, "office", row.get("office") or "", offices[officer])
                )
                row["office"] = offices[officer]
            if officer in designations and row.get("designation") != designations[officer]:
                changes.append(
                    (
                        officer,
                        "designation",
                        row.get("designation") or "",
                        designations[officer],
                    )
                )
                row["designation"] = designations[officer]

        # The signer's identity is the row for the approving minute.
        signer_designation = snapshot.signer_designation
        for row in rows:
            if row.get("step") == snapshot.minute.step_number:
                signer_designation = row.get("designation") or ""
                break

        if (
            not changes
            and signer_designation == snapshot.signer_designation
            and not options["reissue"]
        ):
            self.stdout.write("No changes.")
            return

        for officer, field, before, after in changes:
            self.stdout.write(f"{officer}: {field} {before!r} -> {after!r}")
        if signer_designation != snapshot.signer_designation:
            self.stdout.write(
                "signer_designation "
                f"{snapshot.signer_designation!r} -> {signer_designation!r}"
            )

        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING(
                    "Dry run: re-run with --apply to write the correction."
                )
            )
            return

        issued_pdf = self._issued_pdf(snapshot)
        if issued_pdf is None:
            raise CommandError(
                "The issued approved copy is not available, so its memo pages "
                "cannot be preserved. Restore that file before correcting rows; "
                "the record will not be re-rendered from the live memo."
            )

        with transaction.atomic():
            ApprovalSnapshot.objects.filter(pk=snapshot.pk).update(
                minutes=rows,
                signer_designation=signer_designation,
                updated_at=timezone.now(),
            )
            snapshot.refresh_from_db()
            pdf_bytes = rebuild_approval_record_pdf(
                minute=snapshot.minute,
                correspondence=snapshot.correspondence,
                snapshot=snapshot,
                issued_pdf=issued_pdf,
            )
            if snapshot.pdf_file:
                snapshot.pdf_file.delete(save=False)
            snapshot.pdf_file.save(
                f"{snapshot.minute_id}.pdf", ContentFile(pdf_bytes), save=False
            )
            snapshot.pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
            snapshot.pdf_generated_at = timezone.now()
            snapshot.save(
                update_fields=[
                    "pdf_file",
                    "pdf_sha256",
                    "pdf_generated_at",
                    "updated_at",
                ]
            )
            self._replace_approved_copy(snapshot, pdf_bytes)
            AuditService.log_activity(
                user=None,
                action=ActivityLog.ActionType.CORRESPONDENCE_UPDATED,
                object_type="approval_snapshot",
                object_id=str(snapshot.pk),
                object_repr=f"Approval record {snapshot.document_reference}",
                module="correspondence",
                description=f"Approval record corrected: {reason}",
                metadata={
                    "reason": reason,
                    "changes": [
                        {
                            "officer": officer,
                            "field": field,
                            "from": before,
                            "to": after,
                        }
                        for officer, field, before, after in changes
                    ],
                    "signer_designation": signer_designation,
                    "pdf_sha256": snapshot.pdf_sha256,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Corrected {snapshot.document_reference or snapshot.pk}; "
                f"re-issued PDF sha256 {snapshot.pdf_sha256[:12]}…"
            )
        )

    @staticmethod
    def _parse_pairs(values, flag: str, *, allow_empty: bool = False) -> dict[str, str]:
        pairs: dict[str, str] = {}
        for value in values:
            officer, separator, setting = value.partition("=")
            officer = officer.strip()
            setting = setting.strip()
            if not separator or not officer or (not setting and not allow_empty):
                raise CommandError(
                    f"{flag} expects OFFICER=VALUE, got {value!r}."
                )
            pairs[officer] = setting
        return pairs

    @staticmethod
    def _issued_pdf(snapshot) -> bytes | None:
        if snapshot.pdf_file:
            try:
                with snapshot.pdf_file.open("rb") as handle:
                    return handle.read()
            except (OSError, ValueError):
                pass
        return ExecutiveApprovalPDFService._read_approved_copy_pdf(
            snapshot.approved_document
        )

    @staticmethod
    def _replace_approved_copy(snapshot, pdf_bytes: bytes) -> None:
        """Keep the DMS approved copy identical to the re-issued PDF."""
        document = snapshot.approved_document
        if document is None:
            return
        version = document.versions.order_by("version_number").first()
        if version is None or not version.file_url:
            return
        storage_path = _media_storage_path(version.file_url)
        if not storage_path:
            return
        if default_storage.exists(storage_path):
            default_storage.delete(storage_path)
        stored_name = default_storage.save(storage_path, ContentFile(pdf_bytes))
        if stored_name != storage_path:
            raise CommandError(
                "The approved copy was written to a different path than its "
                "version records; the record was corrected but the DMS copy "
                "needs attention."
            )
        version.file_size = len(pdf_bytes)
        version.save(update_fields=["file_size", "updated_at"])
