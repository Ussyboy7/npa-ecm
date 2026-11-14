"""Document visibility is one rule: list, search and object access agree.

Also covers ACL level enforcement (read vs write vs admin) and
directorate-wide sharing.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from dms.drm import resolve_effective_document_rights
from dms.models import Document, DocumentPermission
from organization.models import Department, Directorate, Division, Role
from search.services import SearchService

User = get_user_model()


class DocumentVisibilityTests(APITestCase):
    def setUp(self):
        self.directorate = Directorate.objects.create(name="Marine Directorate", code="MDIR")
        self.division_a = Division.objects.create(
            directorate=self.directorate, name="Division A", code="DIVA"
        )
        self.division_b = Division.objects.create(
            directorate=self.directorate, name="Division B", code="DIVB"
        )
        self.department_a = Department.objects.create(
            division=self.division_a, name="Department A", code="DEPA"
        )
        self.department_b = Department.objects.create(
            division=self.division_b, name="Department B", code="DEPB"
        )

        from organization.models import Role

        document_role = Role.objects.create(
            name="Document visibility test role",
            permissions={"can_access_document_management": True},
        )
        self.author = User.objects.create_user(
            username="vis_author",
            email="vis_author@npa.gov.ng",
            password="pass12345",
            division=self.division_a,
            department=self.department_a,
            directorate=self.directorate,
            grade_level="MSS3",
            system_role=document_role,
        )
        self.colleague = User.objects.create_user(
            username="vis_colleague",
            email="vis_colleague@npa.gov.ng",
            password="pass12345",
            division=self.division_b,
            department=self.department_b,
            directorate=self.directorate,
            grade_level="MSS3",
            system_role=document_role,
        )
        self.outsider = User.objects.create_user(
            username="vis_outsider",
            email="vis_outsider@npa.gov.ng",
            password="pass12345",
            grade_level="MSS3",
            system_role=document_role,
        )

        self.document = Document.objects.create(
            title="Harbour Dredging Secret Memo",
            description="Internal dredging programme",
            document_type=Document.DocumentType.MEMO,
            status=Document.DocumentStatus.DRAFT,
            sensitivity=Document.Sensitivity.INTERNAL,
            author=self.author,
            division=self.division_a,
            department=self.department_a,
        )

    def _listed_ids(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("api_v1:document-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        return {str(item["id"]) for item in rows}

    def _searched_ids(self, user, query="Dredging"):
        result = SearchService.full_text_search_documents(
            query, {}, limit=50, offset=0, user=user
        )
        return {str(doc.id) for doc in result["results"]}

    def test_internal_draft_is_invisible_to_other_departments_in_list_and_search(self):
        self.assertNotIn(str(self.document.id), self._listed_ids(self.colleague))
        self.assertNotIn(str(self.document.id), self._searched_ids(self.colleague))
        self.assertNotIn(str(self.document.id), self._searched_ids(self.outsider))

    def test_search_and_list_agree_once_shared_with_the_department(self):
        permission = DocumentPermission.objects.create(
            document=self.document, access=DocumentPermission.AccessLevel.READ
        )
        permission.departments.add(self.department_b)

        self.assertIn(str(self.document.id), self._listed_ids(self.colleague))
        self.assertIn(str(self.document.id), self._searched_ids(self.colleague))

    def test_publishing_internal_does_not_widen_the_audience(self):
        self.document.status = Document.DocumentStatus.PUBLISHED
        self.document.save(update_fields=["status"])

        self.assertNotIn(str(self.document.id), self._listed_ids(self.colleague))
        self.assertNotIn(str(self.document.id), self._searched_ids(self.colleague))

    def test_public_draft_stays_private_until_published(self):
        self.document.sensitivity = Document.Sensitivity.PUBLIC
        self.document.save(update_fields=["sensitivity"])

        self.assertNotIn(str(self.document.id), self._listed_ids(self.colleague))

        self.document.status = Document.DocumentStatus.PUBLISHED
        self.document.save(update_fields=["status"])
        self.assertIn(str(self.document.id), self._listed_ids(self.colleague))

    def test_directorate_permission_reaches_every_division_in_it(self):
        permission = DocumentPermission.objects.create(
            document=self.document, access=DocumentPermission.AccessLevel.READ
        )
        permission.directorates.add(self.directorate)

        self.assertIn(str(self.document.id), self._listed_ids(self.colleague))
        self.assertNotIn(str(self.document.id), self._listed_ids(self.outsider))

    def test_division_grant_reaches_department_member_without_a_division_id(self):
        """A department-only account inherits the division containing it."""
        department_only = User.objects.create_user(
            username="vis_department_division_only",
            email="vis_department_division_only@npa.gov.ng",
            password="pass12345",
            department=self.department_b,
            grade_level="MSS3",
            system_role=self.author.system_role,
        )
        permission = DocumentPermission.objects.create(
            document=self.document, access=DocumentPermission.AccessLevel.READ
        )
        permission.divisions.add(self.division_b)

        self.assertIn(str(self.document.id), self._listed_ids(department_only))
        self.assertIn(str(self.document.id), self._searched_ids(department_only))
        self.assertEqual(
            resolve_effective_document_rights(self.document, department_only)["access_level"],
            "read",
        )
        self.assertIsNone(
            resolve_effective_document_rights(self.document, self.outsider)["access_level"]
        )

    def test_directorate_grant_reaches_members_without_a_directorate_id(self):
        """Many accounts only carry a division or department, not a directorate."""
        division_only = User.objects.create_user(
            username="vis_division_only",
            email="vis_division_only@npa.gov.ng",
            password="pass12345",
            division=self.division_b,
            department=self.department_b,
            grade_level="MSS3",
            system_role=self.author.system_role,
        )
        department_only = User.objects.create_user(
            username="vis_department_only",
            email="vis_department_only@npa.gov.ng",
            password="pass12345",
            department=self.department_b,
            grade_level="MSS3",
            system_role=self.author.system_role,
        )
        permission = DocumentPermission.objects.create(
            document=self.document, access=DocumentPermission.AccessLevel.READ
        )
        permission.directorates.add(self.directorate)

        self.assertIn(str(self.document.id), self._listed_ids(division_only))
        self.assertIn(str(self.document.id), self._searched_ids(division_only))
        self.assertIn(str(self.document.id), self._listed_ids(department_only))
        self.assertEqual(
            resolve_effective_document_rights(self.document, division_only)["access_level"],
            "read",
        )
        self.assertIsNone(
            resolve_effective_document_rights(self.document, self.outsider)["access_level"]
        )


class DocumentAclLevelTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Editor",
            permissions={"can_edit_documents": True, "can_delete_documents": True},
        )
        self.author = User.objects.create_user(
            username="acl_author",
            email="acl_author@npa.gov.ng",
            password="pass12345",
            grade_level="MSS3",
            system_role=self.role,
        )
        self.reader = User.objects.create_user(
            username="acl_reader",
            email="acl_reader@npa.gov.ng",
            password="pass12345",
            grade_level="MSS3",
            system_role=self.role,
        )
        self.document = Document.objects.create(
            title="Edit Control Memo",
            document_type=Document.DocumentType.MEMO,
            status=Document.DocumentStatus.DRAFT,
            sensitivity=Document.Sensitivity.INTERNAL,
            author=self.author,
        )
        self.permission = DocumentPermission.objects.create(
            document=self.document,
            access=DocumentPermission.AccessLevel.READ,
        )
        self.permission.users.add(self.reader)

    def _patch_title(self, user, title):
        self.client.force_authenticate(user=user)
        return self.client.patch(
            reverse("api_v1:document-detail", args=[self.document.id]),
            {"title": title},
            format="json",
        )

    def test_read_level_recipient_cannot_edit(self):
        response = self._patch_title(self.reader, "Edited by reader")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.document.refresh_from_db()
        self.assertEqual(self.document.title, "Edit Control Memo")

    def test_read_level_recipient_cannot_delete(self):
        self.client.force_authenticate(user=self.reader)
        response = self.client.delete(
            reverse("api_v1:document-detail", args=[self.document.id])
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Document.objects.get(id=self.document.id).is_deleted)

    def test_write_level_recipient_can_edit(self):
        self.permission.access = DocumentPermission.AccessLevel.WRITE
        self.permission.save(update_fields=["access"])

        response = self._patch_title(self.reader, "Edited with write access")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.document.refresh_from_db()
        self.assertEqual(self.document.title, "Edited with write access")

    def test_author_keeps_full_control(self):
        response = self._patch_title(self.author, "Edited by author")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
