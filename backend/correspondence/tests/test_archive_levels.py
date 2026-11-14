"""Archiving must honour both level authority and organisational scope."""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from audit.models import ActivityLog
from correspondence.models import Correspondence
from dms.models import Document, DocumentPermission
from organization.models import Department, Directorate, Division, Office, Role

User = get_user_model()


class ArchiveLevelTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.directorate = Directorate.objects.create(
            name=f"Corporate Services {uuid.uuid4().hex[:6]}",
            code=f"CS-{uuid.uuid4().hex[:6]}",
        )
        self.other_directorate = Directorate.objects.create(
            name=f"Engineering {uuid.uuid4().hex[:6]}",
            code=f"EN-{uuid.uuid4().hex[:6]}",
        )
        self.division = Division.objects.create(
            directorate=self.directorate,
            name=f"ICT Division {uuid.uuid4().hex[:6]}",
            code=f"ICT-{uuid.uuid4().hex[:6]}",
        )
        self.other_division = Division.objects.create(
            directorate=self.other_directorate,
            name=f"Marine Division {uuid.uuid4().hex[:6]}",
            code=f"MAR-{uuid.uuid4().hex[:6]}",
        )
        self.department = Department.objects.create(
            division=self.division,
            name=f"ICT Department {uuid.uuid4().hex[:6]}",
            code=f"ICTD-{uuid.uuid4().hex[:6]}",
        )
        self.other_department = Department.objects.create(
            division=self.other_division,
            name=f"Marine Department {uuid.uuid4().hex[:6]}",
            code=f"MARD-{uuid.uuid4().hex[:6]}",
        )
        self.office = Office.objects.create(
            name=f"ICT Archive Office {uuid.uuid4().hex[:6]}",
            code=f"ICT-OFF-{uuid.uuid4().hex[:6]}",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

        self.department_role = Role.objects.create(
            name=f"ArchiveDept-{uuid.uuid4().hex[:6]}",
            permissions={"can_archive": True, "can_archive_department": True},
        )
        self.division_role = Role.objects.create(
            name=f"ArchiveDiv-{uuid.uuid4().hex[:6]}",
            permissions={
                "can_archive": True,
                "can_archive_department": True,
                "can_archive_division": True,
            },
        )
        self.directorate_role = Role.objects.create(
            name=f"ArchiveDir-{uuid.uuid4().hex[:6]}",
            permissions={
                "can_archive": True,
                "can_archive_department": True,
                "can_archive_division": True,
                "can_archive_directorate": True,
            },
        )

        self.department_user = User.objects.create_user(
            username=f"archive-dept-{uuid.uuid4().hex[:8]}",
            password="x",
            grade_level="AGMCS",
            system_role=self.department_role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.division_user = User.objects.create_user(
            username=f"archive-div-{uuid.uuid4().hex[:8]}",
            password="x",
            grade_level="GMCS",
            system_role=self.division_role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.directorate_user = User.objects.create_user(
            username=f"archive-dir-{uuid.uuid4().hex[:8]}",
            password="x",
            grade_level="EDCS",
            system_role=self.directorate_role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.clerk = User.objects.create_user(
            username=f"archive-clerk-{uuid.uuid4().hex[:8]}",
            password="x",
            grade_level="SSS1",
            system_role=self.department_role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

    def _make_correspondence(self, *, created_by, department=None, division=None, status=None):
        return Correspondence.objects.create(
            reference_number=f"NPA/ARCH/{uuid.uuid4().hex[:8].upper()}",
            subject="Archive level test",
            sender_name="Sender",
            created_by=created_by,
            owning_office=self.office,
            current_office=self.office,
            department=department,
            division=division,
            status=status or Correspondence.Status.COMPLETED,
        )

    def _archive_list(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse("api_v1:correspondence-records-archive"),
            {"status": Correspondence.Status.ARCHIVED},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        return {
            row["reference_number"]
            for row in response.data.get("results", [])
        }

    def _archive(self, correspondence, user, payload=None):
        self.client.force_authenticate(user=user)
        url = f"{reverse('api_v1:correspondence-detail', args=[correspondence.id])}archive/"
        return self.client.post(url, payload or {}, format="json")

    def test_department_memo_defaults_to_department_level(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
        )

        response = self._archive(correspondence, self.department_user)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.ARCHIVED)
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_department_archive_is_visible_upward_but_not_to_other_departments(self):
        department_record = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        department_record.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        department_record.save(update_fields=["archive_level"])
        other_record = self._make_correspondence(
            created_by=self.department_user,
            department=self.other_department,
            division=self.other_division,
            status=Correspondence.Status.ARCHIVED,
        )
        other_record.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        other_record.save(update_fields=["archive_level"])

        department_refs = self._archive_list(self.department_user)
        division_refs = self._archive_list(self.division_user)
        directorate_refs = self._archive_list(self.directorate_user)

        self.assertIn(department_record.reference_number, department_refs)
        self.assertNotIn(other_record.reference_number, department_refs)
        self.assertIn(department_record.reference_number, division_refs)
        self.assertIn(department_record.reference_number, directorate_refs)
        self.assertNotIn(other_record.reference_number, directorate_refs)

    def test_division_archived_item_is_not_visible_to_department_scope(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DIVISION
        correspondence.save(update_fields=["archive_level"])

        self.assertNotIn(
            correspondence.reference_number,
            self._archive_list(self.department_user),
        )
        self.assertIn(
            correspondence.reference_number,
            self._archive_list(self.division_user),
        )

    def test_directorate_archive_level_filter_uses_read_scope_not_filing_permission(self):
        correspondence = self._make_correspondence(
            created_by=self.directorate_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DIRECTORATE
        correspondence.save(update_fields=["archive_level"])
        self.client.force_authenticate(user=self.directorate_user)

        response = self.client.get(
            reverse("api_v1:correspondence-records-archive"),
            {
                "status": Correspondence.Status.ARCHIVED,
                "archive_level": Correspondence.ArchiveLevel.DIRECTORATE,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertIn(
            correspondence.reference_number,
            {row["reference_number"] for row in response.data.get("results", [])},
        )

    def test_default_filing_uses_the_memos_own_org_unit(self):
        correspondence = self._make_correspondence(
            created_by=self.directorate_user,
            department=self.department,
            division=self.division,
        )

        response = self._archive(correspondence, self.directorate_user)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_department_user_cannot_file_at_directorate_level(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
        )

        response = self._archive(
            correspondence,
            self.department_user,
            {"archive_level": Correspondence.ArchiveLevel.DIRECTORATE},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertEqual(response.data["details"]["code"], "archive_level_forbidden")
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.COMPLETED)
        self.assertEqual(correspondence.archive_level, "")

    def test_department_user_cannot_file_another_department(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.other_department,
            division=self.other_division,
        )

        response = self._archive(
            correspondence,
            self.department_user,
            {"archive_level": Correspondence.ArchiveLevel.DEPARTMENT},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertEqual(response.data["details"]["code"], "archive_scope_denied")
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.COMPLETED)

    def test_division_user_may_file_a_department_inside_their_division(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
        )

        response = self._archive(
            correspondence,
            self.division_user,
            {"archive_level": Correspondence.ArchiveLevel.DEPARTMENT},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_division_user_cannot_file_another_division(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.other_department,
            division=self.other_division,
        )

        response = self._archive(
            correspondence,
            self.division_user,
            {"archive_level": Correspondence.ArchiveLevel.DIVISION},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertEqual(response.data["details"]["code"], "archive_scope_denied")

    def test_directorate_user_files_division_memo_at_directorate_level(self):
        correspondence = self._make_correspondence(
            created_by=self.directorate_user,
            division=self.division,
        )

        response = self._archive(
            correspondence,
            self.directorate_user,
            {"archive_level": Correspondence.ArchiveLevel.DIRECTORATE},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DIRECTORATE)

    def test_participation_alone_is_not_archive_authority(self):
        correspondence = self._make_correspondence(
            created_by=self.clerk,
            department=self.department,
            division=self.division,
        )

        response = self._archive(
            correspondence,
            self.clerk,
            {"archive_level": Correspondence.ArchiveLevel.DEPARTMENT},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertEqual(response.data["details"]["code"], "archive_scope_denied")
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.COMPLETED)

    def test_owning_office_department_resolves_the_filing_level(self):
        correspondence = Correspondence.objects.create(
            reference_number=f"NPA/ARCH/{uuid.uuid4().hex[:8].upper()}",
            subject="Office only placement",
            sender_name="Sender",
            created_by=self.department_user,
            owning_office=self.office,
            current_office=self.office,
            status=Correspondence.Status.COMPLETED,
        )

        response = self._archive(correspondence, self.department_user)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_record_without_org_placement_archives_without_a_level(self):
        correspondence = Correspondence.objects.create(
            reference_number=f"NPA/ARCH/{uuid.uuid4().hex[:8].upper()}",
            subject="Unplaced legacy record",
            sender_name="Sender",
            created_by=self.department_user,
            status=Correspondence.Status.COMPLETED,
        )

        response = self._archive(correspondence, self.department_user)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.ARCHIVED)
        self.assertEqual(correspondence.archive_level, "")

    def test_unknown_archive_level_is_rejected(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
        )

        response = self._archive(correspondence, self.department_user, {"archive_level": "ward"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.COMPLETED)

    def test_already_archived_memo_is_rejected(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )

        response = self._archive(correspondence, self.department_user)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)

    def _attach_package(self, correspondence):
        document = Document.objects.create(
            title=f"Package {uuid.uuid4().hex[:6]}",
            document_type=Document.DocumentType.REPORT,
            author=self.department_user,
            status=Document.DocumentStatus.PUBLISHED,
        )
        correspondence.completion_package = document
        correspondence.save(update_fields=["completion_package"])
        return document

    def _read_permissions(self, document):
        return DocumentPermission.objects.filter(
            document=document,
            access=DocumentPermission.AccessLevel.READ,
        ).first()

    def test_archiving_grants_package_read_to_the_filing_department(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
        )
        document = self._attach_package(correspondence)

        response = self._archive(
            correspondence,
            self.department_user,
            {"archive_level": Correspondence.ArchiveLevel.DEPARTMENT},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        permission = self._read_permissions(document)
        self.assertIsNotNone(permission)
        self.assertIn(self.department, permission.departments.all())

    def test_archive_level_sharing_preserves_existing_package_grants(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
        )
        document = self._attach_package(correspondence)
        existing = DocumentPermission.objects.create(
            document=document,
            access=DocumentPermission.AccessLevel.READ,
            note="Shared while routing",
        )
        existing.users.add(self.clerk)

        response = self._archive(
            correspondence,
            self.department_user,
            {"archive_level": Correspondence.ArchiveLevel.DEPARTMENT},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        existing.refresh_from_db()
        self.assertIn(self.clerk, existing.users.all())
        self.assertIn(self.department, existing.departments.all())

    def test_refiling_to_division_grants_division_package_access(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["archive_level"])
        document = self._attach_package(correspondence)

        response = self._refile(
            correspondence,
            self.division_user,
            {
                "archive_level": Correspondence.ArchiveLevel.DIVISION,
                "reason": "Spans several departments.",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        permission = self._read_permissions(document)
        self.assertIsNotNone(permission)
        self.assertIn(self.division, permission.divisions.all())

    def test_refiling_to_directorate_grants_the_directorate_package_access(self):
        correspondence = self._make_correspondence(
            created_by=self.directorate_user,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DIVISION
        correspondence.save(update_fields=["archive_level"])
        document = self._attach_package(correspondence)

        response = self._refile(
            correspondence,
            self.directorate_user,
            {
                "archive_level": Correspondence.ArchiveLevel.DIRECTORATE,
                "reason": "Directorate-wide decision.",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        permission = self._read_permissions(document)
        self.assertIsNotNone(permission)
        self.assertIn(self.directorate, permission.directorates.all())

    def _unarchive(self, correspondence, user, payload):
        self.client.force_authenticate(user=user)
        url = f"{reverse('api_v1:correspondence-detail', args=[correspondence.id])}unarchive/"
        return self.client.post(url, payload, format="json")

    def test_unarchive_restores_the_exact_prior_status_and_audits_reason(self):
        for previous_status in (
            Correspondence.Status.COMPLETED,
            Correspondence.Status.DISPATCHED,
            Correspondence.Status.ACKNOWLEDGED,
        ):
            with self.subTest(previous_status=previous_status):
                correspondence = self._make_correspondence(
                    created_by=self.division_user,
                    department=self.department,
                    division=self.division,
                    status=Correspondence.Status.ARCHIVED,
                )
                correspondence.pre_archive_status = previous_status
                correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
                correspondence.archived_at = timezone.now()
                correspondence.save(
                    update_fields=["pre_archive_status", "archive_level", "archived_at"]
                )

                response = self._unarchive(
                    correspondence,
                    self.division_user,
                    {"reason": "Retention classification was corrected."},
                )

                self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
                correspondence.refresh_from_db()
                self.assertEqual(correspondence.status, previous_status)
                self.assertIsNone(correspondence.pre_archive_status)
                self.assertIsNone(correspondence.archived_at)
                self.assertEqual(correspondence.archive_level, "")
                log = ActivityLog.objects.filter(
                    object_id=str(correspondence.id),
                    metadata__unarchived=True,
                ).latest("timestamp")
                self.assertEqual(log.metadata["restored_status"], previous_status)
                self.assertEqual(
                    log.metadata["reason"], "Retention classification was corrected."
                )

    def test_unarchive_requires_a_reason_and_does_not_change_archived_record(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.pre_archive_status = Correspondence.Status.COMPLETED
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["pre_archive_status", "archive_level"])

        response = self._unarchive(correspondence, self.division_user, {"reason": "  "})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.ARCHIVED)
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_unarchive_denies_user_outside_filing_level_scope(self):
        other_role = Role.objects.create(
            name=f"ArchiveOtherDept-{uuid.uuid4().hex[:6]}",
            permissions={"can_archive": True, "can_archive_department": True},
        )
        other_department_user = User.objects.create_user(
            username=f"archive-other-dept-{uuid.uuid4().hex[:8]}",
            password="x",
            grade_level="AGMCS",
            system_role=other_role,
            directorate=self.other_directorate,
            division=self.other_division,
            department=self.other_department,
        )
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.pre_archive_status = Correspondence.Status.COMPLETED
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["pre_archive_status", "archive_level"])

        response = self._unarchive(
            correspondence,
            other_department_user,
            {"reason": "Attempt outside filing scope."},
        )

        # The object-scoped viewset deliberately hides out-of-scope records as 404.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.status, Correspondence.Status.ARCHIVED)

    def _refile(self, correspondence, user, payload):
        self.client.force_authenticate(user=user)
        url = f"{reverse('api_v1:correspondence-detail', args=[correspondence.id])}refile/"
        return self.client.post(url, payload, format="json")

    def test_authorised_user_can_refile_and_the_change_is_audited(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["archive_level"])

        response = self._refile(
            correspondence,
            self.division_user,
            {
                "archive_level": Correspondence.ArchiveLevel.DIVISION,
                "reason": "Decision affects several departments in the division.",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DIVISION)
        self.assertEqual(correspondence.status, Correspondence.Status.ARCHIVED)

        log = ActivityLog.objects.filter(
            object_id=str(correspondence.id),
            description__contains="Re-filed correspondence",
        ).latest("timestamp")
        self.assertEqual(log.metadata["previous_archive_level"], "department")
        self.assertEqual(log.metadata["archive_level"], "division")
        self.assertEqual(
            log.metadata["reason"], "Decision affects several departments in the division."
        )

    def test_refile_requires_a_reason(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["archive_level"])

        response = self._refile(
            correspondence,
            self.division_user,
            {"archive_level": Correspondence.ArchiveLevel.DIVISION, "reason": "   "},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_refile_to_the_current_level_is_rejected(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["archive_level"])

        response = self._refile(
            correspondence,
            self.division_user,
            {"archive_level": Correspondence.ArchiveLevel.DEPARTMENT, "reason": "No change."},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)

    def test_unarchived_correspondence_cannot_be_refiled(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
        )

        response = self._refile(
            correspondence,
            self.division_user,
            {"archive_level": Correspondence.ArchiveLevel.DIVISION, "reason": "Too early."},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)

    def test_refile_above_the_users_authority_is_rejected(self):
        correspondence = self._make_correspondence(
            created_by=self.department_user,
            department=self.department,
            division=self.division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["archive_level"])

        response = self._refile(
            correspondence,
            self.department_user,
            {"archive_level": Correspondence.ArchiveLevel.DIVISION, "reason": "Escalating."},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertEqual(response.data["details"]["code"], "archive_level_forbidden")
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_refile_outside_the_users_scope_is_rejected(self):
        correspondence = self._make_correspondence(
            created_by=self.division_user,
            department=self.other_department,
            division=self.other_division,
            status=Correspondence.Status.ARCHIVED,
        )
        correspondence.archive_level = Correspondence.ArchiveLevel.DEPARTMENT
        correspondence.save(update_fields=["archive_level"])

        response = self._refile(
            correspondence,
            self.division_user,
            {"archive_level": Correspondence.ArchiveLevel.DIVISION, "reason": "Wrong division."},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertEqual(response.data["details"]["code"], "archive_scope_denied")
        correspondence.refresh_from_db()
        self.assertEqual(correspondence.archive_level, Correspondence.ArchiveLevel.DEPARTMENT)

    def test_bulk_archive_applies_the_same_level_and_scope_rules(self):
        inside = self._make_correspondence(
            created_by=self.division_user,
            department=self.department,
            division=self.division,
        )
        outside = self._make_correspondence(
            created_by=self.division_user,
            department=self.other_department,
            division=self.other_division,
        )

        self.client.force_authenticate(user=self.division_user)
        response = self.client.post(
            reverse("api_v1:correspondence-bulk-archive"),
            {
                "correspondence_ids": [str(inside.id), str(outside.id)],
                "archive_level": Correspondence.ArchiveLevel.DIVISION,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data["archived_count"], 1)
        self.assertEqual(response.data["skipped_count"], 1)
        self.assertEqual(len(response.data["skipped"]), 1)

        inside.refresh_from_db()
        outside.refresh_from_db()
        self.assertEqual(inside.status, Correspondence.Status.ARCHIVED)
        self.assertEqual(inside.archive_level, Correspondence.ArchiveLevel.DIVISION)
        self.assertEqual(outside.status, Correspondence.Status.COMPLETED)
        self.assertEqual(outside.archive_level, "")
