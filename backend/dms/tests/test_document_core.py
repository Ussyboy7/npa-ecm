from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from audit.models import ActivityLog
from ..drm import resolve_effective_document_rights
from ..models import Document, DocumentPermission, DocumentRightsPolicy, DocumentVersion
from accounts.models import User
from notifications.models import Notification
from organization.models import Department, Directorate, Division, Role
from ..visibility import documents_visible_to


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
        role = Role.objects.create(
            name="Document API test role",
            permissions={
                "can_access_document_management": True,
                "can_create_documents": True,
            },
        )
        self.user = User.objects.create_user(
            username="apiuser",
            password="testpass123",
            system_role=role,
        )
        self.client.force_authenticate(user=self.user)

    def test_list_documents_empty(self):
        url = reverse("api_v1:document-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_document(self):
        url = reverse("api_v1:document-list")
        response = self.client.post(url, {
            "title": "New Document",
            "document_type": "memo",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Document.objects.count(), 1)

    def test_create_document_requires_auth(self):
        self.client.force_authenticate(user=None)
        url = reverse("api_v1:document-list")
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

    def make_issued_version(self):
        version = DocumentVersion.objects.create(
            document=self.doc,
            version_number=1,
            uploaded_by=self.user,
            file_url="/media/issued.txt",
            file_name="issued.txt",
            file_size=100,
            content_text="Original issued text",
        )
        ActivityLog.objects.create(
            user=self.user,
            action=ActivityLog.ActionType.DOCUMENT_UPDATED,
            object_type="document",
            object_id=str(self.doc.id),
            module="dms",
            metadata={
                "issue_type": "minute",
                "correspondence_id": "correspondence-id",
                "published_version_id": str(version.id),
                "published_version_number": 1,
            },
        )
        return version

    def test_formally_issued_version_cannot_be_replaced_or_updated(self):
        version = self.make_issued_version()
        replace_url = reverse("api_v1:document-version-replace", args=[version.id])
        detail_url = reverse("api_v1:document-version-detail", args=[version.id])

        replace_response = self.client.post(
            replace_url,
            {"file_name": "changed.txt", "content_text": "Changed"},
            format="json",
        )
        update_response = self.client.patch(
            detail_url,
            {"content_text": "Changed"},
            format="json",
        )

        self.assertEqual(replace_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)
        version.refresh_from_db()
        self.assertEqual(version.content_text, "Original issued text")

    def test_formally_issued_version_cannot_be_deleted_but_new_revision_can_be_created(self):
        version = self.make_issued_version()
        detail_url = reverse("api_v1:document-version-detail", args=[version.id])

        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(DocumentVersion.objects.filter(id=version.id).exists())

        create_response = self.client.post(
            reverse("api_v1:document-version-list"),
            {
                "document": str(self.doc.id),
                "file_name": "revision.txt",
                "file_type": "text/plain",
                "file_size": 8,
                "content_text": "Revision",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["version_number"], 2)
        self.assertEqual(DocumentVersion.objects.filter(document=self.doc).count(), 2)

        revision_id = create_response.data["id"]
        replace_revision_response = self.client.post(
            reverse("api_v1:document-version-replace", args=[revision_id]),
            {"file_name": "revision-updated.txt"},
            format="json",
        )
        self.assertEqual(replace_revision_response.status_code, status.HTTP_200_OK)
        revision = DocumentVersion.objects.get(id=revision_id)
        self.assertEqual(revision.file_name, "revision-updated.txt")

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
        url = reverse("api_v1:document-version-replace", args=[version.id])
        response = self.client.post(url, {"file_url": "data:text/plain;base64,dGVzdA=="})
        # Versions of documents outside the user's visibility resolve as 404, not 403.
        self.assertIn(
            response.status_code,
            {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND},
        )


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
            reverse("api_v1:document-permission-list"),
            {"document": str(self.document.id), "access": "read", "user_ids": [str(self.other.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.permission_id = response.data["id"]

    def test_other_user_cannot_enumerate_permission_records(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.get(reverse("api_v1:document-permission-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_other_user_cannot_update_permission_record(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.patch(
            reverse("api_v1:document-permission-detail", args=[self.permission_id]),
            {"access": "admin"},
            format="json",
        )

        self.assertIn(response.status_code, {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND})

    def test_share_notifies_recipient_and_records_recipient_count(self):
        notification = Notification.objects.filter(
            recipient=self.other,
            related_object_type="document",
            related_object_id=str(self.document.id),
            title=f"Document Shared: {self.document.title}",
        ).first()

        self.assertIsNotNone(notification, "A direct share should notify the recipient")
        self.assertEqual(notification.action_url, f"/dms/{self.document.id}")
        self.assertEqual(notification.status, Notification.Status.UNREAD)

        log = ActivityLog.objects.filter(
            object_type="document",
            object_id=str(self.document.id),
            action=ActivityLog.ActionType.DOCUMENT_SHARED,
        ).latest("timestamp")
        self.assertEqual(log.metadata.get("user_count"), 1)

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


class DepartmentDivisionAclInheritanceTests(TestCase):
    def test_department_only_user_inherits_division_document_permission(self):
        directorate = Directorate.objects.create(name="ACL Directorate", code="ACL-DIR")
        division = Division.objects.create(
            name="ACL Division",
            code="ACL-DIV",
            directorate=directorate,
        )
        department = Department.objects.create(
            name="ACL Department",
            code="ACL-DEPT",
            division=division,
        )
        owner = User.objects.create_user(username="acl-owner", password="x")
        department_user = User.objects.create_user(
            username="acl-department-only",
            password="x",
            department=department,
        )
        document = Document.objects.create(
            title="Division-shared document",
            author=owner,
            document_type=Document.DocumentType.MEMO,
        )
        permission = DocumentPermission.objects.create(
            document=document,
            access=DocumentPermission.AccessLevel.READ,
        )
        permission.divisions.add(division)

        self.assertIsNone(department_user.division_id)
        self.assertEqual(
            resolve_effective_document_rights(document, department_user)["access_level"],
            DocumentPermission.AccessLevel.READ,
        )
        self.assertTrue(
            documents_visible_to(Document.objects.filter(id=document.id), department_user).exists()
        )
