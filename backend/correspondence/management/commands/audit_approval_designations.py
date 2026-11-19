"""List approval-record rows that print a permission role as a designation.

Read-only. Rows captured before designations were stored canonically contain the
acting user's role name, because capture used it as a fallback. Only rows whose
acting account records no designation of its own are listed: a title that merely
matches a role name is otherwise indistinguishable from a real one. Clear or
replace the listed rows with ``correct_approval_record`` once confirmed.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from correspondence.models import ApprovalSnapshot, Minute


class Command(BaseCommand):
    help = "List approval-record rows whose designation is a permission role name."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reference",
            help="Limit the audit to one correspondence reference number.",
        )

    def handle(self, *args, **options):
        snapshots = ApprovalSnapshot.objects.select_related("correspondence").order_by(
            "created_at"
        )
        if options["reference"]:
            snapshots = snapshots.filter(
                correspondence__reference_number=options["reference"]
            )
        snapshots = list(snapshots)

        minutes = {
            (minute.correspondence_id, minute.step_number): minute
            for minute in Minute.objects.filter(
                correspondence_id__in=[snapshot.correspondence_id for snapshot in snapshots]
            ).select_related("user__system_role")
        }

        findings = []
        for snapshot in snapshots:
            for row in snapshot.minutes or []:
                designation = str(row.get("designation") or "").strip()
                if not designation:
                    continue
                minute = minutes.get((snapshot.correspondence_id, row.get("step")))
                user = getattr(minute, "user", None)
                role_name = (getattr(getattr(user, "system_role", None), "name", "") or "").strip()
                account_designation = (getattr(user, "designation", "") or "").strip()
                if not role_name or designation.casefold() != role_name.casefold():
                    continue
                if account_designation:
                    continue
                findings.append(
                    (
                        snapshot.correspondence.reference_number
                        or str(snapshot.correspondence_id),
                        row.get("step"),
                        row.get("by") or "",
                        designation,
                        role_name,
                    )
                )

        if not findings:
            self.stdout.write(
                f"No role-name designations in {len(snapshots)} approval record(s)."
            )
            return

        for reference, step, officer, designation, role_name in findings:
            self.stdout.write(
                f"{reference} | step {step} | {officer} | "
                f"designation={designation!r} equals role {role_name!r}"
            )
        references = {finding[0] for finding in findings}
        self.stdout.write(
            self.style.WARNING(
                f"{len(findings)} row(s) across {len(references)} record(s) print a "
                "permission role as a designation. Nothing was changed."
            )
        )
