"""Dry-run the nominal roll and write a row-by-row reconciliation report."""

from __future__ import annotations

import csv
import os
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from accounts.management.commands.import_nominal_roll import (
    HEADER_ALIASES,
    KNOWN_EMPLOYEE_USERNAMES,
    PROTECTED_USERNAMES,
    _admin_name_matches,
    _email,
    _header_key,
    _is_management_account,
    _text,
    _username_base,
)
from organization.models import OfficeMembership


REPORT_FIELDS = [
    "row_number",
    "employee_number",
    "personnel_number",
    "surname",
    "first_name",
    "middle_name",
    "grade_level",
    "designation",
    "email",
    "action",
    "match_method",
    "matched_username",
    "matched_user_id",
    "current_role",
    "current_office",
    "note",
]


class Command(BaseCommand):
    help = (
        "Compare the nominal roll with existing accounts and write a CSV "
        "reconciliation report. No accounts are created, updated, or deactivated."
    )

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path, help="Path to the nominal-roll .xlsx file")
        parser.add_argument(
            "--out",
            type=Path,
            help="CSV output path. Defaults to <roll name>-reconciliation.csv.",
        )
        parser.add_argument(
            "--deactivate-missing",
            action="store_true",
            help="Include active accounts that would be deactivated by the importer.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Only inspect the first N data rows.",
        )

    def handle(self, *args, **options):
        path: Path = options["file"]
        if not path.exists():
            raise CommandError(f"Nominal roll not found: {path}")
        if path.suffix.lower() not in {".xlsx", ".xlsm"}:
            raise CommandError("Expected an .xlsx nominal-roll workbook.")

        limit = options.get("limit")
        if limit is not None and limit < 1:
            raise CommandError("--limit must be at least 1.")

        try:
            from openpyxl import load_workbook
        except ImportError as exc:
            raise CommandError(
                "openpyxl is required. Install backend requirements and retry."
            ) from exc

        workbook = load_workbook(path, read_only=True, data_only=True)
        rows = workbook.active.iter_rows(values_only=True)
        header_row_number = None
        column_map: dict[str, int] = {}
        for row_number, row in enumerate(rows, start=1):
            keys = [_header_key(_text(cell)) for cell in row]
            candidate: dict[str, int] = {}
            for field, aliases in HEADER_ALIASES.items():
                for index, key in enumerate(keys):
                    if key in aliases:
                        candidate[field] = index
                        break
            if {"last_name", "first_name", "employee_number"} <= candidate.keys():
                header_row_number = row_number
                column_map = candidate
                break

        if header_row_number is None:
            raise CommandError(
                "Could not find a header row containing Employee Number, "
                "Surname, and First Name."
            )

        data_rows = []
        for row_number, row in enumerate(rows, start=header_row_number + 1):
            values = {
                field: _text(row[index]) if index < len(row) else ""
                for field, index in column_map.items()
            }
            if not any(values.values()):
                continue
            data_rows.append((row_number, values))
            if limit is not None and len(data_rows) >= limit:
                break
        workbook.close()

        management_candidates = [
            user
            for user in User.objects.select_related("system_role").filter(is_active=True)
            if _is_management_account(user)
        ]
        matched_user_ids: set[int] = set()
        seen_employees: dict[str, int] = {}
        seen_personnel: dict[str, int] = {}
        seen_emails: dict[str, int] = {}
        report_rows = []
        counts = Counter()

        def office_for(user):
            membership = (
                OfficeMembership.objects.filter(
                    user=user, is_active=True, is_primary=True
                )
                .select_related("office")
                .first()
            )
            return membership.office.name if membership else ""

        def add_row(
            row_number,
            values,
            *,
            action,
            match_method="",
            user=None,
            username="",
            note="",
        ):
            raw_email = values.get("email", "")
            email_value = _email(raw_email)
            if raw_email and not email_value:
                note = (
                    f"Email placeholder {raw_email!r} treated as missing. " + note
                ).strip()
            report_rows.append(
                {
                    "row_number": row_number,
                    "employee_number": values.get("employee_number", ""),
                    "personnel_number": values.get("personnel_number", ""),
                    "surname": values.get("last_name", ""),
                    "first_name": values.get("first_name", ""),
                    "middle_name": values.get("middle_name", ""),
                    "grade_level": values.get("grade_level", ""),
                    "designation": values.get("designation", ""),
                    "email": email_value,
                    "action": action,
                    "match_method": match_method,
                    "matched_username": username or (user.username if user else ""),
                    "matched_user_id": str(user.pk) if user else "",
                    "current_role": (
                        user.system_role.name if user and user.system_role_id else ""
                    ),
                    "current_office": office_for(user) if user else "",
                    "note": note,
                }
            )
            counts[action] += 1

        for row_number, values in data_rows:
            employee_number = values.get("employee_number", "")
            personnel_number = values.get("personnel_number", "")
            first_name = values.get("first_name", "")
            last_name = values.get("last_name", "")
            email = _email(values.get("email", ""))

            if not employee_number or not first_name or not last_name:
                add_row(
                    row_number,
                    values,
                    action="skip_incomplete",
                    note="Missing employee number, first name, or surname.",
                )
                continue

            duplicate_employee = seen_employees.get(employee_number)
            if duplicate_employee:
                add_row(
                    row_number,
                    values,
                    action="skip_duplicate_employee",
                    note=f"Employee number first appears on row {duplicate_employee}.",
                )
                continue
            seen_employees[employee_number] = row_number

            if personnel_number:
                key = personnel_number.casefold()
                duplicate_personnel = seen_personnel.get(key)
                if duplicate_personnel:
                    add_row(
                        row_number,
                        values,
                        action="skip_duplicate_personnel",
                        note=f"Person No. first appears on row {duplicate_personnel}.",
                    )
                    continue
                seen_personnel[key] = row_number

            if email:
                duplicate_email = seen_emails.get(email)
                if duplicate_email:
                    add_row(
                        row_number,
                        values,
                        action="skip_duplicate_email",
                        note=f"Email first appears on row {duplicate_email}.",
                    )
                    continue
                seen_emails[email] = row_number

            user = User.objects.filter(employee_id=employee_number).first()
            match_method = "employee_number"
            if user is None and personnel_number:
                user = User.objects.filter(
                    personnel_number__iexact=personnel_number
                ).first()
                match_method = "personnel_number"
            if user is None:
                known_username = KNOWN_EMPLOYEE_USERNAMES.get(employee_number)
                if known_username:
                    user = User.objects.filter(username=known_username).first()
                    match_method = "known_admin_username"
            if user is None:
                name_matches = _admin_name_matches(
                    management_candidates, values, matched_user_ids
                )
                if len(name_matches) == 1:
                    user = name_matches[0]
                    match_method = "management_name"
                elif len(name_matches) > 1:
                    add_row(
                        row_number,
                        values,
                        action="ambiguous_name",
                        match_method="management_name",
                        note=(
                            "Multiple management accounts match: "
                            + ", ".join(candidate.username for candidate in name_matches)
                        ),
                    )
                    continue
            if user is None and email:
                email_matches = list(User.objects.filter(email__iexact=email)[:2])
                if len(email_matches) == 1:
                    user = email_matches[0]
                    match_method = "email"
                elif len(email_matches) > 1:
                    add_row(
                        row_number,
                        values,
                        action="ambiguous_email",
                        match_method="email",
                        note="Multiple accounts use this email.",
                    )
                    continue

            if user is None:
                if email and User.objects.filter(email__iexact=email).exists():
                    add_row(
                        row_number,
                        values,
                        action="skip_email_conflict",
                        note="Email already belongs to an account not matched to this row.",
                    )
                    continue
                username = _username_base(email, employee_number)
                base = username
                suffix = 2
                while User.objects.filter(username__iexact=username).exists():
                    username = f"{base}{suffix}"
                    suffix += 1
                add_row(
                    row_number,
                    values,
                    action="create",
                    match_method="new",
                    username=username,
                    note="Would create with the configured initial password.",
                )
                continue

            conflict = (
                User.objects.filter(employee_id=employee_number)
                .exclude(pk=user.pk)
                .exists()
            )
            if conflict:
                add_row(
                    row_number,
                    values,
                    action="skip_employee_conflict",
                    user=user,
                    match_method=match_method,
                    note="Employee number belongs to another account.",
                )
                continue

            matched_user_ids.add(user.pk)
            existing_email = user.email or ""
            note = "Would update identity fields in place."
            if existing_email and existing_email.lower() != email:
                note += f" Email would change from {existing_email} to {email}."
            elif not existing_email and email:
                note += f" Email would be set to {email}."
            add_row(
                row_number,
                values,
                action="update",
                user=user,
                match_method=match_method,
                note=note,
            )

        if options["deactivate_missing"]:
            missing = (
                User.objects.filter(
                    is_active=True,
                    is_superuser=False,
                    is_staff=False,
                )
                .exclude(pk__in=matched_user_ids)
                .exclude(username__in=PROTECTED_USERNAMES)
                .select_related("system_role")
                .order_by("username")
            )
            for user in missing:
                report_rows.append(
                    {
                        "row_number": "",
                        "employee_number": user.employee_id or "",
                        "personnel_number": getattr(user, "personnel_number", "") or "",
                        "surname": user.last_name or "",
                        "first_name": user.first_name or "",
                        "middle_name": getattr(user, "middle_name", "") or "",
                        "grade_level": user.grade_level or "",
                        "designation": getattr(user, "designation", "") or "",
                        "email": user.email or "",
                        "action": "deactivate_missing",
                        "match_method": "",
                        "matched_username": user.username,
                        "matched_user_id": str(user.pk),
                        "current_role": (
                            user.system_role.name if user.system_role_id else ""
                        ),
                        "current_office": office_for(user),
                        "note": "Active, non-protected account absent from the roll.",
                    }
                )
                counts["deactivate_missing"] += 1

        out_path = options.get("out") or path.with_name(
            f"{path.stem}-reconciliation.csv"
        )
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=REPORT_FIELDS)
            writer.writeheader()
            writer.writerows(report_rows)
        try:
            os.chmod(out_path, 0o600)
        except OSError:
            pass

        summary = ", ".join(f"{key}={value}" for key, value in sorted(counts.items()))
        self.stdout.write(self.style.SUCCESS(f"Wrote {out_path}"))
        self.stdout.write(f"Rows inspected: {len(data_rows)}")
        self.stdout.write(summary or "No changes would be made.")
