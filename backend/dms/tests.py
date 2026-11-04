from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .drm import resolve_effective_document_rights
from .models import Document, DocumentPermission, DocumentRightsPolicy, DocumentVersion
from accounts.models import User


class DocumentModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="docuser",
            password="testpass123",
        )

    def test_document_creation(self):
        doc = Document.objects.create(
            title="Test Document",
            author=self.user,
            document_type=Document.DocumentType.MEMO,
        )
        self.assertEqual(doc.title, "Test Document")
        self.assertEqual(doc.author, self.user)
        self.assertEqual(doc.status, Document.DocumentStatus.DRAFT)


class DocumentAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="apiuser",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def test_list_documents_empty(self):
        url = reverse("api_v1:dms:document-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_document(self):
        url = reverse("api_v1:dms:document-list")
        response = self.client.post(url, {
            "title": "New Document",
            "document_type": "memo",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Document.objects.count(), 1)

    def test_create_document_requires_auth(self):
        self.client.force_authenticate(user=None)
        url = reverse("api_v1:dms:document-list")
        response = self.client.post(url, {
            "title": "Unauthorized Document",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DocumentVersionViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="versionuser",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.doc = Document.objects.create(
            title="Version Test Doc",
            author=self.user,
            document_type=Document.DocumentType.MEMO,
        )

    def test_replace_version_requires_permission(self):
        version = DocumentVersion.objects.create(
            document=self.doc,
            version_number=1,
            uploaded_by=self.user,
            file_url="/media/test.txt",
            file_name="test.txt",
            file_size=100,
        )
        other_user = User.objects.create_user(
            username="otheruser",
            password="testpass123",
        )
        self.client.force_authenticate(user=other_user)
        url = reverse("api_v1:dms:documentversion-replace", args=[version.id])
        response = self.client.post(url, {"file_url": "data:text/plain;base64,dGVzdA=="})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DocumentPermissionViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_superuser(
            username="permission-owner",
            password="testpass123",
        )
        self.other = User.objects.create_user(
            username="permission-other",
            password="testpass123",
        )
        self.document = Document.objects.create(
            title="Permission Test Document",
            author=self.owner,
            document_type=Document.DocumentType.MEMO,
        )
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            reverse("api_v1:dms:document-permission-list"),
            {"document": str(self.document.id), "access": "read", "user_ids": [str(self.other.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.permission_id = response.data["id"]

    def test_other_user_cannot_enumerate_permission_records(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.get(reverse("api_v1:dms:document-permission-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_other_user_cannot_update_permission_record(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.patch(
            reverse("api_v1:dms:document-permission-detail", args=[self.permission_id]),
            {"access": "admin"},
            format="json",
        )

        self.assertIn(response.status_code, {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND})

    def test_effective_rights_combine_write_access_with_drm_restrictions(self):
        policy = DocumentRightsPolicy.objects.create(
            name="View Only",
            allow_download=False,
            allow_print=False,
            view_only=True,
        )
        self.document.drm_policy = policy
        self.document.save(update_fields=["drm_policy"])
        permission = DocumentPermission.objects.get(id=self.permission_id)
        permission.access = DocumentPermission.AccessLevel.WRITE
        permission.save(update_fields=["access"])

        rights = resolve_effective_document_rights(self.document, self.other)

        self.assertEqual(rights["access_level"], "write")
        self.assertTrue(rights["can_view"])
        self.assertTrue(rights["can_replace_version"])
        self.assertFalse(rights["can_download"])
        self.assertFalse(rights["can_print"])
