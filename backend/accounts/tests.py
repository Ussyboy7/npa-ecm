from django.test import TestCase
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.management import call_command
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
import jwt
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from organization.models import Directorate, Division, Office, OfficeMembership, Role
from accounts.nominal_roll_mapping import resolve_office_code, resolve_role
from .models import User, SealOTP
from unittest.mock import patch
from pathlib import Path
import csv
import tempfile


def set_existing_auth_cookies(client, user):
    """Simulate a browser session cookie arriving without a CSRF header."""
    client.cookies["npa_ecm_access_token"] = str(RefreshToken.for_user(user).access_token)
    client.cookies["npa_ecm_session"] = "1"


class UserModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def test_user_creation(self):
        self.assertEqual(self.user.username, "testuser")
        self.assertTrue(self.user.check_password("testpass123"))

    def test_user_str(self):
        self.assertEqual(str(self.user), self.user.username)


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            is_active=True,
        )
        self.login_url = reverse("api_v1:token_obtain_pair")

    def test_login_success(self):
        response = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertIn("npa_ecm_access_token", response.cookies)
        self.assertIn("npa_ecm_refresh_token", response.cookies)
        self.assertIn("npa_ecm_csrf_token", response.cookies)
        self.assertTrue(response.cookies["npa_ecm_access_token"]["httponly"])
        self.assertTrue(response.cookies["npa_ecm_refresh_token"]["httponly"])
        self.assertFalse(response.cookies["npa_ecm_csrf_token"]["httponly"])
        body = response.content.decode()
        self.assertNotIn(response.cookies["npa_ecm_access_token"].value, body)
        self.assertNotIn(response.cookies["npa_ecm_refresh_token"].value, body)

    def test_cookie_refresh_rotates_http_only_tokens_without_exposing_them(self):
        login = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "testpass123",
        })
        old_refresh = login.cookies["npa_ecm_refresh_token"].value
        csrf = login.cookies["npa_ecm_csrf_token"].value

        response = self.client.post(
            reverse("api_v1:token_refresh"),
            {},
            format="json",
            HTTP_X_CSRF_TOKEN=csrf,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"detail": "Session refreshed."})
        self.assertTrue(response.cookies["npa_ecm_access_token"]["httponly"])
        self.assertTrue(response.cookies["npa_ecm_refresh_token"]["httponly"])
        self.assertNotEqual(response.cookies["npa_ecm_refresh_token"].value, old_refresh)
        old_jti = jwt.decode(old_refresh, options={"verify_signature": False})["jti"]
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=old_jti).exists())
        body = response.content.decode()
        self.assertNotIn(response.cookies["npa_ecm_access_token"].value, body)
        self.assertNotIn(response.cookies["npa_ecm_refresh_token"].value, body)

    def test_logout_blacklists_refresh_and_expires_session_cookies(self):
        login = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "testpass123",
        })
        refresh = login.cookies["npa_ecm_refresh_token"].value
        csrf = login.cookies["npa_ecm_csrf_token"].value

        response = self.client.post(
            reverse("api_v1:logout"),
            {},
            format="json",
            HTTP_X_CSRF_TOKEN=csrf,
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.content, b"")
        refresh_jti = jwt.decode(refresh, options={"verify_signature": False})["jti"]
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=refresh_jti).exists())
        for cookie_name in (
            "npa_ecm_access_token",
            "npa_ecm_refresh_token",
            "npa_ecm_session",
        ):
            self.assertEqual(response.cookies[cookie_name]["max-age"], 0)

    def test_impersonation_and_return_keep_jwts_in_cookies(self):
        admin = User.objects.create_superuser(
            username="cookie-impersonation-admin",
            email="cookie-admin@example.com",
            password="testpass123",
        )
        target = User.objects.create_user(
            username="cookie-impersonation-target",
            email="cookie-target@example.com",
            password="testpass123",
            is_active=True,
        )
        self.client.post(self.login_url, {
            "username": admin.username,
            "password": "testpass123",
        })
        original_refresh = self.client.cookies["npa_ecm_refresh_token"].value
        csrf = self.client.cookies["npa_ecm_csrf_token"].value

        impersonated = self.client.post(
            reverse("api_v1:token_impersonate"),
            {"username": target.username},
            format="json",
            HTTP_X_CSRF_TOKEN=csrf,
        )

        self.assertEqual(impersonated.status_code, status.HTTP_200_OK)
        self.assertEqual(str(impersonated.data["user"]["id"]), str(target.id))
        self.assertTrue(impersonated.cookies["npa_ecm_original_refresh_token"]["httponly"])
        self.assertEqual(
            impersonated.cookies["npa_ecm_original_refresh_token"].value,
            original_refresh,
        )
        self.assertTrue(impersonated.cookies["npa_ecm_access_token"]["httponly"])
        self.assertTrue(impersonated.cookies["npa_ecm_refresh_token"]["httponly"])
        impersonation_body = impersonated.content.decode()
        self.assertNotIn('"access"', impersonation_body)
        self.assertNotIn('"refresh"', impersonation_body)
        self.assertNotIn(impersonated.cookies["npa_ecm_access_token"].value, impersonation_body)
        self.assertNotIn(impersonated.cookies["npa_ecm_refresh_token"].value, impersonation_body)

        returned = self.client.post(
            reverse("api_v1:token_impersonate_return"),
            {},
            format="json",
            HTTP_X_CSRF_TOKEN=self.client.cookies["npa_ecm_csrf_token"].value,
        )

        self.assertEqual(returned.status_code, status.HTTP_200_OK)
        self.assertEqual(returned.data, {"detail": "Returned to your primary account."})
        self.assertEqual(returned.cookies["npa_ecm_impersonating"]["max-age"], 0)
        self.assertEqual(returned.cookies["npa_ecm_original_user_id"]["max-age"], 0)
        self.assertEqual(returned.cookies["npa_ecm_original_refresh_token"]["max-age"], 0)
        self.assertTrue(returned.cookies["npa_ecm_access_token"]["httponly"])
        self.assertTrue(returned.cookies["npa_ecm_refresh_token"]["httponly"])
        return_body = returned.content.decode()
        self.assertNotIn('"access"', return_body)
        self.assertNotIn('"refresh"', return_body)
        self.assertNotIn(returned.cookies["npa_ecm_access_token"].value, return_body)
        self.assertNotIn(returned.cookies["npa_ecm_refresh_token"].value, return_body)
        current_user = self.client.get(reverse("api_v1:current_user"))
        self.assertEqual(current_user.status_code, status.HTTP_200_OK)
        self.assertEqual(str(current_user.data["id"]), str(admin.id))

    def test_cookie_session_requires_csrf_for_unsafe_requests(self):
        login = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "testpass123",
        })
        csrf = login.cookies["npa_ecm_csrf_token"].value

        me = self.client.get(reverse("api_v1:current_user"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(str(me.data["id"]), str(self.user.id))

        blocked = self.client.post(reverse("api_v1:change_password"), {}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_403_FORBIDDEN)

        allowed = self.client.post(
            reverse("api_v1:change_password"),
            {},
            format="json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        self.assertEqual(allowed.status_code, status.HTTP_400_BAD_REQUEST)


    def test_login_failure(self):
        response = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "wrongpassword",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_ignores_stale_auth_cookies_without_csrf(self):
        set_existing_auth_cookies(self.client, self.user)

        response = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "testpass123",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("npa_ecm_access_token", response.cookies)
        self.assertIn("npa_ecm_refresh_token", response.cookies)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        body = response.content.decode()
        self.assertNotIn('"access"', body)
        self.assertNotIn('"refresh"', body)
        self.assertNotIn(response.cookies["npa_ecm_access_token"].value, body)
        self.assertNotIn(response.cookies["npa_ecm_refresh_token"].value, body)

    def test_legacy_refresh_token_can_bootstrap_without_csrf(self):
        refresh = RefreshToken.for_user(self.user)

        response = self.client.post(
            reverse("api_v1:token_refresh"),
            {"refresh": str(refresh)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("npa_ecm_access_token", response.cookies)
        self.assertIn("npa_ecm_session", response.cookies)

    def test_cookie_only_refresh_still_requires_csrf(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["npa_ecm_refresh_token"] = str(refresh)

        response = self.client.post(reverse("api_v1:token_refresh"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("accounts.views_auth.resolve_username_from_claims", return_value="oidcuser")
    @patch("accounts.views_auth.fetch_userinfo")
    @patch("accounts.views_auth.exchange_code_for_tokens", return_value={"access_token": "provider-token"})
    @patch("accounts.views_auth.pop_oidc_state", return_value={"nonce": "abc"})
    @patch("accounts.views_auth.oidc_enabled", return_value=True)
    def test_oidc_callback_redirect_uses_cookies_not_query_tokens(
        self,
        _mock_oidc_enabled,
        _mock_pop_state,
        _mock_exchange,
        mock_userinfo,
        _mock_resolve_username,
    ):
        mock_userinfo.return_value = {
            "sub": "oidc-subject-1",
            "email": "oidc@example.com",
            "given_name": "OIDC",
            "family_name": "User",
        }

        response = self.client.get(
            reverse("api_v1:oidc_callback"),
            {"code": "provider-code", "state": "state-token"},
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(
            response["Location"],
            f"{settings.FRONTEND_BASE_URL.rstrip('/')}/auth/callback",
        )
        self.assertNotIn("access=", response["Location"])
        self.assertNotIn("refresh=", response["Location"])
        self.assertIn("npa_ecm_access_token", response.cookies)
        self.assertIn("npa_ecm_refresh_token", response.cookies)


class LoginMFAStaleCookieTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="mfa-cookie-user",
            email="mfa-cookie@example.com",
            password="testpass123",
            is_active=True,
        )

    def test_mfa_login_challenge_response_contains_no_jwts(self):
        from .login_mfa import get_or_create_login_security

        security = get_or_create_login_security(self.user)
        security.mfa_enabled = True
        security.save(update_fields=["mfa_enabled", "updated_at"])

        response = self.client.post(
            reverse("api_v1:token_obtain_pair"),
            {"username": self.user.username, "password": "testpass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["mfa_required"])
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertNotIn('"access"', response.content.decode())
        self.assertNotIn('"refresh"', response.content.decode())

    def test_mfa_verification_ignores_stale_auth_cookies_without_csrf(self):
        from .login_mfa import create_mfa_challenge

        otp = SealOTP.create_for_user(
            user=self.user,
            purpose="login",
            validity_minutes=10,
        )
        challenge = create_mfa_challenge(self.user)
        set_existing_auth_cookies(self.client, self.user)

        response = self.client.post(
            reverse("api_v1:token_mfa_verify"),
            {
                "challenge_id": challenge["challenge_id"],
                "code": otp.code,
                "method": "email",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("npa_ecm_access_token", response.cookies)
        self.assertIn("npa_ecm_refresh_token", response.cookies)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        body = response.content.decode()
        self.assertNotIn(response.cookies["npa_ecm_access_token"].value, body)
        self.assertNotIn(response.cookies["npa_ecm_refresh_token"].value, body)

    def test_mfa_email_request_ignores_stale_auth_cookies_without_csrf(self):
        from .login_mfa import create_mfa_challenge

        challenge = create_mfa_challenge(self.user)
        set_existing_auth_cookies(self.client, self.user)

        response = self.client.post(
            reverse("api_v1:login_mfa_email_request"),
            {"challenge_id": challenge["challenge_id"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)


class InitialPasswordSetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="firstlogin",
            email="firstlogin@example.com",
        )
        self.user.set_unusable_password()
        self.user.save(update_fields=["password"])
        self.url = reverse("api_v1:initial_password_set")
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_sets_password_and_consumes_token(self):
        response = self.client.post(
            self.url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "NewSecurePass123!",
                "confirm_password": "NewSecurePass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecurePass123!"))
        cache.clear()

        retry = self.client.post(
            self.url,
            {
                "uid": self.uid,
                "token": self.token,
                "new_password": "AnotherPass123!",
                "confirm_password": "AnotherPass123!",
            },
            format="json",
        )
        self.assertEqual(retry.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_invalid_token(self):
        response = self.client.post(
            self.url,
            {
                "uid": self.uid,
                "token": "invalid-token",
                "new_password": "NewSecurePass123!",
                "confirm_password": "NewSecurePass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class NominalRollImportTests(TestCase):
    def setUp(self):
        self.md_role = Role.objects.create(name="Managing Director")
        self.gm_role = Role.objects.create(name="General Manager")
        self.agm_role = Role.objects.create(name="Assistant General Manager")

        self.md = User.objects.create_user(
            username="md",
            email="md@npa.gov.ng",
            password="ExistingPass123!",
            first_name="Dr.",
            last_name="Dantsoho",
        )
        self.md.system_role = self.md_role
        self.md.save(update_fields=["system_role"])

        self.gm = User.objects.create_user(
            username="gmprocurement",
            email="gm.procurement@npa.gov.ng",
            password="ExistingPass123!",
            first_name="Adedapo",
            last_name="Adekunle",
        )
        self.gm.system_role = self.gm_role
        self.gm.save(update_fields=["system_role"])

        self.agm = User.objects.create_user(
            username="agmsoftware",
            email="agm.software@npa.gov.ng",
            password="ExistingPass123!",
            first_name="Fola",
            last_name="Adeyinka",
        )
        self.agm.system_role = self.agm_role
        self.agm.save(update_fields=["system_role"])

        self.other = User.objects.create_user(
            username="demo-other",
            email="demo-other@npa.gov.ng",
            password="ExistingPass123!",
        )
        self.legacy = User.objects.create_user(
            username="legacy-unusable",
            email="legacy@npa.gov.ng",
            password=None,
            first_name="Legacy",
            last_name="User",
            employee_id="8888",
        )

    def test_updates_known_admins_in_place_and_sets_default_password(self):
        from openpyxl import Workbook

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            workbook_path = tmp_path / "roll.xlsx"
            links_path = tmp_path / "first-login.csv"

            workbook = Workbook()
            sheet = workbook.active
            sheet.append(
                [
                    "Employee Number",
                    "Person No.",
                    "Title",
                    "Surname",
                    "First Name",
                    "Middle Name",
                    "Grade Level",
                    "Designation",
                    "Email Address",
                ]
            )
            sheet.append(
                [
                    "3509",
                    "6493",
                    "Mr.",
                    "DANTSOHO",
                    "ABUBAKAR",
                    "MOHAMMED",
                    "MDCS",
                    "MANAGING DIRECTOR",
                    "a.dantosho@nigerianports.gov.ng",
                ]
            )
            sheet.append(
                [
                    "3643",
                    "6275",
                    "Mr.",
                    "ADEKUNLE",
                    "ADEDAPO",
                    "FELIX",
                    "MSS1",
                    "GENERAL MANAGER PROCUREMENT (HOD)",
                    "f.adekunle@nigerianports.gov.ng",
                ]
            )
            sheet.append(
                [
                    "9999",
                    "A9999",
                    "Ms.",
                    "NEWPERSON",
                    "ADA",
                    "NGOZI",
                    "SSS2",
                    "OFFICER II",
                    "ada.newperson@nigerianports.gov.ng",
                ]
            )
            sheet.append(
                [
                    "8888",
                    "A8888",
                    "Mr.",
                    "USER",
                    "LEGACY",
                    "",
                    "SSS1",
                    "OFFICER I",
                    "legacy@npa.gov.ng",
                ]
            )
            workbook.save(workbook_path)

            call_command(
                "import_nominal_roll",
                workbook_path,
                "--apply",
                "--deactivate-missing",
                "--first-login-out",
                links_path,
                "--first-login-base-url",
                "https://ecm.example.gov.ng",
            )

            self.md.refresh_from_db()
            self.assertEqual(self.md.employee_id, "3509")
            self.assertEqual(self.md.email, "a.dantosho@nigerianports.gov.ng")
            self.assertEqual(self.md.system_role_id, self.md_role.id)
            self.assertTrue(self.md.check_password("ExistingPass123!"))

            self.gm.refresh_from_db()
            self.assertEqual(self.gm.employee_id, "3643")
            self.assertEqual(self.gm.email, "f.adekunle@nigerianports.gov.ng")
            self.assertEqual(self.gm.system_role_id, self.gm_role.id)
            self.assertTrue(self.gm.check_password("ExistingPass123!"))

            self.assertEqual(User.objects.filter(username="md").count(), 1)
            self.assertEqual(User.objects.filter(username="gmprocurement").count(), 1)
            new_user = User.objects.get(employee_id="9999")
            self.assertTrue(new_user.check_password("ChangeMe123!"))
            self.legacy.refresh_from_db()
            self.assertTrue(self.legacy.check_password("ChangeMe123!"))
            self.assertTrue(self.agm.is_active)
            self.assertFalse(self.other.refresh_from_db() or self.other.is_active)
            self.assertFalse(links_path.exists())

    def test_reconcile_report_flags_placeholder_and_duplicate_emails(self):
        from io import StringIO
        from openpyxl import Workbook

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            workbook_path = tmp_path / "roll.xlsx"
            report_path = tmp_path / "reconciliation.csv"

            workbook = Workbook()
            sheet = workbook.active
            sheet.append(
                [
                    "Employee Number",
                    "Person No.",
                    "Title",
                    "Surname",
                    "First Name",
                    "Middle Name",
                    "Grade Level",
                    "Designation",
                    "Email Address",
                ]
            )
            sheet.append(
                ["9701", "A9701", "Mr.", "ALPHA", "ONE", "", "SSS1", "OFFICER", "nan"]
            )
            sheet.append(
                ["9702", "A9702", "Ms.", "BETA", "TWO", "", "SSS2", "OFFICER", "nan"]
            )
            sheet.append(
                [
                    "9703",
                    "A9703",
                    "Mr.",
                    "GAMMA",
                    "THREE",
                    "",
                    "SSS3",
                    "OFFICER",
                    "shared@nigerianports.gov.ng",
                ]
            )
            sheet.append(
                [
                    "9704",
                    "A9704",
                    "Mrs.",
                    "DELTA",
                    "FOUR",
                    "",
                    "SSS4",
                    "OFFICER",
                    "shared@nigerianports.gov.ng",
                ]
            )
            workbook.save(workbook_path)

            call_command(
                "reconcile_nominal_roll",
                workbook_path,
                "--out",
                report_path,
                stdout=StringIO(),
            )
            with report_path.open(newline="", encoding="utf-8") as handle:
                rows = {row["employee_number"]: row for row in csv.DictReader(handle)}

            self.assertEqual(rows["9701"]["action"], "create")
            self.assertEqual(rows["9701"]["email"], "")
            self.assertIn("placeholder", rows["9701"]["note"])
            self.assertEqual(rows["9702"]["action"], "create")
            self.assertEqual(rows["9704"]["action"], "skip_duplicate_email")
            self.assertEqual(rows["9704"]["note"], "Email first appears on row 4.")

    def test_import_treats_email_placeholder_as_missing(self):
        from io import StringIO
        from openpyxl import Workbook

        with tempfile.TemporaryDirectory() as tmp:
            workbook_path = Path(tmp) / "roll.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(
                [
                    "Employee Number",
                    "Person No.",
                    "Title",
                    "Surname",
                    "First Name",
                    "Middle Name",
                    "Grade Level",
                    "Designation",
                    "Email Address",
                ]
            )
            sheet.append(
                ["9705", "A9705", "Mr.", "EPSILON", "FIVE", "", "SSS1", "OFFICER", "nan"]
            )
            workbook.save(workbook_path)

            call_command(
                "import_nominal_roll",
                workbook_path,
                "--apply",
                stdout=StringIO(),
                stderr=StringIO(),
            )

            created = User.objects.get(employee_id="9705")
            self.assertEqual(created.email, "")
            self.assertEqual(created.username, "npa9705")
            self.assertTrue(created.check_password("ChangeMe123!"))

    def test_management_name_match_is_not_used_for_non_management_grade(self):
        from io import StringIO
        from openpyxl import Workbook

        with tempfile.TemporaryDirectory() as tmp:
            workbook_path = Path(tmp) / "roll.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(
                [
                    "Employee Number",
                    "Person No.",
                    "Title",
                    "Surname",
                    "First Name",
                    "Middle Name",
                    "Grade Level",
                    "Designation",
                    "Email Address",
                ]
            )
            sheet.append(
                [
                    "9706",
                    "A9706",
                    "Mr.",
                    "ADEKUNLE",
                    "ADEDAPO",
                    "",
                    "SSS2",
                    "SENIOR ERM OFFICER",
                    "unique.adedapo@nigerianports.gov.ng",
                ]
            )
            workbook.save(workbook_path)

            call_command(
                "import_nominal_roll",
                workbook_path,
                "--apply",
                stdout=StringIO(),
                stderr=StringIO(),
            )

            self.gm.refresh_from_db()
            self.assertNotEqual(self.gm.employee_id, "9706")
            created = User.objects.get(employee_id="9706")
            self.assertEqual(created.system_role_id, None)


class NominalRollMappingTests(TestCase):
    def test_role_is_selected_by_grade_and_secretary_is_overridden(self):
        self.assertEqual(resolve_role("MDCS", "MANAGING DIRECTOR"), "Managing Director")
        self.assertEqual(resolve_role("MSS1", "GENERAL MANAGER ENGINEERING"), "General Manager")
        self.assertEqual(resolve_role("MSS2", "ASST. GENERAL MANAGER"), "Assistant General Manager")
        self.assertEqual(resolve_role("SSS4", "SENIOR AUDITOR"), "Officer II")
        self.assertEqual(resolve_role("MSS4", "PRIN PERSONAL SECRETARY"), "Secretary")
        self.assertEqual(resolve_role("JSS1", "CHIEF PATROLMAN"), "Staff I")

    def test_office_mapping_uses_grade_tier_and_unit(self):
        self.assertEqual(
            resolve_office_code("MSS1", "GENERAL MANAGER PROCUREMENT (HOD)"),
            "OFF_DIV_PROCUREMENT",
        )
        self.assertEqual(
            resolve_office_code("SSS2", "SENIOR AUDITOR"),
            "OFF_DIV_AUDIT",
        )
        self.assertEqual(
            resolve_office_code("SSS2", "HR OPERATIONS OFFICER I"),
            "OFF_DEPT_HR_MGT",
        )
        self.assertEqual(
            resolve_office_code("MDCS", "MANAGING DIRECTOR"),
            "OFF_MD",
        )
        self.assertEqual(
            resolve_office_code("EDCS", "EXECUTIVE DIR. MARINE & OPERATIONS"),
            "OFF_DIR_EDMO",
        )
        self.assertIsNone(resolve_office_code("SSS2", "GENERAL DUTY OFFICER"))


class NominalRollRoleAssignmentCommandTests(TestCase):
    def setUp(self):
        self.directorate = Directorate.objects.create(
            name="Engineering & Technical Services",
            code="ENG",
        )
        self.division = Division.objects.create(
            directorate=self.directorate,
            name="Engineering & Technical Services",
            code="ENG",
        )
        self.office = Office.objects.create(
            name="Engineering & Technical Services Division Office",
            code="OFF_DIV_ENGINEERING",
            office_type=Office.OfficeTier.DIVISION,
            directorate=self.directorate,
            division=self.division,
        )
        self.role = Role.objects.create(
            name="General Manager",
            permissions={"can_approve": True, "can_register_correspondence": True},
        )
        self.user = User.objects.create_user(
            username="rollmanager",
            email="rollmanager@nigerianports.gov.ng",
            employee_id="8801",
            password="ExistingPass123!",
        )

    def _workbook(self, path):
        from openpyxl import Workbook

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(
            [
                "Employee Number",
                "Person No.",
                "Title",
                "Surname",
                "First Name",
                "Middle Name",
                "Grade Level",
                "Designation",
                "Email Address",
            ]
        )
        sheet.append(
            [
                "8801",
                "A8801",
                "Mr.",
                "ROLL",
                "MANAGER",
                "",
                "MSS1",
                "GENERAL MANAGER ENGINEERING (HOD)",
                "rollmanager@nigerianports.gov.ng",
            ]
        )
        workbook.save(path)

    def test_apply_fills_blank_role_and_office_and_is_idempotent(self):
        from io import StringIO

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            workbook_path = tmp_path / "roll.xlsx"
            report_path = tmp_path / "mapping.csv"
            self._workbook(workbook_path)

            call_command(
                "assign_nominal_roll_roles",
                workbook_path,
                "--apply",
                "--out",
                report_path,
                stdout=StringIO(),
                stderr=StringIO(),
            )
            self.user.refresh_from_db()
            self.assertEqual(self.user.system_role_id, self.role.id)
            self.assertEqual(self.user.directorate_id, self.directorate.id)
            self.assertEqual(self.user.division_id, self.division.id)
            membership = OfficeMembership.objects.get(user=self.user, office=self.office)
            self.assertTrue(membership.is_primary)
            self.assertTrue(membership.can_approve)

            call_command(
                "assign_nominal_roll_roles",
                workbook_path,
                "--apply",
                "--out",
                report_path,
                stdout=StringIO(),
                stderr=StringIO(),
            )
            self.assertEqual(
                OfficeMembership.objects.filter(user=self.user).count(), 1
            )
            self.user.refresh_from_db()
            self.assertEqual(self.user.system_role_id, self.role.id)

class SealOTPModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="otpuser",
            password="testpass123",
        )

    def test_otp_generation(self):
        otp = SealOTP.create_for_user(self.user)
        self.assertEqual(len(otp.code), 6)
        self.assertTrue(otp.code.isdigit())
        self.assertTrue(otp.is_valid())

    def test_otp_verification_valid(self):
        otp = SealOTP.create_for_user(self.user)
        self.assertTrue(otp.verify(otp.code))
        self.assertTrue(otp.is_used)

    def test_otp_verification_invalid(self):
        otp = SealOTP.create_for_user(self.user)
        self.assertFalse(otp.verify("000000"))
        self.assertEqual(otp.attempts, 1)

    def test_otp_max_attempts(self):
        otp = SealOTP.create_for_user(self.user)
        for _ in range(5):
            otp.verify("000000")
        self.assertFalse(otp.is_valid())
