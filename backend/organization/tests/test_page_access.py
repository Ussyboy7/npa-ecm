from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from organization.models import Role
from organization.permission_utils import resolve_page_access, require_page_access
from organization.permissions_catalog import ROLE_PERMISSION_PRESETS

User = get_user_model()


class PageAccessTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Page access test",
            permissions={
                "can_access_cases": True,
                "can_create_cases": True,
                "can_approve": True,
                "can_access_forms_library": True,
                "can_access_document_management": True,
                "can_access_audit_compliance": False,
            },
        )
        self.user = User.objects.create_user(
            username="page-access-user",
            password="x",
            system_role=self.role,
        )
        self.client = APIClient()

    def test_resolver_uses_named_rules_and_scope(self):
        pages = resolve_page_access(self.user)
        self.assertTrue(pages["cases_my"]["allowed"])
        self.assertFalse(pages["cases_office"]["allowed"])
        self.assertFalse(pages["cases_all"]["allowed"])
        self.assertTrue(pages["forms"]["allowed"])
        self.assertFalse(pages["audit"]["allowed"])
        self.assertTrue(pages["approvals_executive"]["allowed"])
        self.assertTrue(pages["approvals_departmental"]["allowed"])
        self.client.force_authenticate(user=self.user)
        executive = self.client.get(
            reverse("api_v1:minute-list"),
            {"action_type": "approve", "approval_level": "executive"},
        )
        self.assertEqual(executive.status_code, 200, executive.content)
        departmental = self.client.get(
            reverse("api_v1:minute-list"),
            {"action_type": "approve", "approval_level": "departmental"},
        )
        self.assertEqual(departmental.status_code, 200, departmental.content)
        with self.assertRaises(Exception):
            require_page_access(self.user, "audit")

    def test_hierarchical_cases_all_is_scoped_and_explicit_all_grant_is_global(self):
        from organization.models import Directorate, Division

        directorate = Directorate.objects.create(name="Page access directorate", code="PAD")
        division = Division.objects.create(name="Page access division", code="PAV", directorate=directorate)
        scoped_user = User.objects.create_user(
            username="page-access-scoped",
            password="x",
            grade_level="GMCS",
            system_role=self.role,
            directorate=directorate,
            division=division,
        )
        pages = resolve_page_access(scoped_user)
        self.assertTrue(pages["cases_all"]["allowed"])
        require_page_access(scoped_user, "cases_all", "division")
        with self.assertRaises(Exception):
            require_page_access(scoped_user, "cases_all", "all")

        self.role.permissions = {**self.role.permissions, "can_access_all_cases": True}
        self.role.save(update_fields=["permissions"])
        self.user.refresh_from_db()
        require_page_access(self.user, "cases_all", "all")

    def test_page_endpoint_gates_registered_and_physical_views(self):
        self.client.force_authenticate(user=self.user)
        physical = self.client.get(reverse("api_v1:physical-document-list"))
        approvals = self.client.get(
            reverse("api_v1:minute-list"),
            {"action_type": "approve", "approval_level": "executive"},
        )
        registered = self.client.get("/api/v1/correspondence/items/registered/")
        self.assertEqual(physical.status_code, 403, physical.content)
        self.assertEqual(approvals.status_code, 200, approvals.content)
        self.assertEqual(registered.status_code, 403, registered.content)

    def test_can_approve_grants_executive_register_access(self):
        role = Role.objects.create(
            name="Approver-only page access",
            permissions={"can_approve": True},
        )
        user = User.objects.create_user(
            username="approver-only-page-access",
            password="x",
            system_role=role,
        )

        pages = resolve_page_access(user)

        self.assertTrue(pages["approvals_executive"]["allowed"])
        self.assertTrue(pages["approvals_departmental"]["allowed"])

    def test_can_approve_grants_all_approval_surfaces(self):
        from organization.models import Directorate, Division

        directorate = Directorate.objects.create(
            name="Approver surface directorate",
            code="ASD",
        )
        division = Division.objects.create(
            name="Approver surface division",
            code="ASV",
            directorate=directorate,
        )
        role = Role.objects.create(
            name="Approver-only all surfaces",
            permissions={"can_approve": True},
        )
        user = User.objects.create_user(
            username="approver-only-all-surfaces",
            password="x",
            grade_level="GMCS",
            system_role=role,
            directorate=directorate,
            division=division,
        )

        pages = resolve_page_access(user)

        for page_id in (
            "approvals",
            "approvals_executive",
            "approvals_departmental",
            "my_inbox",
            "my_sent",
        ):
            self.assertTrue(pages[page_id]["allowed"], page_id)

    def test_can_approve_only_role_can_load_my_inbox_and_my_sent(self):
        from organization.models import Directorate, Division

        directorate = Directorate.objects.create(
            name="Approver queue directorate",
            code="AQD",
        )
        division = Division.objects.create(
            name="Approver queue division",
            code="AQV",
            directorate=directorate,
        )
        role = Role.objects.create(
            name="Approver-only queue access",
            permissions={"can_approve": True},
        )
        user = User.objects.create_user(
            username="approver-only-queue-access",
            password="x",
            grade_level="GMCS",
            system_role=role,
            directorate=directorate,
            division=division,
        )
        self.client.force_authenticate(user=user)

        for url_name in (
            "api_v1:correspondence-my-inbox",
            "api_v1:correspondence-my-sent",
        ):
            response = self.client.get(reverse(url_name))
            self.assertEqual(response.status_code, 200, response.content)

    def test_officer_i_personal_queues_do_not_require_a_queue_seat(self):
        from organization.models import Directorate, Division

        directorate = Directorate.objects.create(
            name="Officer queue directorate",
            code="OQD",
        )
        division = Division.objects.create(
            name="Officer queue division",
            code="OQV",
            directorate=directorate,
        )
        role = Role.objects.create(
            name="Officer I page access",
            permissions=ROLE_PERMISSION_PRESETS["Officer I"],
        )
        user = User.objects.create_user(
            username="officer-i-page-access",
            password="x",
            grade_level="SSS3",
            system_role=role,
            directorate=directorate,
            division=division,
        )

        pages = resolve_page_access(user)

        self.assertTrue(pages["my_inbox"]["allowed"])
        self.assertTrue(pages["my_sent"]["allowed"])
        self.client.force_authenticate(user=user)
        for url_name in (
            "api_v1:correspondence-my-inbox",
            "api_v1:correspondence-my-sent",
        ):
            response = self.client.get(reverse(url_name))
            self.assertEqual(response.status_code, 200, response.content)

    def test_page_access_endpoint_requires_authentication(self):
        response = self.client.get(reverse("api_v1:page_access"))
        self.assertIn(response.status_code, (401, 403))

    def test_page_access_endpoint_returns_backend_resolved_rules(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("api_v1:page_access"))
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["pages"]["forms"]["allowed"])
        self.assertFalse(response.data["pages"]["audit"]["allowed"])

    def test_agm_gets_scoped_user_management_but_not_role_administration(self):
        permissions = ROLE_PERMISSION_PRESETS["Assistant General Manager"]
        self.assertTrue(permissions.get("can_manage_users", False))
        self.assertFalse(permissions.get("can_manage_roles", False))
        self.assertFalse(permissions.get("can_manage_org_structure", False))
        self.assertTrue(permissions.get("can_archive", False))
        self.assertTrue(permissions.get("can_access_cases", False))

    def test_system_administrator_has_full_correspondence_but_no_seat_grant(self):
        permissions = ROLE_PERMISSION_PRESETS["System Administrator"]
        for key in (
            "can_register_correspondence",
            "can_minute_correspondence",
            "can_treat_correspondence",
            "can_distribute",
            "can_archive",
            "can_view_all_correspondence",
            "can_access_approvals",
        ):
            self.assertTrue(permissions.get(key, False), key)
        self.assertNotIn("office_memberships", permissions)
