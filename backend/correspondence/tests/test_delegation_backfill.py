"""Legacy delegation rows are linked to assignments without widening or breaking them."""

import uuid
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from correspondence.models import Correspondence, CorrespondenceDelegation, Delegation


class DelegationBackfillTests(TestCase):
    def setUp(self):
        self.principal = User.objects.create_user(
            username=f"backfill_principal_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="MSS1",
        )
        self.assigned = User.objects.create_user(
            username=f"backfill_assigned_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="SSS1",
        )
        self.stranger = User.objects.create_user(
            username=f"backfill_stranger_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="SSS1",
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/BF/{uuid.uuid4().hex[:8].upper()}",
            subject="Backfill",
            sender_name="Sender",
            created_by=self.principal,
            current_approver=self.principal,
            status=Correspondence.Status.IN_PROGRESS,
        )
        self.assignment = Delegation.objects.create(
            principal=self.principal,
            assistant=self.assigned,
            assistant_type="PA",
            active=True,
            can_minute=True,
        )
        # The shape every pre-0077 delegation has: no assignment link.
        self.legacy = CorrespondenceDelegation.objects.create(
            correspondence=self.correspondence,
            principal=self.principal,
            assistant=self.assigned,
            status=CorrespondenceDelegation.Status.ACTIVE,
            expires_at=timezone.now() + timedelta(hours=1),
        )
        # Only one active delegation per record and principal is allowed, so
        # the unlinkable row lives on a second record.
        self.other_correspondence = Correspondence.objects.create(
            reference_number=f"NPA/BF/{uuid.uuid4().hex[:8].upper()}",
            subject="Backfill orphan",
            sender_name="Sender",
            created_by=self.principal,
            current_approver=self.principal,
            status=Correspondence.Status.IN_PROGRESS,
        )
        self.orphan = CorrespondenceDelegation.objects.create(
            correspondence=self.other_correspondence,
            principal=self.principal,
            assistant=self.stranger,
            status=CorrespondenceDelegation.Status.ACTIVE,
        )

    def _run(self, *args):
        out = StringIO()
        call_command("link_delegation_assignments", *args, stdout=out, stderr=StringIO())
        return out.getvalue()

    def test_audit_without_apply_reports_and_writes_nothing(self):
        output = self._run()

        self.assertIn("would link: 1", output)
        self.assertIn("unmatched: 1", output)
        self.legacy.refresh_from_db()
        self.orphan.refresh_from_db()
        self.assertIsNone(self.legacy.delegation_id)
        self.assertEqual(self.orphan.status, CorrespondenceDelegation.Status.ACTIVE)

    def test_apply_links_the_match_and_leaves_the_unmatched_row_alone(self):
        self._run("--apply")

        self.legacy.refresh_from_db()
        self.orphan.refresh_from_db()
        self.assertEqual(self.legacy.delegation_id, self.assignment.id)
        self.assertIsNone(self.orphan.delegation_id)
        self.assertEqual(self.orphan.status, CorrespondenceDelegation.Status.ACTIVE)

    def test_revoke_unmatched_withdraws_only_the_orphan(self):
        self._run("--apply", "--revoke-unmatched")

        self.legacy.refresh_from_db()
        self.orphan.refresh_from_db()
        self.assertEqual(self.legacy.delegation_id, self.assignment.id)
        self.assertEqual(self.legacy.status, CorrespondenceDelegation.Status.ACTIVE)
        self.assertEqual(self.orphan.status, CorrespondenceDelegation.Status.REVOKED)
        self.assertIsNotNone(self.orphan.revoked_at)

    def test_revoke_unmatched_cannot_run_as_an_audit(self):
        with self.assertRaises(CommandError):
            self._run("--revoke-unmatched")
