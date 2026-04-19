import uuid

from django.test import TestCase

from accounts.models import User
from correspondence.models import Correspondence
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

        document = CorrespondenceDocumentService.create_document_from_correspondence(
            correspondence,
            attachments=[],
        )

        self.assertEqual(document.description, "Formal treatment response text.")
