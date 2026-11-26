"""Recall: sender-only, until the recipient reads it, and final.

Covers the rule that replaced the 1-hour window and the MD/superuser bypass:
a minute stays recallable while it is unopened and nobody downstream has acted,
only its sender may recall it, and a recall can never be undone.
"""

import uuid
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import DocumentSeal, User
from audit.models import ActivityLog
from correspondence.models import (
    ApprovalSnapshot,
    Correspondence,
    CorrespondenceDocumentLink,
    Minute,
)
from dms.models import Document
from correspondence.serializers import MinuteSerializer
from organization.models import Directorate, Division, Department, Office, OfficeMembership, Role


class MinuteRecallTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.directorate = Directorate.objects.create(name="RecallDir", code="REC_DIR")
        self.division = Division.objects.create(
            name="RecallDiv", code="REC_DIV", directorate=self.directorate
        )
        self.department = Department.objects.create(
            name="RecallDept", code="REC_DEPT", division=self.division
        )
        self.office_a = Office.objects.create(
            name="Recall Office A",
            code="REC-A",
            division=self.division,
            department=self.department,
            directorate=self.directorate,
        )
        self.office_b = Office.objects.create(
            name="Recall Office B",
            code="REC-B",
            division=self.division,
            department=self.department,
            directorate=self.directorate,
        )
        self.office_c = Office.objects.create(
            name="Recall Office C",
            code="REC-C",
            division=self.division,
            department=self.department,
            directorate=self.directorate,
        )

        staff_role, _ = Role.objects.get_or_create(
            name="Recall Staff",
            defaults={"permissions": {"can_minute_correspondence": True}},
        )

        def make_user(username, grade="SSS1"):
            user = User.objects.create_user(
                username=username,
                email=f"{username}@example.com",
                password="x",
                grade_level=grade,
                system_role=staff_role,
                directorate=self.directorate,
                division=self.division,
                department=self.department,
            )
            return user

        self.user_a = make_user("recall_user_a")
        self.user_b = make_user("recall_user_b")
        self.user_c = make_user("recall_user_c")
        for user, office in ((self.user_a, self.office_a), (self.user_b, self.office_b), (self.user_c, self.office_c)):
            OfficeMembership.objects.create(
                user=user, office=office, assignment_role="principal", is_primary=True, is_active=True
            )

        md_role, _ = Role.objects.get_or_create(
            name="Managing Director",
            defaults={"permissions": {"can_minute_correspondence": True, "can_approve": True}},
        )
        self.md = User.objects.create_user(
            username="recall_md",
            email="recall_md@example.com",
            password="x",
            grade_level="MDCS",
            system_role=md_role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/REC/{uuid.uuid4().hex[:8].upper()}",
            subject="Recall test",
            sender_name="Test",
            created_by=self.user_a,
            owning_office=self.office_a,
            current_office=self.office_b,
            current_approver=self.user_b,
            status=Correspondence.Status.IN_PROGRESS,
            priority=Correspondence.Priority.MEDIUM,
            division=self.division,
            department=self.department,
        )
        self.minute_a = self._minute(
            self.user_a, self.office_a, to_office=self.office_b, step=1
        )
        self.minute_b = self._minute(
            self.user_b, self.office_b, to_office=self.office_c, step=2
        )

    def _minute(self, user, from_office, to_office=None, step=1, action_type="minute"):
        return Minute.objects.create(
            correspondence=self.correspondence,
            user=user,
            action_type=action_type,
            minute_text=f"Minute {step}",
            from_office=from_office,
            to_office=to_office,
            step_number=step,
            dispatched_at=timezone.now(),
        )

    @staticmethod
    def _reason(response):
        details = response.data.get("details") or {}
        return details.get("reason") or response.data.get("reason")

    def _recall(self, user, minute):
        self.client.force_authenticate(user=user)
        return self.client.post(
            reverse("api_v1:minute-recall", args=[str(minute.id)]), {}, format="json"
        )

    def test_sender_can_recall_an_unopened_minute(self):
        response = self._recall(self.user_b, self.minute_b)

        self.assertEqual(response.status_code, 200, response.data)
        self.minute_b.refresh_from_db()
        self.assertTrue(self.minute_b.is_recalled)
        self.assertIsNotNone(self.minute_b.recalled_at)

        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.current_office_id, self.office_b.id)
        self.assertEqual(self.correspondence.current_approver_id, self.user_b.id)

    def test_recall_is_logged_on_the_audit_trail(self):
        response = self._recall(self.user_b, self.minute_b)

        self.assertEqual(response.status_code, 200, response.data)
        entries = ActivityLog.objects.filter(action="minute_recalled")
        entry = entries.filter(metadata__minute_id=str(self.minute_b.id)).first()
        self.assertIsNotNone(entry, list(entries.values_list("action", "metadata")))
        self.assertFalse(entry.metadata["approved_copy_withdrawn"])
        self.assertEqual(entry.metadata["approved_copy_document_ids"], [])

    def test_cannot_recall_after_the_recipient_opens_it(self):
        self.minute_b.is_opened = True
        self.minute_b.opened_at = timezone.now()
        self.minute_b.acknowledged_at = timezone.now()
        self.minute_b.save(update_fields=["is_opened", "opened_at", "acknowledged_at"])

        response = self._recall(self.user_b, self.minute_b)

        self.assertEqual(response.status_code, 400)
        self.assertIn("opened", str(response.data))
        self.minute_b.refresh_from_db()
        self.assertFalse(self.minute_b.is_recalled)

    def test_cannot_recall_once_someone_downstream_has_acted(self):
        self._minute(self.user_c, self.office_c, step=3)

        response = self._recall(self.user_b, self.minute_b)

        self.assertEqual(response.status_code, 400)
        self.assertIn("already acted", str(response.data))
        self.minute_b.refresh_from_db()
        self.assertFalse(self.minute_b.is_recalled)

    def test_only_the_sender_can_recall(self):
        for stranger in (self.user_c, self.user_a):
            response = self._recall(stranger, self.minute_b)
            self.assertEqual(response.status_code, 403)
            self.assertEqual(self._reason(response), "recall_not_sender")

        self.minute_b.refresh_from_db()
        self.assertFalse(self.minute_b.is_recalled)

    def test_md_cannot_recall_someone_elses_minute(self):
        response = self._recall(self.md, self.minute_b)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self._reason(response), "recall_not_sender")

    def test_superuser_cannot_recall_someone_elses_minute(self):
        self.md.is_superuser = True
        self.md.save(update_fields=["is_superuser"])

        response = self._recall(self.md, self.minute_b)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self._reason(response), "recall_not_sender")

    def test_recall_is_final(self):
        self.assertEqual(self._recall(self.user_b, self.minute_b).status_code, 200)

        second = self._recall(self.user_b, self.minute_b)

        self.assertEqual(second.status_code, 400)
        self.assertIn("already been recalled", str(second.data))

    def test_recall_does_not_need_a_time_window(self):
        # Recalls used to expire after an hour. Age must not close the gate;
        # only the recipient opening the minute does.
        now = timezone.now()
        Minute.objects.filter(pk=self.minute_a.pk).update(timestamp=now - timedelta(hours=7))
        Minute.objects.filter(pk=self.minute_b.pk).update(
            timestamp=now - timedelta(hours=6),
            edit_window_expires_at=now - timedelta(hours=5),
        )

        response = self._recall(self.user_b, self.minute_b)

        self.assertEqual(response.status_code, 200, response.data)
        self.minute_b.refresh_from_db()
        self.assertTrue(self.minute_b.is_recalled)

    @staticmethod
    def _register_ids(response):
        data = response.data
        rows = data.get("results", []) if isinstance(data, dict) else data
        return {str(row["id"]) for row in rows}

    def test_recalled_md_approval_leaves_the_register_and_its_snapshot(self):
        correspondence = Correspondence.objects.create(
            reference_number=f"NPA/REC/APPR/{uuid.uuid4().hex[:6].upper()}",
            subject="Approval recall",
            sender_name="Test",
            created_by=self.md,
            owning_office=self.office_a,
            status=Correspondence.Status.IN_PROGRESS,
            priority=Correspondence.Priority.MEDIUM,
            division=self.division,
            department=self.department,
        )
        approval = Minute.objects.create(
            correspondence=correspondence,
            user=self.md,
            minute_text="Approved as recommended.",
            action_type=Minute.ActionType.APPROVE,
            approval_level=Minute.ApprovalLevel.EXECUTIVE,
            approval_role="approval",
            from_office=self.office_a,
            step_number=1,
            dispatched_at=timezone.now(),
        )
        seal = DocumentSeal.objects.create(
            correspondence=correspondence,
            sealed_by=self.md,
            serial_number=f"NPA-REC-{uuid.uuid4().hex[:8].upper()}",
            seal_hash="recall-hash",
            verification_url="http://localhost:3002/verify/recall",
            office_name="NIGERIAN PORTS AUTHORITY",
            office_title="OFFICE OF THE MANAGING DIRECTOR",
        )
        Minute.objects.filter(pk=approval.pk).update(seal_applied=seal)
        approval.refresh_from_db()
        ApprovalSnapshot.objects.create(
            minute=approval,
            correspondence=correspondence,
            seal=seal,
            signer_name="Managing Director",
            document_reference=correspondence.reference_number,
        )
        approved_copy = Document.objects.create(
            title="Approved copy — recall test memo",
            document_type=Document.DocumentType.MEMO,
            status=Document.DocumentStatus.PUBLISHED,
            author=self.md,
            role=Document.Role.ATTACHMENT,
            tags=["approved-copy", f"approval-minute:{approval.id}"],
        )
        approved_link = CorrespondenceDocumentLink.objects.create(
            correspondence=correspondence,
            document=approved_copy,
            notes="Approved copy generated from approval minute",
        )

        self.client.force_authenticate(user=self.md)
        register_url = reverse("api_v1:minute-list")
        # The approvals page itself asks for the executive register this way.
        register_params = {"action_type": "approve", "approval_level": "executive"}

        before = self.client.get(register_url, register_params)
        self.assertEqual(before.status_code, 200, before.data)
        self.assertIn(str(approval.id), self._register_ids(before))

        recall = self._recall(self.md, approval)
        self.assertEqual(recall.status_code, 200, recall.data)

        seal.refresh_from_db()
        self.assertFalse(seal.is_valid)

        # The snapshot is evidence: kept, voided with a reason, never rewritten.
        snapshot = ApprovalSnapshot.objects.get(minute=approval)
        self.assertTrue(snapshot.is_void)
        self.assertIsNotNone(snapshot.voided_at)
        self.assertIn("Recalled", snapshot.voided_reason)
        self.assertEqual(snapshot.signer_name, "Managing Director")

        after = self.client.get(register_url, register_params)
        self.assertEqual(after.status_code, 200, after.data)
        self.assertNotIn(str(approval.id), self._register_ids(after))

        # The withdrawn copy cannot be reissued by opening its PDF route.
        pdf = self.client.get(
            reverse("api_v1:minute-approval-pdf", args=[str(approval.id)])
        )
        self.assertEqual(pdf.status_code, 400, getattr(pdf, "data", None))

        # The archived copy leaves the DMS download routes, but its row stays
        # as evidence and the record still shows it as recalled.
        self.assertFalse(Document.objects.filter(pk=approved_copy.pk).exists())
        withdrawn = Document.all_objects.get(pk=approved_copy.pk)
        self.assertTrue(withdrawn.is_deleted)
        self.assertIn("recalled", withdrawn.tags)
        self.assertTrue(
            CorrespondenceDocumentLink.objects.filter(pk=approved_link.pk).exists()
        )

        detail = self.client.get(
            reverse("api_v1:correspondence-detail", args=[str(correspondence.id)])
        )
        self.assertEqual(detail.status_code, 200, detail.data)
        self.assertEqual(len(detail.data["recalled_documents"]), 1)
        self.assertEqual(
            detail.data["recalled_documents"][0]["id"], str(approved_copy.pk)
        )
        self.assertEqual(
            detail.data["recalled_documents"][0]["title"], approved_copy.title
        )
        self.assertIsNotNone(detail.data["recalled_documents"][0]["recalled_at"])

        # The audit trail names the withdrawn document and says it was withdrawn.
        recall_log = ActivityLog.objects.get(
            action="minute_recalled", metadata__minute_id=str(approval.id)
        )
        self.assertTrue(recall_log.metadata["approved_copy_withdrawn"])
        self.assertEqual(
            recall_log.metadata["approved_copy_document_ids"],
            [str(approved_copy.pk)],
        )

        # Seal verification stops offering the voided copy's hash.
        verification = self.client.get(
            reverse("api_v1:seal_verify", args=[seal.serial_number])
        )
        self.assertEqual(verification.status_code, 200, verification.data)
        self.assertFalse(verification.data["valid"])
        self.assertNotIn("pdf_sha256", verification.data)

        check = self.client.post(
            reverse("api_v1:seal_document_check", args=[seal.serial_number]),
            {
                "file": SimpleUploadedFile(
                    "approved-copy.pdf", b"%PDF-1.4 recalled", content_type="application/pdf"
                )
            },
            format="multipart",
        )
        self.assertEqual(check.status_code, 404, getattr(check, "data", None))

        # Access is decided before the withdrawal is disclosed.
        self.client.force_authenticate(user=self.user_a)
        denied = self.client.get(
            reverse("api_v1:minute-approval-pdf", args=[str(approval.id)])
        )
        self.assertEqual(denied.status_code, 403, getattr(denied, "data", None))

    def test_serializer_refuses_additional_minutes(self):
        serializer = MinuteSerializer(
            data={
                "correspondence": str(self.correspondence.id),
                "user_id": str(self.user_b.id),
                "action_type": "minute",
                "minute_text": "Note on the minute",
                "is_additional": True,
                "minute_type": "instruction",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        minute = serializer.save(
            from_office=self.office_b, dispatched_at=timezone.now()
        )

        self.assertFalse(minute.is_additional)
        self.assertEqual(minute.minute_type, "routing")
