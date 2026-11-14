import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from audit.models import ActivityLog
from correspondence.models import Correspondence, CorrespondenceDocumentLink, Minute
from correspondence.services import CorrespondenceDocumentService
from dms.models import Document, DocumentVersion


User = get_user_model()


class CorrespondenceDocumentIssueTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="issueuser",
            email="issueuser@example.com",
            password="testpass123",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/ISSUE/{uuid.uuid4().hex[:8].upper()}",
            subject="Issue status test",
            sender_name="Unit Test",
            created_by=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )

    def test_issue_publishes_only_draft_primary_and_audits_version(self):
        primary = Document.objects.create(
            title="Authored memo",
            document_type=Document.DocumentType.MEMO,
            role=Document.Role.PRIMARY,
            status=Document.DocumentStatus.DRAFT,
            author=self.user,
        )
        attachment = Document.objects.create(
            title="Received scan",
            document_type=Document.DocumentType.OTHER,
            role=Document.Role.ATTACHMENT,
            status=Document.DocumentStatus.DRAFT,
            author=self.user,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=primary,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=attachment,
        )
        version = DocumentVersion.objects.create(
            document=primary,
            version_number=1,
            file_name="memo.html",
            file_type="text/html",
            file_size=0,
            uploaded_by=self.user,
        )
        minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.user,
            minute_text="Issue to the receiving office.",
            to_office=self.correspondence.owning_office,
        )

        published = CorrespondenceDocumentService.publish_documents_on_issue(
            self.correspondence,
            user=self.user,
            minutes=[minute],
        )

        primary.refresh_from_db()
        attachment.refresh_from_db()
        self.assertEqual([doc.id for doc in published], [primary.id])
        self.assertEqual(primary.status, Document.DocumentStatus.PUBLISHED)
        self.assertEqual(attachment.status, Document.DocumentStatus.DRAFT)
        audit = ActivityLog.objects.get(object_type="document", object_id=str(primary.id))
        self.assertEqual(audit.metadata["published_version_id"], str(version.id))
        self.assertEqual(audit.metadata["minute_ids"], [str(minute.id)])

        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get(reverse("api_v1:document-detail", args=[primary.id]))
        self.assertEqual(response.status_code, 200)
        issue = response.data["publication_history"][0]
        self.assertEqual(issue["published_version_id"], str(version.id))
        self.assertEqual(issue["published_version_number"], 1)
        self.assertEqual(issue["correspondence_reference"], self.correspondence.reference_number)
        self.assertEqual(issue["issue_type"], "minute")

    def test_routing_inbound_external_scan_does_not_publish_it(self):
        self.correspondence.direction = Correspondence.Direction.UPWARD
        self.correspondence.source = Correspondence.Source.EXTERNAL
        self.correspondence.save(update_fields=["direction", "source"])
        scan = Document.objects.create(
            title="Incoming scan",
            document_type=Document.DocumentType.OTHER,
            role=Document.Role.PRIMARY,
            status=Document.DocumentStatus.DRAFT,
            author=self.user,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=scan,
        )
        minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.user,
            minute_text="Route inward correspondence.",
            to_office=self.correspondence.owning_office,
        )

        published = CorrespondenceDocumentService.publish_documents_on_issue(
            self.correspondence,
            user=self.user,
            minutes=[minute],
        )

        scan.refresh_from_db()
        self.assertEqual(published, [])
        self.assertEqual(scan.status, Document.DocumentStatus.DRAFT)

    def test_no_issue_event_does_not_publish_linked_documents(self):
        document = Document.objects.create(
            title="Working memo",
            document_type=Document.DocumentType.MEMO,
            role=Document.Role.PRIMARY,
            status=Document.DocumentStatus.DRAFT,
            author=self.user,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=document,
        )

        published = CorrespondenceDocumentService.publish_documents_on_issue(
            self.correspondence,
            user=self.user,
        )

        document.refresh_from_db()
        self.assertEqual(published, [])
        self.assertEqual(document.status, Document.DocumentStatus.DRAFT)