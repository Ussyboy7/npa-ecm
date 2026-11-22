"""Safely deactivate legacy mock accounts without deleting them.

The mock seed data has been removed from the repository; the usernames it
created are kept here so existing databases can still be cleaned up. The
command reports every account and active office membership it would disable,
and refuses --apply while any targeted account would remove the last active
real principal from an office or still owns actionable open work.
"""

from __future__ import annotations

import csv
import os
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from accounts.models import User
from audit.models import ActivityLog
from audit.services import AuditService
from correspondence.models import Case, Correspondence, CorrespondenceDistribution, Minute
from organization.models import (
    ActingAppointment,
    Department,
    Directorate,
    Division,
    OfficeMembership,
)
from workflow.models import ApprovalTask

HOLD_USERNAMES = frozenset({"superadmin"})

# Usernames created by the former MOCK_USERS seed, retained only so existing
# databases can be cleaned up. Nothing seeds these accounts any more.
LEGACY_MOCK_USERNAMES = frozenset({
    "agmabuja",
    "agmaccounts",
    "agmadminarchives",
    "agmadminfacility",
    "agmadmingeneral",
    "agmatonsvts",
    "agmauditfinance",
    "agmauditpolicy",
    "agmauditsystems",
    "agmbms",
    "agmboardregistry",
    "agmbudget",
    "agmcivil",
    "agmcr",
    "agmcsccsr",
    "agmcscpem",
    "agmcspplanning",
    "agmcspresearch",
    "agmelectrical",
    "agmenvironment",
    "agmerm",
    "agmfinance",
    "agmfirerescue",
    "agmharbours",
    "agmhrlabour",
    "agmhrld",
    "agmhrmgt",
    "agmhydrographic",
    "agmict",
    "agminfra",
    "agminvestment",
    "agmlandsassets",
    "agmlegal",
    "agmmedical",
    "agmmonitoring",
    "agmnbv",
    "agmnetworks",
    "agmnursing",
    "agmoccupational",
    "agmoperations",
    "agmperformance",
    "agmpharmacy",
    "agmportseng",
    "agmppd",
    "agmppp",
    "agmprojects",
    "agmradiology",
    "agmregulatory",
    "agmresearch",
    "agmsafety",
    "agmseaviewproperties",
    "agmsecurity",
    "agmservicom",
    "agmsoftware",
    "agmsuperannuation",
    "agmtariff",
    "agmtax",
    "agmvessel",
    "assistantgm",
    "assistantmanager",
    "assistantmd",
    "asst3",
    "asst_mgr",
    "edets",
    "edfa",
    "edmo",
    "gmadmin",
    "gmaudit",
    "gmcsc",
    "gmcsp",
    "gmengineering",
    "gmfinance",
    "gmhr",
    "gmhse",
    "gmict",
    "gmlandsassets",
    "gmlegal",
    "gmliaison",
    "gmmarinealt",
    "gmmdoffice",
    "gmmedical",
    "gmmonitoring",
    "gmoperations",
    "gmoversealiaison",
    "gmppp",
    "gmprocurement",
    "gmregulatory",
    "gmseaviewproperties",
    "gmsecurity",
    "gmservicom",
    "gmspecialduties",
    "gmsuperannuationinvestment",
    "gmtariff",
    "managersupport",
    "mgr",
    "officer1",
    "officer2",
    "officer_i",
    "officer_ii",
    "officeradmin",
    "officerdev",
    "officersupport",
    "pamd",
    "pmgr",
    "pmsadm",
    "pmsoftware",
    "sec_md",
    "secretaryed",
    "secretarymd",
    "smfinance",
    "smgr2",
    "smhr",
    "sofficer",
    "staff1",
    "staff2",
    "staff3",
    "staff_i",
    "staff_ii",
    "staff_iii",
    "staffjunior",
    "staffmid",
    "staffsenior",
    "superadmin",
})
OPEN_CORRESPONDENCE_STATUSES = ("pending", "in-progress")
OPEN_CASE_STATUSES = ("open", "in_progress")
OPEN_TASK_STATUSES = ("pending", "in-progress")

ACCOUNT_FIELDS = [
    "username",
    "full_name",
    "email",
    "employee_id",
    "personnel_number",
    "system_role",
    "grade_level",
    "is_superuser",
    "is_staff",
    "active_before",
    "seed_source_match",
    "change_me_password_valid",
    "last_login",
    "last_activity",
    "active_membership_count",
    "primary_membership_count",
    "principal_membership_count",
    "active_memberships",
    "principal_offices",
    "mock_only_principal_offices",
    "actionable_open_work",
    "historical_created_open_records",
    "proposed_action",
    "blocking_reasons",
    "notes",
]

