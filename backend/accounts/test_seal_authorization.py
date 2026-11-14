from io import BytesIO
import uuid

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from accounts.models import DocumentSeal, ExecutiveSignature, User
from accounts.services import SealGenerationService
from correspondence.models import Correspondence, Minute
from dms.models import Document, DocumentPermission
from organization.models import Role


def make_signature(user, *, require_2fa=False):
    buffer = BytesIO()
    Image.new("RGB", (200, 80), "white").save(buffer, format="PNG")
    signature = ExecutiveSignature.objects.create(
        user=user,
        signature_image=SimpleUploadedFile(
            "seal-authorization.png",
            buffer.getvalue(),
            content_type="image/png",
        ),
        require_2fa=require_2fa,
    )
    return signature


class SealAuthorizationTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Seal Authorization Approver",
            permissions={"can_approve": True},
        )
        self.approver = User.objects.create_user(
            username="seal-authorization-approver",
            password="testpass123",
            system_role=self.role,
        )
        self.outsider = User.objects.create_user(
            username="seal-authorization-outsider",
            password="testpass123",
            system_role=self.role,
        )

        for user in (self.approver, self.outsider):
            signature = make_signature(user)
            self.addCleanup(signature.signature_image.delete, save=False)

        # The outsider is the creator so the org-scope check passes. The
        # remaining question is whether they own the current approval turn.
        self.correspondence = Correspondence.objects.create(
            subject="Seal authorization test",
            created_by=self.outsider,
            current_approver=self.approver,
        )

    def _cleanup_seal(self, seal):
        self.addCleanup(seal.signature_image_snapshot.delete, save=False)
        self.addCleanup(seal.seal_image.delete, save=False)

    def test_current_approver_can_seal_correspondence(self):
        seal, _ = SealGenerationService.generate_seal(
            user=self.approver,
            correspondence=self.correspondence,
        )
        self._cleanup_seal(seal)

        self.assertEqual(seal.correspondence_id, self.correspondence.id)
        self.assertEqual(seal.sealed_by_id, self.approver.id)

    def test_signed_user_without_approval_turn_cannot_seal_correspondence(self):
        with self.assertRaises(PermissionDenied):
            SealGenerationService.generate_seal(
                user=self.outsider,
                correspondence=self.correspondence,
            )

        self.assertFalse(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )

    def test_seal_endpoint_rejects_correspondence_the_user_cannot_approve(self):
        client = APIClient()
        client.force_authenticate(self.outsider)

        response = client.post(
            reverse("api_v1:seal_apply"),
            {"correspondence_id": str(self.correspondence.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.content)
        self.assertFalse(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )

    def test_document_owner_can_seal_document(self):
        document = Document.objects.create(
            title=f"Seal authorization {uuid.uuid4().hex[:8]}",
            document_type=Document.DocumentType.MEMO,
            author=self.approver,
        )

        seal, _ = SealGenerationService.generate_seal(
            user=self.approver,
            document=document,
        )
        self._cleanup_seal(seal)

        self.assertEqual(seal.document_id, document.id)

    def test_signed_user_without_document_admin_access_cannot_seal_document(self):
        document = Document.objects.create(
            title=f"Seal authorization {uuid.uuid4().hex[:8]}",
            document_type=Document.DocumentType.MEMO,
            author=self.approver,
        )
        write_permission = DocumentPermission.objects.create(
            document=document,
            access=DocumentPermission.AccessLevel.WRITE,
        )
        write_permission.users.add(self.outsider)

        with self.assertRaises(PermissionDenied):
            SealGenerationService.generate_seal(
                user=self.outsider,
                document=document,
            )

        self.assertFalse(DocumentSeal.objects.filter(document=document).exists())

    def test_document_owner_without_approval_permission_cannot_seal_document(self):
        owner_without_approval = User.objects.create_user(
            username="seal-owner-without-approval",
            password="testpass123",
        )
        signature = make_signature(owner_without_approval)
        self.addCleanup(signature.signature_image.delete, save=False)
        document = Document.objects.create(
            title=f"Seal authorization {uuid.uuid4().hex[:8]}",
            document_type=Document.DocumentType.MEMO,
            author=owner_without_approval,
        )

        with self.assertRaises(PermissionDenied):
            SealGenerationService.generate_seal(
                user=owner_without_approval,
                document=document,
            )

        self.assertFalse(DocumentSeal.objects.filter(document=document).exists())

    def test_saved_approve_minute_authorizes_the_md_seal_path(self):
        # The minute view has already checked the turn and saved the approval;
        # routing may have moved current_approver before apply_if_eligible runs.
        self.correspondence.current_approver = self.outsider
        self.correspondence.save(update_fields=["current_approver"])
        minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.approver,
            minute_text="Approved after routing changed.",
            action_type=Minute.ActionType.APPROVE,
        )

        seal, _ = SealGenerationService.generate_seal(
            user=self.approver,
            correspondence=self.correspondence,
            minute=minute,
        )
        self._cleanup_seal(seal)

        self.assertEqual(seal.sealed_by_id, self.approver.id)

    def test_arbitrary_minute_context_cannot_authorize_another_user(self):
        minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.approver,
            minute_text="Someone else's approval.",
            action_type=Minute.ActionType.APPROVE,
        )

        with self.assertRaises(PermissionDenied):
            SealGenerationService.generate_seal(
                user=self.outsider,
                correspondence=self.correspondence,
                minute=minute,
            )

        self.assertFalse(
            DocumentSeal.objects.filter(correspondence=self.correspondence).exists()
        )