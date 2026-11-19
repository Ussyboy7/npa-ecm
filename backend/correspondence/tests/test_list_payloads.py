import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, Minute


class ListPayloadTests(TestCase):
    """Queues must not inline minutes or signature artwork.

    A 50-row inbox re-sent every minute, and every minute's base64 signature,
    which put a single page near 600 KB for a handful of rows.
    """

    def setUp(self):
        self.user = User.objects.create_superuser(
            username="payload-root",
            email="payload-root@example.com",
            password="testpass123",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/PAYLOAD/{uuid.uuid4().hex[:8].upper()}",
            subject="Queue payload shape",
            body_html="<p>Body stays on the detail route.</p>",
        )
        self.minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.user,
            minute_text="Approve and return.",
            signature_payload={"image_data": "data:image/png;base64," + "A" * 4096},
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_list_omits_minutes_and_signature_payload(self):
        response = self.client.get("/api/v1/correspondence/items/")

        self.assertEqual(response.status_code, 200)
        rows = response.data["results"]
        self.assertTrue(rows)
        row = next(r for r in rows if str(r["id"]) == str(self.correspondence.id))
        self.assertNotIn("minutes", row)
        self.assertNotIn("body_html", row)

    def test_detail_keeps_minutes_and_signature_payload(self):
        response = self.client.get(f"/api/v1/correspondence/items/{self.correspondence.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["minutes"]), 1)
        self.assertEqual(
            response.data["minutes"][0]["signature_payload"],
            self.minute.signature_payload,
        )

    def test_records_archive_keeps_completion_package_and_minutes(self):
        # RecordCard renders completionPackage.versionId for its download link,
        # so the archive list deliberately keeps the full serializer.
        completed = Correspondence.objects.create(
            reference_number=f"NPA/PAYLOAD/{uuid.uuid4().hex[:8].upper()}",
            subject="Archive payload shape",
            status=Correspondence.Status.COMPLETED,
        )
        Minute.objects.create(
            correspondence=completed,
            user=self.user,
            minute_text="Filed after completion.",
        )

        response = self.client.get("/api/v1/correspondence/items/records-archive/")

        self.assertEqual(response.status_code, 200)
        rows = response.data["results"]
        row = next((r for r in rows if str(r["id"]) == str(completed.id)), None)
        self.assertIsNotNone(row, "completed record missing from records archive")
        self.assertIn("completion_package", row)
        self.assertEqual(len(row["minutes"]), 1)

    def test_minute_list_omits_signature_payload(self):
        response = self.client.get("/api/v1/correspondence/minutes/")

        self.assertEqual(response.status_code, 200)
        rows = response.data["results"]
        self.assertTrue(rows)
        self.assertNotIn("signature_payload", rows[0])

    def test_minute_detail_keeps_signature_payload(self):
        response = self.client.get(f"/api/v1/correspondence/minutes/{self.minute.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["signature_payload"],
            self.minute.signature_payload,
        )
