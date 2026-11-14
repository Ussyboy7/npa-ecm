import uuid

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, Minute
from organization.models import Office, Role


class CorrespondenceCompletionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role = Role.objects.create(
            name=f"CompletionTest-{uuid.uuid4().hex[:8]}",
            permissions={"can_minute_correspondence": True, "can_archive": True},
        )
        self.user = User.objects.create_user(
            username=f"completion-user-{uuid.uuid4().hex[:8]}",
            password="test",
            system_role=self.role,
        )
        self.other_user = User.objects.create_user(
            username=f"completion-other-{uuid.uuid4().hex[:8]}",
            password="test",
            system_role=self.role,
        )
        self.office = Office.objects.create(
            name=f"Completion office {uuid.uuid4().hex[:6]}",
            code=f"CMP-{uuid.uuid4().hex[:8]}",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"TEST-COMP-{uuid.uuid4().hex[:8]}",
            subject="Completion test",
            created_by=self.other_user,
            owning_office=self.office,
            current_office=self.office,
            current_approver=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )
        self.minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.other_user,
            grade_level="SSS1",
            action_type=Minute.ActionType.MINUTE,
            minute_text="Test handoff",
            direction=Minute.Direction.DOWNWARD,
            step_number=1,
            acknowledged_at=timezone.now(),
        )
        self.detail_url = reverse("api_v1:correspondence-detail", args=[self.correspondence.id])
        self.url = f"{self.detail_url}complete/"
        self.no_reply_url = f"{self.detail_url}complete-no-response/"
        self.client.force_authenticate(user=self.user)

    def test_current_approver_completes_acknowledged_correspondence_without_archiving(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.COMPLETED)
        self.assertIsNotNone(self.correspondence.completed_at)
        self.assertIsNone(self.correspondence.archived_at)
        self.assertIsNotNone(self.correspondence.completion_package_id)
        self.assertTrue(self.correspondence.completion_package.versions.exists())

    def test_current_assignee_can_finish_without_reply_and_records_final_minute(self):
        response = self.client.post(
            self.no_reply_url,
            {"minute_text": "No further action is required."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.COMPLETED)
        self.assertIsNotNone(self.correspondence.completed_at)
        self.assertIsNone(self.correspondence.archived_at)
        self.assertIsNotNone(self.correspondence.completion_package_id)
        self.assertTrue(self.correspondence.completion_package.versions.exists())

        final_minute = self.correspondence.minutes.order_by("-timestamp").first()
        self.assertEqual(final_minute.user_id, self.user.id)
        self.assertIsNone(final_minute.to_office_id)
        self.assertIsNone(final_minute.to_user_id)
        self.assertFalse(final_minute.requires_response)
        self.assertIn("No further action is required.", final_minute.minute_text)

    def test_no_reply_completion_requires_acknowledgment_of_prior_routed_minutes(self):
        self.minute.to_office = self.office
        self.minute.acknowledged_at = None
        self.minute.save(update_fields=["to_office", "acknowledged_at"])

        response = self.client.post(
            self.no_reply_url,
            {"minute_text": "No further action is required."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.IN_PROGRESS)
        self.assertEqual(self.correspondence.minutes.count(), 1)

    def test_non_current_user_cannot_finish_without_a_reply(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            self.no_reply_url,
            {"minute_text": "No further action is required."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.IN_PROGRESS)
        self.assertEqual(self.correspondence.minutes.count(), 1)

    def test_no_reply_completion_requires_a_final_note(self):
        response = self.client.post(self.no_reply_url, {"minute_text": "  "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.IN_PROGRESS)

    def test_generic_patch_cannot_bypass_completion_checks(self):
        response = self.client.patch(
            self.detail_url,
            {"status": Correspondence.Status.COMPLETED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.IN_PROGRESS)
        self.assertIsNone(self.correspondence.completed_at)

    def test_completion_requires_at_least_one_non_recalled_minute(self):
        self.minute.is_recalled = True
        self.minute.save(update_fields=["is_recalled"])

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.IN_PROGRESS)

    def test_completion_requires_every_non_recalled_minute_to_be_acknowledged(self):
        self.minute.acknowledged_at = None
        self.minute.save(update_fields=["acknowledged_at"])

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.IN_PROGRESS)

    def test_non_current_user_cannot_complete(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.IN_PROGRESS)

    def test_completed_correspondence_can_be_archived_separately(self):
        completed = self.client.post(self.url, {}, format="json")
        self.assertEqual(completed.status_code, status.HTTP_200_OK, completed.content)

        archive_url = f"{self.detail_url}archive/"
        archived = self.client.post(archive_url, {}, format="json")

        self.assertEqual(archived.status_code, status.HTTP_200_OK, archived.content)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.ARCHIVED)
        self.assertIsNotNone(self.correspondence.archived_at)
