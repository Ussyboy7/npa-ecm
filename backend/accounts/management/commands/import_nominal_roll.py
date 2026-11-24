"""Create or refresh user accounts from the NPA nominal roll.

Existing users are matched by employee number, person number, known admin
username, exact name for management accounts, or email. Existing accounts are
updated in place so roles, offices, signatures, and audit history are retained.
Users are never deleted.

New accounts receive no shared password. Instead the command writes a CSV of
single-use, expiring set-password links that can be distributed securely.
"""

from __future__ import annotations

import csv
import os
import re
from pathlib import Path
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from common.grade_utils import grade_is_management, normalise_grade_code

from accounts.models import User


HEADER_ALIASES = {
    "employee_number": {"employee number", "employee no", "employee id"},
    "personnel_number": {"person no.", "person no", "personnel number", "personnel no"},
    "honorific": {"title", "honorific"},
    "last_name": {"surname", "last name"},
    "first_name": {"first name", "firstname"},
    "middle_name": {"middle name", "middlename"},
    "grade_level": {"grade level", "grade"},
    "designation": {"designation", "job title"},
    "email": {"email address", "email"},
}

# Existing real accounts whose username is intentionally not their email local
# part. These are updated in place even when the roll uses a different email.
KNOWN_EMPLOYEE_USERNAMES = {
    "3509": "md",  # Managing Director
}

# Accounts that must keep access even if they do not appear in the roll.
PROTECTED_USERNAMES = {"superadmin", "md", "agmsoftware"}

MANAGEMENT_ROLE_NAMES = {
    "super admin",
    "managing director",
    "executive director",
    "general manager",
    "assistant general manager",
}

DEFAULT_INITIAL_PASSWORD = "ChangeMe123!"


def _text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _email(value) -> str:
    """Normalize workbook email placeholders as a missing email."""
    email = _text(value).lower()
    return "" if email in {"nan", "none", "null", "n/a", "na"} else email


