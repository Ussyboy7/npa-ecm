from io import BytesIO
import time
import re

import pyotp
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from audit.models import ActivityLog

from .models import BackupCode, ExecutiveSignature, LoginSecuritySettings, SealOTP, User
from .services import BackupCodeService


def make_png(name="hardening-signature.png"):
    buffer = BytesIO()
    Image.new("RGB", (200, 80), "white").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def raw_column(table, column, row_id):
    with connection.cursor() as cursor:
        cursor.execute(
            f'SELECT "{column}" FROM "{table}" WHERE "id" = %s',
            [row_id],
        )
        row = cursor.fetchone()
    return row[0] if row else None


class SealTotpHardeningTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="seal-hardening-user",
            email="seal-hardening@example.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api_v1:executive_signature"),
            {"signature_image": make_png()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.signature = ExecutiveSignature.objects.get(user=self.user)
        self.addCleanup(self.signature.signature_image.delete, save=False)

    def test_existing_totp_seed_requires_step_up_and_rotation_changes_seed(self):
        first = self.client.post(reverse("api_v1:2fa_totp_setup"), format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        original_secret = first.data["secret"]

        unauthenticated = self.client.post(reverse("api_v1:2fa_totp_setup"), format="json")
        self.assertEqual(unauthenticated.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(unauthenticated.data["details"]["step_up_required"])

        rotated = self.client.post(
            reverse("api_v1:2fa_totp_setup"),
            {"regenerate": True, "current_password": "testpass123"},
            format="json",
        )
        self.assertEqual(rotated.status_code, status.HTTP_200_OK)
        self.assertNotEqual(rotated.data["secret"], original_secret)

    def test_totp_setup_throttle_wait_is_at_most_one_minute(self):
        responses = []
        for _ in range(6):
            responses.append(
                self.client.post(
                    reverse("api_v1:2fa_totp_setup"),
                    {"current_password": "testpass123"},
                    format="json",
                )
            )

        self.assertEqual(
            [response.status_code for response in responses[:5]],
            [status.HTTP_200_OK] * 5,
        )
        throttled = responses[5]
        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        message = str(throttled.data["message"])
        match = re.search(r"available in (\d+) seconds", message)
        self.assertIsNotNone(match, message)
        wait = int(match.group(1))
        self.assertLessEqual(wait, 60)
        self.assertGreater(wait, 0)

    def test_totp_secret_is_encrypted_at_rest(self):
        response = self.client.post(reverse("api_v1:2fa_totp_setup"), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        secret = response.data["secret"]

        stored = raw_column(
            ExecutiveSignature._meta.db_table,
            "totp_secret",
            self.signature.pk,
        )
        self.assertNotEqual(stored, secret)
        self.assertNotIn(secret, str(stored))

    def test_totp_verification_rejects_a_replayed_time_step(self):
        setup = self.client.post(reverse("api_v1:2fa_totp_setup"), format="json")
        secret = setup.data["secret"]
        code = pyotp.TOTP(secret).now()

        first = self.client.post(
            reverse("api_v1:2fa_totp_verify"),
            {"code": code, "purpose": "setup"},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        replay = self.client.post(
            reverse("api_v1:2fa_totp_verify"),
            {"code": code, "purpose": "verify"},
            format="json",
        )
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(replay.data["verified"])

    def test_disabling_totp_requires_a_current_code(self):
        setup = self.client.post(reverse("api_v1:2fa_totp_setup"), format="json")
        secret = setup.data["secret"]
        code = pyotp.TOTP(secret).now()
        confirmed = self.client.post(
            reverse("api_v1:2fa_totp_verify"),
            {"code": code, "purpose": "setup", "generate_backup_codes": True},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)

        missing = self.client.post(reverse("api_v1:2fa_totp_disable"), format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)

        next_code = pyotp.TOTP(secret).at(int(time.time()) + 30)
        disabled = self.client.post(
            reverse("api_v1:2fa_totp_disable"),
            {"code": next_code},
            format="json",
        )
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        self.signature.refresh_from_db()
        self.assertFalse(self.signature.totp_enabled)
        self.assertEqual(self.signature.totp_secret, "")

    def test_disabling_totp_accepts_password_when_the_authenticator_is_lost(self):
        setup = self.client.post(reverse("api_v1:2fa_totp_setup"), format="json")
        secret = setup.data["secret"]
        confirmed = self.client.post(
            reverse("api_v1:2fa_totp_verify"),
            {"code": pyotp.TOTP(secret).now(), "purpose": "setup"},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)

        disabled = self.client.post(
            reverse("api_v1:2fa_totp_disable"),
            {"current_password": "testpass123"},
            format="json",
        )
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        self.signature.refresh_from_db()
        self.assertFalse(self.signature.totp_enabled)


class BackupCodeHardeningTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="backup-hardening-user",
            email="backup-hardening@example.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_backup_codes_are_hashed_single_use_and_audited(self):
        generated = self.client.post(
            reverse("api_v1:backup_code_generate"),
            {"current_password": "testpass123"},
            format="json",
        )
        self.assertEqual(generated.status_code, status.HTTP_200_OK)
        codes = generated.data["backup_codes"]
        self.assertEqual(len(codes), BackupCodeService.DEFAULT_COUNT)

        record = BackupCode.objects.filter(user=self.user).first()
        self.assertIsNotNone(record)
        self.assertNotEqual(record.code_hash, BackupCodeService._normalize(codes[0]))

        verified = self.client.post(
            reverse("api_v1:backup_code_verify"),
            {"code": codes[0]},
            format="json",
        )
        self.assertEqual(verified.status_code, status.HTTP_200_OK)
        self.assertTrue(verified.data["verification_token"])

        replay = self.client.post(
            reverse("api_v1:backup_code_verify"),
            {"code": codes[0]},
            format="json",
        )
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

        remaining = self.client.get(reverse("api_v1:backup_code_status"))
        self.assertEqual(remaining.data["remaining"], len(codes) - 1)
        self.assertTrue(
            ActivityLog.objects.filter(
                user=self.user,
                description__icontains="backup code",
            ).exists()
        )


class EmailOtpHardeningTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="email-hardening-user",
            email="email-hardening@example.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api_v1:executive_signature"),
            {"signature_image": make_png()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.signature = ExecutiveSignature.objects.get(user=self.user)
        self.addCleanup(self.signature.signature_image.delete, save=False)

    def test_email_otp_setup_requires_otp_id_and_persists_enrollment(self):
        request_response = self.client.post(
            reverse("api_v1:2fa_email_request"),
            {"purpose": "email_otp_setup"},
            format="json",
        )
        self.assertEqual(request_response.status_code, status.HTTP_200_OK)
        otp_id = request_response.data["otp_id"]
        otp = SealOTP.objects.get(id=otp_id)

        self.assertNotIn(otp.code, mail.outbox[-1].subject)
        self.assertIn(otp.code, mail.outbox[-1].body)
        stored = raw_column(SealOTP._meta.db_table, "code", otp.pk)
        self.assertNotEqual(stored, otp.code)
        self.assertNotIn(otp.code, str(stored))

        missing_id = self.client.post(
            reverse("api_v1:2fa_email_verify"),
            {"code": otp.code, "purpose": "email_otp_setup"},
            format="json",
        )
        self.assertEqual(missing_id.status_code, status.HTTP_400_BAD_REQUEST)

        verified = self.client.post(
            reverse("api_v1:2fa_email_verify"),
            {"otp_id": otp_id, "code": otp.code, "purpose": "email_otp_setup"},
            format="json",
        )
        self.assertEqual(verified.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(verified.data["backup_codes"]), 1)
        self.signature.refresh_from_db()
        self.assertTrue(self.signature.email_otp_enabled)

    def test_disabling_email_otp_requires_step_up_and_persists(self):
        self.signature.email_otp_enabled = True
        self.signature.save(update_fields=["email_otp_enabled"])

        missing = self.client.post(reverse("api_v1:2fa_email_disable"), format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(missing.data["details"]["step_up_required"])

        disabled = self.client.post(
            reverse("api_v1:2fa_email_disable"),
            {"current_password": "testpass123"},
            format="json",
        )
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        self.signature.refresh_from_db()
        self.assertFalse(self.signature.email_otp_enabled)

        request_after_disable = self.client.post(
            reverse("api_v1:2fa_email_request"),
            {"purpose": "seal_application"},
            format="json",
        )
        self.assertEqual(request_after_disable.status_code, status.HTTP_400_BAD_REQUEST)


class LoginMfaHardeningTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="login-hardening-user",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_enable_rejects_an_account_with_no_available_method(self):
        response = self.client.post(reverse("api_v1:login_mfa_enable"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        BackupCodeService.generate(self.user)
        backup_only = self.client.post(reverse("api_v1:login_mfa_enable"), format="json")
        self.assertEqual(backup_only.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            LoginSecuritySettings.objects.get(user=self.user).mfa_enabled
        )

    def test_disabling_login_mfa_requires_step_up_and_is_audited(self):
        self.user.email = "login-hardening@example.com"
        self.user.save(update_fields=["email"])
        enabled = self.client.post(reverse("api_v1:login_mfa_enable"), format="json")
        self.assertEqual(enabled.status_code, status.HTTP_200_OK)

        missing = self.client.post(reverse("api_v1:login_mfa_disable"), format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(missing.data["details"]["step_up_required"])

        disabled = self.client.post(
            reverse("api_v1:login_mfa_disable"),
            {"current_password": "testpass123"},
            format="json",
        )
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        security = LoginSecuritySettings.objects.get(user=self.user)
        self.assertFalse(security.mfa_enabled)
        self.assertEqual(security.totp_secret, "")
        self.assertTrue(
            ActivityLog.objects.filter(
                user=self.user,
                description__icontains="Disabled login MFA",
            ).exists()
        )

    def test_abandoned_login_totp_setup_does_not_enable_mfa(self):
        setup = self.client.post(reverse("api_v1:login_mfa_totp_setup"), format="json")
        self.assertEqual(setup.status_code, status.HTTP_200_OK)
        security = LoginSecuritySettings.objects.get(user=self.user)
        self.assertFalse(security.mfa_enabled)
        self.assertFalse(security.totp_confirmed)

        verify = self.client.post(
            reverse("api_v1:login_mfa_totp_verify"),
            {"code": pyotp.TOTP(setup.data["secret"]).now()},
            format="json",
        )
        self.assertEqual(verify.status_code, status.HTTP_200_OK)
        security.refresh_from_db()
        self.assertTrue(security.mfa_enabled)
        self.assertTrue(security.totp_confirmed)
        self.assertGreaterEqual(len(verify.data["backup_codes"]), 1)

    def test_existing_login_totp_seed_requires_step_up(self):
        first = self.client.post(reverse("api_v1:login_mfa_totp_setup"), format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        unauthenticated = self.client.post(
            reverse("api_v1:login_mfa_totp_setup"),
            format="json",
        )
        self.assertEqual(unauthenticated.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(unauthenticated.data["details"]["step_up_required"])

        stepped_up = self.client.post(
            reverse("api_v1:login_mfa_totp_setup"),
            {"current_password": "testpass123"},
            format="json",
        )
        self.assertEqual(stepped_up.status_code, status.HTTP_200_OK)


class SignaturePolicyHardeningTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="policy-hardening-user",
            email="policy-hardening@example.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        response = self.client.post(
            reverse("api_v1:executive_signature"),
            {"signature_image": make_png()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.signature = ExecutiveSignature.objects.get(user=self.user)
        self.addCleanup(self.signature.signature_image.delete, save=False)

    def test_turning_off_seal_2fa_requires_step_up(self):
        missing = self.client.patch(
            reverse("api_v1:executive_signature"),
            {"require_2fa": False},
            format="json",
        )
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(missing.data["details"]["step_up_required"])

        disabled = self.client.patch(
            reverse("api_v1:executive_signature"),
            {"require_2fa": False, "current_password": "testpass123"},
            format="json",
        )
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        self.signature.refresh_from_db()
        self.assertFalse(self.signature.require_2fa)
