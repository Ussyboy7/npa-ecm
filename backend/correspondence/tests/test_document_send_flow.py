"""The send flow in the share dialog, all the way to the receiving seat.

The dialog's Correspondence tab posts exactly three calls:

1. ``POST /correspondence/items/`` — register the covering record, addressed to
   the receiving office and assigned to that office's seat holder;
2. ``POST /correspondence/document-links/`` — attach the DMS document;
3. ``POST /correspondence/minutes/`` — record the dispatch minute to that office.

This test replays those three payloads (same fields, same formats) and then
checks the contract they are supposed to establish: the record lands in the
receiving office's tray, the office's seat can open the attached document, the
document is published as a formal issue, and no permission row was written for
anybody — correspondence is custody, not a share.
"""

import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from correspondence.models import Correspondence, CorrespondenceDocumentLink, Minute
from dms.models import Document, DocumentPermission
from organization.models import (
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    ReferenceClassification,
    ReferenceScheme,
    Role,
)

User = get_user_model()


class DocumentSendFlowTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Send flow role",
            permissions={
                "can_register_correspondence": True,
                "can_minute_correspondence": True,
                "can_treat_correspondence": True,
                "can_distribute": True,
                "can_access_document_management": True,
                "can_view_registry": True,
            },
        )

        self.directorate = Directorate.objects.create(
            name="Send Flow Directorate", code="SND-DIR"
        )
        self.division = Division.objects.create(
            directorate=self.directorate, name="Send Flow Division", code="SND-DIV"
        )
        self.department = Department.objects.create(
            division=self.division, name="Send Flow Department", code="SND-DEPT"
        )

        self.sending_office = Office.objects.create(
            name="Send Flow Sending Office",
            code="SND-OFF-SRC",
            office_type=Office.OfficeTier.DIVISION,
            division=self.division,
        )
        self.receiving_office = Office.objects.create(
            name="Send Flow Receiving Office",
            code="SND-OFF-DST",
            office_type=Office.OfficeTier.DEPARTMENT,
            department=self.department,
        )
        self.other_office = Office.objects.create(
            name="Send Flow Other Office",
            code="SND-OFF-OTHER",
            office_type=Office.OfficeTier.DEPARTMENT,
            department=self.department,
        )

        # The registry allocates the reference from the sending office's scheme.
        scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DIVISION,
            division=self.division,
            location_code="HQ",
            authority_code="GM",
            unit_code="SND",
        )
        ReferenceClassification.objects.create(
            scheme=scheme, code="AD", label="Administration"
        )

        self.sender = self._user("snd_sender", grade="MSS2")
        self.principal = self._user("snd_principal", grade="MSS4")
        self.staff = self._user("snd_staff", grade="SSS3")
        self.outsider = self._user("snd_outsider", grade="MSS4")

        OfficeMembership.objects.create(
            office=self.sending_office,
            user=self.sender,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
        )
        OfficeMembership.objects.create(
            office=self.receiving_office,
            user=self.principal,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=False,
        )
        OfficeMembership.objects.create(
            office=self.receiving_office,
            user=self.staff,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
            is_primary=True,
        )
        OfficeMembership.objects.create(
            office=self.other_office,
            user=self.outsider,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )

        self.document = Document.objects.create(
            title="Send flow memo",
            document_type=Document.DocumentType.MEMO,
            role=Document.Role.PRIMARY,
            status=Document.DocumentStatus.DRAFT,
            sensitivity=Document.Sensitivity.INTERNAL,
            author=self.sender,
            division=self.division,
        )

        self.client.force_authenticate(user=self.sender)

    def _user(self, username, *, grade):
        return User.objects.create_user(
            username=username,
            email=f"{username}@npa.gov.ng",
            password="testpass123",
            grade_level=grade,
            division=self.division,
            system_role=self.role,
        )

    def _register_correspondence(self):
        """Call 1 — the dialog's multipart FormData, field for field."""
        return self.client.post(
            reverse("api_v1:correspondence-list"),
            {
                "subject": "Send flow memo",
                "sender_name": self.sender.get_full_name() or "System",
                "sender_organization": "Internal",
                "received_date": date.today().isoformat(),
                "priority": "medium",
                "source": "internal",
                "direction": "upward",
                "document_type": "letter",
                "current_office": str(self.receiving_office.id),
                # The dialog resolves the seat holder: principal, acting, secretariat.
                "current_approver_id": str(self.principal.id),
            },
            format="multipart",
        )

    def _link_document(self, correspondence_id):
        """Call 2 — attach the DMS document to the record."""
        return self.client.post(
            reverse("api_v1:correspondence-document-link-list"),
            {
                "correspondence": correspondence_id,
                "document": str(self.document.id),
            },
            format="json",
        )

    def _dispatch_minute(self, correspondence_id):
        """Call 3 — the dispatch minute names the receiving office."""
        return self.client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": correspondence_id,
                "user_id": str(self.sender.id),
                "action_type": "minute",
                "minute_text": "Routed via document correspondence",
                "direction": "upward",
                "step_number": 1,
                "purpose": "action",
                "requires_response": True,
                "to_office_id": str(self.receiving_office.id),
            },
            format="json",
        )

    def _send(self):
        registered = self._register_correspondence()
        self.assertEqual(registered.status_code, status.HTTP_201_CREATED, registered.content)
        correspondence_id = registered.data["id"]

        linked = self._link_document(correspondence_id)
        self.assertEqual(linked.status_code, status.HTTP_201_CREATED, linked.content)

        dispatched = self._dispatch_minute(correspondence_id)
        self.assertEqual(dispatched.status_code, status.HTTP_201_CREATED, dispatched.content)

        return Correspondence.objects.get(id=correspondence_id)

    def _document_endpoint_status(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse("api_v1:document-detail", args=[self.document.id])
        )
        return response.status_code

    def _office_inbox_refs(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("api_v1:correspondence-office-inbox"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        return {item["reference_number"] for item in response.data.get("results", [])}

    def test_the_three_dialog_calls_deliver_the_document_to_the_receiving_seat(self):
        correspondence = self._send()

        # The record is the receiving office's, assigned to its seat holder.
        self.assertEqual(correspondence.current_office_id, self.receiving_office.id)
        self.assertEqual(correspondence.owning_office_id, self.sending_office.id)
        self.assertEqual(correspondence.current_approver_id, self.principal.id)

        # The dispatch minute names the office, and formal issue published the memo.
        minute = Minute.objects.get(correspondence=correspondence)
        self.assertEqual(minute.to_office_id, self.receiving_office.id)
        self.document.refresh_from_db()
        self.assertEqual(self.document.status, Document.DocumentStatus.PUBLISHED)

        # It is in the receiving office's tray, and not in a bystander office's.
        self.assertIn(correspondence.reference_number, self._office_inbox_refs(self.principal))
        self.assertNotIn(correspondence.reference_number, self._office_inbox_refs(self.staff))
        self.assertNotIn(correspondence.reference_number, self._office_inbox_refs(self.outsider))

        # The seat holder can open the attachment, because the office holds the
        # record — the endpoint that used to 404 for the recipient.
        self.assertEqual(
            self._document_endpoint_status(self.principal), status.HTTP_200_OK
        )
        self.assertEqual(
            self._document_endpoint_status(self.staff), status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self._document_endpoint_status(self.outsider), status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(self._document_endpoint_status(self.sender), status.HTTP_200_OK)

        # "Does not grant access" is literal: only the record was written.
        self.assertFalse(
            DocumentPermission.objects.filter(document=self.document).exists(),
            "sending a document through correspondence must not write a share",
        )
        self.assertEqual(CorrespondenceDocumentLink.objects.count(), 1)

    def test_a_seatless_office_cannot_be_sent_a_document(self):
        """Guard the dialog's precondition: the record must arrive assigned."""
        empty_office = Office.objects.create(
            name="Send Flow Seatless Office",
            code="SND-OFF-EMPTY",
            office_type=Office.OfficeTier.DEPARTMENT,
            department=self.department,
        )
        OfficeMembership.objects.create(
            office=empty_office,
            user=self.staff,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )

        response = self.client.post(
            reverse("api_v1:correspondence-list"),
            {
                "subject": "Send flow memo",
                "sender_name": "Sender",
                "sender_organization": "Internal",
                "received_date": date.today().isoformat(),
                "priority": "medium",
                "source": "internal",
                "direction": "upward",
                "document_type": "letter",
                "current_office": str(empty_office.id),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        dispatched = self._dispatch_minute(response.data["id"])
        self.assertEqual(dispatched.status_code, status.HTTP_403_FORBIDDEN, dispatched.content)
