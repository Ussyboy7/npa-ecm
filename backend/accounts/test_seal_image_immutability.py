import hashlib
import uuid
from io import BytesIO
from unittest.mock import patch

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from common.throttles import AnonSealImageThrottle
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import DocumentSeal, ExecutiveSignature, User
from accounts.services import SealGenerationService


def make_signature(user):
    buffer = BytesIO()
    Image.new("RGB", (200, 80), "white").save(buffer, format="PNG")
    return ExecutiveSignature.objects.create(
        user=user,
        signature_image=SimpleUploadedFile(
            "seal-image-immutability.png",
            buffer.getvalue(),
            content_type="image/png",
        ),
        require_2fa=False,
    )


class SealImageImmutabilityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="seal-image-owner",
            password="testpass123",
        )
        self.signature = make_signature(self.user)
        self.seal = DocumentSeal.objects.create(
            sealed_by=self.user,
            signature_used=self.signature,
            serial_number=f"NPA-IMAGE-{uuid.uuid4().hex[:8].upper()}",
            seal_hash="immutability-test",
            verification_url="http://localhost:3002/verify/image-test",
            office_name="NIGERIAN PORTS AUTHORITY",
            office_title="OFFICE OF THE MANAGING DIRECTOR",
        )
        self.addCleanup(self.signature.signature_image.delete, save=False)
        self.addCleanup(self.seal.signature_image_snapshot.delete, save=False)
        self.addCleanup(self.seal.seal_image.delete, save=False)

    def tearDown(self):
        cache.clear()

    def _ensure_image(self):
        image = SealGenerationService.ensure_seal_image(self.seal)
        self.assertIsNotNone(image)
        self.assertTrue(image.startswith(b"\x89PNG"))
        self.seal.refresh_from_db()
        self.assertEqual(
            hashlib.sha256(image).hexdigest(),
            self.seal.seal_image_sha256,
        )
        return image

    def test_server_render_stores_and_verifies_hash(self):
        image = self._ensure_image()

        self.assertTrue(self.seal.seal_image)
        with self.seal.seal_image.open("rb") as stored:
            self.assertEqual(stored.read(), image)

    def test_tampered_cached_image_is_regenerated_not_served(self):
        original = self._ensure_image()
        with open(self.seal.seal_image.path, "wb") as cached:
            cached.write(b"tampered evidence")

        repaired = self._ensure_image()

        self.assertNotEqual(repaired, b"tampered evidence")
        self.assertEqual(repaired, original)
        with self.seal.seal_image.open("rb") as stored:
            self.assertEqual(stored.read(), repaired)

    def test_legacy_image_without_hash_is_never_trusted(self):
        self.seal.seal_image.save(
            f"{self.seal.serial_number}.png",
            ContentFile(b"client-rendered seal"),
            save=True,
        )
        self.seal.seal_image_sha256 = ""
        self.seal.save(update_fields=["seal_image_sha256", "updated_at"])

        repaired = self._ensure_image()

        self.assertNotEqual(repaired, b"client-rendered seal")

    def test_image_endpoint_rejects_client_replacements(self):
        client = APIClient()
        client.force_authenticate(self.user)

        response = client.post(
            reverse("api_v1:seal_image", args=[self.seal.serial_number]),
            {"image_data_url": "data:image/png;base64,AAAA"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_image_endpoint_serves_hash_verified_png_after_tampering(self):
        self._ensure_image()
        with open(self.seal.seal_image.path, "wb") as cached:
            cached.write(b"tampered evidence")

        client = APIClient()
        client.force_authenticate(self.user)
        response = client.get(
            reverse("api_v1:seal_image", args=[self.seal.serial_number])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "image/png")
        image = b"".join(response.streaming_content)
        self.assertTrue(image.startswith(b"\x89PNG"))
        self.seal.refresh_from_db()
        self.assertEqual(
            hashlib.sha256(image).hexdigest(),
            self.seal.seal_image_sha256,
        )

    def test_public_image_endpoint_serves_verified_png_for_valid_seal(self):
        self._ensure_image()

        response = APIClient().get(
            reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "image/png")
        image = b"".join(response.streaming_content)
        self.seal.refresh_from_db()
        self.assertEqual(
            hashlib.sha256(image).hexdigest(),
            self.seal.seal_image_sha256,
        )

    def test_public_image_serves_smaller_display_rendition(self):
        full = self._ensure_image()

        response = APIClient().get(
            reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
            + "?width=440"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rendition = b"".join(response.streaming_content)
        with Image.open(BytesIO(rendition)) as image:
            self.assertEqual(image.size, (440, 440))
        self.assertLess(len(rendition), len(full))

    def test_public_image_rejects_unlisted_display_width(self):
        self._ensure_image()

        response = APIClient().get(
            reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
            + "?width=4000"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_image_full_resolution_remains_available(self):
        full = self._ensure_image()

        response = APIClient().get(
            reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(b"".join(response.streaming_content), full)

    def test_public_image_does_not_generate_when_none_is_stored(self):
        response = APIClient().get(
            reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.seal.refresh_from_db()
        self.assertFalse(self.seal.seal_image)
        self.assertEqual(self.seal.seal_image_sha256, "")

    def test_public_image_refuses_tampered_artwork_without_rewriting_it(self):
        self._ensure_image()
        with open(self.seal.seal_image.path, "wb") as cached:
            cached.write(b"tampered evidence")
        stored_hash = self.seal.seal_image_sha256

        response = APIClient().get(
            reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        with open(self.seal.seal_image.path, "rb") as cached:
            self.assertEqual(cached.read(), b"tampered evidence")
        self.seal.refresh_from_db()
        self.assertEqual(self.seal.seal_image_sha256, stored_hash)

    def test_public_image_is_rate_limited(self):
        self._ensure_image()
        client = APIClient()
        url = reverse("api_v1:seal_public_image", args=[self.seal.serial_number])

        with patch.object(AnonSealImageThrottle, "get_rate", return_value="2/min"):
            self.assertEqual(client.get(url).status_code, status.HTTP_200_OK)
            self.assertEqual(client.get(url).status_code, status.HTTP_200_OK)
            self.assertEqual(
                client.get(url).status_code,
                status.HTTP_429_TOO_MANY_REQUESTS,
            )

    def test_public_image_endpoint_returns_nothing_for_invalidated_seal(self):
        self._ensure_image()
        self.seal.is_valid = False
        self.seal.invalidated_at = timezone.now()
        self.seal.save(update_fields=["is_valid", "invalidated_at", "updated_at"])

        response = APIClient().get(
            reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)