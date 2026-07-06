from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.test.client import RequestFactory
from rest_framework.test import APIClient

from common.middleware import SecurityHeadersMiddleware
from common.pagination import CatalogPageNumberPagination, StandardPageNumberPagination
from organization.models import Role
from organization.permissions_catalog import ROLE_PERMISSION_PRESETS

User = get_user_model()


class PaginationConfigTests(TestCase):
    def test_standard_pagination_defaults(self):
        paginator = StandardPageNumberPagination()
        self.assertEqual(paginator.page_size, 50)
        self.assertEqual(paginator.page_size_query_param, "page_size")
        self.assertEqual(paginator.max_page_size, 100)

    def test_catalog_pagination_defaults(self):
        paginator = CatalogPageNumberPagination()
        self.assertEqual(paginator.page_size, 100)
        self.assertEqual(paginator.max_page_size, 500)


class UserListPaginationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username="pagadmin",
            email="pagadmin@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.admin)
        for index in range(3):
            User.objects.create_user(
                username=f"user{index}",
                email=f"user{index}@example.com",
                password="testpass123",
            )

    def test_users_list_honors_page_size(self):
        response = self.client.get("/api/v1/accounts/users/?page=1&page_size=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertGreaterEqual(response.data["count"], 4)

    def test_users_list_caps_page_size_at_catalog_max(self):
        response = self.client.get("/api/v1/accounts/users/?page=1&page_size=9999")
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(response.data["results"]), 500)


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
            permissions={"can_access_system_health": True},
        )
        self.user = User.objects.create_user(
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


class SecurityHeadersMiddlewareTests(TestCase):
    def test_adds_security_headers(self):
        def get_response(request):
            from django.http import HttpResponse

            return HttpResponse("ok")

        request = RequestFactory().get("/api/v1/health/")
        response = SecurityHeadersMiddleware(get_response)(request)
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["Referrer-Policy"], "strict-origin-when-cross-origin")


class EnvironmentParityCommandTests(TestCase):
    def test_detects_missing_role_permissions(self):
        Role.objects.create(name="Secretary", permissions={})
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        with self.assertRaises(SystemExit):
            call_command("check_environment_parity", "--strict", "--skip-env", stdout=out)

        output = out.getvalue()
        self.assertIn("Secretary", output)

    def test_passes_when_role_permissions_seeded(self):
        preset = ROLE_PERMISSION_PRESETS["Secretary"]
        Role.objects.create(name="Secretary", permissions=preset)
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command(
            "setup_celery_beat",
            stdout=StringIO(),
        )
        call_command("check_environment_parity", "--strict", "--skip-env", stdout=out)
        self.assertIn("passed", out.getvalue().lower())
