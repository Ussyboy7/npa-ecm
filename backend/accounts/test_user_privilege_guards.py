from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from organization.models import Role

from .models import User


class UserPrivilegeGuardTests(APITestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(
            name="User Manager",
            permissions={"can_manage_users": True},
        )
        self.admin = User.objects.create_user(
            username="user-manager",
            password="testpass123",
            system_role=self.admin_role,
        )
        self.officer_role = Role.objects.create(
            name="Officer I",
            permissions={"can_register_correspondence": True},
            is_system=True,
        )
        self.target = User.objects.create_user(
            username="target-user",
            password="testpass123",
            system_role=self.officer_role,
        )
        self.super_role = Role.objects.create(
            name="Super Admin",
            permissions={"can_manage_users": True, "can_manage_roles": True},
            is_system=True,
        )
        self.superuser = User.objects.create_superuser(
            username="root-admin",
            email="root@example.com",
            password="testpass123",
            system_role=self.super_role,
        )
        self.client.force_authenticate(self.admin)
        self.target_url = reverse("api_v1:user-detail", args=[self.target.id])
        self.admin_url = reverse("api_v1:user-detail", args=[self.admin.id])
        self.superuser_url = reverse("api_v1:user-detail", args=[self.superuser.id])

    def test_non_superuser_cannot_set_superuser_flags(self):
        response = self.client.patch(
            self.target_url,
            {"is_superuser": True, "is_staff": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_superuser)
        self.assertFalse(self.target.is_staff)

    def test_non_superuser_cannot_assign_a_privileged_role(self):
        response = self.client.patch(
            self.target_url,
            {"system_role": str(self.super_role.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.target.refresh_from_db()
        self.assertEqual(self.target.system_role_id, self.officer_role.id)

    def test_non_superuser_cannot_change_their_own_role(self):
        response = self.client.patch(
            self.admin_url,
            {"system_role": str(self.officer_role.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.system_role_id, self.admin_role.id)

    def test_non_superuser_cannot_clear_their_own_role(self):
        response = self.client.patch(
            self.admin_url,
            {"system_role": None},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.system_role_id, self.admin_role.id)

    def test_non_superuser_cannot_modify_a_superuser(self):
        response = self.client.patch(
            self.superuser_url,
            {"first_name": "Hacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.superuser.refresh_from_db()
        self.assertNotEqual(self.superuser.first_name, "Hacked")

    def test_non_superuser_cannot_reset_a_superuser_password(self):
        response = self.client.patch(
            self.superuser_url,
            {"password": "NewPassword123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_superuser_cannot_reset_a_privileged_role_password(self):
        privileged_role = Role.objects.create(
            name="Privileged Manager",
            permissions={"can_manage_roles": True},
        )
        privileged_user = User.objects.create_user(
            username="privileged-manager",
            password="testpass123",
            system_role=privileged_role,
        )
        url = reverse("api_v1:user-detail", args=[privileged_user.id])

        response = self.client.patch(url, {"password": "NewPassword123!"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        privileged_user.refresh_from_db()
        self.assertTrue(privileged_user.check_password("testpass123"))

    def test_non_superuser_cannot_reset_a_staff_account_password(self):
        staff_user = User.objects.create_user(
            username="staff-account",
            password="testpass123",
            system_role=self.officer_role,
            is_staff=True,
        )
        url = reverse("api_v1:user-detail", args=[staff_user.id])

        response = self.client.patch(url, {"password": "NewPassword123!"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        staff_user.refresh_from_db()
        self.assertTrue(staff_user.check_password("testpass123"))

    def test_non_superuser_cannot_raise_their_own_grade_through_the_user_endpoint(self):
        response = self.client.patch(
            self.admin_url,
            {"grade_level": "MDCS"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.admin.refresh_from_db()
        self.assertNotEqual(self.admin.grade_level, "MDCS")

    def test_non_superuser_can_update_their_own_profile_with_unchanged_admin_fields(self):
        response = self.client.patch(
            self.admin_url,
            {
                "first_name": "Manager",
                "grade_level": self.admin.grade_level,
                "is_active": self.admin.is_active,
                "system_role": str(self.admin_role.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.first_name, "Manager")

    def test_non_superuser_cannot_reset_their_own_password_through_the_user_endpoint(self):
        response = self.client.patch(
            self.admin_url,
            {"password": "NewPassword123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("testpass123"))

    def test_initial_password_setup_rejects_a_superuser_account(self):
        response = self.client.post(
            reverse("api_v1:initial_password_set"),
            self._setup_payload(self.superuser),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.check_password("testpass123"))

    def test_initial_password_setup_rejects_a_privileged_role_account(self):
        privileged_role = Role.objects.create(
            name="Setup Blocked Role",
            permissions={"can_manage_users": True},
        )
        privileged_user = User.objects.create_user(
            username="setup-privileged",
            password="testpass123",
            system_role=privileged_role,
        )

        response = self.client.post(
            reverse("api_v1:initial_password_set"),
            self._setup_payload(privileged_user),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        privileged_user.refresh_from_db()
        self.assertTrue(privileged_user.check_password("testpass123"))

    @staticmethod
    def _setup_payload(user):
        return {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!",
        }

    def test_non_superuser_cannot_bulk_delete_a_superuser(self):
        response = self.client.post(
            "/api/v1/accounts/users/bulk-delete/",
            {"user_ids": [self.superuser.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.superuser.pk).exists())

    def test_last_active_superuser_cannot_be_deactivated(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.patch(
            self.superuser_url,
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_active)

    def test_last_active_superuser_cannot_be_deleted(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.delete(self.superuser_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.superuser.pk).exists())

    def test_last_active_superuser_cannot_be_bulk_deactivated(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.post(
            "/api/v1/accounts/users/bulk-deactivate/",
            {"user_ids": [self.superuser.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_active)

    def _create_payload(self, **overrides):
        payload = {
            "username": "created-officer",
            "password": "Str0ngPassw0rd!77",
            "grade_level": "SSS3",
        }
        payload.update(overrides)
        return payload

    def test_non_superuser_cannot_create_an_account_with_an_elevated_grade(self):
        response = self.client.post(
            reverse("api_v1:user-list"),
            self._create_payload(grade_level="MDCS"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="created-officer").exists())

    def test_non_superuser_can_create_an_ordinary_staff_account(self):
        response = self.client.post(
            reverse("api_v1:user-list"),
            self._create_payload(grade_level="SSS3"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(
            User.objects.get(username="created-officer").grade_level, "SSS3"
        )

    def test_non_superuser_cannot_assign_an_integration_role(self):
        integration_role = Role.objects.create(
            name="Integration Manager",
            permissions={"can_manage_integration": True},
        )

        response = self.client.patch(
            self.target_url,
            {"system_role": str(integration_role.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.target.refresh_from_db()
        self.assertEqual(self.target.system_role_id, self.officer_role.id)
