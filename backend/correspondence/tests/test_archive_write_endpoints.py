"""Direct write endpoints must not mutate closed records or their workflow."""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import (
    Case,
    CaseCorrespondenceLink,
    Correspondence,
    CorrespondenceDraft,
    DispatchRecord,
    ParallelRoutingGroup,
)
from organization.models import Department, Directorate, Division, Office

User = get_user_model()


class ArchiveWriteEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username=f"archive-write-{uuid.uuid4().hex[:8]}",
            password="x",
            email="archive-write@example.com",
        )
        self.client.force_authenticate(user=self.user)

        self.directorate = Directorate.objects.create(
            name=f"Archive Write Directorate {uuid.uuid4().hex[:6]}",
            code=f"AW-DIR-{uuid.uuid4().hex[:6]}",
        )
        self.division = Division.objects.create(
            directorate=self.directorate,
            name=f"Archive Write Division {uuid.uuid4().hex[:6]}",
            code=f"AW-DIV-{uuid.uuid4().hex[:6]}",
        )
        self.department = Department.objects.create(
            division=self.division,
            name=f"Archive Write Department {uuid.uuid4().hex[:6]}",
            code=f"AW-DEPT-{uuid.uuid4().hex[:6]}",
        )
        self.office = Office.objects.create(
            name=f"Archive Write Office {uuid.uuid4().hex[:6]}",
            code=f"AW-OFF-{uuid.uuid4().hex[:6]}",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

    def _make_correspondence(self, status_value=Correspondence.Status.ARCHIVED):
        return Correspondence.objects.create(
            reference_number=f"NPA/AW/{uuid.uuid4().hex[:8].upper()}",
            subject="Archive write endpoint test",
            sender_name="Sender",
            created_by=self.user,
            owning_office=self.office,
            current_office=self.office,
            department=self.department,
            division=self.division,
            status=status_value,
        )

    def _make_dispatch(self, correspondence):
        return DispatchRecord.objects.create(
            correspondence=correspondence,
            dispatch_mode=DispatchRecord.DispatchMode.EMAIL,
            dispatched_date=timezone.localdate(),
            dispatched_by=self.user,
        )

    def test_closed_record_dispatch_records_are_read_only(self):
        for status_value in (Correspondence.Status.COMPLETED, Correspondence.Status.ARCHIVED):
            with self.subTest(status=status_value):
                correspondence = self._make_correspondence(status_value)
                record = self._make_dispatch(correspondence)
                detail_url = reverse("api_v1:dispatch-record-detail", args=[record.id])

                patch_response = self.client.patch(detail_url, {"notes": "changed"}, format="json")
                self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST, patch_response.content)

                acknowledge_response = self.client.post(
                    reverse("api_v1:dispatch-record-mark-acknowledged", args=[record.id]),
                    {},
                    format="json",
                )
                self.assertEqual(acknowledge_response.status_code, status.HTTP_400_BAD_REQUEST, acknowledge_response.content)

                delete_response = self.client.delete(detail_url)
                self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST, delete_response.content)

                record.refresh_from_db()
                self.assertEqual(record.notes, "")
                self.assertIsNone(record.acknowledged_date)
                self.assertTrue(DispatchRecord.objects.filter(id=record.id).exists())

    def test_closed_record_parallel_groups_are_read_only(self):
        active = self._make_correspondence(Correspondence.Status.IN_PROGRESS)
        for status_value in (Correspondence.Status.COMPLETED, Correspondence.Status.ARCHIVED):
            with self.subTest(status=status_value):
                correspondence = self._make_correspondence(status_value)
                group = ParallelRoutingGroup.objects.create(
                    correspondence=correspondence,
                    created_by=self.user,
                    merge_strategy="independent",
                )
                detail_url = reverse("api_v1:parallel-routing-group-detail", args=[group.id])

                patch_response = self.client.patch(detail_url, {"merge_strategy": "all"}, format="json")
                self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST, patch_response.content)

                delete_response = self.client.delete(detail_url)
                self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST, delete_response.content)

                create_response = self.client.post(
                    reverse("api_v1:parallel-routing-group-list"),
                    {"correspondence_id": str(correspondence.id), "merge_strategy": "all"},
                    format="json",
                )
                self.assertEqual(create_response.status_code, status.HTTP_400_BAD_REQUEST, create_response.content)

                group.refresh_from_db()
                self.assertEqual(group.merge_strategy, "independent")
                self.assertTrue(ParallelRoutingGroup.objects.filter(id=group.id).exists())

        move_group = ParallelRoutingGroup.objects.create(
            correspondence=active,
            created_by=self.user,
            merge_strategy="independent",
        )
        move_response = self.client.patch(
            reverse("api_v1:parallel-routing-group-detail", args=[move_group.id]),
            {"correspondence_id": str(self._make_correspondence().id)},
            format="json",
        )
        self.assertEqual(move_response.status_code, status.HTTP_400_BAD_REQUEST, move_response.content)
        move_group.refresh_from_db()
        self.assertEqual(move_group.correspondence_id, active.id)

    def test_closed_record_drafts_are_read_only(self):
        for status_value in (Correspondence.Status.COMPLETED, Correspondence.Status.ARCHIVED):
            with self.subTest(status=status_value):
                correspondence = self._make_correspondence(status_value)
                draft = CorrespondenceDraft.objects.create(
                    correspondence=correspondence,
                    user=self.user,
                    draft_type=CorrespondenceDraft.DraftType.MINUTE,
                    content="Original draft",
                )
                detail_url = reverse("api_v1:correspondence-draft-detail", args=[draft.id])

                patch_response = self.client.patch(detail_url, {"content": "Changed draft"}, format="json")
                self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST, patch_response.content)

                create_response = self.client.post(
                    reverse("api_v1:correspondence-draft-list"),
                    {
                        "correspondence_id": str(correspondence.id),
                        "draft_type": CorrespondenceDraft.DraftType.MINUTE,
                        "content": "New draft for a closed record",
                    },
                    format="json",
                )
                self.assertEqual(create_response.status_code, status.HTTP_400_BAD_REQUEST, create_response.content)

                draft.refresh_from_db()
                self.assertEqual(draft.content, "Original draft")

                delete_response = self.client.delete(detail_url)
                self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT, delete_response.content)
                self.assertFalse(CorrespondenceDraft.objects.filter(id=draft.id).exists())

        active = self._make_correspondence(Correspondence.Status.IN_PROGRESS)
        active_draft = CorrespondenceDraft.objects.create(
            correspondence=active,
            user=self.user,
            draft_type=CorrespondenceDraft.DraftType.MINUTE,
            content="Active draft",
        )
        move_response = self.client.patch(
            reverse("api_v1:correspondence-draft-detail", args=[active_draft.id]),
            {
                "correspondence_id": str(self._make_correspondence().id),
                "content": "Moved draft",
            },
            format="json",
        )
        self.assertEqual(move_response.status_code, status.HTTP_400_BAD_REQUEST, move_response.content)
        active_draft.refresh_from_db()
        self.assertEqual(active_draft.correspondence_id, active.id)
        self.assertEqual(active_draft.content, "Active draft")

        registration_draft = self.client.post(
            reverse("api_v1:correspondence-draft-list"),
            {
                "draft_type": CorrespondenceDraft.DraftType.REGISTRATION,
                "content": "",
                "form_data": {"subject": "Unfinished registration"},
            },
            format="json",
        )
        self.assertEqual(registration_draft.status_code, status.HTTP_201_CREATED, registration_draft.content)

    def test_closed_record_case_links_are_read_only(self):
        case = Case.objects.create(
            case_number=f"NPA/AW/CASE/{uuid.uuid4().hex[:8].upper()}",
            title="Archive write case",
            created_by=self.user,
            owning_office=self.office,
        )
        for status_value in (Correspondence.Status.COMPLETED, Correspondence.Status.ARCHIVED):
            with self.subTest(status=status_value):
                correspondence = self._make_correspondence(status_value)

                link_response = self.client.post(
                    reverse("api_v1:case-link-correspondence", args=[case.id]),
                    {"correspondence_id": str(correspondence.id)},
                    format="json",
                )
                self.assertEqual(link_response.status_code, status.HTTP_400_BAD_REQUEST, link_response.content)
                correspondence.refresh_from_db()
                self.assertIsNone(correspondence.case_id)

                direct_link_response = self.client.post(
                    reverse("api_v1:case-correspondence-link-list"),
                    {"case": str(case.id), "correspondence_id": str(correspondence.id)},
                    format="json",
                )
                self.assertEqual(direct_link_response.status_code, status.HTTP_400_BAD_REQUEST, direct_link_response.content)

                link = CaseCorrespondenceLink.objects.create(
                    case=case,
                    correspondence=correspondence,
                )
                detail_url = reverse("api_v1:case-correspondence-link-detail", args=[link.id])
                patch_response = self.client.patch(detail_url, {"notes": "changed"}, format="json")
                self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST, patch_response.content)

                delete_response = self.client.delete(detail_url)
                self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST, delete_response.content)

                unlink_response = self.client.delete(
                    reverse("api_v1:case-unlink-correspondence", args=[case.id]),
                    {"correspondence_id": str(correspondence.id)},
                    format="json",
                )
                self.assertEqual(unlink_response.status_code, status.HTTP_400_BAD_REQUEST, unlink_response.content)
                self.assertTrue(CaseCorrespondenceLink.objects.filter(id=link.id).exists())

        active = self._make_correspondence(Correspondence.Status.IN_PROGRESS)
        active_link = CaseCorrespondenceLink.objects.create(
            case=case,
            correspondence=active,
        )
        move_response = self.client.patch(
            reverse("api_v1:case-correspondence-link-detail", args=[active_link.id]),
            {"correspondence_id": str(self._make_correspondence().id)},
            format="json",
        )
        self.assertEqual(move_response.status_code, status.HTTP_400_BAD_REQUEST, move_response.content)
        active_link.refresh_from_db()
        self.assertEqual(active_link.correspondence_id, active.id)