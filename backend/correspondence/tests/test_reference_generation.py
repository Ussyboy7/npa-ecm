from unittest.mock import patch

from rest_framework.test import APITestCase

from accounts.models import User
from correspondence.models import Correspondence
from organization.models import Office


class CorrespondenceReferenceGenerationTests(APITestCase):
    """References are generated from the owning office, not the creator."""

    def setUp(self):
        self.user = User.objects.create_superuser(
            username="reference-admin",
            email="reference-admin@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_browser_placeholder_is_canonicalized_per_owning_office(self, _create_document):
        offices = [
            Office.objects.create(name="MD Office", code="MD"),
            Office.objects.create(name="ED Office", code="ED"),
            Office.objects.create(name="GM Office", code="GM"),
            Office.objects.create(name="AGM Office", code="AGM"),
        ]

        for office in offices:
            response = self.client.post(
                "/api/v1/correspondence/items/",
                {
                    "reference_number": "NPA/REG/2026/550E8400",
                    "subject": f"Reference test for {office.code}",
                    "sender_name": "Registry Test",
                    "sender_organization": "NPA",
                    "owning_office": str(office.id),
                    "current_office": str(office.id),
                    "source": "internal",
                    "direction": "upward",
                    "priority": "medium",
                },
                format="json",
            )

            self.assertEqual(response.status_code, 201, response.data)
            self.assertRegex(
                response.data["reference_number"],
                rf"^NPA/{office.code}/\d{{4}}/\d{{6}}$",
            )

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_explicit_custom_reference_is_preserved(self, _create_document):
        office = Office.objects.create(name="Registry Office", code="REG")
        custom_reference = "NPA/CUSTOM/2026/0001"

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "reference_number": custom_reference,
                "subject": "Custom reference test",
                "sender_name": "Registry Test",
                "sender_organization": "NPA",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "internal",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_number"], custom_reference)
