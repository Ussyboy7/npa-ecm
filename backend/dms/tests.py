from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import Document, DocumentVersion, DocumentPermission
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
