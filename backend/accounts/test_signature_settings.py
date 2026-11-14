import importlib
from io import BytesIO

from django.apps import apps as django_apps
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from audit.models import ActivityLog
from correspondence.models import Correspondence
from correspondence.services.approval_pdf import _signature_png
from organization.models import Role

from .services import SealGenerationService, VerificationTokenService
from .models import DocumentSeal, ExecutiveSignature, User


def make_png(name="signature.png"):
    buffer = BytesIO()
    Image.new("RGB", (200, 80), "white").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class ExecutiveSignatureSettingsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="signature-owner",
            email="signature-owner@example.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = reverse("api_v1:executive_signature")

    def upload_signature(self):
        return self.client.post(
            self.url,
            {"signature_image": make_png()},
            format="multipart",
        )

    def test_patch_validates_and_normalises_prefix(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)

        response = self.client.patch(
            self.url,
            {"seal_prefix": "npa-md"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["seal_prefix"], "NPA-MD")

    def test_signature_file_is_encrypted_at_rest(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)
        signature = ExecutiveSignature.objects.get(user=self.user)

        with open(signature.signature_image.path, "rb") as stored:
            self.assertFalse(stored.read().startswith(b"\x89PNG"))
        with signature.signature_image.open("rb") as readable:
            self.assertTrue(readable.read().startswith(b"\x89PNG"))

    def test_existing_plaintext_signature_is_still_served(self):
        """A signature written before encryption existed must not vanish from Settings."""
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)
        signature = ExecutiveSignature.objects.get(user=self.user)
        raw_png = signature.signature_image.read()
        with open(signature.signature_image.path, "wb") as legacy:
            legacy.write(raw_png)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_signature"])
        self.assertTrue(response.data["signature_url"].startswith("data:image/png;base64,"))

    def test_migration_encrypts_legacy_plaintext_signature(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)
        signature = ExecutiveSignature.objects.get(user=self.user)
        raw_png = signature.signature_image.read()
        with open(signature.signature_image.path, "wb") as legacy:
            legacy.write(raw_png)

        seal = DocumentSeal.objects.create(
            sealed_by=self.user,
            serial_number="NPA-MIGRATION-00000001",
            seal_hash="migration-test",
            office_name="NIGERIAN PORTS AUTHORITY",
            office_title="OFFICE OF THE MANAGING DIRECTOR",
        )
        seal.signature_image_snapshot.save(
            "legacy-snapshot.png",
            ContentFile(raw_png),
            save=True,
        )
        self.addCleanup(seal.signature_image_snapshot.delete, save=False)
        with open(seal.signature_image_snapshot.path, "wb") as legacy:
            legacy.write(raw_png)

        migration = importlib.import_module(
            "accounts.migrations.0019_encrypt_existing_signature_files"
        )
        migration.encrypt_existing_files(django_apps, None)
        migration.encrypt_existing_files(django_apps, None)

        with open(signature.signature_image.path, "rb") as stored:
            self.assertFalse(stored.read().startswith(b"\x89PNG"))
        with signature.signature_image.open("rb") as readable:
            self.assertEqual(readable.read(), raw_png)
        with open(seal.signature_image_snapshot.path, "rb") as stored:
            self.assertFalse(stored.read().startswith(b"\x89PNG"))
        with seal.signature_image_snapshot.open("rb") as readable:
            self.assertEqual(readable.read(), raw_png)

    def test_patch_rejects_invalid_prefix(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)

        response = self.client.patch(
            self.url,
            {"seal_prefix": "bad prefix"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("seal_prefix", response.data["details"])

    def test_patch_rejects_blank_office_name(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)

        response = self.client.patch(
            self.url,
            {"seal_office_name": "   "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("seal_office_name", response.data["details"])

    def test_patch_is_audited(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)

        response = self.client.patch(
            self.url,
            {"seal_office_title": "OFFICE OF THE MANAGING DIRECTOR"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            ActivityLog.objects.filter(
                user=self.user,
                action=ActivityLog.ActionType.USER_UPDATED,
                description="Updated digital seal settings",
            ).exists()
        )

    def test_reupload_reactivates_signature(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)
        signature = ExecutiveSignature.objects.get(user=self.user)
        signature.is_active = False
        signature.save(update_fields=["is_active"])

        response = self.upload_signature()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        signature.refresh_from_db()
        self.assertTrue(signature.is_active)

    def test_reupload_preserves_saved_settings(self):
        self.assertEqual(self.upload_signature().status_code, status.HTTP_201_CREATED)
        response = self.client.patch(
            self.url,
            {
                "seal_office_name": "CUSTOM OFFICE",
                "seal_office_title": "CUSTOM TITLE",
                "seal_prefix": "CUSTOM",
                "require_2fa": False,
                "current_password": "testpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.upload_signature()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        signature = ExecutiveSignature.objects.get(user=self.user)
        self.assertEqual(signature.seal_office_name, "CUSTOM OFFICE")
        self.assertEqual(signature.seal_office_title, "CUSTOM TITLE")
        self.assertEqual(signature.seal_prefix, "CUSTOM")
        self.assertFalse(signature.require_2fa)

    def test_svg_upload_is_rejected(self):
        svg = SimpleUploadedFile(
            "signature.svg",
            b'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>',
            content_type="image/svg+xml",
        )

        response = self.client.post(
            self.url,
            {"signature_image": svg},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("signature_image", response.data)


class SealSignatureImageAccessTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="seal-owner",
            email="seal-owner@example.com",
            password="testpass123",
        )
        self.other = User.objects.create_user(
            username="seal-other",
            email="seal-other@example.com",
            password="testpass123",
        )
        upload = APIClient()
        upload.force_authenticate(self.owner)
        response = upload.post(
            reverse("api_v1:executive_signature"),
            {"signature_image": make_png()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.signature = ExecutiveSignature.objects.get(user=self.owner)
        self.seal = DocumentSeal.objects.create(
            sealed_by=self.owner,
            signature_used=self.signature,
            serial_number="NPA-TEST-00000001",
            seal_hash="test-hash",
            office_name="NIGERIAN PORTS AUTHORITY",
            office_title="OFFICE OF THE SUPER ADMIN",
        )
        self.url = reverse(
            "api_v1:seal_signature_image",
            kwargs={"serial_number": self.seal.serial_number},
        )

    def test_signature_image_is_not_public(self):
        response = APIClient().get(self.url)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_signature_image_is_private_to_seal_owner(self):
        other_client = APIClient()
        other_client.force_authenticate(self.other)
        response = other_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_signature_image_is_available_to_owner(self):
        owner_client = APIClient()
        owner_client.force_authenticate(self.owner)
        response = owner_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "image/png")


class SealSignatureSnapshotTests(APITestCase):
    def test_seal_keeps_signature_used_at_issue_time(self):
        approver_role = Role.objects.create(
            name="Snapshot Seal Approver",
            permissions={"can_approve": True},
        )
        owner = User.objects.create_user(
            username="snapshot-owner",
            email="snapshot-owner@example.com",
            password="testpass123",
            system_role=approver_role,
        )
        upload = APIClient()
        upload.force_authenticate(owner)
        response = upload.post(
            reverse("api_v1:executive_signature"),
            {"signature_image": make_png()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ExecutiveSignature.objects.filter(user=owner).update(require_2fa=False)

        correspondence = Correspondence.objects.create(
            subject="Seal snapshot test",
            current_approver=owner,
        )
        seal, _ = SealGenerationService.generate_seal(
            user=owner,
            correspondence=correspondence,
        )
        self.addCleanup(seal.signature_image_snapshot.delete, save=False)
        self.addCleanup(seal.seal_image.delete, save=False)
        with seal.signature_image_snapshot.open("rb") as snapshot:
            original_snapshot = snapshot.read()
        original_pdf_signature = _signature_png(seal)

        # Replacing the live signature must not change the historical seal.
        replacement = upload.post(
            reverse("api_v1:executive_signature"),
            {"signature_image": make_png("replacement.png")},
            format="multipart",
        )
        self.assertEqual(replacement.status_code, status.HTTP_200_OK)

        seal.refresh_from_db()
        with seal.signature_image_snapshot.open("rb") as snapshot:
            self.assertEqual(snapshot.read(), original_snapshot)
        self.assertEqual(_signature_png(seal), original_pdf_signature)


class SealApplicationTwoFactorTests(APITestCase):
    def setUp(self):
        approver_role = Role.objects.create(
            name="Seal 2FA Approver",
            permissions={"can_approve": True},
        )
        self.owner = User.objects.create_user(
            username="seal-2fa-owner",
            email="seal-2fa-owner@example.com",
            password="testpass123",
            system_role=approver_role,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            reverse("api_v1:executive_signature"),
            {"signature_image": make_png()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            ExecutiveSignature.objects.get(user=self.owner).require_2fa
        )
        self.correspondence = Correspondence.objects.create(
            subject="Seal 2FA test",
            current_approver=self.owner,
        )
        self.url = reverse("api_v1:seal_apply")

    def test_requires_verification_token_when_enabled(self):
        response = self.client.post(
            self.url,
            {"correspondence_id": str(self.correspondence.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("2FA", str(response.data))

    def test_accepts_valid_verification_token(self):
        token = VerificationTokenService.generate_token(
            user_id=str(self.owner.id),
            purpose="seal_application",
        )

        response = self.client.post(
            self.url,
            {
                "correspondence_id": str(self.correspondence.id),
                "verification_token": token,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("serial_number", response.data)

    def test_skips_verification_when_setting_is_off(self):
        signature = ExecutiveSignature.objects.get(user=self.owner)
        signature.require_2fa = False
        signature.save(update_fields=["require_2fa"])

        response = self.client.post(
            self.url,
            {"correspondence_id": str(self.correspondence.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
