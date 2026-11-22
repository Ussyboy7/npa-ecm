"""FOIA record visibility is limited to the assignee unless the role is global."""

import uuid
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.foia_models import FOIARequest, FOIARequestDocument, FOIANote
from dms.models import Document
from organization.models import Role

User = get_user_model()


class FOIAScopeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.assigned_role = Role.objects.create(name="FOIA assignee", permissions={})
        self.assigned = User.objects.create_user(
            username="foia-assigned",
            password="test-pass",
            system_role=self.assigned_role,
        )
        self.other = User.objects.create_user(username="foia-other", password="test-pass")
        self.global_role = Role.objects.create(
            name="FOIA global viewer",
            permissions={"can_view_all_correspondence": True},
        )
        self.global_user = User.objects.create_user(
            username="foia-global",
            password="test-pass",
            system_role=self.global_role,
        )

        self.own_foia = FOIARequest.objects.create(
            request_number=f"FOIA-{uuid.uuid4().hex[:8].upper()}",
            requester_name="Own Requester",
            description_of_documents="Own request",
            status=FOIARequest.Status.SUBMITTED,
            received_date=date.today() - timedelta(days=10),
            deadline_date=date.today() - timedelta(days=3),
            assigned_to=self.assigned,
        )
        self.other_foia = FOIARequest.objects.create(
            request_number=f"FOIA-{uuid.uuid4().hex[:8].upper()}",
            requester_name="Other Requester",
            description_of_documents="Other request",
            status=FOIARequest.Status.IN_PROCESSING,
            received_date=date.today() - timedelta(days=2),
            deadline_date=date.today() + timedelta(days=5),
            assigned_to=self.other,
        )

        document = Document.objects.create(
            title="Other FOIA attachment",
            author=self.other,
            document_type="other",
        )
        FOIARequestDocument.objects.create(
            foia_request=self.other_foia,
            document=document,
            added_by=self.other,
        )
        FOIANote.objects.create(
            foia_request=self.other_foia,
            user=self.other,
            note="Other request note",
        )

    @staticmethod
    def _rows(response):
        if isinstance(response.data, dict):
            return response.data.get("results", [])
        return response.data

    def test_assignee_list_contains_only_their_requests(self):
        self.client.force_authenticate(self.assigned)

        response = self.client.get(reverse("api_v1:foia-request-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        ids = {row["id"] for row in self._rows(response)}
        self.assertEqual(ids, {str(self.own_foia.id)})

    def test_assignee_cannot_retrieve_another_users_request(self):
        self.client.force_authenticate(self.assigned)

        response = self.client.get(
            reverse("api_v1:foia-request-detail", args=[self.other_foia.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.content)

    def test_assignee_stats_and_overdue_are_scoped(self):
        self.client.force_authenticate(self.assigned)

        stats_response = self.client.get(reverse("api_v1:foia-request-stats"))
        overdue_response = self.client.get(reverse("api_v1:foia-request-overdue"))

        self.assertEqual(stats_response.status_code, status.HTTP_200_OK, stats_response.content)
        self.assertEqual(stats_response.data["total"], 1)
        self.assertEqual(stats_response.data["submitted"], 1)
        self.assertEqual(stats_response.data["in_processing"], 0)
        self.assertEqual(stats_response.data["overdue"], 1)
        self.assertEqual(
            {row["id"] for row in self._rows(overdue_response)},
            {str(self.own_foia.id)},
        )

    def test_assignee_cannot_read_or_add_child_records_on_another_request(self):
        self.client.force_authenticate(self.assigned)

        notes_response = self.client.get(
            reverse("api_v1:foia-note-list"),
            {"foia_request": str(self.other_foia.id)},
        )
        documents_response = self.client.get(
            reverse("api_v1:foia-document-list"),
            {"foia_request": str(self.other_foia.id)},
        )
        note_create = self.client.post(
            reverse("api_v1:foia-note-list"),
            {"foia_request": self.other_foia.id, "note": "Unauthorized note"},
        )
        document = Document.objects.create(
            title="Unauthorized FOIA attachment",
            author=self.assigned,
            document_type="other",
        )
        document_create = self.client.post(
            reverse("api_v1:foia-document-list"),
            {"foia_request": self.other_foia.id, "document": document.id},
        )

        self.assertEqual(notes_response.status_code, status.HTTP_200_OK, notes_response.content)
        self.assertEqual(self._rows(notes_response), [])
        self.assertEqual(documents_response.status_code, status.HTTP_200_OK, documents_response.content)
        self.assertEqual(self._rows(documents_response), [])
        self.assertEqual(note_create.status_code, status.HTTP_403_FORBIDDEN, note_create.content)
        self.assertEqual(
            document_create.status_code,
            status.HTTP_403_FORBIDDEN,
            document_create.content,
        )

    def test_assignee_only_sees_public_notes_on_their_request(self):
        FOIANote.objects.create(
            foia_request=self.own_foia,
            user=self.assigned,
            note="Public update",
            is_internal=False,
        )
        internal_note = FOIANote.objects.create(
            foia_request=self.own_foia,
            user=self.other,
            note="Staff-only update",
            is_internal=True,
        )
        self.client.force_authenticate(self.assigned)

        list_response = self.client.get(
            reverse("api_v1:foia-note-list"),
            {"foia_request": str(self.own_foia.id)},
        )
        detail_response = self.client.get(
            reverse("api_v1:foia-note-detail", args=[internal_note.id])
        )
        request_response = self.client.get(
            reverse("api_v1:foia-request-detail", args=[self.own_foia.id])
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK, list_response.content)
        self.assertEqual({row["note"] for row in self._rows(list_response)}, {"Public update"})
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND, detail_response.content)
        self.assertEqual(request_response.status_code, status.HTTP_200_OK, request_response.content)
        self.assertEqual(
            {row["note"] for row in request_response.data["notes_entries"]},
            {"Public update"},
        )

    def test_global_correspondence_permission_keeps_full_foia_visibility(self):
        self.client.force_authenticate(self.global_user)

        list_response = self.client.get(reverse("api_v1:foia-request-list"))
        detail_response = self.client.get(
            reverse("api_v1:foia-request-detail", args=[self.other_foia.id])
        )
        stats_response = self.client.get(reverse("api_v1:foia-request-stats"))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK, list_response.content)
        self.assertEqual(
            {row["id"] for row in self._rows(list_response)},
            {str(self.own_foia.id), str(self.other_foia.id)},
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK, detail_response.content)
        self.assertEqual(stats_response.data["total"], 2)
        self.assertEqual(stats_response.data["in_processing"], 1)
        self.assertEqual(stats_response.data["overdue"], 1)

    def test_unassigned_requests_are_visible_only_to_global_viewers(self):
        unassigned = FOIARequest.objects.create(
            request_number=f"FOIA-{uuid.uuid4().hex[:8].upper()}",
            requester_name="Unassigned Requester",
            description_of_documents="Unassigned request",
            status=FOIARequest.Status.SUBMITTED,
        )

        self.client.force_authenticate(self.assigned)
        assignee_list = self.client.get(reverse("api_v1:foia-request-list"))
        self.client.force_authenticate(self.global_user)
        global_list = self.client.get(reverse("api_v1:foia-request-list"))

        self.assertNotIn(str(unassigned.id), {row["id"] for row in self._rows(assignee_list)})
        self.assertIn(str(unassigned.id), {row["id"] for row in self._rows(global_list)})

    def test_unauthenticated_requests_are_rejected(self):
        response = self.client.get(reverse("api_v1:foia-request-list"))
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))