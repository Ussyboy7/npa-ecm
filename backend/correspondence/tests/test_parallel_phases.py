"""Tests for parallel routing Phases 3 & 4: office branch_originator + non-response handling."""
import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, Minute, ParallelRoutingGroup
from organization.models import Office, OfficeMembership, Role


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
        self.member_a = User.objects.create_user(username="member_a", password="x")
        minute_role, _ = Role.objects.get_or_create(
            name="ParallelTestMinute",
            defaults={"permissions": {"can_minute_correspondence": True}},
        )
        minute_role.permissions = {"can_minute_correspondence": True}
        minute_role.save(update_fields=["permissions"])
        self.member_a.system_role = minute_role
        self.member_a.save(update_fields=["system_role"])
        OfficeMembership.objects.create(
            user=self.member_a, office=self.office_a, is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL, is_primary=True,
        )
        self.office_b = Office.objects.create(name="Finance Div", code="FIN")
        self.member_b = User.objects.create_user(username="member_b", password="x")
        self.member_b.system_role = minute_role
        self.member_b.save(update_fields=["system_role"])
        OfficeMembership.objects.create(
            user=self.member_b, office=self.office_b, is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL, is_primary=True,
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

    def test_parallel_route_accepts_office_only_recipients(self):
        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        url = reverse("api_v1:minute-parallel-route")

        response = self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "merge_strategy": "all",
                "recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "Review finance impact."},
                    {"office_id": str(self.office_b.id), "purpose": "action", "minute_text": "Review operational impact."},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Minute.objects.filter(parallel_group_id=response.data["parallel_group_id"]).count(), 2)
        self.assertTrue(Minute.objects.filter(to_office=self.office_a, to_user__isnull=True).exists())
        self.assertTrue(Minute.objects.filter(to_office=self.office_b, to_user__isnull=True).exists())

    def test_parallel_route_mixed_users_and_offices(self):
        person = User.objects.create_superuser(username="jane_parallel", password="x")
        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        url = reverse("api_v1:minute-parallel-route")
        response = self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "merge_strategy": "all",
                "recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "Finance review."},
                    {"user_id": str(person.id), "purpose": "approval", "minute_text": "Jane approval."},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        group_id = response.data["parallel_group_id"]
        self.assertTrue(Minute.objects.filter(parallel_group_id=group_id, to_office=self.office_a).exists())
        self.assertTrue(Minute.objects.filter(parallel_group_id=group_id, to_user=person).exists())

    def test_parallel_route_rejects_duplicate_targets(self):
        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        url = reverse("api_v1:minute-parallel-route")
        response = self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "One."},
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "Duplicate."},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_parallel_route_defaults_merge_strategy_all(self):
        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        url = reverse("api_v1:minute-parallel-route")
        response = self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "A."},
                    {"office_id": str(self.office_b.id), "purpose": "action", "minute_text": "B."},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        group = ParallelRoutingGroup.objects.get(id=response.data["parallel_group_id"])
        self.assertEqual(group.merge_strategy, "all")

    def test_parallel_route_sets_response_deadline(self):
        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        url = reverse("api_v1:minute-parallel-route")
        response = self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "merge_strategy": "all",
                "recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "Review."},
                    {"office_id": str(self.office_b.id), "purpose": "action", "minute_text": "Review."},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        for branch in Minute.objects.filter(parallel_group_id=response.data["parallel_group_id"]):
            self.assertIsNotNone(branch.response_deadline)

    def test_parallel_route_parent_minute_id(self):
        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        fork = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.md,
            minute_text="Fork instruction",
            action_type=Minute.ActionType.MINUTE,
        )
        url = reverse("api_v1:minute-parallel-route")
        response = self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "parent_minute_id": str(fork.id),
                "recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "A."},
                    {"office_id": str(self.office_b.id), "purpose": "action", "minute_text": "B."},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            Minute.objects.filter(
                parallel_group_id=response.data["parallel_group_id"],
                parent_minute_id=fork.id,
            ).count(),
            2,
        )

    def test_branch_visibility_hides_sibling_from_recipient(self):
        from correspondence.services import ParallelBranchService

        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        url = reverse("api_v1:minute-parallel-route")
        response = self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "Branch A."},
                    {"office_id": str(self.office_b.id), "purpose": "action", "minute_text": "Branch B."},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        all_minutes = Minute.objects.filter(correspondence=self.correspondence)
        branch_b = all_minutes.get(to_office=self.office_b, is_parallel_branch=True)

        visible_to_a = ParallelBranchService.filter_minutes_for_viewer(
            all_minutes, self.correspondence, self.member_a
        )
        self.assertFalse(visible_to_a.filter(id=branch_b.id).exists())
        visible_to_md = ParallelBranchService.filter_minutes_for_viewer(
            all_minutes, self.correspondence, self.md
        )
        self.assertTrue(visible_to_md.filter(id=branch_b.id).exists())

    def test_related_responses_on_parent_correspondence(self):
        child = Correspondence.objects.create(
            reference_number=f"NPA/RES/{uuid.uuid4().hex[:8].upper()}",
            subject="Formal response",
            sender_name="Test",
            created_by=self.md,
            parent_correspondence=self.correspondence,
            owning_office=self.owner_office,
            status=Correspondence.Status.IN_PROGRESS,
            priority=Correspondence.Priority.MEDIUM,
        )
        detail_url = reverse("api_v1:correspondence-detail", args=[self.correspondence.id])
        resp = self.client.get(detail_url)
        self.assertEqual(resp.status_code, 200, resp.content)
        related = resp.data.get("related_responses") or []
        self.assertTrue(any(r["id"] == str(child.id) for r in related))

    def _parallel_route(self, merge_strategy="all", offices=None):
        self.md.grade_level = "MDCS"
        self.md.save(update_fields=["grade_level"])
        offices = offices or [self.office_a, self.office_b]
        url = reverse("api_v1:minute-parallel-route")
        recipients = [
            {"office_id": str(o.id), "purpose": "action", "minute_text": f"Branch {o.code}."}
            for o in offices
        ]
        return self.client.post(
            url,
            {
                "correspondence_id": str(self.correspondence.id),
                "merge_strategy": merge_strategy,
                "recipients": recipients,
            },
            format="json",
        )

    def _respond_as_branch_member(self, user):
        self.client.force_authenticate(user=user)
        return self.client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(self.correspondence.id),
                "action_type": "minute",
                "minute_text": "Branch response",
                "user_id": str(user.id),
            },
            format="json",
        )

    def test_merge_strategy_any_completes_on_first_response(self):
        response = self._parallel_route(merge_strategy="any")
        self.assertEqual(response.status_code, 201, response.content)
        group_id = response.data["parallel_group_id"]

        resp = self._respond_as_branch_member(self.member_a)
        self.assertEqual(resp.status_code, 201, resp.content)

        group = ParallelRoutingGroup.objects.get(id=group_id)
        self.assertTrue(group.is_complete)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.workflow_state, "merged")

    def test_merge_strategy_majority_requires_two_of_three(self):
        office_c = Office.objects.create(name="Legal Div", code="LEG")
        member_c = User.objects.create_user(username="member_c", password="x")
        member_c.system_role = self.member_a.system_role
        member_c.save(update_fields=["system_role"])
        OfficeMembership.objects.create(
            user=member_c, office=office_c, is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )

        response = self._parallel_route(
            merge_strategy="majority",
            offices=[self.office_a, self.office_b, office_c],
        )
        self.assertEqual(response.status_code, 201, response.content)
        group_id = response.data["parallel_group_id"]

        self._respond_as_branch_member(self.member_a)
        group = ParallelRoutingGroup.objects.get(id=group_id)
        self.assertFalse(group.is_complete)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.workflow_state, "parallel")

        self._respond_as_branch_member(self.member_b)
        group.refresh_from_db()
        self.assertTrue(group.is_complete)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.workflow_state, "merged")

    def test_independent_branch_does_not_auto_merge_group(self):
        staff_a = User.objects.create_user(username="staff_a", password="x")
        staff_a.system_role = self.member_a.system_role
        staff_a.save(update_fields=["system_role"])
        OfficeMembership.objects.create(
            user=staff_a,
            office=self.office_a,
            is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )

        response = self._parallel_route(merge_strategy="independent")
        self.assertEqual(response.status_code, 201, response.content)
        group_id = response.data["parallel_group_id"]

        resp = self._respond_as_branch_member(staff_a)
        self.assertEqual(resp.status_code, 201, resp.content)

        group = ParallelRoutingGroup.objects.get(id=group_id)
        self.assertFalse(group.is_complete)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.workflow_state, "parallel")

    def test_formal_response_create_sets_parent_and_related_responses(self):
        parent = self.correspondence
        create_url = reverse("api_v1:correspondence-list")
        resp = self.client.post(
            create_url,
            {
                "subject": "Formal response memo",
                "body_html": "<p>Our response</p>",
                "source": "internal",
                "parent_correspondence_id": str(parent.id),
                "owning_office": str(self.owner_office.id),
                "status": "pending",
                "priority": "medium",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        child_id = resp.data["id"]

        detail_url = reverse("api_v1:correspondence-detail", args=[parent.id])
        detail = self.client.get(detail_url)
        self.assertEqual(detail.status_code, 200, detail.content)
        related = detail.data.get("related_responses") or []
        self.assertTrue(any(r["id"] == child_id for r in related))

        child = Correspondence.objects.get(id=child_id)
        self.assertEqual(child.parent_correspondence_id, parent.id)

    def test_refer_parallel_creates_branches(self):
        from correspondence.models import Case

        audit_office = Office.objects.create(name="GM Audit Office", code="OFF_AUDIT_PAR")
        OfficeMembership.objects.create(
            user=self.md, office=audit_office, is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL, is_primary=True,
        )
        case = Case.objects.create(
            case_type=Case.CaseType.AUDIT,
            title="AQ-PARALLEL-TEST",
            case_number=f"AQ-PAR-{uuid.uuid4().hex[:6].upper()}",
            owning_office=audit_office,
            created_by=self.md,
            metadata={"audit_state": "CERTIFIED"},
        )
        url = f"/api/v1/correspondence/cases/{case.id}/actions/"
        resp = self.client.post(
            url,
            {
                "action": "REFER",
                "subject": "Parallel audit refer",
                "body_html": "<p>Please respond in parallel</p>",
                "parallel_recipients": [
                    {"office_id": str(self.office_a.id), "purpose": "action", "minute_text": "Audit branch A."},
                    {"office_id": str(self.office_b.id), "purpose": "action", "minute_text": "Audit branch B."},
                ],
                "merge_strategy": "all",
                "action_required": True,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        corr_id = resp.data.get("correspondence_id") or resp.json().get("refer_correspondence_id")
        if not corr_id:
            corr_id = (case.metadata or {}).get("refer_correspondence_id")
        self.assertIsNotNone(corr_id, resp.data)
        corr = Correspondence.objects.get(id=corr_id)
        self.assertEqual(corr.workflow_state, "parallel")
        self.assertEqual(
            Minute.objects.filter(correspondence=corr, is_parallel_branch=True).count(),
            2,
        )
