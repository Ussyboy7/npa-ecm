"""Tests for environment parity checks and security headers."""

from django.test import TestCase, override_settings
from django.test.client import RequestFactory

from common.middleware import SecurityHeadersMiddleware
from organization.models import Role
from organization.permissions_catalog import ROLE_PERMISSION_PRESETS


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
