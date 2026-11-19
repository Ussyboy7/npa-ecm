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

    def test_records_archive_keeps_completion_package_without_minutes(self):
        completed = Correspondence.objects.create(
            reference_number=f"NPA/PAYLOAD/{uuid.uuid4().hex[:8].upper()}",
            subject="Archive payload shape",
            status=Correspondence.Status.COMPLETED,
        )
        Minute.objects.create(
            correspondence=completed,
            user=self.user,
            minute_text="Filed after completion.",
            signature_payload={"image_data": "data:image/png;base64," + "A" * 4096},
        )

        response = self.client.get("/api/v1/correspondence/items/records-archive/")

        self.assertEqual(response.status_code, 200)
        rows = response.data["results"]
        row = next((r for r in rows if str(r["id"]) == str(completed.id)), None)
        self.assertIsNotNone(row, "completed record missing from records archive")
        self.assertIn("completion_package", row)
        self.assertNotIn("minutes", row)
        self.assertNotIn("signature_payload", row)

    def test_archive_records_omits_minutes_and_signature_payload(self):
        archived = Correspondence.objects.create(
            reference_number=f"NPA/PAYLOAD/{uuid.uuid4().hex[:8].upper()}",
            subject="Filed archive payload shape",
            status=Correspondence.Status.ARCHIVED,
            archive_level=Correspondence.ArchiveLevel.DEPARTMENT,
        )
        Minute.objects.create(
            correspondence=archived,
            user=self.user,
            minute_text="Filed in archive.",
            signature_payload={"image_data": "data:image/png;base64," + "A" * 4096},
        )

        response = self.client.get("/api/v1/correspondence/items/archive-records/")

        self.assertEqual(response.status_code, 200)
        row = next(
            result for result in response.data["results"]
            if str(result["id"]) == str(archived.id)
        )
        self.assertNotIn("minutes", row)
        self.assertNotIn("signature_payload", row)

    def test_minute_list_omits_signature_payload(self):
        response = self.client.get("/api/v1/correspondence/minutes/")

        self.assertEqual(response.status_code, 200)
        rows = response.data["results"]
        self.assertTrue(rows)
        self.assertNotIn("signature_payload", rows[0])

    def test_pending_approvals_omits_signature_payload(self):
        approval = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.user,
            to_user=self.user,
            purpose="approval",
            action_type=Minute.ActionType.APPROVE,
            minute_text="Approve the request.",
            signature_payload={"image_data": "data:image/png;base64," + "A" * 4096},
        )

        response = self.client.get(
            "/api/v1/correspondence/minutes/pending-approvals/?page_size=50"
        )

        self.assertEqual(response.status_code, 200)
        row = next(
            result for result in response.data["results"]
            if result["id"] == str(approval.id)
        )
        self.assertNotIn("signature_payload", row)
        self.assertNotIn("signature_payload", row["correspondence"])

    def test_minute_detail_keeps_signature_payload(self):
        response = self.client.get(f"/api/v1/correspondence/minutes/{self.minute.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["signature_payload"],
            self.minute.signature_payload,
        )
