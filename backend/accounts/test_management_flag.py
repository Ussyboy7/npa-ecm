"""`is_management` is derived state of the grade, on every write path.

Accounts are edited from the admin, the people API, CSV import and management
commands, not only from the nominal roll. Deriving the flag in the model keeps
all of them consistent with the served catalogue.
"""

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


class DerivedManagementFlagTests(TestCase):
    def test_created_accounts_take_the_flag_from_their_grade(self):
        expectations = {
            "MDCS": True,
            "MSS1": True,
            "MSS5": True,
            "SSS1": True,
            "SSS2": False,
            "JSS1": False,
            "": False,
        }

        for index, (grade_level, expected) in enumerate(expectations.items()):
            user = User.objects.create_user(
                username=f"derived-{index}",
                password="x",
                grade_level=grade_level,
            )
            self.assertEqual(
                user.is_management,
                expected,
                msg=f"{grade_level or '<blank>'} should be management={expected}",
            )

    def test_manual_grant_on_a_non_management_grade_is_cleared(self):
        user = User.objects.create_user(
            username="manual-grant",
            password="x",
            grade_level="SSS3",
            is_management=True,
        )

        self.assertFalse(user.is_management)

    def test_grade_change_clears_the_flag_when_saving_grade_only(self):
        user = User.objects.create_user(
            username="demoted-manager",
            password="x",
            grade_level="MSS1",
        )
        self.assertTrue(user.is_management)

        user.grade_level = "SSS3"
        user.save(update_fields=["grade_level"])

        user.refresh_from_db()
        self.assertFalse(user.is_management)

    def test_saving_an_unrelated_field_repairs_a_stale_flag(self):
        # A legacy row written with queryset.update() bypasses save().
        user = User.objects.create_user(
            username="stale-flag",
            password="x",
            grade_level="SSS1",
        )
        User.objects.filter(pk=user.pk).update(is_management=False)

        user.refresh_from_db()
        user.first_name = "Repaired"
        user.save(update_fields=["first_name"])

        user.refresh_from_db()
        self.assertTrue(user.is_management)

    def test_grade_text_is_stored_normalised(self):
        user = User.objects.create_user(
            username="normalised-text",
            password="x",
            grade_level="  sss1 ",
        )

        user.refresh_from_db()
        self.assertEqual(user.grade_level, "SSS1")
        self.assertTrue(user.is_management)


class UserApiDerivedManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="flag-admin",
            email="flag-admin@example.com",
            password="Str0ngPassw0rd!77",
        )
        self.client.force_authenticate(user=self.admin)

    def test_create_derives_the_flag_even_when_the_client_says_otherwise(self):
        response = self.client.post(
            "/api/v1/accounts/users/",
            {
                "username": "api-assistant-manager",
                "password": "Str0ngPassw0rd!77",
                "grade_level": "SSS1",
                "is_management": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        created = User.objects.get(username="api-assistant-manager")
        self.assertTrue(created.is_management)
        self.assertTrue(response.data["is_management"])

    def test_update_derives_the_flag_from_the_new_grade(self):
        user = User.objects.create_user(
            username="api-demoted",
            password="Str0ngPassw0rd!77",
            grade_level="MSS1",
        )
        self.assertTrue(user.is_management)

        response = self.client.patch(
            f"/api/v1/accounts/users/{user.pk}/",
            {"grade_level": "SSS4"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        user.refresh_from_db()
        self.assertFalse(user.is_management)
