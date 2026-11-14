import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import Correspondence, Minute

User = get_user_model()


class MinuteEditAfterDownstreamTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="minute-author",
            password="testpass123",
        )
        self.next_user = User.objects.create_user(
            username="minute-next-user",
            password="testpass123",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/MIN/{uuid.uuid4().hex[:8].upper()}",
            subject="Minute edit lock test",
            sender_name="Test sender",
            created_by=self.author,
        )
        self.original_minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.author,
            minute_text="Original instruction",
            action_type=Minute.ActionType.MINUTE,
            step_number=1,
            timestamp=timezone.now() - timedelta(minutes=2),
            edit_window_expires_at=timezone.now() + timedelta(minutes=30),
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.author)
        self.url = reverse("api_v1:minute-detail", args=[self.original_minute.id])

    def test_original_minute_cannot_be_changed_after_next_person_acts(self):
        Minute.objects.create(
            correspondence=self.correspondence,
            user=self.next_user,
            minute_text="Next person acted",
            action_type=Minute.ActionType.APPROVE,
            step_number=2,
            timestamp=timezone.now() - timedelta(minutes=1),
        )

        response = self.client.patch(
            self.url,
            {"minute_text": "Changed after downstream action"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.original_minute.refresh_from_db()
        self.assertEqual(self.original_minute.minute_text, "Original instruction")
        self.assertFalse(self.original_minute.can_be_edited())

    def test_same_timestamp_higher_step_also_locks_original_minute(self):
        self.original_minute.timestamp = timezone.now()
        self.original_minute.save(update_fields=["timestamp"])
        Minute.objects.create(
            correspondence=self.correspondence,
            user=self.next_user,
            minute_text="Next step at same timestamp",
            action_type=Minute.ActionType.APPROVE,
            step_number=2,
            timestamp=self.original_minute.timestamp,
        )

        response = self.client.patch(
            self.url,
            {"minute_text": "Changed after downstream action"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.original_minute.refresh_from_db()
        self.assertEqual(self.original_minute.minute_text, "Original instruction")
