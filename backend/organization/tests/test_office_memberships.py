from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from organization.models import Division, Directorate, Office, OfficeMembership, Role

User = get_user_model()


class OfficeMembershipQualityTests(TestCase):
    def setUp(self):
        role = Role.objects.create(
            name="Office membership quality administrator",
            permissions={"can_manage_users": True},
        )
        self.admin = User.objects.create_user(
            username="membership-quality-admin",
            password="test-password",
            system_role=role,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        directorate = Directorate.objects.create(name="Membership Directorate", code="MEMD")
        self.division = Division.objects.create(
            name="Membership Division",
            code="MEMV",
            directorate=directorate,
        )
        self.office = Office.objects.create(
            name="Membership Office",
            code="MEM-OFFICE",
            division=self.division,
        )

    def make_user(self, username):
        return User.objects.create_user(username=username, password="test-password")

    def add_membership(self, user, *, office=None, role="staff", primary=False, active=True):
        return OfficeMembership.objects.create(
            office=office or self.office,
            user=user,
            assignment_role=role,
            is_primary=primary,
            is_active=active,
        )

    def test_quality_summary_flags_only_active_actionable_assignment_conflicts(self):
        principal_one = self.make_user("principal-one")
        principal_two = self.make_user("principal-two")
        primary_user = self.make_user("multiple-primary-user")
        duplicate_user = self.make_user("duplicate-office-user")
        inactive_user = self.make_user("inactive-principal")

        first_principal = self.add_membership(principal_one, role="principal")
        second_principal = self.add_membership(principal_two, role="principal")
        inactive_principal = self.add_membership(inactive_user, role="principal", active=False)
        first_primary = self.add_membership(primary_user, role="staff", primary=True)
        second_primary_office = Office.objects.create(name="Second Office", code="MEM-OFFICE-2")
        second_primary = self.add_membership(
            primary_user,
            office=second_primary_office,
            role="secretariat",
            primary=True,
        )
        duplicate_staff = self.add_membership(duplicate_user, role="staff")
        duplicate_registry = self.add_membership(duplicate_user, role="registry")
        self.add_membership(inactive_user, role="staff", active=False)

        response = self.client.get("/api/v1/organization/office-memberships/quality/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["counts"], {
            "multipleActivePrincipals": 1,
            "multiplePrimaryAssignments": 1,
            "duplicateOfficeAssignments": 1,
        })
        principal_conflict = response.data["multipleActivePrincipals"][0]
        self.assertEqual(principal_conflict["officeId"], str(self.office.id))
        self.assertEqual(
            {row["id"] for row in principal_conflict["memberships"]},
            {str(first_principal.id), str(second_principal.id)},
        )
        primary_conflict = response.data["multiplePrimaryAssignments"][0]
        self.assertEqual(primary_conflict["userId"], str(primary_user.id))
        self.assertEqual(
            {row["id"] for row in primary_conflict["memberships"]},
            {str(first_primary.id), str(second_primary.id)},
        )
        duplicate_conflict = response.data["duplicateOfficeAssignments"][0]
        self.assertEqual(duplicate_conflict["officeId"], str(self.office.id))
        self.assertEqual(duplicate_conflict["userId"], str(duplicate_user.id))
        self.assertEqual(
            {row["id"] for row in duplicate_conflict["memberships"]},
            {str(duplicate_staff.id), str(duplicate_registry.id)},
        )
        self.assertNotIn(str(inactive_principal.id), {
            row["id"]
            for conflict in response.data["multipleActivePrincipals"]
            for row in conflict["memberships"]
        })

    def test_quality_summary_batches_group_detail_queries(self):
        offices = [
            Office.objects.create(name=f"Conflict Office {index}", code=f"CONFLICT-{index}")
            for index in range(20)
        ]
        users = [
            User.objects.create_user(username=f"conflict-principal-{index}")
            for index in range(40)
        ]
        OfficeMembership.objects.bulk_create([
            OfficeMembership(
                office=offices[group_index],
                user=users[group_index * 2 + member_index],
                assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            )
            for group_index in range(20)
            for member_index in range(2)
        ])

        with CaptureQueriesContext(connection) as queries:
            response = self.client.get("/api/v1/organization/office-memberships/quality/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["counts"]["multipleActivePrincipals"], 20)
        self.assertLess(len(queries), 10, [query["sql"] for query in queries])
        self.assertEqual(len(response.data["multipleActivePrincipals"][0]["memberships"]), 2)

    def test_office_list_includes_active_members_and_principal_summary(self):
        principal = self.make_user("directory-principal")
        staff = self.make_user("directory-staff")
        inactive = self.make_user("directory-inactive")
        self.add_membership(principal, role="principal")
        self.add_membership(staff, role="staff")
        self.add_membership(inactive, role="principal", active=False)

        response = self.client.get("/api/v1/organization/offices/", {"division": str(self.division.id)})

        self.assertEqual(response.status_code, 200, response.content)
        office = next(row for row in response.data["results"] if row["id"] == str(self.office.id))
        self.assertEqual(office["active_member_count"], 2)
        self.assertEqual(office["active_principal_name"], "directory-principal")

    def test_scoped_membership_queries_filter_by_selected_user_or_office(self):
        selected_user = self.make_user("scoped-membership-user")
        other_user = self.make_user("other-membership-user")
        selected_office = Office.objects.create(name="Scoped Office", code="SCOPED")
        selected_membership = self.add_membership(selected_user, office=selected_office)
        self.add_membership(other_user, office=selected_office)
        self.add_membership(selected_user, role="principal")

        user_response = self.client.get(
            "/api/v1/organization/office-memberships/",
            {"user": str(selected_user.id)},
        )
        office_response = self.client.get(
            "/api/v1/organization/office-memberships/",
            {"office": str(selected_office.id)},
        )

        self.assertEqual(user_response.status_code, 200, user_response.content)
        self.assertEqual(office_response.status_code, 200, office_response.content)
        self.assertEqual(
            {row["id"] for row in user_response.data["results"]},
            {str(selected_membership.id), str(OfficeMembership.objects.get(user=selected_user, office=self.office).id)},
        )
        self.assertEqual(
            {str(row["user"]) for row in office_response.data["results"]},
            {str(selected_user.id), str(other_user.id)},
        )

    def test_membership_quality_summary_requires_management_permission(self):
        ordinary_user = self.make_user("ordinary-membership-reader")
        self.client.force_authenticate(user=ordinary_user)

        response = self.client.get("/api/v1/organization/office-memberships/quality/")

        self.assertEqual(response.status_code, 403, response.content)
