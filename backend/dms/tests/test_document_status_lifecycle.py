from django.contrib.auth import get_user_model
from django.test import TestCase

from dms.models import Document
from dms.serializers import DocumentSerializer
from organization.models import Department, Directorate, Division


User = get_user_model()


class DocumentStatusLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="statususer",
            email="statususer@example.com",
            password="testpass123",
        )

    def test_document_serializer_includes_only_its_hierarchy_names(self):
        directorate = Directorate.objects.create(name="Operations Directorate", code="OD")
        division = Division.objects.create(
            directorate=directorate,
            name="Marine Division",
            code="MD",
        )
        department = Department.objects.create(
            division=division,
            name="Port Department",
            code="PD",
        )
        document = Document.objects.create(
            title="Scoped hierarchy names",
            document_type="memo",
            author=self.user,
            division=division,
            department=department,
        )

        data = DocumentSerializer(document).data

        self.assertEqual(str(data["division"]), str(division.id))
        self.assertEqual(data["division_name"], "Marine Division")
        self.assertEqual(str(data["department"]), str(department.id))
        self.assertEqual(data["department_name"], "Port Department")

    def test_client_cannot_create_a_document_as_published(self):
        serializer = DocumentSerializer(data={
            "title": "Status controlled by workflow",
            "document_type": "memo",
            "status": "published",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        document = serializer.save(author=self.user)

        self.assertEqual(document.status, Document.DocumentStatus.DRAFT)