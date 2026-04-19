"""
Diagnose why Executive Approvals list may be empty.

Run: python manage.py diagnose_executive_approvals

Checks:
- Count of APPROVE minutes (action_type=approve)
- Count of APPROVE minutes with seal_applied set
- Count of APPROVE minutes with valid seal (seal_applied__is_valid=True)
- Sample of APPROVE minutes WITHOUT seal: user, grade, role, has ExecutiveSignature
- Sample of APPROVE minutes WITH seal

Executive Approvals page shows only minutes with action_type=approve AND
seal_applied (valid). Seal is applied only when: is_executive + ExecutiveSignature
exists (active) + SealGenerationService.generate_seal() succeeds.
"""
from django.core.management.base import BaseCommand

from correspondence.models import Minute


class Command(BaseCommand):
    help = "Diagnose why Executive Approvals list may be empty."

    def handle(self, *args, **options):
        self.stdout.write("=== Executive Approvals diagnostic ===\n")

        # 1. Counts
        approve_all = Minute.objects.filter(action_type=Minute.ActionType.APPROVE)
        n_approve = approve_all.count()
        n_with_seal = approve_all.exclude(seal_applied__isnull=True).count()
        n_valid_seal = approve_all.filter(
            seal_applied__isnull=False, seal_applied__is_valid=True
        ).count()

        self.stdout.write(f"Minutes with action_type=approve:     {n_approve}")
        self.stdout.write(f"  - with seal_applied set:            {n_with_seal}")
        self.stdout.write(f"  - with seal_applied valid:          {n_valid_seal}")
        self.stdout.write("")

        if n_valid_seal > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"At least {n_valid_seal} approval(s) have valid seals and should appear in Executive Approvals."
                )
            )
            return

        if n_approve == 0:
            self.stdout.write(
                self.style.WARNING("No APPROVE minutes in the database. Create an approval minute first.")
            )
            return

        # 2. APPROVE minutes without seal: show why (user, grade, role, ExecutiveSignature)
        self.stdout.write("Sample of APPROVE minutes WITHOUT seal (why they don't appear):\n")
        from accounts.models import ExecutiveSignature

        no_seal = (
            approve_all.filter(seal_applied__isnull=True)
            .select_related("user", "user__system_role")
            .order_by("-timestamp")[:10]
        )
        for m in no_seal:
            u = m.user
            grade = (getattr(u, "grade_level", None) or "").strip().upper()
            role = (getattr(getattr(u, "system_role", None), "name", None) or "").upper()
            try:
                sig = ExecutiveSignature.objects.get(user=u)
                has_sig = "Y" if sig.is_active else "inactive"
            except ExecutiveSignature.DoesNotExist:
                has_sig = "N"
            exec_grades = ["MDCS", "EDCS", "MSS1", "MSS2", "MSS3"]
            is_exec = (
                grade in exec_grades
                or "MANAGING DIRECTOR" in role
                or "EXECUTIVE DIRECTOR" in role
                or "GENERAL MANAGER" in role
                or "PRINCIPAL MANAGER" in role
                or getattr(u, "is_management", False)
            )
            self.stdout.write(
                f"  id={m.id} user={u.username} grade={repr(grade)} role={repr(role)} "
                f"ExecutiveSignature={has_sig} is_executive={is_exec} ts={m.timestamp}"
            )
        self.stdout.write("")
        self.stdout.write(
            "Common causes for 0 approvals: (1) Approver has no ExecutiveSignature in Settings → Signature, "
            "(2) Approver grade/role not in MDCS/EDCS/MSS1/MSS2/MSS3 or Managing/Executive/General/Principal, "
            "(3) Seal generation failed at approve time. New approvals need Signature configured before approving."
        )
