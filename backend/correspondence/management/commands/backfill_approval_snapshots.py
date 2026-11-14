"""Freeze snapshots for approval minutes that predate approval integrity."""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from correspondence.models import (
    ApprovalSnapshot,
    CorrespondenceDocumentLink,
    Minute,
)
from correspondence.services import ExecutiveApprovalPDFService


class Command(BaseCommand):
    help = (
        "Create immutable approval snapshots for existing approval minutes. "
        "The archived DMS copy is reused when one exists."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--minute",
            dest="minute_id",
            help="Only process the approval minute with this UUID.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Maximum number of approval minutes to process.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List the approvals that would be frozen without writing.",
        )

    def handle(self, *args, **options):
        minute_id = options.get("minute_id")
        limit = options.get("limit")
        dry_run = options.get("dry_run")

        if limit is not None and limit < 1:
            raise CommandError("--limit must be at least 1.")

        minutes = (
            Minute.objects.filter(
                Q(action_type=Minute.ActionType.APPROVE)
                | Q(approval_level__isnull=False),
                approval_snapshot__isnull=True,
                correspondence__isnull=False,
            )
            .select_related("correspondence", "user", "seal_applied")
            .order_by("timestamp", "step_number")
        )
        if minute_id:
            minutes = minutes.filter(pk=minute_id)
        if limit:
            minutes = minutes[:limit]

        processed = 0
        skipped = 0
        failed = 0
        for minute in minutes.iterator():
            if not CorrespondenceDocumentLink.objects.filter(
                correspondence=minute.correspondence
            ).exists():
                skipped += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Skip {minute.id}: no linked source memo at approval time."
                    )
                )
                continue

            if dry_run:
                self.stdout.write(
                    f"Would freeze {minute.id} "
                    f"({minute.correspondence.reference_number or minute.correspondence_id})"
                )
                processed += 1
                continue

            try:
                ExecutiveApprovalPDFService.generate_and_store_approval_pdf(
                    minute=minute,
                    correspondence=minute.correspondence,
                )
            except Exception as exc:
                failed += 1
                self.stderr.write(f"Failed {minute.id}: {exc}")
                continue

            if ApprovalSnapshot.objects.filter(minute=minute).exists():
                processed += 1
                self.stdout.write(f"Frozen {minute.id}")
            else:
                failed += 1
                self.stderr.write(f"No snapshot created for {minute.id}")

        verb = "Would freeze" if dry_run else "Frozen"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb}: {processed}; skipped: {skipped}; failed: {failed}"
            )
        )
