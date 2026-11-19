import uuid
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import DocumentSeal, User
from accounts.services import SealGenerationService
from common.throttles import AnonSealVerifyThrottle


class SealVerificationThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="verify-throttle-owner",
            password="testpass123",
        )
        self.seal = DocumentSeal.objects.create(
            sealed_by=self.user,
            serial_number=f"NPA-VERIFY-{uuid.uuid4().hex[:8].upper()}",
            seal_hash="verify-throttle-test",
            office_name="NIGERIAN PORTS AUTHORITY",
            office_title="OFFICE OF THE MANAGING DIRECTOR",
        )
        self.addCleanup(self.seal.seal_image.delete, save=False)

    def tearDown(self):
        cache.clear()

    def test_verification_lookup_is_rate_limited(self):
        url = reverse("api_v1:seal_verify", args=[self.seal.serial_number])
        client = APIClient()

        with patch.object(AnonSealVerifyThrottle, "get_rate", return_value="2/min"):
            self.assertEqual(client.get(url).status_code, status.HTTP_200_OK)
            self.assertEqual(client.get(url).status_code, status.HTTP_200_OK)
            self.assertEqual(
                client.get(url).status_code,
                status.HTTP_429_TOO_MANY_REQUESTS,
            )

    def test_verification_still_returns_record_metadata(self):
        url = reverse("api_v1:seal_verify", args=[self.seal.serial_number])

        response = APIClient().get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["serial_number"], self.seal.serial_number)
        self.assertTrue(response.data["valid"])

    def test_repeated_page_loads_stay_under_the_default_limit(self):
        SealGenerationService.ensure_seal_image(self.seal)
        verify_url = reverse("api_v1:seal_verify", args=[self.seal.serial_number])
        image_url = reverse("api_v1:seal_public_image", args=[self.seal.serial_number])
        client = APIClient()

        for _ in range(5):
            verify = client.get(verify_url)
            image = client.get(image_url)
            self.assertEqual(verify.status_code, status.HTTP_200_OK)
            self.assertEqual(image.status_code, status.HTTP_200_OK)
