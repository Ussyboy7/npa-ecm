import uuid
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.foia_models import FOIARequest, FOIARequestDocument, FOIANote
from dms.models import Document

User = get_user_model()


class FOIATests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="foiaadmin",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.foia = FOIARequest.objects.create(
            request_number=f"FOIA-{uuid.uuid4().hex[:8].upper()}",
            requester_name="John Doe",
            requester_email="john@example.com",
            description_of_documents="Test documents request",
            status=FOIARequest.Status.SUBMITTED,
        )

    def test_create_foia_request(self):
        url = reverse("api_v1:foia-request-list")
        response = self.client.post(url, {
            "request_number": f"FOIA-{uuid.uuid4().hex[:8].upper()}",
            "requester_name": "Jane Smith",
            "requester_email": "jane@example.com",
            "description_of_documents": "Requested agency records",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FOIARequest.objects.count(), 2)
        self.assertIsNotNone(response.data.get("request_number"))

    def test_acknowledge_updates_status_and_date(self):
        url = reverse("api_v1:foia-request-acknowledge", args=[self.foia.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.foia.refresh_from_db()
        self.assertEqual(self.foia.status, FOIARequest.Status.ACKNOWLEDGED)
        self.assertIsNotNone(self.foia.acknowledged_date)

    def test_acknowledge_fails_if_not_submitted(self):
        self.foia.status = FOIARequest.Status.ACKNOWLEDGED
        self.foia.save()
        url = reverse("api_v1:foia-request-acknowledge", args=[self.foia.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_respond_approved(self):
        url = reverse("api_v1:foia-request-respond", args=[self.foia.id])
        response = self.client.post(url, {"outcome": "approved"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.foia.refresh_from_db()
        self.assertEqual(self.foia.status, FOIARequest.Status.APPROVED)
        self.assertIsNotNone(self.foia.response_date)

    def test_respond_partial(self):
        url = reverse("api_v1:foia-request-respond", args=[self.foia.id])
        response = self.client.post(url, {"outcome": "partial"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.foia.refresh_from_db()
        self.assertEqual(self.foia.status, FOIARequest.Status.PARTIALLY_GRANTED)

    def test_respond_denied(self):
        url = reverse("api_v1:foia-request-respond", args=[self.foia.id])
        response = self.client.post(url, {"outcome": "denied"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.foia.refresh_from_db()
        self.assertEqual(self.foia.status, FOIARequest.Status.DENIED)

    def test_respond_invalid_outcome(self):
        url = reverse("api_v1:foia-request-respond", args=[self.foia.id])
        response = self.client.post(url, {"outcome": "invalid"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_respond_fails_if_already_responded(self):
        self.foia.status = FOIARequest.Status.RESPONDED
        self.foia.save()
        url = reverse("api_v1:foia-request-respond", args=[self.foia.id])
        response = self.client.post(url, {"outcome": "approved"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_close_on_responded_request(self):
        self.foia.status = FOIARequest.Status.RESPONDED
        self.foia.save()
        url = reverse("api_v1:foia-request-close", args=[self.foia.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.foia.refresh_from_db()
        self.assertEqual(self.foia.status, FOIARequest.Status.CLOSED)

    def test_overdue_filter(self):
        overdue = FOIARequest.objects.create(
            request_number=f"FOIA-{uuid.uuid4().hex[:8].upper()}",
            requester_name="Overdue Requestor",
            description_of_documents="Overdue documents",
            status=FOIARequest.Status.SUBMITTED,
            received_date=date.today() - timedelta(days=30),
            deadline_date=date.today() - timedelta(days=23),
        )
        url = reverse("api_v1:foia-request-overdue")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertGreaterEqual(len(results), 1)

    def test_non_overdue_excluded_from_overdue_filter(self):
        FOIARequest.objects.create(
            request_number=f"FOIA-{uuid.uuid4().hex[:8].upper()}",
            requester_name="On Time Requestor",
            description_of_documents="On-time documents",
            status=FOIARequest.Status.RESPONDED,
            received_date=date.today() - timedelta(days=30),
            deadline_date=date.today() - timedelta(days=23),
        )
        url = reverse("api_v1:foia-request-overdue")
        response = self.client.get(url)
        results = response.data.get("results", response.data)
        result_ids = [r["id"] for r in results]
        on_time = FOIARequest.objects.get(requester_name="On Time Requestor")
        self.assertNotIn(str(on_time.id), result_ids)

    def test_stats_endpoint(self):
        url = reverse("api_v1:foia-request-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total", response.data)
        self.assertIn("submitted", response.data)
        self.assertIn("in_processing", response.data)
        self.assertIn("overdue", response.data)
        self.assertIn("closed_this_month", response.data)

    def test_create_foia_note(self):
        url = reverse("api_v1:foia-note-list")
        response = self.client.post(url, {
            "foia_request": self.foia.id,
            "note": "Internal test note for FOIA request",
            "is_internal": True,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FOIANote.objects.count(), 1)
        note = FOIANote.objects.first()
        self.assertEqual(note.user, self.user)
        self.assertEqual(note.foia_request, self.foia)
        self.assertTrue(note.is_internal)

    def test_create_foia_request_document(self):
        doc = Document.objects.create(
            title="FOIA Response Document",
            author=self.user,
            document_type="other",
        )
        url = reverse("api_v1:foia-document-list")
        response = self.client.post(url, {
            "foia_request": self.foia.id,
            "document": doc.id,
            "is_response": True,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FOIARequestDocument.objects.count(), 1)
        foia_doc = FOIARequestDocument.objects.first()
        self.assertTrue(foia_doc.is_response)
        self.assertEqual(foia_doc.document, doc)
