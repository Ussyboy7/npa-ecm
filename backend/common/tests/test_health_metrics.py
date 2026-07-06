"""Tests for health and metrics endpoints."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from organization.models import Role


class HealthMetricsTests(TestCase):
    def test_liveness(self):
        response = self.client.get("/api/v1/health/live/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_prometheus_metrics(self):
        response = self.client.get("/api/metrics/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("ecm_database_up", response.content.decode())


class SystemStatusTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        role = Role.objects.create(
            name="System Administrator",
            permissions={"can_access_administration": True},
        )
        self.user = get_user_model().objects.create_user(
            username="ictadmin",
            email="ict@npa.gov.ng",
            password="testpass123",
            system_role=role,
        )

    def test_system_status_requires_auth(self):
        response = self.client.get("/api/v1/platform/system-status/")
        self.assertEqual(response.status_code, 401)

    def test_system_status_for_admin(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/platform/system-status/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("services", data)
        self.assertIn("users", data)
        self.assertIn("recent_activity", data)
