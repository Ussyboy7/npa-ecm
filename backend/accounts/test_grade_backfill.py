"""The grade backfill keeps stored users on the canonical hierarchy.

Retired General Manager codes and the management flag are denormalised copies
of the served grade hierarchy, so a data migration aligns both with
``common.grade_utils`` instead of leaving people ranked as unknown grades or
mis-labelled in the admin and exports.
"""

from importlib import import_module

from django.apps import apps as django_apps
from django.test import TestCase

from accounts.models import User

MIGRATION = import_module(
    "accounts.migrations.0023_backfill_canonical_grades"
)


def run_backfill():
    MIGRATION.backfill_canonical_grades(django_apps, None)


class CanonicalGradeBackfillTests(TestCase):
    def _user(self, username, grade_level, **extra):
        return User.objects.create_user(
            username=username,
            password="x",
            grade_level=grade_level,
            **extra,
        )

    def test_maps_retired_general_manager_codes(self):
        gm = self._user("legacy-gm", "GMCS")
        agm = self._user("legacy-agm", "AGMCS")
        padded = self._user("legacy-padded", "  agmcs ")

        run_backfill()

        for user, code in ((gm, "MSS1"), (agm, "MSS2"), (padded, "MSS2")):
            user.refresh_from_db()
            self.assertEqual(user.grade_level, code)
            self.assertTrue(user.is_management)

    def test_marks_assistant_managers_as_management(self):
        assistant_manager = self._user("assistant-manager", "SSS1")
        self.assertFalse(assistant_manager.is_management)

        run_backfill()

        assistant_manager.refresh_from_db()
        self.assertTrue(assistant_manager.is_management)

    def test_marks_the_whole_management_band_without_touching_officers(self):
        principal_manager = self._user("principal-manager", "MSS3")
        senior_manager = self._user("senior-manager", "MSS4")
        officer = self._user("senior-officer", "SSS2")
        staff = self._user("staff-one", "JSS1")

        run_backfill()

        for user in (principal_manager, senior_manager):
            user.refresh_from_db()
            self.assertTrue(user.is_management)
        for user in (officer, staff):
            user.refresh_from_db()
            self.assertFalse(user.is_management)

    def test_is_idempotent(self):
        assistant_manager = self._user("assistant-manager-twice", "SSS1")
        legacy_gm = self._user("legacy-gm-twice", "GMCS")

        run_backfill()
        run_backfill()

        assistant_manager.refresh_from_db()
        legacy_gm.refresh_from_db()
        self.assertTrue(assistant_manager.is_management)
        self.assertEqual(legacy_gm.grade_level, "MSS1")