def _header_key(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", _text(value).lower())


def _username_base(email: str, employee_number: str) -> str:
    source = email.split("@", 1)[0].lower() if email else ""
    source = re.sub(r"[^a-z0-9._-]", "", source)
    if source:
        return source
    digits = re.sub(r"[^a-z0-9]", "", employee_number.lower())
    return f"npa{digits}" if digits else "npa-user"


def _is_management_account(user: User) -> bool:
    if user.is_superuser or user.is_staff:
        return True
    role_name = (user.system_role.name if user.system_role_id else "").strip().lower()
    return role_name in MANAGEMENT_ROLE_NAMES


def _admin_name_matches(candidates, values, used_ids: set[int]):
    """Return management users whose first/last name matches the roll row.

    Name matching is intentionally restricted to management accounts and must
    be unique. It handles both NPA's surname-first roll order and the existing
    first-name-first account records.
    """

    roll_first = _norm(values.get("first_name", ""))
    roll_last = _norm(values.get("last_name", ""))
    if not roll_first or not roll_last:
        return []

    roll_pairs = {
        (roll_first, roll_last),
        (roll_last, roll_first),
    }
    matches = []
    for candidate in candidates:
        if candidate.pk in used_ids:
            continue
        first = _norm(candidate.first_name)
        last = _norm(candidate.last_name)
        if not first or not last:
            continue
        candidate_pairs = {(first, last), (last, first)}
        if candidate_pairs & roll_pairs:
            matches.append(candidate)
    return matches


def _first_login_url(user: User, base_url: str) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    query = urlencode({"uid": uid, "token": token})
    return f"{base_url.rstrip('/')}/set-password?{query}"


def _write_first_login_file(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "employee_number",
                "personnel_number",
                "full_name",
                "email",
                "username",
                "setup_url",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


class Command(BaseCommand):
    help = (
        "Import the NPA nominal roll into user accounts. Existing accounts are "
        "matched and updated; audit history is never deleted."
    )

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path, help="Path to the nominal-roll .xlsx file")
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write changes. Without this flag the command only reports what it would do.",
        )
        parser.add_argument(
            "--password",
            default=DEFAULT_INITIAL_PASSWORD,
            help=(
                "Initial password for new or unusable accounts. Defaults to "
                f"{DEFAULT_INITIAL_PASSWORD}. Pass an empty string to generate "
                "one-time set-password links instead."
            ),
        )
        parser.add_argument(
            "--first-login-out",
            type=Path,
            default=None,
            help=(
                "CSV path for one-time set-password links when --password is empty. Defaults to "
                "<roll name>-first-login.csv next to the workbook."
            ),
        )
        parser.add_argument(
            "--first-login-base-url",
            default="",
            help=(
                "Public frontend origin used in first-login links. Defaults to "
                "PUBLIC_APP_ORIGIN or FRONTEND_BASE_URL."
            ),
        )
        parser.add_argument(
            "--deactivate-missing",
            action="store_true",
            help=(
                "Deactivate non-superuser accounts that are not present in the roll. "
                "Never deletes users or their minutes, and never deactivates known "
                "protected admin accounts."
            ),
        )

    def handle(self, *args, **options):
        path: Path = options["file"]
        if not path.exists():
            raise CommandError(f"Nominal roll not found: {path}")
        if path.suffix.lower() not in {".xlsx", ".xlsm"}:
            raise CommandError("Expected an .xlsx nominal-roll workbook.")

        try:
            from openpyxl import load_workbook
        except ImportError as exc:
            raise CommandError(
                "openpyxl is required. Install backend requirements and retry."
            ) from exc

        workbook = load_workbook(path, read_only=True, data_only=True)
        sheet = workbook.active
        rows = sheet.iter_rows(values_only=True)

        header_row = None
        column_map: dict[str, int] = {}
        for row in rows:
            keys = [_header_key(_text(cell)) for cell in row]
            candidate: dict[str, int] = {}
            for field, aliases in HEADER_ALIASES.items():
                for index, key in enumerate(keys):
                    if key in aliases:
                        candidate[field] = index
                        break
            if {"last_name", "first_name", "employee_number"} <= candidate.keys():
                header_row = row
                column_map = candidate
                break

        if header_row is None:
            raise CommandError(
                "Could not find a header row containing Employee Number, Surname, and First Name."
            )

        apply = options["apply"]
        password = options["password"]
        base_url = (
            options["first_login_base_url"]
            or getattr(settings, "PUBLIC_APP_ORIGIN", "")
            or getattr(settings, "FRONTEND_BASE_URL", "")
        ).rstrip("/")
        if apply and not password and not base_url:
            raise CommandError(
                "A public frontend URL is required to generate first-login links. "
                "Set PUBLIC_APP_ORIGIN or pass --first-login-base-url."
            )
        if apply and not password and "localhost" in base_url:
            self.stderr.write(
                self.style.WARNING(
                    "First-login links use a localhost URL and will not work on "
                    "another device. Pass --first-login-base-url with the public URL."
                )
            )

        seen_ids: set[str] = set()
        seen_personnel: set[str] = set()
        seen_emails: set[str] = set()
        matched_user_ids: set[int] = set()
        first_login_rows: list[dict[str, str]] = []
        created = updated = skipped = ambiguous = password_updates = 0

        management_candidates = [
            user
            for user in User.objects.select_related("system_role").filter(is_active=True)
            if _is_management_account(user)
        ]

        with transaction.atomic():
            for row in rows:
                values = {
                    field: _text(row[index]) if index < len(row) else ""
                    for field, index in column_map.items()
                }
                # Store the normalised code and derive the management flag from it.
                grade_level = normalise_grade_code(values.get("grade_level", ""))
                employee_number = values.get("employee_number", "")
                first_name = values.get("first_name", "")
                last_name = values.get("last_name", "")
                email = _email(values.get("email", ""))

                if not any((employee_number, first_name, last_name, email)):
                    continue
                if not employee_number or not last_name or not first_name:
                    skipped += 1
                    self.stderr.write(
                        f"Skipped incomplete row: {last_name!r}, {first_name!r}, {employee_number!r}"
                    )
                    continue
                if employee_number in seen_ids:
                    skipped += 1
                    self.stderr.write(f"Skipped duplicate employee number: {employee_number}")
                    continue
                seen_ids.add(employee_number)

                personnel_number = values.get("personnel_number", "")
                if personnel_number:
                    personnel_key = personnel_number.casefold()
                    if personnel_key in seen_personnel:
                        skipped += 1
                        self.stderr.write(
                            f"Skipped duplicate person number: {personnel_number}"
                        )
                        continue
                    seen_personnel.add(personnel_key)

                if email:
                    if email in seen_emails:
                        skipped += 1
                        self.stderr.write(f"Skipped duplicate email: {email}")
                        continue
                    seen_emails.add(email)

                user = User.objects.filter(employee_id=employee_number).first()
                match_reason = "employee number"
                if user is None and values.get("personnel_number"):
                    user = User.objects.filter(
                        personnel_number__iexact=values["personnel_number"]
                    ).first()
                    match_reason = "person number"

                if user is None:
                    known_username = KNOWN_EMPLOYEE_USERNAMES.get(employee_number)
                    if known_username:
                        user = User.objects.filter(username=known_username).first()
                        match_reason = f"known admin username {known_username}"

                if user is None and grade_is_management(grade_level):
                    name_matches = _admin_name_matches(
                        management_candidates, values, matched_user_ids
                    )
                    if len(name_matches) == 1:
                        user = name_matches[0]
                        match_reason = "management name match"
                    elif len(name_matches) > 1:
                        ambiguous += 1
                        skipped += 1
                        self.stderr.write(
                            "Skipped ambiguous management-name match: "
                            f"{first_name} {last_name} ({employee_number})"
                        )
                        continue

                if user is None and email:
                    email_matches = list(User.objects.filter(email__iexact=email)[:2])
                    if len(email_matches) == 1:
                        user = email_matches[0]
                        match_reason = "email"

                if user is not None:
                    matched_user_ids.add(user.pk)

                if user is None:
                    if email and User.objects.filter(email__iexact=email).exists():
                        skipped += 1
                        self.stderr.write(
                            f"Skipped {first_name} {last_name} ({employee_number}): "
                            f"email {email} already belongs to another account."
                        )
                        continue

                    username = _username_base(email, employee_number)
                    base = username
                    suffix = 2
                    while User.objects.filter(username__iexact=username).exists():
                        username = f"{base}{suffix}"
                        suffix += 1
                    user = User(
                        username=username,
                        email=email,
                        employee_id=employee_number,
                        first_name=first_name,
                        middle_name=values.get("middle_name", ""),
                        last_name=last_name,
                        honorific=values.get("honorific", ""),
                        personnel_number=values.get("personnel_number", ""),
                        grade_level=grade_level,
                        designation=values.get("designation", ""),
                        is_management=grade_is_management(grade_level),
                        is_active=True,
                    )
                    if password:
                        user.set_password(password)
                    else:
                        user.set_unusable_password()
                    if apply:
                        user.save()
                        matched_user_ids.add(user.pk)
                    created += 1
                    if apply and not password and not user.has_usable_password():
                        first_login_rows.append(
                            {
                                "employee_number": employee_number,
                                "personnel_number": values.get("personnel_number", ""),
                                "full_name": " ".join(filter(None, [first_name, last_name])),
                                "email": email,
                                "username": user.username,
                                "setup_url": _first_login_url(user, base_url),
                            }
                        )
                    continue

                conflict = (
                    User.objects.filter(employee_id=employee_number)
                    .exclude(pk=user.pk)
                    .exists()
                )
                if conflict:
                    skipped += 1
                    self.stderr.write(
                        f"Skipped {first_name} {last_name}: employee number "
                        f"{employee_number} already belongs to another account."
                    )
                    continue

                # Identity fields only. Never overwrite role, office, active
                # status, password, signature, or superuser/staff access.
                user.employee_id = employee_number
                user.first_name = first_name
                user.middle_name = values.get("middle_name", "")
                user.last_name = last_name
                user.honorific = values.get("honorific", "")
                user.personnel_number = values.get("personnel_number", "")
                user.grade_level = grade_level
                user.designation = values.get("designation", "")
                if email:
                    user.email = email
                if apply:
                    update_fields = [
                        "employee_id",
                        "first_name",
                        "middle_name",
                        "last_name",
                        "honorific",
                        "personnel_number",
                        "grade_level",
                        "designation",
                        "email",
                    ]
                    # User.save() derives is_management from grade_level.
                    if password and not user.has_usable_password():
                        user.set_password(password)
                        update_fields.append("password")
                        password_updates += 1
                    user.save(update_fields=update_fields)
                updated += 1
                if (
                    apply
                    and not password
                    and user.is_active
                    and not user.has_usable_password()
                ):
                    first_login_rows.append(
                        {
                            "employee_number": employee_number,
                            "personnel_number": user.personnel_number,
                            "full_name": " ".join(filter(None, [first_name, last_name])),
                            "email": user.email,
                            "username": user.username,
                            "setup_url": _first_login_url(user, base_url),
                        }
                    )

                if apply:
                    self.stdout.write(
                        f"Updated {user.username} in place via {match_reason}."
                    )

            deactivated = 0
            if options["deactivate_missing"]:
                missing = (
                    User.objects.filter(
                        is_active=True,
                        is_superuser=False,
                        is_staff=False,
                    )
                    .exclude(pk__in=matched_user_ids)
                    .exclude(username__in=PROTECTED_USERNAMES)
                )
                deactivated = missing.count()
                if apply:
                    missing.update(is_active=False)

        setup_count = len(first_login_rows)
        if apply and first_login_rows:
            output_path = options["first_login_out"] or path.with_name(
                f"{path.stem}-first-login.csv"
            )
            _write_first_login_file(output_path, first_login_rows)
        else:
            output_path = None

        mode = "APPLIED" if apply else "DRY RUN"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}: {created} created, {updated} updated, "
                f"{skipped} skipped ({ambiguous} ambiguous), {deactivated} deactivated, "
                f"{password_updates} passwords set, {setup_count} first-login links."
            )
        )
        if output_path:
            self.stdout.write(
                self.style.WARNING(
                    f"First-login links written to {output_path} (mode 0600). "
                    "Distribute each link privately; it is single-use and expires."
                )
            )
        if created and not password and not apply:
            self.stdout.write(
                "New accounts would receive one-time set-password links; no shared "
                "password will be created."
            )
        if apply and password and (created or password_updates):
            self.stdout.write(
                self.style.WARNING(
                    f"New/unusable accounts now use the initial password "
                    f"{DEFAULT_INITIAL_PASSWORD}. Ask users to change it after sign-in."
                )
            )
        if deactivated and not apply:
            self.stdout.write(
                "Missing accounts would be deactivated; rerun with --apply "
                "--deactivate-missing to apply."
            )
