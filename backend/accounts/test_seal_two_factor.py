from io import BytesIO

import pyotp
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import DocumentSeal, ExecutiveSignature, User
from accounts.services import SealGenerationService, SealTwoFactorError
from correspondence.models import Correspondence
from organization.models import Role


def make_signature(user, *, require_2fa=True):
    buffer = BytesIO()
    Image.new("RGB", (200, 80), "white").save(buffer, format="PNG")
    signature = ExecutiveSignature.objects.create(
        user=user,
        signature_image=SimpleUploadedFile(
            "seal-two-factor.png",
            buffer.getvalue(),
            content_type="image/png",
        ),
        require_2fa=require_2fa,
    )
    return signature


class SealTwoFactorPolicyTests(APITestCase):
    def setUp(self):
        role = Role.objects.create(
            name="Seal 2FA Policy Approver",
            permissions={"can_approve": True},
        )
        self.user = User.objects.create_user(
            username="seal-two-factor-user",
            password="testpass123",
            system_role=role,
        )
        self.signature = make_signature(self.user)
        self.addCleanup(self.signature.signature_image.delete, save=False)
        self.correspondence = Correspondence.objects.create(
            subject="Seal 2FA policy test",
            current_approver=self.user,
        )
        self.client.force_authenticate(self.user)

    def _seal(self, **kwargs):
        seal, _ = SealGenerationService.generate_seal(
            user=self.user,
            correspondence=self.correspondence,
            **kwargs,
        )
        self.addCleanup(seal.signature_image_snapshot.delete, save=False)
        self.addCleanup(seal.seal_image.delete, save=False)
        return seal

    def test_status_fails_closed_without_a_method_and_offers_recovery(self):
        response = self.client.get(reverse("api_v1:2fa_status"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["require_2fa"])
        self.assertEqual(response.data["available_methods"], [])
        self.assertFalse(response.data["can_seal"])
        self.assertEqual(response.data["blocking_reason"], "no_2fa_method")
        actions = {item["action"] for item in response.data["recovery_actions"]}
        self.assertIn("setup_totp", actions)
        self.assertIn("add_email", actions)

    def test_seal_fails_closed_when_no_method_is_configured(self):
        response = self.client.post(
            reverse("api_v1:seal_apply"),
            {"correspondence_id": str(self.correspondence.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        details = response.data["details"]
        self.assertEqual(details["reason"], "no_2fa_method")
        self.assertIn("setup_totp", {item["action"] for item in details["recovery_actions"]})
        self.assertFalse(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )

    def test_service_rejects_missing_token_even_with_email(self):
        self.user.email = "seal-two-factor-user@example.com"
        self.user.save(update_fields=["email"])

        with self.assertRaises(SealTwoFactorError) as ctx:
            self._seal()

        self.assertEqual(ctx.exception.detail["reason"], "verification_required")
        self.assertEqual(ctx.exception.detail["available_methods"], ["email"])
        self.assertFalse(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )

    def test_service_rejects_invalid_token(self):
        self.user.email = "seal-two-factor-user@example.com"
        self.user.save(update_fields=["email"])

        with self.assertRaises(SealTwoFactorError) as ctx:
            self._seal(verification_token="not-a-real-token")

        self.assertEqual(ctx.exception.detail["reason"], "invalid_verification_token")
        self.assertFalse(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )

    def test_no_method_fails_even_when_internal_flow_claims_verified(self):
        with self.assertRaises(SealTwoFactorError) as ctx:
            self._seal(two_factor_verified=True)

        self.assertEqual(ctx.exception.detail["reason"], "no_2fa_method")
        self.assertFalse(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )

    def test_totp_setup_is_a_working_recovery_path(self):
        setup_response = self.client.post(
            reverse("api_v1:2fa_totp_setup"),
            format="json",
        )
        self.assertEqual(setup_response.status_code, status.HTTP_200_OK)
        secret = setup_response.data["secret"]

        verify_response = self.client.post(
            reverse("api_v1:2fa_totp_verify"),
            {
                "code": pyotp.TOTP(secret).now(),
                "purpose": "setup",
                "generate_backup_codes": True,
            },
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        token = verify_response.data["verification_token"]

        status_response = self.client.get(reverse("api_v1:2fa_status"))
        self.assertTrue(status_response.data["can_seal"])
        self.assertIn("totp", status_response.data["available_methods"])
        self.assertIn("backup_code", status_response.data["available_methods"])
        self.assertIsNone(status_response.data["blocking_reason"])

        response = self.client.post(
            reverse("api_v1:seal_apply"),
            {
                "correspondence_id": str(self.correspondence.id),
                "verification_token": token,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertTrue(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )