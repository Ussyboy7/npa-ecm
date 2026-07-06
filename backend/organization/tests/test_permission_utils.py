"""Tests for permission explainability helpers."""

from django.test import TestCase

from accounts.models import User
from organization.models import Role
from organization.permission_utils import explain_access_context, explain_permission_denial
from organization.permissions_catalog import normalize_permissions


class PermissionExplainabilityTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Clerk",
            permissions={"can_register_correspondence": False},
        )
        self.user = User.objects.create_user(
            username="clerk1",
            password="ChangeMe123!",
            system_role=self.role,
        )

    def test_explain_permission_denial_when_not_allowed(self):
        payload = explain_permission_denial(self.user, "can_register_correspondence")
        self.assertFalse(payload["allowed"])
        self.assertEqual(payload["role_name"], "Clerk")
        self.assertIn("does not include", payload["reason"])
        self.assertTrue(payload["suggestion"])

    def test_explain_access_context_document_view(self):
        payload = explain_access_context(self.user, "document_view")
        self.assertFalse(payload["allowed"])
        self.assertEqual(payload["label"], "View Document")
        self.assertIn("sensitivity", payload["reason"].lower())

    def test_require_permission_raises_when_denied(self):
        from organization.permission_utils import require_permission
        from rest_framework.exceptions import PermissionDenied

        with self.assertRaises(PermissionDenied):
            require_permission(self.user, "can_register_correspondence")

    def test_require_permission_passes_when_allowed(self):
        from organization.permission_utils import require_permission

        self.role.permissions = {"can_register_correspondence": True}
        self.role.save(update_fields=["permissions"])
        require_permission(self.user, "can_register_correspondence")

    def test_require_any_permission_passes_with_alternate(self):
        from organization.permission_utils import require_any_permission

        self.role.permissions = {"can_manage_users": True}
        self.role.save(update_fields=["permissions"])
        require_any_permission(self.user, "can_manage_roles", "can_manage_users")

    def test_normalize_permissions_sidebar_defaults_visible(self):
        normalized = normalize_permissions({"can_access_analytics": True})
        self.assertTrue(normalized["sidebar_show_my_workspace"])
        self.assertTrue(normalized["sidebar_show_analytics_reports"])
        self.assertTrue(normalized["can_access_analytics"])

    def test_normalize_permissions_sidebar_explicit_false_honored(self):
        normalized = normalize_permissions(
            {"sidebar_show_my_workspace": False, "can_access_analytics": True}
        )
        self.assertFalse(normalized["sidebar_show_my_workspace"])
        self.assertTrue(normalized["sidebar_show_analytics_reports"])
