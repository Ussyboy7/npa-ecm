"""The nominal-roll importer derives management status from the grade.

`is_management` is a stored copy of the canonical management band. Seeding from
the roll used to write `grade_level` only, so every seeded account landed with
the field's default `False`; these tests keep the importer from reintroducing
that drift.
"""

from __future__ import annotations

import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.db import connection
from django.test import TestCase

from accounts.models import User


def force_stored_values(user, **values):
    """Write columns directly, as a pre-derivation release would have."""
    assignments = ", ".join(f"{field} = %s" for field in values)
    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE accounts_user SET {assignments} WHERE id = %s",
            [*values.values(), user.pk],
        )

ROLL_HEADERS = [
    "Employee Number",
    "Person No.",
    "Title",
    "Surname",
    "First Name",
    "Middle Name",
    "Grade Level",
    "Designation",
    "Email Address",
]


def write_roll(path: Path, rows: list[list[str]]) -> Path:
    from openpyxl import Workbook

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(ROLL_HEADERS)
    for row in rows:
        sheet.append(row)
    workbook.save(path)
    return path


class NominalRollManagementFlagTests(TestCase):
    def _import(self, rows: list[list[str]]) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = write_roll(Path(tmp) / "roll.xlsx", rows)
            call_command(
                "import_nominal_roll",
                path,
                "--apply",
                stdout=StringIO(),
                stderr=StringIO(),
            )

    def _row(self, employee_number, surname, grade, designation="OFFICER"):
        return [
            employee_number,
            f"A{employee_number}",
            "Mr.",
            surname,
            "TEST",
            "",
            grade,
            designation,
            f"{surname.lower()}@nigerianports.gov.ng",
        ]

    def test_new_accounts_take_management_status_from_their_grade(self):
        self._import(
            [
                self._row("9101", "MANAGER", "MSS1", "GENERAL MANAGER"),
                self._row("9102", "ASSISTANT", "SSS1", "ASSISTANT MANAGER"),
                self._row("9103", "OFFICER", "SSS2", "SENIOR OFFICER"),
                self._row("9104", "STAFF", "JSS1", "STAFF I"),
            ]
        )

        users = {
            user.employee_id: user
            for user in User.objects.filter(
                employee_id__in=["9101", "9102", "9103", "9104"]
            )
        }

        self.assertTrue(users["9101"].is_management)
        self.assertTrue(users["9102"].is_management)
        self.assertFalse(users["9103"].is_management)
        self.assertFalse(users["9104"].is_management)

    def test_reimport_sets_management_for_an_existing_assistant_manager(self):
        existing = User.objects.create_user(
            username="existing-assistant-manager",
            password="x",
            employee_id="9301",
            grade_level="SSS1",
        )
        # Simulate a row seeded before the flag was derived.
        force_stored_values(existing, is_management=False)
        existing.refresh_from_db()
        self.assertFalse(existing.is_management)

        self._import([self._row("9301", "ASSISTANT", "SSS1", "ASSISTANT MANAGER")])

        existing.refresh_from_db()
        self.assertTrue(existing.is_management)

    def test_reimport_clears_a_flag_that_contradicts_the_grade(self):
        existing = User.objects.create_user(
            username="manually-granted",
            password="x",
            employee_id="9302",
            grade_level="SSS3",
        )
        # Simulate a legacy manual grant that contradicts the grade.
        force_stored_values(existing, is_management=True)
        existing.refresh_from_db()
        self.assertTrue(existing.is_management)

        self._import([self._row("9302", "GRANTED", "SSS3", "OFFICER I")])

        existing.refresh_from_db()
        self.assertFalse(existing.is_management)
