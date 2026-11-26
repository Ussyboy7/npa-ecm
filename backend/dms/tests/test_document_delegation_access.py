"""A live delegate may read the documents carried by the record they hold.

The delegation is the way in; the document's classification still decides
whether the delegate may reach that grade at all.
"""

import uuid
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, CorrespondenceDelegation, CorrespondenceDocumentLink, Delegation
from dms.models import Document
from organization.models import Department, Directorate, Division, Office, Role


class DelegatedDocumentAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.directorate = Directorate.objects.create(
            name=f"Docs {uuid.uuid4().hex[:6]}", code=f"DOC-{uuid.uuid4().hex[:6]}"
        )
        self.division = Division.objects.create(
            name=f"Docs Division {uuid.uuid4().hex[:6]}",
            code=f"DOCD-{uuid.uuid4().hex[:6]}",
            directorate=self.directorate,
        )
        self.department = Department.objects.create(
            name=f"Docs Department {uuid.uuid4().hex[:6]}",
            code=f"DOCP-{uuid.uuid4().hex[:6]}",
            division=self.division,
        )
        self.office = Office.objects.create(
            name=f"Docs Office {uuid.uuid4().hex[:6]}",
            code=f"DOC-O-{uuid.uuid4().hex[:6]}",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

        self.outside_directorate = Directorate.objects.create(
            name=f"Field {uuid.uuid4().hex[:6]}", code=f"FLD-{uuid.uuid4().hex[:6]}"
        )
        self.outside_division = Division.objects.create(
            name=f"Field Ops {uuid.uuid4().hex[:6]}",
            code=f"FLD-OPS-{uuid.uuid4().hex[:6]}",
            directorate=self.outside_directorate,
        )

        self.role = Role.objects.create(
            name=f"DelegatedDocs {uuid.uuid4().hex[:6]}",
            permissions={"can_access_document_management": True},
        )

        self.principal = User.objects.create_user(
            username=f"doc_principal_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="MSS1",
            system_role=self.role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.assistant = User.objects.create_user(
            username=f"doc_assistant_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="SSS3",
            system_role=self.role,
            directorate=self.outside_directorate,
            division=self.outside_division,
        )

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/DOC/{uuid.uuid4().hex[:8].upper()}",
            subject="Carried document",
            sender_name="Sender",
            created_by=self.principal,
            owning_office=self.office,
            current_office=self.office,
            current_approver=self.principal,
            status=Correspondence.Status.IN_PROGRESS,
            division=self.division,
            department=self.department,
        )
        self.document = Document.objects.create(
            title="Carried memo",
            document_type=Document.DocumentType.MEMO,
            status=Document.DocumentStatus.DRAFT,
            sensitivity=Document.Sensitivity.INTERNAL,
            author=self.principal,
            division=self.division,
            department=self.department,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence, document=self.document
        )

    def _delegate(self, *, can_view=True, expires_in=None):
        assignment = Delegation.objects.create(
            principal=self.principal,
            assistant=self.assistant,
            assistant_type="PA",
            active=True,
            can_view=can_view,
        )
        return CorrespondenceDelegation.objects.create(
            correspondence=self.correspondence,
            principal=self.principal,
            assistant=self.assistant,
            delegation=assignment,
            status=CorrespondenceDelegation.Status.ACTIVE,
            expires_at=None if expires_in is None else timezone.now() + expires_in,
        )

    def _open_document(self):
        self.client.force_authenticate(user=self.assistant)
        return self.client.get(reverse("api_v1:document-detail", args=[self.document.id]))

    def _listed_document_ids(self):
        self.client.force_authenticate(user=self.assistant)
        response = self.client.get(reverse("api_v1:document-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        return {str(item["id"]) for item in rows}

    def test_a_live_delegate_can_open_a_document_the_record_carries(self):
        self._delegate()

        response = self._open_document()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn(str(self.document.id), self._listed_document_ids())

    def test_a_delegate_without_the_view_grant_cannot_open_the_document(self):
        self._delegate(can_view=False)

        self.assertEqual(
            self._open_document().status_code, status.HTTP_404_NOT_FOUND
        )

    def test_an_expired_delegation_no_longer_reaches_the_document(self):
        self._delegate(expires_in=timedelta(minutes=-1))

        self.assertEqual(
            self._open_document().status_code, status.HTTP_404_NOT_FOUND
        )

    def test_classification_still_gates_a_delegated_document(self):
        self.document.sensitivity = Document.Sensitivity.CONFIDENTIAL
        self.document.save(update_fields=["sensitivity"])
        self._delegate()

        self.assertEqual(
            self._open_document().status_code, status.HTTP_404_NOT_FOUND
        )
