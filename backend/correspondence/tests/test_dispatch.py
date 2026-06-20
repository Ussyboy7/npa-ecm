import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import Correspondence, DispatchRecord

User = get_user_model()


class DispatchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="dispatchadmin",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/DSP/{uuid.uuid4().hex[:8].upper()}",
            subject="Dispatch Test Correspondence",
            sender_name="Test Sender",
            created_by=self.user,
            status=Correspondence.Status.COMPLETED,
        )

    def test_create_correspondence_with_dispatched_status(self):
        correspondence = Correspondence.objects.create(
            reference_number=f"NPA/DSP/{uuid.uuid4().hex[:8].upper()}",
            subject="Pre-dispatched",
            sender_name="Test",
            created_by=self.user,
            status=Correspondence.Status.DISPATCHED,
        )
        self.assertEqual(correspondence.status, Correspondence.Status.DISPATCHED)

    def test_dispatch_action_creates_dispatch_record(self):
        url = reverse("api_v1:correspondence-dispatch", args=[self.correspondence.id])
        response = self.client.post(url, {
            "dispatch_mode": "email",
            "dispatched_date": date.today().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(DispatchRecord.objects.count(), 1)
        record = DispatchRecord.objects.first()
        self.assertEqual(record.dispatch_mode, "email")
        self.assertEqual(record.correspondence, self.correspondence)
        self.assertEqual(record.dispatched_by, self.user)

        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.DISPATCHED)

    def test_dispatch_validation_requires_dispatch_mode(self):
        url = reverse("api_v1:correspondence-dispatch", args=[self.correspondence.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_acknowledge_action_updates_acknowledged_date(self):
        dispatch_url = reverse("api_v1:correspondence-dispatch", args=[self.correspondence.id])
        self.client.post(dispatch_url, {
            "dispatch_mode": "courier",
            "dispatched_date": date.today().isoformat(),
        })

        ack_url = reverse("api_v1:correspondence-acknowledge", args=[self.correspondence.id])
        response = self.client.post(ack_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.ACKNOWLEDGED)
        self.assertIsNotNone(self.correspondence.acknowledged_date)

    def test_acknowledge_validation_must_be_dispatched(self):
        pending_corr = Correspondence.objects.create(
            reference_number=f"NPA/ACK/{uuid.uuid4().hex[:8].upper()}",
            subject="Acknowledge Validation Test",
            sender_name="Test",
            created_by=self.user,
            status=Correspondence.Status.PENDING,
        )
        url = reverse("api_v1:correspondence-acknowledge", args=[pending_corr.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
