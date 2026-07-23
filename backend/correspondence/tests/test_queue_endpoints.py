import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import Correspondence, DispatchRecord, Minute

User = get_user_model()


class MySentEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="sentuser",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.routed_corr = Correspondence.objects.create(
            reference_number=f"NPA/SNT/{uuid.uuid4().hex[:8].upper()}",
            subject="Routed internally",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.COMPLETED,
        )
        Minute.objects.create(
            correspondence=self.routed_corr,
            user=self.user,
            minute_text="Please treat.",
            action_type=Minute.ActionType.MINUTE,
            dispatched_at=timezone.now(),
        )

        self.dispatched_corr = Correspondence.objects.create(
            reference_number=f"NPA/EXT/{uuid.uuid4().hex[:8].upper()}",
            subject="Dispatched externally",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.DISPATCHED,
            dispatch_date=date.today(),
        )
        DispatchRecord.objects.create(
            correspondence=self.dispatched_corr,
            dispatch_mode=DispatchRecord.DispatchMode.EMAIL,
            dispatched_date=date.today(),
            dispatched_by=self.user,
        )

        self.active_corr = Correspondence.objects.create(
            reference_number=f"NPA/ACT/{uuid.uuid4().hex[:8].upper()}",
            subject="Still active",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )

    def test_my_sent_returns_routed_and_dispatched_items(self):
        url = reverse("api_v1:correspondence-my-sent")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.routed_corr.reference_number, refs)
        self.assertIn(self.dispatched_corr.reference_number, refs)
        self.assertNotIn(self.active_corr.reference_number, refs)

    def test_my_sent_internal_filter(self):
        url = reverse("api_v1:correspondence-my-sent")
        response = self.client.get(url, {"sent_type": "internal"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.routed_corr.reference_number, refs)
        self.assertNotIn(self.dispatched_corr.reference_number, refs)

    def test_my_sent_external_filter(self):
        url = reverse("api_v1:correspondence-my-sent")
        response = self.client.get(url, {"sent_type": "external"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.dispatched_corr.reference_number, refs)
        self.assertNotIn(self.routed_corr.reference_number, refs)


class OfficeSentEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="officesentuser",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.dispatched = Correspondence.objects.create(
            reference_number=f"NPA/OFD/{uuid.uuid4().hex[:8].upper()}",
            subject="Office sent log item",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.DISPATCHED,
            dispatch_date=date.today(),
        )
        DispatchRecord.objects.create(
            correspondence=self.dispatched,
            dispatch_mode=DispatchRecord.DispatchMode.COURIER,
            dispatched_date=date.today(),
            dispatched_by=self.user,
            tracking_number="TRK-001",
        )

        self.pending = Correspondence.objects.create(
            reference_number=f"NPA/PND/{uuid.uuid4().hex[:8].upper()}",
            subject="Not sent yet",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )

    def test_office_sent_returns_dispatched_items(self):
        url = reverse("api_v1:correspondence-office-sent")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.dispatched.reference_number, refs)
        self.assertNotIn(self.pending.reference_number, refs)
        self.assertGreaterEqual(response.data["summary"]["total"], 1)

    def test_sidebar_counts_include_office_sent(self):
        url = reverse("api_v1:correspondence-sidebar-counts")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("officeSent", response.data)
        self.assertIn("myWork", response.data)

    def test_my_sent_count_includes_minuted_items(self):
        other = Correspondence.objects.create(
            reference_number=f"NPA/SNT/{uuid.uuid4().hex[:8].upper()}",
            subject="Minuted by user",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )
        Minute.objects.create(
            correspondence=other,
            user=self.user,
            minute_text="Forward for action",
            action_type=Minute.ActionType.FORWARD,
        )
        url = reverse("api_v1:correspondence-sidebar-counts")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["mySent"], 2)
