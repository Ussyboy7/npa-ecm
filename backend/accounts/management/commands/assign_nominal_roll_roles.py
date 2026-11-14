"""Map imported roll users to system roles and primary offices."""

from __future__ import annotations

import csv
import os
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Prefetch

from accounts.management.commands.import_nominal_roll import (
    HEADER_ALIASES,
    _header_key,
    _text,
)
from accounts.models import User
from accounts.nominal_roll_mapping import (
    resolve_office_code,
    resolve_role,
)
from organization.models import (
    Directorate,
    Office,
    OfficeMembership,
    Role,
)

REPORT_FIELDS = [
    "employee_number",
    "username",
    "full_name",
    "grade_level",
    "designation",
    "mapped_role",
    "existing_role",
    "role_action",
    "mapped_office_code",
    "mapped_office_name",
    "existing_office",
    "office_action",
    "mapped_directorate",
    "mapped_division",
    "mapped_department",
    "org_action",
    "status",
    "note",
]

ED_DIRECTORATES = {
    "OFF_MD": "Managing Director",
    "OFF_DIR_EDETS": "Executive Director, Engineering & Technical Services",
    "OFF_DIR_EDFA": "Executive Director, Finance & Administration",
    "OFF_DIR_EDMO": "Executive Director, Marine & Operations",
}


