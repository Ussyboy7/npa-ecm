"""The approval record must state only what was recorded, and only up to the approval."""

import io
import re
import uuid

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from pypdf import PdfReader

from audit.models import ActivityLog
from correspondence.models import ApprovalSnapshot, Correspondence, Minute
from correspondence.services.approval_pdf import (
    NOT_RECORDED,
    build_approval_pdf,
    rebuild_approval_record_pdf,
)
from correspondence.services.approval_snapshot import (
    capture_approval_snapshot,
    get_or_create_approval_snapshot,
)
from organization.models import Office, Role

User = get_user_model()


def _pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _flowed(text: str) -> str:
    """Normalise table cells that wrapped across lines."""
    return re.sub(r"\s+", " ", text)


class ApprovalRecordIntegrityTests(TestCase):
    def setUp(self):
        # A permission role is named like a title; it must never be printed as one.
        self.role = Role.objects.create(
            name=f"General Manager ICT {uuid.uuid4().hex[:6]}",
            permissions={},
        )
        self.officer = User.objects.create_user(
            username=f"record-{uuid.uuid4().hex[:8]}",
            password="testpass123",
            first_name="Fola",
            last_name="Adeyinka",
            system_role=self.role,
        )
        self.office = Office.objects.create(
            name="Software Applications & Database Management Department Office",
            code=f"OFC{uuid.uuid4().hex[:8].upper()}",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/REC/{uuid.uuid4().hex[:8].upper()}",
            subject="Approval record integrity",
            sender_name="Test sender",
            created_by=self.officer,
        )
        self.routing_minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.officer,
            minute_text="Routed via document correspondence",
            action_type=Minute.ActionType.MINUTE,
            step_number=1,
            from_office=self.office,
        )
        self.approval = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.officer,
            minute_text="Approved as recommended.",
            action_type=Minute.ActionType.APPROVE,
            approval_level=Minute.ApprovalLevel.DEPARTMENTAL,
            approval_role="approval",
            step_number=2,
            from_office=self.office,
        )

    def _snapshot(self):
        return get_or_create_approval_snapshot(
            minute=self.approval,
            correspondence=self.correspondence,
            seal=None,
        )

    def test_role_name_is_never_recorded_or_printed_as_a_designation(self):
        snapshot = self._snapshot()

        self.assertEqual(snapshot.minutes[0]["designation"], "")
        self.assertEqual(snapshot.signer_designation, "")

        text = _pdf_text(
            build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
                snapshot=snapshot,
            )
        )
        self.assertNotIn(self.role.name, text)
        self.assertIn(NOT_RECORDED, text)

    def test_recorded_designation_is_printed_in_its_own_column(self):
        self.officer.designation = "AGM, SA&DM"
        self.officer.save(update_fields=["designation"])

        snapshot = self._snapshot()
        self.assertEqual(snapshot.minutes[0]["designation"], "AGM, SA&DM")

        text = _pdf_text(
            build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
                snapshot=snapshot,
            )
        )
        self.assertIn("AGM, SA&DM", text)
        self.assertNotIn(NOT_RECORDED, text)

    def test_designation_column_sits_between_by_and_office(self):
        snapshot = self._snapshot()
        text = _pdf_text(
            build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
                snapshot=snapshot,
            )
        )
        self.assertRegex(text, r"By\s+Designation\s+Office")

    def test_minutes_after_the_approval_are_excluded(self):
        Minute.objects.create(
            correspondence=self.correspondence,
            user=self.officer,
            minute_text="Forwarded to registry after approval",
            action_type=Minute.ActionType.FORWARD,
            step_number=3,
        )

        snapshot = self._snapshot()
        self.assertEqual([row["step"] for row in snapshot.minutes], [1, 2])

        text = _pdf_text(
            build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
                snapshot=snapshot,
            )
        )
        self.assertNotIn("Forwarded to registry after approval", text)

    def test_recalled_minutes_are_excluded(self):
        recalled = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.officer,
            minute_text="Withdrawn instruction",
            action_type=Minute.ActionType.MINUTE,
            step_number=2,
        )
        # Place it before the approval so only the recall state can exclude it.
        Minute.objects.filter(pk=recalled.pk).update(
            is_recalled=True,
            recalled_at=timezone.now(),
            timestamp=self.routing_minute.timestamp,
        )

        snapshot = self._snapshot()
        notes = [row["note"] for row in snapshot.minutes]
        self.assertNotIn("Withdrawn instruction", notes)
        self.assertEqual([row["step"] for row in snapshot.minutes], [1, 2])

        text = _pdf_text(
            build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
                snapshot=snapshot,
            )
        )
        self.assertNotIn("Withdrawn instruction", text)

    def test_reissue_keeps_memo_pages_and_applies_the_corrected_record(self):
        snapshot = self._snapshot()
        issued = build_approval_pdf(
            minute=self.approval,
            correspondence=self.correspondence,
            snapshot=snapshot,
        )
        issued_pages = PdfReader(io.BytesIO(issued)).pages
        memo_page = issued_pages[0].extract_text() or ""

        self.officer.designation = "AGM, SA&DM"
        self.officer.save(update_fields=["designation"])
        snapshot.minutes[0]["designation"] = "AGM, SA&DM"

        reissued = rebuild_approval_record_pdf(
            minute=self.approval,
            correspondence=self.correspondence,
            snapshot=snapshot,
            issued_pdf=issued,
        )
        reissued_pages = PdfReader(io.BytesIO(reissued)).pages

        self.assertEqual(len(reissued_pages), len(issued_pages))
        self.assertEqual(reissued_pages[0].extract_text() or "", memo_page)
        self.assertIn("AGM, SA&DM", _pdf_text(reissued))

    def test_correction_command_rewrites_the_office_and_logs_the_reason(self):
        ict_office = Office.objects.create(
            name="Information & Communication Technology Division Office",
            code=f"OFC{uuid.uuid4().hex[:8].upper()}",
        )
        Minute.objects.filter(pk=self.routing_minute.pk).update(from_office=ict_office)

        snapshot = self._snapshot()
        self.assertEqual(snapshot.minutes[0]["office"], ict_office.name)
        capture_approval_snapshot(
            minute=self.approval,
            correspondence=self.correspondence,
            seal=None,
            pdf_bytes=build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
                snapshot=snapshot,
            ),
        )
        self.addCleanup(snapshot.pdf_file.delete, save=False)
        corrected = "Software Applications & Database Management Department Office"

        call_command(
            "correct_approval_record",
            "--reference",
            self.correspondence.reference_number,
            "--office",
            f"Fola Adeyinka={corrected}",
            "--reason",
            "Office restored from the approved memo.",
            "--apply",
        )

        snapshot.refresh_from_db()
        self.assertEqual(snapshot.minutes[0]["office"], corrected)

        entry = ActivityLog.objects.filter(
            object_type="approval_snapshot", object_id=str(snapshot.pk)
        ).latest("timestamp")
        self.assertIn("Office restored from the approved memo.", entry.description)
        self.assertEqual(entry.metadata["changes"][0]["to"], corrected)

    def test_correction_command_records_a_confirmed_designation(self):
        snapshot = self._snapshot()
        capture_approval_snapshot(
            minute=self.approval,
            correspondence=self.correspondence,
            seal=None,
            pdf_bytes=build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
                snapshot=snapshot,
            ),
        )
        self.addCleanup(snapshot.pdf_file.delete, save=False)
        confirmed = "Assistant General Manager SA&DM"

        call_command(
            "correct_approval_record",
            "--reference",
            self.correspondence.reference_number,
            "--designation",
            f"Fola Adeyinka={confirmed}",
            "--reason",
            "Designation confirmed for the officer who acted on the memo.",
            "--apply",
        )

        snapshot.refresh_from_db()
        self.assertEqual(snapshot.minutes[0]["designation"], confirmed)
        with snapshot.pdf_file.open("rb") as handle:
            text = _flowed(_pdf_text(handle.read()))
        self.assertIn(confirmed, text)
        self.assertNotIn(self.role.name, text)

    def test_audit_command_lists_role_names_without_changing_them(self):
        snapshot = self._snapshot()
        legacy_rows = [dict(row) for row in snapshot.minutes]
        legacy_rows[0]["designation"] = self.role.name
        ApprovalSnapshot.objects.filter(pk=snapshot.pk).update(minutes=legacy_rows)

        out = io.StringIO()
        call_command("audit_approval_designations", stdout=out)
        output = out.getvalue()

        self.assertIn(self.correspondence.reference_number, output)
        self.assertIn(self.role.name, output)
        self.assertIn("Nothing was changed", output)

        snapshot.refresh_from_db()
        self.assertEqual(snapshot.minutes[0]["designation"], self.role.name)

    def test_audit_command_ignores_a_title_recorded_on_the_account(self):
        snapshot = self._snapshot()
        legacy_rows = [dict(row) for row in snapshot.minutes]
        legacy_rows[0]["designation"] = self.role.name
        ApprovalSnapshot.objects.filter(pk=snapshot.pk).update(minutes=legacy_rows)
        # A title that matches the role name is a coincidence once the account
        # records it, so it is not reported as the old fallback.
        self.officer.designation = self.role.name
        self.officer.save(update_fields=["designation"])

        out = io.StringIO()
        call_command("audit_approval_designations", stdout=out)
        self.assertIn("No role-name designations", out.getvalue())

    def test_live_render_without_a_snapshot_uses_the_same_record_bounds(self):
        Minute.objects.create(
            correspondence=self.correspondence,
            user=self.officer,
            minute_text="Forwarded to registry after approval",
            action_type=Minute.ActionType.FORWARD,
            step_number=3,
        )

        text = _pdf_text(
            build_approval_pdf(
                minute=self.approval,
                correspondence=self.correspondence,
            )
        )
        self.assertNotIn("Forwarded to registry after approval", text)
        self.assertNotIn(self.role.name, text)
        self.assertIn(NOT_RECORDED, text)
