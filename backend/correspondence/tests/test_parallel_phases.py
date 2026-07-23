"""Tests for parallel routing Phases 3 & 4: office branch_originator + non-response handling."""
import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, Minute, ParallelRoutingGroup
from organization.models import Office, OfficeMembership


class ParallelPhasesTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.md = User.objects.create_superuser(username="md_phase", password="x")
        self.client.force_authenticate(user=self.md)

        # Owning office (MD's office) - md is the principal so route-back resolves.
        self.owner_office = Office.objects.create(name="MD Office", code="MDO")
        OfficeMembership.objects.create(
            user=self.md, office=self.owner_office, is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL, is_primary=True,
        )

        # Two target offices, each with a member + principal.
        self.office_a = Office.objects.create(name="Audit Dept", code="AUD")
        self.member_a = User.objects.create_superuser(username="member_a", password="x")
        OfficeMembership.objects.create(
            user=self.member_a, office=self.office_a, is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )
        self.office_b = Office.objects.create(name="Finance Div", code="FIN")
        self.member_b = User.objects.create_superuser(username="member_b", password="x")
        OfficeMembership.objects.create(
            user=self.member_b, office=self.office_b, is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/PAR/{uuid.uuid4().hex[:8].upper()}",
            subject="Parallel phase test",
            sender_name="Test",
            created_by=self.md,
            owning_office=self.owner_office,
            current_office=self.owner_office,
            status=Correspondence.Status.IN_PROGRESS,
            workflow_state="parallel",
            priority=Correspondence.Priority.MEDIUM,
        )

    def _create_branch(self, office, group_id):
        url = reverse("api_v1:minute-list")
        return self.client.post(
            url,
            {
                "correspondence": str(self.correspondence.id),
                "action_type": "minute",
                "minute_text": f"Branch to {office.name}",
                "to_office_id": str(office.id),
                "parallel_group_id": str(group_id),
                "is_parallel_branch": True,
                "merge_strategy": "all",
                "user_id": str(self.md.id),
            },
            format="json",
        )

    def test_phase3_office_branch_originator_and_deadline(self):
        group_id = uuid.uuid4()
        r1 = self._create_branch(self.office_a, group_id)
        self.assertEqual(r1.status_code, 201, r1.content)
        r2 = self._create_branch(self.office_b, group_id)
        self.assertEqual(r2.status_code, 201, r2.content)

        ma = Minute.objects.get(to_office=self.office_a, parallel_group_id=group_id)
        mb = Minute.objects.get(to_office=self.office_b, parallel_group_id=group_id)

        # Phase 3: office branches get a branch_originator (principal) so independent routing works.
        self.assertIsNotNone(ma.branch_originator)
        self.assertEqual(ma.branch_originator_id, self.member_a.id)
        self.assertIsNotNone(mb.branch_originator)
        # Phase 4: response deadline assigned per top-level branch.
        self.assertIsNotNone(ma.response_deadline)
        self.assertIsNotNone(mb.response_deadline)

    def test_phase4_force_complete_merges_to_md(self):
        group_id = uuid.uuid4()
        self._create_branch(self.office_a, group_id)
        self._create_branch(self.office_b, group_id)

        # Office A member responds (completes branch A).
        self.client.force_authenticate(user=self.member_a)
        url = reverse("api_v1:minute-list")
        resp = self.client.post(
            url,
            {
                "correspondence": str(self.correspondence.id),
                "action_type": "minute",
                "minute_text": "Audit response",
                "user_id": str(self.member_a.id),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)

        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.workflow_state, "parallel")  # B still pending

        # Phase 4: force-complete branch B (as MD / superuser).
        self.client.force_authenticate(user=self.md)
        furl = reverse("api_v1:correspondence-force_complete_branch", args=[self.correspondence.id])
        branch_b = Minute.objects.get(to_office=self.office_b, parallel_group_id=group_id)
        fresp = self.client.post(
            furl, {"minute_id": str(branch_b.id)}, format="json"
        )
        self.assertEqual(fresp.status_code, 200, fresp.content)

        group = ParallelRoutingGroup.objects.get(id=group_id)
        self.assertTrue(group.is_complete)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.workflow_state, "merged")
        self.assertEqual(self.correspondence.current_office_id, self.owner_office.id)

    def test_phase4_remind_branch_notifies_members(self):
        from notifications.models import Notification

        group_id = uuid.uuid4()
        self._create_branch(self.office_a, group_id)

        url = reverse("api_v1:correspondence-remind_branch", args=[self.correspondence.id])
        branch_a = Minute.objects.get(to_office=self.office_a, parallel_group_id=group_id)
        resp = self.client.post(
            url,
            {"minute_id": str(branch_a.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIn(str(self.member_a.id), resp.json().get("notified_user_ids", []))
        self.assertTrue(
            Notification.objects.filter(recipient=self.member_a).exists()
        )
