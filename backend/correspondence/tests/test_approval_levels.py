import uuid

from django.test import TestCase

from accounts.models import User
from correspondence.models import Correspondence, Minute
from correspondence.services import MinuteRouterService


class ApprovalLevelResolutionTests(TestCase):
    def setUp(self):
        self.md = User.objects.create_user(
            username="md-levels",
            password="testpass123",
            grade_level="MDCS",
        )
        self.gm = User.objects.create_user(
            username="gm-levels",
            password="testpass123",
            grade_level="MSS1",
        )

    def _correspondence(self, required_level):
        return Correspondence.objects.create(
            reference_number=f"NPA/LEVELS/{uuid.uuid4().hex[:8].upper()}",
            subject="Approval level resolution",
            required_approval_level=required_level,
        )

    def test_md_approval_is_executive_for_departmental_requirement(self):
        correspondence = self._correspondence(
            Correspondence.RequiredApprovalLevel.DEPARTMENTAL
        )

        level, role = MinuteRouterService.resolve_approval_levels(
            self.md, correspondence
        )

        self.assertEqual(level, Minute.ApprovalLevel.EXECUTIVE)
        self.assertEqual(role, Minute.ApprovalRole.APPROVAL)

    def test_md_approval_is_executive_for_executive_requirement(self):
        correspondence = self._correspondence(
            Correspondence.RequiredApprovalLevel.EXECUTIVE
        )

        level, role = MinuteRouterService.resolve_approval_levels(
            self.md, correspondence
        )

        self.assertEqual(level, Minute.ApprovalLevel.EXECUTIVE)
        self.assertEqual(role, Minute.ApprovalRole.APPROVAL)

    def test_gm_departmental_approval_stays_departmental(self):
        correspondence = self._correspondence(
            Correspondence.RequiredApprovalLevel.DEPARTMENTAL
        )

        level, role = MinuteRouterService.resolve_approval_levels(
            self.gm, correspondence
        )

        self.assertEqual(level, Minute.ApprovalLevel.DEPARTMENTAL)
        self.assertEqual(role, Minute.ApprovalRole.APPROVAL)

    def test_non_md_on_executive_track_is_departmental_endorsement(self):
        correspondence = self._correspondence(
            Correspondence.RequiredApprovalLevel.EXECUTIVE
        )

        level, role = MinuteRouterService.resolve_approval_levels(
            self.gm, correspondence
        )

        self.assertEqual(level, Minute.ApprovalLevel.DEPARTMENTAL)
        self.assertEqual(role, Minute.ApprovalRole.ENDORSEMENT)
