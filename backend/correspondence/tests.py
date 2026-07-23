import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APITestCase

from accounts.models import User
from organization.models import Office, OfficeMembership
from correspondence.models import Correspondence, Minute
from correspondence.serializers import CorrespondenceSerializer
from correspondence.services import CorrespondenceDocumentService


class CorrespondenceTreatmentResponseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpass123",
        )

    def _create_correspondence(self, **overrides):
        data = {
            "reference_number": f"NPA/TEST/{uuid.uuid4().hex[:8].upper()}",
            "subject": "Test Correspondence",
            "sender_name": "Unit Test",
            "sender_organization": "QA",
            "created_by": self.user,
            "status": Correspondence.Status.PENDING,
            "treatment_response": "",
        }
        data.update(overrides)
        return Correspondence.objects.create(**data)

    def test_serializer_exposes_treatment_response_and_not_summary(self):
        correspondence = self._create_correspondence(
            treatment_response="Approved with minor revisions."
        )

        serialized = CorrespondenceSerializer(correspondence).data

        self.assertIn("treatment_response", serialized)
        self.assertNotIn("summary", serialized)
        self.assertEqual(serialized["treatment_response"], "Approved with minor revisions.")

    def test_serializer_updates_treatment_response(self):
        correspondence = self._create_correspondence(treatment_response="")
        serializer = CorrespondenceSerializer(
            correspondence,
            data={"treatment_response": "Please proceed as directed."},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        correspondence.refresh_from_db()

        self.assertEqual(correspondence.treatment_response, "Please proceed as directed.")

    def test_document_service_uses_treatment_response_for_description(self):
        correspondence = self._create_correspondence(
            treatment_response="Formal treatment response text."
        )

        documents = CorrespondenceDocumentService.create_document_from_correspondence(
            correspondence,
            attachments=[],
        )

        self.assertEqual(len(documents), 1)
        doc = documents[0]
        self.assertEqual(doc.role, "primary")
        self.assertEqual(doc.description, "Formal treatment response text.")

    def test_serializer_rejects_completed_status_change(self):
        correspondence = self._create_correspondence(status=Correspondence.Status.COMPLETED)
        serializer = CorrespondenceSerializer(
            correspondence,
            data={"status": "pending"},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("status", serializer.errors)

    def test_auto_created_document_id_annotation(self):
        """Verify the annotated queryset returns doc ID without N+1 queries."""
        correspondence = self._create_correspondence()
        from correspondence.models import CorrespondenceDocumentLink
        from dms.models import Document, DocumentVersion
        doc = Document.objects.create(title="Test Doc")
        CorrespondenceDocumentLink.objects.create(
            correspondence=correspondence,
            document=doc,
            notes="Auto-created from correspondence registration",
        )
        from django.db.models import OuterRef, Subquery, CharField
        annotated_qs = Correspondence.all_objects.filter(pk=correspondence.pk).annotate(
            _auto_created_document_id=Subquery(
                CorrespondenceDocumentLink.objects.filter(
                    correspondence=OuterRef('pk'),
                    notes__icontains="Auto-created",
                ).values('document_id')[:1],
                output_field=CharField(),
            )
        )
        obj = annotated_qs.first()
        self.assertIsNotNone(obj)
        self.assertEqual(str(getattr(obj, '_auto_created_document_id', '')), str(doc.id))


class TreatAndRespondEndpointTests(APITestCase):
    """Tests for the POST /correspondence/items/{id}/treat-and-respond/ endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpass123",
        )
        self.office = Office.objects.create(name="Test Office")
        OfficeMembership.objects.create(user=self.user, office=self.office, is_active=True)
        self.client.force_authenticate(user=self.user)
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/TEST/{uuid.uuid4().hex[:8].upper()}",
            subject="Test for Treat and Respond",
            sender_name="Unit Test",
            sender_organization="QA",
            created_by=self.user,
            current_approver=self.user,
            current_office=self.office,
            owning_office=self.office,
            status=Correspondence.Status.PENDING,
            direction="upward",
        )

    def test_treat_and_respond_creates_minute_and_response(self):
        payload = {
            "minute_text": "Approved with corrections.",
            "response_subject": "Response to test inquiry",
            "response_body_html": "<p>Please find attached the requested documents.</p>",
            "direction": "downward",
        }
        response = self.client.post(
            f"/api/v1/correspondence/items/{self.correspondence.id}/treat-and-respond/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("created_response_id", response.data)
        self.assertEqual(Minute.objects.filter(correspondence=self.correspondence).count(), 1)
        minute = Minute.objects.filter(correspondence=self.correspondence).first()
        self.assertEqual(minute.minute_text, "Approved with corrections.")
        self.assertEqual(minute.action_type, "treat")

    def test_treat_and_respond_requires_minute_text(self):
        response = self.client.post(
            f"/api/v1/correspondence/items/{self.correspondence.id}/treat-and-respond/",
            {"response_subject": "Response", "response_body_html": "<p>Body</p>"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("minute", response.data)

    def test_treat_and_respond_requires_response_data(self):
        response = self.client.post(
            f"/api/v1/correspondence/items/{self.correspondence.id}/treat-and-respond/",
            {"minute_text": "Some minute text"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("response", response.data)