class Command(BaseCommand):
    help = (
        "Map imported nominal-roll users to roles and primary offices. "
        "The default is a dry run; --apply writes only blank assignments and "
        "keeps existing roles/offices."
    )

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path, help="Path to the nominal-roll .xlsx file")
        parser.add_argument(
            "--out",
            type=Path,
            help="CSV report path. Defaults to <roll name>-role-office-mapping.csv.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write role, org-unit, and office membership assignments.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Only process the first N data rows.",
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

        employee_numbers = [
            values.get("employee_number", "")
            for _, values in data_rows
            if values.get("employee_number")
        ]
        users = {
            user.employee_id: user
            for user in User.objects.filter(employee_id__in=employee_numbers)
            .select_related("system_role")
            .prefetch_related(
                Prefetch(
                    "office_memberships",
                    queryset=OfficeMembership.objects.filter(
                        is_active=True, is_primary=True
                    ).select_related("office"),
                    to_attr="active_primary_memberships",
                )
            )
        }
        roles = {role.name: role for role in Role.objects.all()}
        offices = {
            office.code: office
            for office in Office.objects.select_related(
                "directorate",
                "division__directorate",
                "department__division__directorate",
            )
        }
        directorates = {directorate.name: directorate for directorate in Directorate.objects.all()}

        report_rows = []
        counts = Counter()
        status_counts = Counter()
        seen_employees: set[str] = set()

        def add_report(values, **extra):
            report_rows.append(
                {
                    "employee_number": values.get("employee_number", ""),
                    "username": extra.get("username", ""),
                    "full_name": " ".join(
                        filter(
                            None,
                            [
                                values.get("first_name", ""),
                                values.get("middle_name", ""),
                                values.get("last_name", ""),
                            ],
                        )
                    ),
                    "grade_level": values.get("grade_level", ""),
                    "designation": values.get("designation", ""),
                    **{field: extra.get(field, "") for field in REPORT_FIELDS[5:]},
                }
            )

        for row_number, values in data_rows:
            employee_number = values.get("employee_number", "")
            grade = values.get("grade_level", "")
            designation = values.get("designation", "")
            if not employee_number or not values.get("first_name") or not values.get("last_name"):
                add_report(
                    values,
                    status="invalid_row",
                    note="Missing employee number or name.",
                )
                counts["invalid_row"] += 1
                continue
            if employee_number in seen_employees:
                add_report(
                    values,
                    status="duplicate_employee",
                    note="Employee number appears more than once in the roll.",
                )
                counts["duplicate_employee"] += 1
                continue
            seen_employees.add(employee_number)

            user = users.get(employee_number)
            if user is None:
                add_report(
                    values,
                    status="user_missing",
                    note="No imported user has this employee number.",
                )
                counts["user_missing"] += 1
                continue

            mapped_role = resolve_role(grade, designation)
            role = roles.get(mapped_role) if mapped_role else None
            if role is None:
                role_action = "exception"
                counts["role_exception"] += 1
            elif user.system_role_id is None:
                role_action = "assign"
                counts["role_assign"] += 1
            else:
                role_action = "keep"
                counts["role_keep"] += 1
                if user.system_role.name != mapped_role:
                    role_action = "keep_conflict"
                    counts["role_conflict"] += 1

            mapped_office_code = resolve_office_code(grade, designation)
            office = offices.get(mapped_office_code) if mapped_office_code else None
            existing_membership = (
                user.active_primary_memberships[0]
                if user.active_primary_memberships
                else None
            )
            if existing_membership is not None:
                office_action = "keep"
                counts["office_keep"] += 1
                if office and existing_membership.office_id != office.id:
                    office_action = "keep_conflict"
                    counts["office_conflict"] += 1
            elif office is None:
                office_action = "exception"
                counts["office_exception"] += 1
            else:
                office_action = "assign"
                counts["office_assign"] += 1

            target_directorate = None
            target_division = None
            target_department = None
            if office:
                target_directorate = (
                    directorates.get(ED_DIRECTORATES.get(office.code, ""))
                    or office.directorate
                    or (office.division.directorate if office.division_id else None)
                    or (
                        office.department.division.directorate
                        if office.department_id and office.department.division_id
                        else None
                    )
                )
                target_division = office.division or (
                    office.department.division if office.department_id else None
                )
                target_department = office.department

            org_fields = [
                user.directorate_id,
                user.division_id,
                user.department_id,
            ]
            if office is None:
                org_action = "exception"
            elif office_action != "assign":
                org_action = "keep"
                counts["org_keep"] += 1
            elif any(value is None for value in org_fields):
                org_action = "assign"
                counts["org_assign"] += 1
            else:
                org_action = "keep"
                counts["org_keep"] += 1

            note_parts = []
            if role_action == "keep_conflict":
                note_parts.append(
                    f"Existing role {user.system_role.name} differs from mapped {mapped_role}."
                )
            if office_action == "keep_conflict":
                note_parts.append(
                    f"Existing office {existing_membership.office.name} differs from "
                    f"mapped {office.name}."
                )
            if office_action == "exception":
                note_parts.append("No high-confidence office rule for this designation.")
            if role_action == "exception":
                note_parts.append("No role rule for this grade.")
            if org_action == "assign":
                note_parts.append("Directorate/division/department will be filled where blank.")

            status = "ready"
            if role_action in {"exception", "keep_conflict"}:
                status = "role_exception"
            elif office_action in {"exception", "keep_conflict"}:
                status = "office_exception"
            status_counts[status] += 1

            add_report(
                values,
                username=user.username,
                mapped_role=mapped_role or "",
                existing_role=user.system_role.name if user.system_role_id else "",
                role_action=role_action,
                mapped_office_code=office.code if office else (mapped_office_code or ""),
                mapped_office_name=office.name if office else "",
                existing_office=existing_membership.office.name if existing_membership else "",
                office_action=office_action,
                mapped_directorate=target_directorate.name if target_directorate else "",
                mapped_division=target_division.name if target_division else "",
                mapped_department=target_department.name if target_department else "",
                org_action=org_action,
                status=status,
                note=" ".join(note_parts),
            )

            if not options["apply"]:
                continue

            with transaction.atomic():
                update_fields = []
                if role_action == "assign":
                    user.system_role = role
                    update_fields.append("system_role")
                if office_action == "assign":
                    if target_directorate and user.directorate_id is None:
                        user.directorate = target_directorate
                        update_fields.append("directorate")
                    if target_division and user.division_id is None:
                        user.division = target_division
                        update_fields.append("division")
                    if target_department and user.department_id is None:
                        user.department = target_department
                        update_fields.append("department")
                    if update_fields:
                        user.save(update_fields=update_fields)
                    assignment_role = self._assignment_role(role)
                    membership, created = OfficeMembership.objects.get_or_create(
                        office=office,
                        user=user,
                        assignment_role=assignment_role,
                        defaults={
                            "is_primary": True,
                            "can_register": bool(
                                role.permissions.get("can_register_correspondence")
                            )
                            if role
                            else False,
                            "can_route": True,
                            "can_approve": bool(
                                role and role.permissions.get("can_approve")
                            ),
                        },
                    )
                    if not created:
                        membership.is_active = True
                        membership.is_primary = True
                        membership.can_register = bool(
                            role.permissions.get("can_register_correspondence")
                        ) if role else False
                        membership.can_route = True
                        membership.can_approve = bool(
                            role and role.permissions.get("can_approve")
                        )
                        membership.save(
                            update_fields=[
                                "is_active",
                                "is_primary",
                                "can_register",
                                "can_route",
                                "can_approve",
                            ]
                        )
                elif update_fields:
                    user.save(update_fields=update_fields)

        out_path = options.get("out") or path.with_name(
            f"{path.stem}-role-office-mapping.csv"
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
        status_summary = ", ".join(
            f"{key}={value}" for key, value in sorted(status_counts.items())
        )
        mode = "APPLIED" if options["apply"] else "DRY RUN"
        self.stdout.write(self.style.SUCCESS(f"{mode}: wrote {out_path}"))
        self.stdout.write(f"Rows inspected: {len(data_rows)}")
        self.stdout.write(summary or "No assignments.")
        self.stdout.write(f"Status: {status_summary or 'none'}")

    @staticmethod
    def _assignment_role(role) -> str:
        if role and role.name in {
            "Managing Director",
            "Executive Director",
            "General Manager",
            "Assistant General Manager",
            "Principal Manager",
        }:
            return OfficeMembership.AssignmentRole.PRINCIPAL
        if role and role.name in {"Secretary", "Personal Assistant"}:
            return OfficeMembership.AssignmentRole.SECRETARIAT
        return OfficeMembership.AssignmentRole.STAFF
