from django.test import TestCase
from rest_framework.test import APIClient


class HealthEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_live_returns_ok(self):
        response = self.client.get("/health/live/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_health_check_returns_services(self):
        response = self.client.get("/api/v1/health/")
        self.assertIn(response.status_code, (200, 503))
        self.assertIn("services", response.json())
