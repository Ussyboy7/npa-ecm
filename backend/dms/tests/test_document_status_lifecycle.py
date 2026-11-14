from django.contrib.auth import get_user_model
from django.test import TestCase

from dms.models import Document
from dms.serializers import DocumentSerializer


User = get_user_model()


class DocumentStatusLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="statususer",
            email="statususer@example.com",
            password="testpass123",
        )

    def test_client_cannot_create_a_document_as_published(self):
        serializer = DocumentSerializer(data={
            "title": "Status controlled by workflow",
            "document_type": "memo",
            "status": "published",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        document = serializer.save(author=self.user)

        self.assertEqual(document.status, Document.DocumentStatus.DRAFT)