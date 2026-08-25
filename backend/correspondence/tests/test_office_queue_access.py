"""Tests for office queue access (principal/acting/secretariat only)."""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import Correspondence
from organization.models import Office, OfficeMembership

User = get_user_model()


class OfficeQueueAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.office = Office.objects.create(name="AGM ICT", code="AGM-ICT-Q")

        self.principal = User.objects.create_user(
            username="agm_principal",
            password="testpass123",
        )
        OfficeMembership.objects.create(
            user=self.principal,
            office=self.office,
            is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
        )

        self.secretariat = User.objects.create_user(
            username="agm_secretariat",
            password="testpass123",
        )
        OfficeMembership.objects.create(
            user=self.secretariat,
            office=self.office,
            is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT,
        )

        self.acting = User.objects.create_user(
            username="agm_acting",
            password="testpass123",
        )
        OfficeMembership.objects.create(
            user=self.acting,
            office=self.office,
            is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.ACTING,
        )

        self.staff = User.objects.create_user(
            username="pm_staff",
            password="testpass123",
        )
        OfficeMembership.objects.create(
            user=self.staff,
            office=self.office,
            is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )

        self.item = Correspondence.objects.create(
            reference_number=f"NPA/Q/{uuid.uuid4().hex[:8].upper()}",
            subject="Office tray item",
            sender_name="Sender",
            created_by=self.principal,
            owning_office=self.office,
            current_office=self.office,
            status=Correspondence.Status.IN_PROGRESS,
        )

    def _refs(self, response):
        return {item["reference_number"] for item in response.data.get("results", [])}

    def test_staff_office_inbox_empty(self):
        self.client.force_authenticate(user=self.staff)
        url = reverse("api_v1:correspondence-office-inbox")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(self.item.reference_number, self._refs(response))
        self.assertEqual(response.data.get("count", 0), 0)

    def test_staff_office_sent_empty(self):
        self.client.force_authenticate(user=self.staff)
        url = reverse("api_v1:correspondence-office-sent")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("count", 0), 0)
        self.assertEqual(response.data.get("results", []), [])

    def test_principal_sees_office_inbox(self):
        self.client.force_authenticate(user=self.principal)
        url = reverse("api_v1:correspondence-office-inbox")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.item.reference_number, self._refs(response))

    def test_secretariat_sees_office_inbox(self):
        self.client.force_authenticate(user=self.secretariat)
        url = reverse("api_v1:correspondence-office-inbox")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.item.reference_number, self._refs(response))

    def test_acting_sees_office_inbox(self):
        self.client.force_authenticate(user=self.acting)
        url = reverse("api_v1:correspondence-office-inbox")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.item.reference_number, self._refs(response))

    def test_staff_sidebar_office_counts_zero(self):
        self.client.force_authenticate(user=self.staff)
        url = reverse("api_v1:correspondence-sidebar-counts")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["officeInbox"], 0)
        self.assertEqual(response.data["officeSent"], 0)
