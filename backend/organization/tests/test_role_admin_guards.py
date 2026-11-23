from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organization.models import Department, Directorate, Division, Office, OfficeMembership, Role
from organization.permission_utils import get_role_permissions
from organization.permissions_catalog import ROLE_PERMISSION_PRESETS


User = get_user_model()


class RoleAdminGuardTests(APITestCase):
    def setUp(self):
        self.manager_role = Role.objects.create(
            name="Role Manager",
            permissions={"can_manage_roles": True},
        )
        self.manager = User.objects.create_user(
            username="role-manager",
            password="testpass123",
            system_role=self.manager_role,
        )
        self.system_role = Role.objects.create(
            name="Officer I",
            permissions={
                "can_register_correspondence": True,
                "can_treat_correspondence": True,
            },
            is_system=True,
        )
        self.super_role = Role.objects.create(
            name="Super Admin",
            permissions={"can_manage_roles": True, "can_manage_users": True},
            is_system=True,
        )
        self.superuser = User.objects.create_superuser(
            username="root-admin",
            email="root@example.com",
            password="testpass123",
            system_role=self.super_role,
        )
        self.client.force_authenticate(self.manager)
        self.detail_url = reverse("api_v1:role-detail", args=[self.system_role.id])

    def test_system_role_cannot_be_renamed(self):
        response = self.client.patch(
            self.detail_url,
            {"name": "Renamed Officer"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.system_role.refresh_from_db()
        self.assertEqual(self.system_role.name, "Officer I")

    def test_system_role_cannot_be_deactivated(self):
        response = self.client.patch(
            self.detail_url,
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.system_role.refresh_from_db()
        self.assertTrue(self.system_role.is_active)

    def test_system_role_cannot_be_deleted(self):
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Role.objects.filter(pk=self.system_role.pk).exists())

    def test_non_superuser_cannot_assign_super_admin_role(self):
        response = self.client.post(
            "/api/v1/organization/roles/bulk-assign/",
            {"role_id": str(self.super_role.id), "user_ids": [str(self.manager.id)]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.manager.refresh_from_db()
        self.assertEqual(self.manager.system_role_id, self.manager_role.id)

    def test_superuser_can_assign_super_admin_role(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.post(
            "/api/v1/organization/roles/bulk-assign/",
            {"role_id": str(self.super_role.id), "user_ids": [str(self.manager.id)]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manager.refresh_from_db()
        self.assertEqual(self.manager.system_role_id, self.super_role.id)

    def test_permission_toggle_preserves_other_permissions(self):
        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/can_view_registry/",
            {"enabled": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.system_role.refresh_from_db()
        self.assertTrue(self.system_role.permissions["can_register_correspondence"])
        self.assertTrue(self.system_role.permissions["can_treat_correspondence"])
        self.assertTrue(self.system_role.permissions["can_view_registry"])

    def test_bulk_permission_update_merges_only_provided_keys(self):
        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/",
            {
                "permissions": {
                    "can_register_correspondence": False,
                    "can_view_registry": True,
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.system_role.refresh_from_db()
        self.assertFalse(self.system_role.permissions["can_register_correspondence"])
        self.assertTrue(self.system_role.permissions["can_treat_correspondence"])
        self.assertTrue(self.system_role.permissions["can_view_registry"])

    def test_non_superuser_cannot_grant_administrative_permission(self):
        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/can_manage_users/",
            {"enabled": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.system_role.refresh_from_db()
        self.assertFalse(self.system_role.permissions.get("can_manage_users", False))

    def test_non_superuser_cannot_revoke_administrative_permission(self):
        self.system_role.permissions["can_manage_users"] = True
        self.system_role.save(update_fields=["permissions"])

        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/can_manage_users/",
            {"enabled": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.system_role.refresh_from_db()
        self.assertTrue(self.system_role.permissions["can_manage_users"])

    def test_non_superuser_cannot_grant_administrative_permission_in_batch(self):
        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/",
            {"permissions": {"can_manage_users": True}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.system_role.refresh_from_db()
        self.assertFalse(self.system_role.permissions.get("can_manage_users", False))

    def test_non_superuser_cannot_write_administrative_permissions_via_role_update(self):
        response = self.client.patch(
            self.detail_url,
            {"permissions": {"can_manage_users": True}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.system_role.refresh_from_db()
        self.assertFalse(self.system_role.permissions.get("can_manage_users", False))

    def test_non_superuser_cannot_create_role_with_administrative_permission(self):
        response = self.client.post(
            "/api/v1/organization/roles/",
            {"name": "Puppet Admin", "permissions": {"can_manage_users": True}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Role.objects.filter(name="Puppet Admin").exists())

    def test_superuser_can_grant_administrative_permission(self):
        self.client.force_authenticate(self.superuser)

        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/can_manage_users/",
            {"enabled": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.system_role.refresh_from_db()
        self.assertTrue(self.system_role.permissions["can_manage_users"])

    def test_non_superuser_cannot_grant_integration_permission(self):
        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/can_manage_integration/",
            {"enabled": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.system_role.refresh_from_db()
        self.assertFalse(self.system_role.permissions.get("can_manage_integration", False))

    def test_non_superuser_cannot_create_role_with_integration_permission(self):
        response = self.client.post(
            "/api/v1/organization/roles/",
            {"name": "Integration Puppet", "permissions": {"can_manage_integration": True}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Role.objects.filter(name="Integration Puppet").exists())

    def test_superuser_can_grant_integration_permission(self):
        self.client.force_authenticate(self.superuser)

        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/can_manage_integration/",
            {"enabled": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.system_role.refresh_from_db()
        self.assertTrue(self.system_role.permissions["can_manage_integration"])

    def test_bulk_permission_update_rejects_unknown_keys(self):
        response = self.client.patch(
            f"/api/v1/organization/roles/{self.system_role.id}/permissions/",
            {"permissions": {"can_fly": True}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_active_user_count_excludes_inactive_users(self):
        User.objects.create_user(
            username="active-officer",
            password="testpass123",
            system_role=self.system_role,
            is_active=True,
        )
        User.objects.create_user(
            username="inactive-officer",
            password="testpass123",
            system_role=self.system_role,
            is_active=False,
        )

        response = self.client.get(reverse("api_v1:role-detail", args=[self.system_role.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_count"], 2)
        self.assertEqual(response.data["active_user_count"], 1)

    def test_inactive_role_grants_no_permissions(self):
        self.system_role.is_active = False
        self.system_role.save(update_fields=["is_active"])
        user = User.objects.create_user(
            username="inactive-role-user",
            password="testpass123",
            system_role=self.system_role,
        )

        permissions = get_role_permissions(user)

        self.assertFalse(any(permissions.values()))


class ScopedRoleAssignmentTests(APITestCase):
    """General managers assign within a division; AGMs within a department."""

    def setUp(self):
        self.directorate = Directorate.objects.create(name="Operations", code="OPS")
        self.division = Division.objects.create(
            name="Port Operations",
            code="OPS-PORT",
            directorate=self.directorate,
        )
        self.other_division = Division.objects.create(
            name="Marine Operations",
            code="OPS-MARINE",
            directorate=self.directorate,
        )
        self.department = Department.objects.create(
            name="Harbour Department",
            code="OPS-PORT-HARBOUR",
            division=self.division,
        )
        self.sibling_department = Department.objects.create(
            name="Terminal Department",
            code="OPS-PORT-TERMINAL",
            division=self.division,
        )
        self.other_department = Department.objects.create(
            name="Marine Department",
            code="OPS-MARINE-DECK",
            division=self.other_division,
        )

        self.officer_role = Role.objects.create(
            name="Scoped Officer",
            permissions={"can_register_correspondence": True},
        )
        self.super_role = Role.objects.create(
            name="Super Admin",
            permissions={"can_manage_users": True, "can_manage_roles": True},
            is_system=True,
        )
        self.superuser = User.objects.create_superuser(
            username="scoped-root-admin",
            email="scoped-root@example.com",
            password="testpass123",
            system_role=self.super_role,
        )

        self.gm_role = Role.objects.create(
            name="General Manager",
            permissions=ROLE_PERMISSION_PRESETS["General Manager"],
            is_system=True,
        )
        self.agm_role = Role.objects.create(
            name="Assistant General Manager",
            permissions=ROLE_PERMISSION_PRESETS["Assistant General Manager"],
            is_system=True,
        )
        self.gm = User.objects.create_user(
            username="scoped-gm",
            password="testpass123",
            system_role=self.gm_role,
            grade_level="MSS1",
            directorate=self.directorate,
            division=self.division,
        )
        self.agm = User.objects.create_user(
            username="scoped-agm",
            password="testpass123",
            system_role=self.agm_role,
            grade_level="MSS2",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.division_staff = User.objects.create_user(
            username="division-staff",
            password="testpass123",
            system_role=self.officer_role,
            directorate=self.directorate,
            division=self.division,
            department=self.sibling_department,
        )
        self.department_staff = User.objects.create_user(
            username="department-staff",
            password="testpass123",
            system_role=self.officer_role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.outside_staff = User.objects.create_user(
            username="outside-staff",
            password="testpass123",
            system_role=self.officer_role,
            directorate=self.directorate,
            division=self.other_division,
            department=self.other_department,
        )
        self.office = Office.objects.create(
            name="Harbour Office",
            code="OPS-PORT-HARBOUR-OFFICE",
            office_type=Office.OfficeTier.DEPARTMENT,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.outside_office = Office.objects.create(
            name="Marine Office",
            code="OPS-MARINE-OFFICE",
            office_type=Office.OfficeTier.DEPARTMENT,
            directorate=self.directorate,
            division=self.other_division,
            department=self.other_department,
        )
        self.assign_url = "/api/v1/organization/roles/bulk-assign/"
        self.membership_url = "/api/v1/organization/office-memberships/"
        self.create_url = reverse("api_v1:user-list")

    def _create_payload(self, **overrides):
        payload = {
            "username": "created-officer",
            "password": "Str0ngPassw0rd!77",
            "directorate": str(self.directorate.id),
            "division": str(self.division.id),
            "grade_level": "SSS3",
        }
        payload.update(overrides)
        return payload

    def _assign(self, role, target):
        return self.client.post(
            self.assign_url,
            {"role_id": str(role.id), "user_ids": [str(target.id)]},
            format="json",
        )

    def test_general_manager_can_assign_a_role_within_their_division(self):
        self.client.force_authenticate(self.gm)

        response = self._assign(self.officer_role, self.division_staff)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.division_staff.refresh_from_db()
        self.assertEqual(self.division_staff.system_role_id, self.officer_role.id)

    def test_general_manager_cannot_assign_a_role_outside_their_division(self):
        self.client.force_authenticate(self.gm)

        response = self._assign(self.officer_role, self.outside_staff)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.outside_staff.refresh_from_db()
        self.assertEqual(self.outside_staff.system_role_id, self.officer_role.id)

    def test_assistant_general_manager_can_assign_a_role_within_their_department(self):
        self.client.force_authenticate(self.agm)

        response = self._assign(self.officer_role, self.department_staff)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.department_staff.refresh_from_db()
        self.assertEqual(self.department_staff.system_role_id, self.officer_role.id)

    def test_assistant_general_manager_cannot_assign_outside_their_department(self):
        self.client.force_authenticate(self.agm)

        response = self._assign(self.officer_role, self.division_staff)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.division_staff.refresh_from_db()
        self.assertEqual(self.division_staff.system_role_id, self.officer_role.id)

    def test_scoped_manager_cannot_assign_an_administrative_role(self):
        self.client.force_authenticate(self.gm)

        response = self._assign(self.super_role, self.division_staff)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.division_staff.refresh_from_db()
        self.assertNotEqual(self.division_staff.system_role_id, self.super_role.id)

    def test_general_manager_can_change_a_role_via_the_user_endpoint_in_scope(self):
        self.client.force_authenticate(self.gm)

        response = self.client.patch(
            reverse("api_v1:user-detail", args=[self.division_staff.id]),
            {"system_role": str(self.officer_role.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

    def test_general_manager_cannot_change_a_role_outside_their_division(self):
        self.client.force_authenticate(self.gm)

        response = self.client.patch(
            reverse("api_v1:user-detail", args=[self.outside_staff.id]),
            {"system_role": str(self.officer_role.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assistant_general_manager_cannot_change_another_departments_user(self):
        self.client.force_authenticate(self.agm)

        response = self.client.patch(
            reverse("api_v1:user-detail", args=[self.division_staff.id]),
            {"system_role": str(self.officer_role.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assistant_general_manager_can_assign_office_access_within_department(self):
        self.client.force_authenticate(self.agm)

        response = self.client.post(
            self.membership_url,
            {
                "office": str(self.office.id),
                "user": str(self.department_staff.id),
                "assignment_role": OfficeMembership.AssignmentRole.STAFF,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def test_assistant_general_manager_cannot_grant_office_access_outside_department(self):
        self.client.force_authenticate(self.agm)

        response = self.client.post(
            self.membership_url,
            {
                "office": str(self.outside_office.id),
                "user": str(self.department_staff.id),
                "assignment_role": OfficeMembership.AssignmentRole.STAFF,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            OfficeMembership.objects.filter(
                office=self.outside_office, user=self.department_staff
            ).exists()
        )

    def test_general_manager_cannot_add_an_outside_user_to_an_in_scope_office(self):
        self.client.force_authenticate(self.gm)

        response = self.client.post(
            self.membership_url,
            {
                "office": str(self.office.id),
                "user": str(self.outside_staff.id),
                "assignment_role": OfficeMembership.AssignmentRole.STAFF,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            OfficeMembership.objects.filter(
                office=self.office, user=self.outside_staff
            ).exists()
        )

    def test_general_manager_role_without_a_grade_is_still_scoped(self):
        self.gm.grade_level = ""
        self.gm.save(update_fields=["grade_level"])
        self.client.force_authenticate(self.gm)

        outside = self._assign(self.officer_role, self.outside_staff)

        self.assertEqual(outside.status_code, status.HTTP_403_FORBIDDEN)

    def test_general_manager_without_a_division_cannot_assign_roles(self):
        self.gm.division = None
        self.gm.save(update_fields=["division"])
        self.client.force_authenticate(self.gm)

        response = self._assign(self.officer_role, self.division_staff)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_scoped_manager_cannot_promote_a_staff_grade(self):
        self.client.force_authenticate(self.gm)

        response = self.client.patch(
            reverse("api_v1:user-detail", args=[self.division_staff.id]),
            {"grade_level": "MDCS"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.division_staff.refresh_from_db()
        self.assertNotEqual(self.division_staff.grade_level, "MDCS")

    def test_scoped_manager_can_update_a_profile_with_unchanged_grade(self):
        self.client.force_authenticate(self.gm)

        response = self.client.patch(
            reverse("api_v1:user-detail", args=[self.division_staff.id]),
            {"first_name": "Renamed", "grade_level": self.division_staff.grade_level},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.division_staff.refresh_from_db()
        self.assertEqual(self.division_staff.first_name, "Renamed")

    def test_scoped_presets_keep_role_administration_superuser_only(self):
        self.assertTrue(ROLE_PERMISSION_PRESETS["General Manager"]["can_manage_users"])
        self.assertTrue(ROLE_PERMISSION_PRESETS["Assistant General Manager"]["can_manage_users"])
        self.assertFalse(ROLE_PERMISSION_PRESETS["General Manager"].get("can_manage_roles", False))
        self.assertFalse(
            ROLE_PERMISSION_PRESETS["Assistant General Manager"].get("can_manage_roles", False)
        )

    def test_general_manager_cannot_create_a_user_with_an_executive_grade(self):
        self.client.force_authenticate(self.gm)

        response = self.client.post(
            self.create_url,
            self._create_payload(grade_level="MDCS"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="created-officer").exists())

    def test_general_manager_grade_guard_is_case_insensitive(self):
        self.client.force_authenticate(self.gm)

        response = self.client.post(
            self.create_url,
            self._create_payload(grade_level="mdcs"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="created-officer").exists())

    def test_general_manager_cannot_create_a_user_with_a_management_grade(self):
        self.client.force_authenticate(self.gm)

        response = self.client.post(
            self.create_url,
            self._create_payload(grade_level="MSS5"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="created-officer").exists())

    def test_general_manager_cannot_create_a_management_account_with_a_staff_grade(self):
        self.client.force_authenticate(self.gm)

        response = self.client.post(
            self.create_url,
            self._create_payload(grade_level="SSS3", is_management=True),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="created-officer").exists())

    def test_general_manager_can_create_an_ordinary_staff_user_in_their_division(self):
        self.client.force_authenticate(self.gm)

        response = self.client.post(
            self.create_url,
            self._create_payload(grade_level="SSS3"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        created = User.objects.get(username="created-officer")
        self.assertEqual(created.grade_level, "SSS3")
        self.assertFalse(created.is_management)

    def test_assistant_general_manager_cannot_create_a_user_with_an_executive_grade(self):
        self.client.force_authenticate(self.agm)

        response = self.client.post(
            self.create_url,
            self._create_payload(
                grade_level="MDCS",
                department=str(self.department.id),
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="created-officer").exists())

    def test_assistant_general_manager_can_create_an_ordinary_staff_user_in_their_department(self):
        self.client.force_authenticate(self.agm)

        response = self.client.post(
            self.create_url,
            self._create_payload(
                grade_level="JSS1",
                department=str(self.department.id),
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        created = User.objects.get(username="created-officer")
        self.assertEqual(created.department_id, self.department.id)
        self.assertEqual(created.grade_level, "JSS1")

    def test_role_administrator_can_create_a_management_grade_user(self):
        role_admin_role = Role.objects.create(
            name="Role Administrator",
            permissions={"can_manage_users": True, "can_manage_roles": True},
        )
        role_admin = User.objects.create_user(
            username="role-administrator",
            password="testpass123",
            system_role=role_admin_role,
            grade_level="MDCS",
        )
        self.client.force_authenticate(role_admin)

        response = self.client.post(
            self.create_url,
            self._create_payload(grade_level="MSS1"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(
            User.objects.get(username="created-officer").grade_level, "MSS1"
        )

    def test_superuser_can_create_a_management_grade_user(self):
        self.client.force_authenticate(self.superuser)

        response = self.client.post(
            self.create_url,
            self._create_payload(grade_level="EDCS"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(
            User.objects.get(username="created-officer").grade_level, "EDCS"
        )


    