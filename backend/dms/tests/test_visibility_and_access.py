"""Document visibility is one rule: list, search and object access agree.

Also covers ACL level enforcement (read vs write vs admin) and
directorate-wide sharing.
"""

import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from correspondence.models import Correspondence, CorrespondenceDocumentLink
from dms.drm import resolve_effective_document_rights
from dms.models import Document, DocumentPermission
from organization.models import (
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    Role,
)
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


class ClassificationGateParityTests(APITestCase):
    """A share and a correspondence delivery obey the same classification gate.

    The channel decides *which* documents a user may reach; the document's
    sensitivity decides whether the user may reach that grade at all. Neither an
    explicit permission row nor an office's custody lifts the gate.
    """

    def setUp(self):
        self.role = Role.objects.create(
            name="Classification parity role",
            permissions={"can_access_document_management": True},
        )
        self.directorate = Directorate.objects.create(
            name="Parity Directorate", code="PAR-DIR"
        )
        self.division = Division.objects.create(
            directorate=self.directorate, name="Parity Division", code="PAR-DIV"
        )
        self.office = Office.objects.create(
            name="Parity Office",
            code="PAR-OFF",
            office_type=Office.OfficeTier.DIVISION,
            division=self.division,
        )

        self.author = self._user("parity_author", grade="MSS4")
        self.below_grade = self._user("parity_below", grade="SSS3")
        self.at_grade = self._user("parity_at", grade="MSS3")

        OfficeMembership.objects.create(
            office=self.office,
            user=self.below_grade,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT,
        )
        OfficeMembership.objects.create(
            office=self.office,
            user=self.at_grade,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )

        self.document = Document.objects.create(
            title="Parity confidential memo",
            document_type=Document.DocumentType.MEMO,
            status=Document.DocumentStatus.DRAFT,
            sensitivity=Document.Sensitivity.CONFIDENTIAL,
            author=self.author,
            division=self.division,
        )

    def _user(self, username, *, grade):
        return User.objects.create_user(
            username=username,
            email=f"{username}@npa.gov.ng",
            password="pass12345",
            grade_level=grade,
            division=self.division,
            system_role=self.role,
        )

    def _share_with(self, user):
        permission = DocumentPermission.objects.create(
            document=self.document, access=DocumentPermission.AccessLevel.READ
        )
        permission.users.add(user)
        return permission

    def _deliver_to_office(self):
        correspondence = Correspondence.objects.create(
            reference_number=f"NPA/PAR/{uuid.uuid4().hex[:8].upper()}",
            subject="Parity delivery",
            sender_name="Sender",
            created_by=self.author,
            owning_office=self.office,
            current_office=self.office,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=correspondence, document=self.document
        )
        return correspondence

    def _can_open(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse("api_v1:document-detail", args=[self.document.id])
        )
        return response.status_code == status.HTTP_200_OK

    def _shared_ids(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("api_v1:document-list"), {"shared_with_me": "1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        return {str(item["id"]) for item in rows}

    def test_a_share_below_the_grade_is_neither_listed_nor_openable(self):
        self._share_with(self.below_grade)

        self.assertNotIn(str(self.document.id), self._shared_ids(self.below_grade))
        self.assertFalse(self._can_open(self.below_grade))
        self.assertIsNone(
            resolve_effective_document_rights(self.document, self.below_grade)["access_level"]
        )

    def test_a_share_at_the_grade_opens(self):
        self._share_with(self.at_grade)

        self.assertIn(str(self.document.id), self._shared_ids(self.at_grade))
        self.assertTrue(self._can_open(self.at_grade))
        self.assertEqual(
            resolve_effective_document_rights(self.document, self.at_grade)["access_level"],
            "read",
        )

    def test_a_delivery_below_the_grade_is_neither_listed_nor_openable(self):
        self._deliver_to_office()

        self.assertNotIn(str(self.document.id), self._shared_ids(self.below_grade))
        self.assertFalse(self._can_open(self.below_grade))
        self.assertIsNone(
            resolve_effective_document_rights(self.document, self.below_grade)["access_level"]
        )

    def test_a_delivery_at_the_grade_opens(self):
        self._deliver_to_office()

        self.assertTrue(self._can_open(self.at_grade))
        self.assertEqual(
            resolve_effective_document_rights(self.document, self.at_grade)["access_level"],
            "read",
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
