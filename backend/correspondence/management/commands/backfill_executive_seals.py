"""
Backfill seal_applied for existing APPROVE minutes that should have received a seal.

Run: python manage.py backfill_executive_seals

Finds APPROVE minutes with seal_applied=null where the approver is_executive and
has an active ExecutiveSignature, then calls SealGenerationService.generate_seal
and sets minute.seal_applied. Use after fixing seal-generation bugs or when
historical approvals never got seals.

Dry run (default): only report what would be done. Use --apply to perform.
"""
from django.core.management.base import BaseCommand

from accounts.models import ExecutiveSignature
from accounts.services import SealGenerationService
from correspondence.models import Minute


def _is_executive(user) -> bool:
    grade = (getattr(user, "grade_level", None) or "").strip().upper()
    role_obj = getattr(user, "system_role", None)
    role = (getattr(role_obj, "name", None) or "").upper()
    return (
        grade in ("MDCS", "EDCS", "MSS1", "MSS2", "MSS3")
        or role in ("MANAGING DIRECTOR", "EXECUTIVE DIRECTOR", "MD", "ED", "GENERAL MANAGER", "AGM", "PRINCIPAL MANAGER")
        or "MANAGING DIRECTOR" in role
        or "EXECUTIVE DIRECTOR" in role
        or "GENERAL MANAGER" in role
        or "PRINCIPAL MANAGER" in role
        or getattr(user, "is_management", False)
    )


class Command(BaseCommand):
    help = "Backfill seal_applied for APPROVE minutes that should have received a seal."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply changes. Default is dry-run (report only).",
        )

    def handle(self, *args, **options):
        apply = options.get("apply", False)
        if not apply:
            self.stdout.write(self.style.WARNING("DRY RUN (use --apply to perform changes)\n"))

        qs = (
            Minute.objects.filter(action_type=Minute.ActionType.APPROVE, seal_applied__isnull=True)
            .select_related("user", "user__system_role", "correspondence")
            .order_by("timestamp")
        )
        to_process = []
        for m in qs:
            try:
                ExecutiveSignature.objects.get(user=m.user, is_active=True)
            except ExecutiveSignature.DoesNotExist:
                continue
            if not _is_executive(m.user):
                continue
            to_process.append(m)

        self.stdout.write(f"Found {len(to_process)} APPROVE minute(s) to backfill.\n")

        ok = 0
        err = 0
        for m in to_process:
            try:
                seal, _ = SealGenerationService.generate_seal(
                    user=m.user,
                    correspondence=m.correspondence,
                    request=None,
                )
                if apply:
                    m.seal_applied = seal
                    m.save(update_fields=["seal_applied"])
                self.stdout.write(f"  OK  minute={m.id} user={m.user.username} serial={seal.serial_number}")
                ok += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ERR minute={m.id} user={m.user.username}: {e}"))
                err += 1

        self.stdout.write("")
        self.stdout.write(f"OK: {ok}  Errors: {err}")
        if not apply and to_process:
            self.stdout.write(self.style.WARNING("Run with --apply to persist seal_applied on these minutes."))
