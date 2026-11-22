"""Organization hierarchy reads are scoped for non-administrative accounts."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from organization.models import (
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    Role,
)
from organization.permissions_catalog import ROLE_PERMISSION_PRESETS

User = get_user_model()


class OrganizationHierarchyAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.directorate = Directorate.objects.create(name="ICT Directorate", code="ICT-DIR")
        self.division = Division.objects.create(
            name="ICT Division",
            code="ICT-DIV",
            directorate=self.directorate,
        )
        self.department = Department.objects.create(
            name="Software Department",
            code="ICT-SOFT",
            division=self.division,
        )
        self.office = Office.objects.create(
            name="Software Office",
            code="ICT-SOFT-OFFICE",
            office_type=Office.OfficeTier.DEPARTMENT,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

        self.other_directorate = Directorate.objects.create(
            name="Finance Directorate",
            code="FIN-DIR",
        )
        self.other_division = Division.objects.create(
            name="Finance Division",
            code="FIN-DIV",
            directorate=self.other_directorate,
        )
        self.other_department = Department.objects.create(
            name="Accounts Department",
            code="FIN-ACC",
            division=self.other_division,
        )
        self.other_office = Office.objects.create(
            name="Accounts Office",
            code="FIN-ACC-OFFICE",
            office_type=Office.OfficeTier.DEPARTMENT,
            directorate=self.other_directorate,
            division=self.other_division,
            department=self.other_department,
        )

        officer_role = Role.objects.create(
            name="Hierarchy Officer I",
            permissions=ROLE_PERMISSION_PRESETS["Officer I"],
        )
        self.officer = User.objects.create_user(
            username="hierarchy-officer",
            password="test-pass",
            system_role=officer_role,
            grade_level="SSS3",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.other_user = User.objects.create_user(
            username="hierarchy-other",
            password="test-pass",
        )
        OfficeMembership.objects.create(
            office=self.office,
            user=self.officer,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )
        OfficeMembership.objects.create(
            office=self.other_office,
            user=self.other_user,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )

        structure_role = Role.objects.create(
            name="Hierarchy structure manager",
            permissions={"can_manage_org_structure": True},
        )
        self.structure_manager = User.objects.create_user(
            username="hierarchy-structure-manager",
            password="test-pass",
            system_role=structure_role,
        )
        people_role = Role.objects.create(
            name="Hierarchy people manager",
            permissions={"can_manage_users": True},
        )
        self.people_manager = User.objects.create_user(
            username="hierarchy-people-manager",
            password="test-pass",
            system_role=people_role,
        )
        administration_role = Role.objects.create(
            name="Hierarchy administration manager",
            permissions={"can_access_administration": True},
        )
        self.administration_manager = User.objects.create_user(
            username="hierarchy-administration-manager",
            password="test-pass",
            system_role=administration_role,
        )

    @staticmethod
    def _ids(response):
        rows = response.data.get("results", []) if isinstance(response.data, dict) else response.data
        return {row["id"] for row in rows}

    def test_officer_only_lists_the_hierarchy_units_they_belong_to(self):
        self.client.force_authenticate(self.officer)

        directorates = self.client.get(reverse("api_v1:directorate-list"))
        divisions = self.client.get(reverse("api_v1:division-list"))
        departments = self.client.get(reverse("api_v1:department-list"))

        self.assertEqual(directorates.status_code, status.HTTP_200_OK, directorates.content)
        self.assertEqual(divisions.status_code, status.HTTP_200_OK, divisions.content)
        self.assertEqual(departments.status_code, status.HTTP_200_OK, departments.content)
        self.assertEqual(self._ids(directorates), {str(self.directorate.id)})
        self.assertEqual(self._ids(divisions), {str(self.division.id)})
        self.assertEqual(self._ids(departments), {str(self.department.id)})

    def test_officer_cannot_retrieve_an_unrelated_hierarchy_unit(self):
        self.client.force_authenticate(self.officer)

        response = self.client.get(
            reverse("api_v1:directorate-detail", args=[self.other_directorate.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.content)

    def test_officer_office_list_is_limited_to_their_org_unit(self):
        self.client.force_authenticate(self.officer)

        response = self.client.get(reverse("api_v1:office-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(self._ids(response), {str(self.office.id)})

    def test_officer_only_lists_their_own_office_memberships(self):
        self.client.force_authenticate(self.officer)

        response = self.client.get(reverse("api_v1:office-membership-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        rows = response.data.get("results", []) if isinstance(response.data, dict) else response.data
        self.assertEqual({str(row["user"]) for row in rows}, {str(self.officer.id)})

    def test_administrative_roles_keep_full_hierarchy_reads(self):
        for manager in (
            self.structure_manager,
            self.people_manager,
            self.administration_manager,
        ):
            with self.subTest(manager=manager.username):
                self.client.force_authenticate(manager)

                directorates = self.client.get(reverse("api_v1:directorate-list"))
                offices = self.client.get(reverse("api_v1:office-list"))
                memberships = self.client.get(reverse("api_v1:office-membership-list"))

                self.assertEqual(
                    self._ids(directorates),
                    {str(self.directorate.id), str(self.other_directorate.id)},
                )
                self.assertEqual(
                    self._ids(offices),
                    {str(self.office.id), str(self.other_office.id)},
                )
                membership_rows = (
                    memberships.data.get("results", [])
                    if isinstance(memberships.data, dict)
                    else memberships.data
                )
                self.assertEqual(
                    {str(row["user"]) for row in membership_rows},
                    {str(self.officer.id), str(self.other_user.id)},
                )

    def test_unauthenticated_hierarchy_requests_are_rejected(self):
        response = self.client.get(reverse("api_v1:directorate-list"))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )