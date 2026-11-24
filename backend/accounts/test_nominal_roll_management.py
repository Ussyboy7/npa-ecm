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
from django.test import TestCase

from accounts.models import User

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

    def test_retired_codes_are_stored_canonically_from_the_roll(self):
        self._import(
            [
                self._row("9201", "LEGACYGM", "GMCS", "GENERAL MANAGER"),
                self._row("9202", "LEGACYAGM", "AGMCS", "ASST. GENERAL MANAGER"),
            ]
        )

        gm = User.objects.get(employee_id="9201")
        agm = User.objects.get(employee_id="9202")

        self.assertEqual(gm.grade_level, "MSS1")
        self.assertEqual(agm.grade_level, "MSS2")
        self.assertTrue(gm.is_management)
        self.assertTrue(agm.is_management)

    def test_reimport_sets_management_for_an_existing_assistant_manager(self):
        existing = User.objects.create_user(
            username="existing-assistant-manager",
            password="x",
            employee_id="9301",
            grade_level="SSS1",
        )
        self.assertFalse(existing.is_management)

        self._import([self._row("9301", "ASSISTANT", "SSS1", "ASSISTANT MANAGER")])

        existing.refresh_from_db()
        self.assertTrue(existing.is_management)

    def test_reimport_keeps_a_manual_management_grant(self):
        existing = User.objects.create_user(
            username="manually-granted",
            password="x",
            employee_id="9302",
            grade_level="SSS3",
            is_management=True,
        )

        self._import([self._row("9302", "GRANTED", "SSS3", "OFFICER I")])

        existing.refresh_from_db()
        self.assertTrue(existing.is_management)