MEMBERSHIP_FIELDS = [
    "username",
    "full_name",
    "employee_id",
    "office_code",
    "office_name",
    "assignment_role",
    "is_primary",
    "can_register",
    "can_route",
    "can_approve",
    "starts_at",
    "ends_at",
    "account_action",
    "membership_action",
    "blocking_reasons",
]


@dataclass
class MockAccount:
    user: User
    memberships: list[OfficeMembership] = field(default_factory=list)
    principal_memberships: list[OfficeMembership] = field(default_factory=list)
    blocker_offices: list[OfficeMembership] = field(default_factory=list)
    open_work: list[str] = field(default_factory=list)
    historical_created: int = 0
    reasons: list[str] = field(default_factory=list)
    coverage_reasons: list[str] = field(default_factory=list)
    action: str = "WOULD_DEACTIVATE"


class Command(BaseCommand):
    help = (
        "Dry-run the deactivation of seeded demo/mock users and their active "
        "office memberships. Must be run with --apply to make changes."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--out",
            type=Path,
            default=Path.cwd() / "mock-account-deactivation.csv",
            help="Account CSV output path. Defaults to ./mock-account-deactivation.csv.",
        )
        parser.add_argument(
            "--memberships-out",
            type=Path,
            help="Membership CSV output path. Defaults to <out>-memberships.csv.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help=(
                "Disable accounts and active office memberships. Refuses to run "
                "if any target is blocked by office-principal coverage, open work, "
                "privilege, or a hold."
            ),
        )
        parser.add_argument(
            "--allow-headless-offices",
            action="store_true",
            help=(
                "Proceed even where an office would be left without an active "
                "principal, for offices that will be staffed manually later. "
                "Open work, leadership references, privileges and holds still block."
            ),
        )

    def handle(self, *args, **options):
        seed_usernames = self._seed_usernames()
        targets = list(
            User.objects.filter(
                employee_id="",
                username__in=seed_usernames,
                is_active=True,
            )
            .select_related("system_role")
            .order_by("username")
        )
        if not targets:
            raise CommandError(
                "No legacy mock accounts were found in this database."
            )

        all_memberships = list(
            OfficeMembership.objects.filter(
                user__in=targets, is_active=True
            )
            .select_related("office")
            .order_by("user__username", "office__code", "assignment_role")
        )
        memberships_by_user: dict[int, list[OfficeMembership]] = defaultdict(list)
        for membership in all_memberships:
            memberships_by_user[membership.user_id].append(membership)

        mock_ids = {user.pk for user in targets}
        office_principals = self._office_principals()
        accounts = [
            self._inspect_account(
                user=user,
                memberships=memberships_by_user[user.pk],
                office_principals=office_principals,
                mock_ids=mock_ids,
                allow_headless=options["allow_headless_offices"],
            )
            for user in targets
        ]

        blocked = [account for account in accounts if account.action == "BLOCKED"]
        held = [account for account in accounts if account.action == "HOLD"]
        ready = [account for account in accounts if account.action == "WOULD_DEACTIVATE"]

        out_path: Path = options["out"]
        memberships_path: Path = options["memberships_out"] or out_path.with_name(
            f"{out_path.stem}-memberships.csv"
        )
        self._write_reports(accounts, out_path, memberships_path)

        action_counts = Counter(account.action for account in accounts)
        membership_count = sum(len(account.memberships) for account in ready)
        headless_office_ids = {
            membership.office_id for account in ready for membership in account.blocker_offices
        }
        self.stdout.write(
            self.style.SUCCESS(
                f"{'APPLIED' if options['apply'] else 'DRY RUN'}: "
                f"{len(accounts)} mock accounts inspected; "
                f"ready={action_counts.get('WOULD_DEACTIVATE', 0)}, "
                f"held={action_counts.get('HOLD', 0)}, "
                f"blocked={action_counts.get('BLOCKED', 0)}; "
                f"memberships that would be disabled={membership_count}."
            )
        )
        if options["allow_headless_offices"] and headless_office_ids:
            self.stderr.write(
                self.style.WARNING(
                    f"{len(headless_office_ids)} office(s) will be left without an active "
                    "principal and must be staffed manually: "
                    + ", ".join(sorted({m.office.code for account in ready for m in account.blocker_offices}))
                )
            )
        self.stdout.write(f"Account report: {out_path.resolve()}")
        self.stdout.write(f"Membership report: {memberships_path.resolve()}")

        if options["apply"] and blocked:
            details = "; ".join(
                f"{account.user.username}: {', '.join(account.reasons)}"
                for account in blocked[:10]
            )
            raise CommandError(
                f"Refusing --apply: {len(blocked)} mock account(s) are blocked. "
                "Resolve coverage/open-work blockers and review the exported report "
                f"first. First blockers: {details}"
            )
        if options["apply"] and held:
            # Held accounts are intentionally excluded from targets; this is
            # defensive in case the hold list changes later.
            self.stderr.write(
                self.style.WARNING(
                    "Held accounts remain active: "
                    + ", ".join(account.user.username for account in held)
                )
            )
        if not options["apply"]:
            return

        applied = [account for account in accounts if account.action == "WOULD_DEACTIVATE"]
        if not applied:
            raise CommandError("Nothing to apply: no mock accounts are eligible.")

        with transaction.atomic():
            for account in applied:
                user = User.objects.select_for_update().get(pk=account.user.pk)
                user.is_active = False
                user.is_staff = False
                user.set_unusable_password()
                user.save(update_fields=["is_active", "is_staff", "password"])

                OfficeMembership.objects.filter(
                    user=user, is_active=True
                ).update(is_active=False)

                AuditService.log_user_activity(
                    user=None,
                    action=ActivityLog.ActionType.USER_UPDATED,
                    target_user=user,
                    description=(
                        "Deactivated seeded mock account through "
                        "deactivate_mock_accounts --apply"
                    ),
                    metadata={
                        "source": "deactivate_mock_accounts",
                        "office_memberships_disabled": len(account.memberships),
                        "mock_source_match": True,
                    },
                )
                account.action = "DEACTIVATED"

        self._write_reports(accounts, out_path, memberships_path)
        self.stdout.write(
            self.style.SUCCESS(
                f"APPLIED: deactivated {len(applied)} account(s) and disabled "
                f"{membership_count} active office membership(s). Reports updated."
            )
        )

    @staticmethod
    def _seed_usernames() -> set[str]:
        return set(LEGACY_MOCK_USERNAMES)

    @staticmethod
    def _office_principals() -> dict[int, list[OfficeMembership]]:
        principals: dict[int, list[OfficeMembership]] = defaultdict(list)
        for membership in OfficeMembership.objects.filter(
            is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            user__is_active=True,
        ).select_related("user", "office"):
            principals[membership.office_id].append(membership)
        return principals

    def _inspect_account(
        self,
        *,
        user: User,
        memberships: list[OfficeMembership],
        office_principals: dict[int, list[OfficeMembership]],
        mock_ids: set[int],
        allow_headless: bool = False,
    ) -> MockAccount:
        account = MockAccount(user=user, memberships=memberships)
        account.principal_memberships = [
            membership
            for membership in memberships
            if membership.assignment_role == OfficeMembership.AssignmentRole.PRINCIPAL
        ]

        if user.username in HOLD_USERNAMES:
            account.action = "HOLD"
            account.reasons.append(
                "Explicit hold: administrator/real-identity decision required."
            )

        if user.is_superuser or user.is_staff:
            account.reasons.append("Account has superuser or staff privileges.")

        leadership_refs = []
        if Directorate.objects.filter(executive_director=user).exists():
            leadership_refs.append("directorate executive director")
        if Division.objects.filter(general_manager=user).exists():
            leadership_refs.append("division general manager")
        if Department.objects.filter(head_of_department=user).exists():
            leadership_refs.append("department head")
        if leadership_refs:
            account.reasons.append(
                "Account is referenced as " + ", ".join(leadership_refs) + "."
            )

        for membership in account.principal_memberships:
            # Coverage counts only principals who are neither a mock account nor
            # an explicit hold, so one mock principal can never be mistaken for
            # a real replacement for another.
            active_real = [
                candidate
                for candidate in office_principals.get(membership.office_id, [])
                if candidate.user_id not in mock_ids
                and candidate.user.username not in HOLD_USERNAMES
            ]
            if not active_real:
                account.blocker_offices.append(membership)
                reason = (
                    f"Office {membership.office.code} would have no active real "
                    "principal after deactivation."
                )
                account.reasons.append(reason)
                account.coverage_reasons.append(reason)

        for entry in self._open_work(user):
            account.open_work.append(entry)
        if account.open_work:
            account.reasons.append(
                "Actionable open work: " + "; ".join(account.open_work)
            )

        account.historical_created = self._historical_created_count(user)

        non_coverage_reasons = [
            reason for reason in account.reasons if reason not in account.coverage_reasons
        ]
        if account.action != "HOLD":
            if non_coverage_reasons or (account.coverage_reasons and not allow_headless):
                account.action = "BLOCKED"
            else:
                account.action = "WOULD_DEACTIVATE"
        return account

    @staticmethod
    def _open_work(user: User) -> list[str]:
        entries: list[str] = []
        for item in Correspondence.objects.filter(
            current_approver=user, status__in=OPEN_CORRESPONDENCE_STATUSES
        ):
            entries.append(
                f"current approver {item.reference_number} [{item.status}]"
            )
        for item in Case.objects.filter(
            assigned_to=user, status__in=OPEN_CASE_STATUSES
        ):
            entries.append(f"assigned case {item.case_number} [{item.status}]")
        for item in ApprovalTask.objects.filter(
            assignee=user, status__in=OPEN_TASK_STATUSES
        ):
            entries.append(f"approval task {item.pk} [{item.status}]")
        for item in Minute.objects.filter(
            to_user=user,
            requires_response=True,
            is_recalled=False,
            acknowledged_at__isnull=True,
        ).select_related("correspondence"):
            entries.append(
                f"pending minute {item.correspondence.reference_number}"
            )
        for item in CorrespondenceDistribution.objects.filter(
            user=user, is_active=True, read_at__isnull=True
        ).select_related("correspondence"):
            entries.append(
                f"unread distribution {item.correspondence.reference_number}"
            )
        for item in ActingAppointment.objects.filter(
            Q(principal=user) | Q(acting_user=user), is_active=True
        ).select_related("office"):
            entries.append(f"active acting appointment {item.office.code}")
        return entries

    @staticmethod
    def _historical_created_count(user: User) -> int:
        return (
            Correspondence.objects.filter(
                created_by=user, status__in=OPEN_CORRESPONDENCE_STATUSES
            ).count()
            + Case.objects.filter(
                created_by=user, status__in=OPEN_CASE_STATUSES
            ).count()
        )

    def _write_reports(
        self,
        accounts: list[MockAccount],
        accounts_path: Path,
        memberships_path: Path,
    ) -> None:
        accounts_path.parent.mkdir(parents=True, exist_ok=True)
        memberships_path.parent.mkdir(parents=True, exist_ok=True)

        account_rows = []
        membership_rows = []
        for account in accounts:
            user = account.user
            membership_text = "; ".join(
                f"{membership.office.code} [{membership.assignment_role}; "
                f"primary={membership.is_primary}]"
                for membership in account.memberships
            )
            account_rows.append(
                {
                    "username": user.username,
                    "full_name": (
                        f"{user.first_name} {user.middle_name} {user.last_name}".strip()
                    ),
                    "email": user.email,
                    "employee_id": user.employee_id,
                    "personnel_number": user.personnel_number,
                    "system_role": user.system_role.name if user.system_role_id else "",
                    "grade_level": user.grade_level,
                    "is_superuser": user.is_superuser,
                    "is_staff": user.is_staff,
                    "active_before": user.is_active,
                    "seed_source_match": True,
                    "change_me_password_valid": user.check_password("ChangeMe123!"),
                    "last_login": user.last_login.isoformat() if user.last_login else "",
                    "last_activity": (
                        user.last_activity.isoformat() if user.last_activity else ""
                    ),
                    "active_membership_count": len(account.memberships),
                    "primary_membership_count": sum(
                        membership.is_primary for membership in account.memberships
                    ),
                    "principal_membership_count": len(account.principal_memberships),
                    "active_memberships": membership_text,
                    "principal_offices": "; ".join(
                        membership.office.code
                        for membership in account.principal_memberships
                    ),
                    "mock_only_principal_offices": "; ".join(
                        membership.office.code
                        for membership in account.blocker_offices
                    ),
                    "actionable_open_work": "; ".join(account.open_work),
                    "historical_created_open_records": account.historical_created,
                    "proposed_action": account.action,
                    "blocking_reasons": "; ".join(account.reasons),
                    "notes": (
                        "No account data is deleted; deactivation preserves audit "
                        "and membership history."
                    ),
                }
            )

            for membership in account.memberships:
                membership_rows.append(
                    {
                        "username": user.username,
                        "full_name": (
                            f"{user.first_name} {user.middle_name} {user.last_name}".strip()
                        ),
                        "employee_id": user.employee_id,
                        "office_code": membership.office.code,
                        "office_name": membership.office.name,
                        "assignment_role": membership.assignment_role,
                        "is_primary": membership.is_primary,
                        "can_register": membership.can_register,
                        "can_route": membership.can_route,
                        "can_approve": membership.can_approve,
                        "starts_at": (
                            membership.starts_at.isoformat()
                            if membership.starts_at
                            else ""
                        ),
                        "ends_at": (
                            membership.ends_at.isoformat()
                            if membership.ends_at
                            else ""
                        ),
                        "account_action": account.action,
                        "membership_action": (
                            "WOULD_DISABLE"
                            if account.action == "WOULD_DEACTIVATE"
                            else (
                                "DISABLED"
                                if account.action == "DEACTIVATED"
                                else account.action
                            )
                        ),
                        "blocking_reasons": "; ".join(account.reasons),
                    }
                )

        self._write_csv(accounts_path, ACCOUNT_FIELDS, account_rows)
        self._write_csv(memberships_path, MEMBERSHIP_FIELDS, membership_rows)

    @staticmethod
    def _write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
