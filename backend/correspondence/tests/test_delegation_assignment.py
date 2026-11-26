"""An assistant assignment must reopen as the TA/PA it was saved as."""

import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User


class DelegationAssignmentRoundTripTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.principal = User.objects.create_user(
            username="assign_principal", password="x", grade_level="MSS1"
        )
        self.assistant = User.objects.create_user(
            username="assign_assistant", password="x", grade_level="SSS1"
        )
        self.client.force_authenticate(user=self.principal)

    def _assign(self, **overrides):
        payload = {
            "principal_id": str(self.principal.id),
            "assistant_id": str(self.assistant.id),
            "can_view": True,
            "can_forward": True,
            "can_respond": False,
            "can_minute": False,
            "can_approve": False,
            "active": True,
        }
        payload.update(overrides)
        return self.client.post(reverse("api_v1:delegation-list"), payload, format="json")

    def _reload(self, assignment_id):
        self.client.force_authenticate(user=self.principal)
        response = self.client.get(reverse("api_v1:delegation-detail", args=[assignment_id]))
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_technical_assistant_keeps_its_type_and_limited_permissions(self):
        created = self._assign(assistant_type="TA")

        self.assertEqual(created.status_code, 201, created.data)
        reloaded = self._reload(created.data["id"])

        self.assertEqual(reloaded["assistant_type"], "TA")
        self.assertTrue(reloaded["can_view"])
        self.assertTrue(reloaded["can_forward"])
        self.assertFalse(reloaded["can_respond"])
        self.assertFalse(reloaded["can_minute"])
        self.assertFalse(reloaded["can_approve"])

    def test_personal_assistant_keeps_its_full_permissions(self):
        created = self._assign(
            assistant_type="PA",
            can_respond=True,
            can_minute=True,
        )

        self.assertEqual(created.status_code, 201, created.data)
        reloaded = self._reload(created.data["id"])

        self.assertEqual(reloaded["assistant_type"], "PA")
        self.assertTrue(reloaded["can_view"])
        self.assertTrue(reloaded["can_forward"])
        self.assertTrue(reloaded["can_respond"])
        self.assertTrue(reloaded["can_minute"])
        self.assertFalse(reloaded["can_approve"])
