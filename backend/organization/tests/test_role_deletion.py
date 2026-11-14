from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from organization.models import Role

User = get_user_model()


class RoleDeletionTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Deletion target",
            permissions={"can_manage_roles": True},
        )
        self.manager = User.objects.create_user(
            username="role-manager",
            password="x",
            system_role=self.role,
        )
        self.assigned = User.objects.create_user(
            username="role-assigned",
            password="x",
            system_role=self.role,
        )
        self.url = reverse("api_v1:role-detail", args=[self.role.id])
        self.client = APIClient()
        self.client.force_authenticate(user=self.manager)

    def test_delete_clears_assignments_with_the_delete(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Role.objects.filter(id=self.role.id).exists())
        self.assigned.refresh_from_db()
        self.assertIsNone(self.assigned.system_role_id)

    def test_rejected_delete_leaves_every_assignment_intact(self):
        outsider_role = Role.objects.create(
            name="Deletion outsider",
            permissions={},
        )
        outsider = User.objects.create_user(
            username="role-outsider",
            password="x",
            system_role=outsider_role,
        )
        client = APIClient()
        client.force_authenticate(user=outsider)

        response = client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Role.objects.filter(id=self.role.id).exists())
        self.assigned.refresh_from_db()
        self.assertEqual(self.assigned.system_role_id, self.role.id)
        outsider.refresh_from_db()
        self.assertEqual(outsider.system_role_id, outsider_role.id)
