from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from organization.models import Role


class SLATargetPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role = Role.objects.create(
            name="Inbox User",
            permissions={"can_access_analytics": True},
        )
        self.user = User.objects.create_user(
            username="inbox-user",
            password="test-password",
            system_role=self.role,
        )
        self.client.force_authenticate(user=self.user)

    def test_authenticated_user_can_read_sla_targets_without_org_admin_permission(self):
        response = self.client.get("/api/v1/analytics/sla-config/targets/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {"urgent", "high", "medium", "low"})

    def test_sla_configuration_writes_still_require_org_admin_permission(self):
        response = self.client.post(
            "/api/v1/analytics/sla-config/bulk_update/",
            {"urgent": 24},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["details"]["permission"], "can_manage_org_structure")
