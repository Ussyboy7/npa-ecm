"""Link legacy correspondence delegations to their assistant assignments.

Rows that predate assignment grants have no ``delegation`` link, so the flags
cannot be enforced for them. Run without ``--apply`` to audit; rerun with
``--apply`` to write the links. Rows with no matching assignment are reported
and left alone unless ``--revoke-unmatched`` is also given.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from correspondence.models import CorrespondenceDelegation, Delegation


class Command(BaseCommand):
    help = "Link legacy correspondence delegations to their assistant assignments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write the links. Without this flag only audits.",
        )
        parser.add_argument(
            "--revoke-unmatched",
            action="store_true",
            help=(
                "Also revoke live delegations with no matching assignment. "
                "Requires --apply."
            ),
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        revoke_unmatched = options["revoke_unmatched"]

        if revoke_unmatched and not apply_changes:
            raise CommandError("--revoke-unmatched requires --apply.")

        unlinked = CorrespondenceDelegation.objects.filter(
            delegation__isnull=True
        ).order_by("delegated_at", "id")

        linked = 0
        unmatched = []
        for row in unlinked.iterator():
            assignment = Delegation.objects.filter(
                principal_id=row.principal_id,
                assistant_id=row.assistant_id,
            ).first()
            if assignment is None:
                unmatched.append(row)
                continue
            linked += 1
            if apply_changes:
                CorrespondenceDelegation.objects.filter(
                    pk=row.pk, delegation__isnull=True
                ).update(delegation_id=assignment.pk)

        revoked = 0
        if revoke_unmatched and apply_changes and unmatched:
            revoked = CorrespondenceDelegation.objects.filter(
                pk__in=[row.pk for row in unmatched],
                delegation__isnull=True,
                status=CorrespondenceDelegation.Status.ACTIVE,
            ).update(
                status=CorrespondenceDelegation.Status.REVOKED,
                revoked_at=timezone.now(),
            )

        verb = "linked" if apply_changes else "would link"
        self.stdout.write(
            f"Unlinked legacy delegations: {linked + len(unmatched)} "
            f"({'apply' if apply_changes else 'dry run'})"
        )
        self.stdout.write(
            f"{verb}: {linked}; unmatched: {len(unmatched)}; revoked: {revoked}"
        )

        for row in unmatched:
            self.stdout.write(
                self.style.WARNING(
                    f"UNMATCHED {row.pk} correspondence={row.correspondence_id} "
                    f"principal={row.principal_id} assistant={row.assistant_id} "
                    f"status={row.status}"
                )
            )

        if unmatched and not revoke_unmatched:
            self.stdout.write(
                "Unmatched rows still grant every action on their record. Assign "
                "the assistant to the principal, or rerun with --apply "
                "--revoke-unmatched to withdraw them."
            )
