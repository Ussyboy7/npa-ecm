import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import (
    CheckOutEvent,
    Correspondence,
    Location,
    PhysicalDocument,
)

User = get_user_model()


class PhysicalDocumentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="physicaladmin",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.location = Location.objects.create(
            building="HQ Tower",
            floor="Ground",
            room="Registry",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/PHY/{uuid.uuid4().hex[:8].upper()}",
            subject="Physical Tracking Test",
            sender_name="Test",
            created_by=self.user,
        )
        self.physical_doc = PhysicalDocument.objects.create(
            tracking_number=f"PHY-{uuid.uuid4().hex[:8].upper()}",
            correspondence=self.correspondence,
            location=self.location,
        )

    def test_create_location(self):
        url = reverse("api_v1:location-list")
        response = self.client.post(url, {
            "building": "Admin Block",
            "floor": "2nd",
            "room": "201",
            "shelf": "",
            "cabinet": "",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Location.objects.count(), 2)

    def test_list_locations(self):
        url = reverse("api_v1:location-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_update_location(self):
        url = reverse("api_v1:location-detail", args=[self.location.id])
        response = self.client.patch(url, {"room": "Updated Room"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.location.refresh_from_db()
        self.assertEqual(self.location.room, "Updated Room")

    def test_delete_location(self):
        url = reverse("api_v1:location-detail", args=[self.location.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Location.objects.count(), 0)

    def test_create_physical_document(self):
        url = reverse("api_v1:physical-document-list")
        response = self.client.post(url, {
            "tracking_number": f"PHY-{uuid.uuid4().hex[:8].upper()}",
            "correspondence": self.correspondence.id,
            "location": self.location.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PhysicalDocument.objects.count(), 2)

    def test_check_out_creates_event_and_sets_user(self):
        url = reverse("api_v1:physical-document-check-out", args=[self.physical_doc.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.physical_doc.refresh_from_db()
        self.assertEqual(self.physical_doc.status, PhysicalDocument.Status.CHECKED_OUT)
        self.assertEqual(self.physical_doc.checked_out_to, self.user)
        self.assertIsNotNone(self.physical_doc.checked_out_at)

        self.assertEqual(CheckOutEvent.objects.count(), 1)
        event = CheckOutEvent.objects.first()
        self.assertEqual(event.physical_document, self.physical_doc)
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.action, CheckOutEvent.Action.CHECKED_OUT)

    def test_check_in_creates_event_and_clears_user(self):
        check_out_url = reverse("api_v1:physical-document-check-out", args=[self.physical_doc.id])
        self.client.post(check_out_url, {})

        check_in_url = reverse("api_v1:physical-document-check-in", args=[self.physical_doc.id])
        response = self.client.post(check_in_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.physical_doc.refresh_from_db()
        self.assertEqual(self.physical_doc.status, PhysicalDocument.Status.IN_STORAGE)
        self.assertIsNone(self.physical_doc.checked_out_to)

        self.assertEqual(CheckOutEvent.objects.count(), 2)

    def test_check_in_fails_if_not_checked_out(self):
        url = reverse("api_v1:physical-document-check-in", args=[self.physical_doc.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_physical_documents_by_location(self):
        url = reverse("api_v1:physical-document-list")
        response = self.client.get(url, {"location": self.location.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
