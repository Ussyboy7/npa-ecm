"""The grade backfill keeps stored users on the canonical hierarchy.

Retired General Manager codes and the management flag are denormalised copies
of the served grade hierarchy, so a data migration aligns both with
``common.grade_utils`` instead of leaving people ranked as unknown grades or
mis-labelled in the admin and exports.

Rows are seeded with ``queryset.update()`` because ``User.save()`` now derives
both fields; the migration exists for data written before that rule.
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
    def _legacy_user(self, username, grade_level, is_management=False):
        """Create a row as an older release would have stored it."""
        user = User.objects.create_user(
            username=username,
            password="x",
            grade_level="SSS2",
        )
        User.objects.filter(pk=user.pk).update(
            grade_level=grade_level,
            is_management=is_management,
        )
        user.refresh_from_db()
        return user

    def test_maps_retired_general_manager_codes(self):
        gm = self._legacy_user("legacy-gm", "GMCS")
        agm = self._legacy_user("legacy-agm", "AGMCS")
        padded = self._legacy_user("legacy-padded", "  agmcs ")

        run_backfill()

        for user, code in ((gm, "MSS1"), (agm, "MSS2"), (padded, "MSS2")):
            user.refresh_from_db()
            self.assertEqual(user.grade_level, code)
            self.assertTrue(user.is_management)

    def test_marks_assistant_managers_as_management(self):
        assistant_manager = self._legacy_user("assistant-manager", "SSS1")
        self.assertFalse(assistant_manager.is_management)

        run_backfill()

        assistant_manager.refresh_from_db()
        self.assertTrue(assistant_manager.is_management)

    def test_marks_the_whole_management_band_without_touching_officers(self):
        principal_manager = self._legacy_user("principal-manager", "MSS3")
        senior_manager = self._legacy_user("senior-manager", "MSS4")
        officer = self._legacy_user("senior-officer", "SSS2")
        staff = self._legacy_user("staff-one", "JSS1")

        run_backfill()

        for user in (principal_manager, senior_manager):
            user.refresh_from_db()
            self.assertTrue(user.is_management)
        for user in (officer, staff):
            user.refresh_from_db()
            self.assertFalse(user.is_management)

    def test_is_idempotent(self):
        assistant_manager = self._legacy_user("assistant-manager-twice", "SSS1")
        legacy_gm = self._legacy_user("legacy-gm-twice", "GMCS")

        run_backfill()
        run_backfill()

        assistant_manager.refresh_from_db()
        legacy_gm.refresh_from_db()
        self.assertTrue(assistant_manager.is_management)
        self.assertEqual(legacy_gm.grade_level, "MSS1")
