import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import Correspondence

User = get_user_model()


class SentDraftActionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="sentuser",
            password="testpass123",
        )
        self.other = User.objects.create_user(
            username="otheruser",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.draft = Correspondence.objects.create(
            reference_number=f"NPA/DRF/{uuid.uuid4().hex[:8].upper()}",
            subject="Pending draft",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.PENDING,
        )

    def test_cancel_draft_marks_withdrawn(self):
        url = reverse("api_v1:correspondence-cancel-draft", kwargs={"pk": self.draft.pk})
        response = self.client.post(url, {"reason": "Typo in recipient"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, Correspondence.Status.WITHDRAWN)
        self.assertEqual(self.draft.withdraw_reason, "Typo in recipient")

    def test_resend_draft_restores_pending(self):
        self.draft.status = Correspondence.Status.WITHDRAWN
        self.draft.withdraw_reason = "Testing"
        self.draft.save(update_fields=["status", "withdraw_reason", "updated_at"])

        url = reverse("api_v1:correspondence-resend-draft", kwargs={"pk": self.draft.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, Correspondence.Status.PENDING)
        self.assertEqual(self.draft.withdraw_reason, "")

    def test_cancel_draft_denied_for_non_creator(self):
        self.client.force_authenticate(user=self.other)
        url = reverse("api_v1:correspondence-cancel-draft", kwargs={"pk": self.draft.pk})
        response = self.client.post(url, {"reason": "Nope"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
