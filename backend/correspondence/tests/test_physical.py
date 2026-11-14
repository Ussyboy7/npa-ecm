import uuid

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from correspondence.models import (
    CheckOutEvent,
    Correspondence,
    Location,
    PhysicalDocument,
)
from organization.models import Office, OfficeMembership

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
        self.destination_location = Location.objects.create(
            building="HQ Tower",
            floor="2nd",
            room="Finance Office",
        )
        self.source_office = Office.objects.create(name="Registry Office", code="PHY-REG")
        self.destination_office = Office.objects.create(name="Finance Office", code="PHY-FIN")
        OfficeMembership.objects.create(office=self.source_office, user=self.user, is_active=True)
        OfficeMembership.objects.create(office=self.destination_office, user=self.user, is_active=True)
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
            current_office=self.source_office,
        )

    def test_create_location(self):
        url = reverse("api_v1:location-list")
        response = self.client.post(url, {
            "building": "Admin Block",
            "floor": "2nd",
            "room": "201",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Location.objects.count(), 3)

    def test_list_locations(self):
        url = reverse("api_v1:location-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)

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
        self.assertEqual(Location.objects.count(), 1)

    def test_create_physical_document(self):
        url = reverse("api_v1:physical-document-list")
        response = self.client.post(url, {
            "tracking_number": f"PHY-{uuid.uuid4().hex[:8].upper()}",
            "correspondence": self.correspondence.id,
            "location": self.location.id,
            "current_office": self.source_office.id,
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
        self.assertEqual(self.physical_doc.status, PhysicalDocument.Status.FILED)
        self.assertIsNone(self.physical_doc.checked_out_to)

        self.assertEqual(CheckOutEvent.objects.count(), 2)

    def test_check_in_fails_if_not_checked_out(self):
        url = reverse("api_v1:physical-document-check-in", args=[self.physical_doc.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_handover_requires_active_membership_in_current_office(self):
        outsider = User.objects.create_user(username="physical-outsider", password="testpass123")
        self.client.force_authenticate(user=outsider)
        response = self.client.post(
            reverse("api_v1:physical-document-handover", args=[self.physical_doc.id]),
            {"to_office": str(self.destination_office.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.physical_doc.refresh_from_db()
        self.assertEqual(self.physical_doc.status, PhysicalDocument.Status.FILED)

    def test_handover_waits_for_recipient_confirmation_and_updates_custody(self):
        response = self.client.post(
            reverse("api_v1:physical-document-handover", args=[self.physical_doc.id]),
            {"to_office": str(self.destination_office.id), "notes": "Please deliver original"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.physical_doc.refresh_from_db()
        self.assertEqual(self.physical_doc.status, PhysicalDocument.Status.IN_TRANSIT)
        self.assertEqual(self.physical_doc.current_office, self.source_office)

        receipt = self.client.post(
            reverse("api_v1:physical-document-confirm-receipt", args=[self.physical_doc.id]),
            {"location": str(self.destination_location.id), "notes": "Received intact"},
            format="json",
        )
        self.assertEqual(receipt.status_code, status.HTTP_200_OK, receipt.content)
        self.physical_doc.refresh_from_db()
        self.assertEqual(self.physical_doc.status, PhysicalDocument.Status.FILED)
        self.assertEqual(self.physical_doc.current_office, self.destination_office)
        self.assertEqual(self.physical_doc.location, self.destination_location)

        history = self.client.get(
            reverse("api_v1:physical-document-handover-events", args=[self.physical_doc.id])
        )
        self.assertEqual(history.status_code, status.HTTP_200_OK, history.content)
        events = history.data["results"] if isinstance(history.data, dict) else history.data
        self.assertEqual(len(events), 1)
        self.assertIsNotNone(events[0]["received_at"])
        self.assertEqual(events[0]["from_office_name"], self.source_office.name)
        self.assertEqual(events[0]["to_office_name"], self.destination_office.name)

    def test_duplicate_pending_handover_is_rejected(self):
        url = reverse("api_v1:physical-document-handover", args=[self.physical_doc.id])
        first = self.client.post(url, {"to_office": str(self.destination_office.id)}, format="json")
        second = self.client.post(url, {"to_office": str(self.destination_office.id)}, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.content)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST, second.content)

    def test_receipt_requires_destination_office_membership_and_location(self):
        self.client.post(
            reverse("api_v1:physical-document-handover", args=[self.physical_doc.id]),
            {"to_office": str(self.destination_office.id)},
            format="json",
        )
        outsider = User.objects.create_user(username="receipt-outsider", password="testpass123")
        self.client.force_authenticate(user=outsider)
        denied = self.client.post(
            reverse("api_v1:physical-document-confirm-receipt", args=[self.physical_doc.id]),
            {"location": str(self.destination_location.id)},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN, denied.content)

        self.client.force_authenticate(user=self.user)
        missing_location = self.client.post(
            reverse("api_v1:physical-document-confirm-receipt", args=[self.physical_doc.id]),
            {},
            format="json",
        )
        self.assertEqual(missing_location.status_code, status.HTTP_400_BAD_REQUEST, missing_location.content)
        self.physical_doc.refresh_from_db()
        self.assertEqual(self.physical_doc.status, PhysicalDocument.Status.IN_TRANSIT)

    def test_list_physical_documents_by_location(self):
        url = reverse("api_v1:physical-document-list")
        response = self.client.get(url, {"location": self.location.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CorrespondencePhysicalCustodyRegistrationTests(APITestCase):
    """Registering a physical original captures its first custodian and location."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="custody-registrar",
            email="custody-registrar@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.office = Office.objects.create(name="Registry Office", code="CUS-REG")
        OfficeMembership.objects.create(office=self.office, user=self.user, is_active=True)
        self.location = Location.objects.create(building="HQ Tower", floor="Ground", room="Registry")

    def _payload(self, **overrides):
        payload = {
            "reference_number": f"NPA/PHY/{uuid.uuid4().hex[:8].upper()}",
            "subject": "Custody registration test",
            "sender_name": "Registry Test",
            "sender_organization": "NPA",
            "owning_office": str(self.office.id),
            "current_office": str(self.office.id),
            "source": "internal",
            "direction": "upward",
            "priority": "medium",
        }
        payload.update(overrides)
        return payload

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_registration_creates_linked_physical_copy_with_custody(self, _create_document):
        response = self.client.post(
            reverse("api_v1:correspondence-list"),
            self._payload(
                has_physical_copy=True,
                physical_location=str(self.location.id),
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        physical = PhysicalDocument.objects.get(correspondence_id=response.data["id"])
        self.assertEqual(physical.location, self.location)
        self.assertEqual(physical.current_office, self.office)
        self.assertEqual(physical.status, PhysicalDocument.Status.FILED)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_registration_defaults_custodian_to_registering_office(self, _create_document):
        response = self.client.post(
            reverse("api_v1:correspondence-list"),
            self._payload(has_physical_copy=True),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        physical = PhysicalDocument.objects.get(correspondence_id=response.data["id"])
        self.assertIsNone(physical.location)
        self.assertEqual(physical.current_office, self.office)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_registration_without_physical_copy_skips_custody_requirements(self, _create_document):
        response = self.client.post(
            reverse("api_v1:correspondence-list"),
            self._payload(has_physical_copy=False),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertFalse(PhysicalDocument.objects.exists())

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_correspondence_detail_exposes_linked_physical_custody(self, _create_document):
        created = self.client.post(
            reverse("api_v1:correspondence-list"),
            self._payload(
                has_physical_copy=True,
                physical_location=str(self.location.id),
            ),
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.content)

        response = self.client.get(
            reverse("api_v1:correspondence-detail", args=[created.data["id"]])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        documents = response.data["physical_documents"]
        self.assertEqual(len(documents), 1)
        self.assertEqual(str(documents[0]["current_office"]), str(self.office.id))
        self.assertEqual(documents[0]["current_office_name"], self.office.name)
        self.assertEqual(documents[0]["location_name"], str(self.location))
        self.assertEqual(documents[0]["status"], PhysicalDocument.Status.FILED)
