from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from correspondence.models import CorrespondenceDraft


class CorrespondenceDraftTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="draft-admin",
            email="draft-admin@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse("api_v1:correspondence-draft-list")

    def test_registration_draft_saves_with_form_data_only(self):
        response = self.client.post(
            self.url,
            {
                "draft_type": CorrespondenceDraft.DraftType.REGISTRATION,
                "subject": "Registration draft",
                "form_data": {
                    "flowType": "inward",
                    "formData": {"subject": "Registration draft"},
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        draft = CorrespondenceDraft.objects.get()
        self.assertEqual(draft.content, "")
        self.assertEqual(draft.form_data["formData"]["subject"], "Registration draft")

    def test_registration_draft_can_be_updated_without_content(self):
        create_response = self.client.post(
            self.url,
            {
                "draft_type": CorrespondenceDraft.DraftType.REGISTRATION,
                "form_data": {"formData": {"subject": "First"}},
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.data)

        response = self.client.patch(
            f"{self.url}{create_response.data['id']}/",
            {"subject": "Updated registration draft"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["content"], "")

    def test_treatment_draft_round_trips_routing_data(self):
        routing_data = {
            "routeType": "office",
            "targetOfficeId": "office-123",
            "routeMode": "parallel",
            "parallelUserIds": ["user-1"],
            "parallelOfficeIds": ["office-2"],
            "purpose": "information",
        }

        response = self.client.post(
            self.url,
            {
                "draft_type": CorrespondenceDraft.DraftType.TREATMENT,
                "content": "<p>Draft response</p>",
                "routing_data": routing_data,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["routing_data"], routing_data)
        draft = CorrespondenceDraft.objects.get()
        self.assertEqual(draft.routing_data, routing_data)

    def test_treatment_draft_round_trips_response_type_and_document(self):
        response = self.client.post(
            self.url,
            {
                "draft_type": CorrespondenceDraft.DraftType.TREATMENT,
                "content": "<p>Notes for the attachment</p>",
                "response_type": "existing-document",
                "selected_document_id": "3d0f6f9a-1f6b-4f37-9a5e-doc42",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["response_type"], "existing-document")
        self.assertEqual(
            response.data["selected_document_id"],
            "3d0f6f9a-1f6b-4f37-9a5e-doc42",
        )
        draft = CorrespondenceDraft.objects.get()
        self.assertEqual(draft.response_type, "existing-document")
        self.assertEqual(
            draft.selected_document_id,
            "3d0f6f9a-1f6b-4f37-9a5e-doc42",
        )

    def test_minute_draft_still_requires_content(self):
        response = self.client.post(
            self.url,
            {
                "draft_type": CorrespondenceDraft.DraftType.MINUTE,
                "subject": "Minute draft",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn("content", response.data["details"])
