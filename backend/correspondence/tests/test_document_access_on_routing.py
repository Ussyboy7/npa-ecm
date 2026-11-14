import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase

from correspondence.models import Correspondence, CorrespondenceDocumentLink, Minute
from correspondence.services import CorrespondenceDocumentService
from dms.models import Document, DocumentPermission
from dms.visibility import documents_visible_to

User = get_user_model()


class DocumentAccessOnRoutingTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(username="routing-author", password="testpass123")
        self.next_approver = User.objects.create_user(username="routing-next", password="testpass123")
        self.outsider = User.objects.create_user(username="routing-outsider", password="testpass123")

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/ACL/{uuid.uuid4().hex[:8].upper()}",
            subject="Routing document access",
            sender_name="Test sender",
            created_by=self.author,
            current_approver=self.next_approver,
        )
        self.document = Document.objects.create(
            title="Linked memo",
            document_type=Document.DocumentType.MEMO,
            author=self.author,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=self.document,
        )

    def test_minute_author_and_current_approver_can_open_linked_document(self):
        # Routing may leave to_user/to_office empty and record only current_approver.
        minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.author,
            minute_text="Routed onward",
            action_type=Minute.ActionType.MINUTE,
            step_number=1,
        )

        CorrespondenceDocumentService.grant_document_access_for_minute(minute)

        permission = DocumentPermission.objects.get(
            document=self.document,
            access=DocumentPermission.AccessLevel.READ,
        )
        granted_user_ids = set(permission.users.values_list("id", flat=True))
        self.assertIn(self.author.id, granted_user_ids)
        self.assertIn(self.next_approver.id, granted_user_ids)
        self.assertNotIn(self.outsider.id, granted_user_ids)

        visible = Document.objects.filter(pk=self.document.pk)
        self.assertTrue(documents_visible_to(visible, self.author).exists())
        self.assertTrue(documents_visible_to(visible, self.next_approver).exists())
        self.assertFalse(documents_visible_to(visible, self.outsider).exists())
