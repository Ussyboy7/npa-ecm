"""A delegation grants only what the assistant assignment says it grants.

The assistant's role permissions decide what they may do anywhere; the
assignment decides what they may do *for this principal on this record*.
"""

import uuid

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, CorrespondenceDelegation, Delegation, Minute
from organization.models import Department, Directorate, Division, Office, OfficeMembership, Role
from datetime import timedelta


class DelegationPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.directorate = Directorate.objects.create(
            name=f"Ops {uuid.uuid4().hex[:6]}", code=f"OPS-{uuid.uuid4().hex[:6]}"
        )
        self.division = Division.objects.create(
            name=f"Admin {uuid.uuid4().hex[:6]}",
            code=f"ADM-{uuid.uuid4().hex[:6]}",
            directorate=self.directorate,
        )
        self.department = Department.objects.create(
            name=f"Registry {uuid.uuid4().hex[:6]}",
            code=f"REG-{uuid.uuid4().hex[:6]}",
            division=self.division,
        )
        self.office = Office.objects.create(
            name=f"Registry Office {uuid.uuid4().hex[:6]}",
            code=f"REG-O-{uuid.uuid4().hex[:6]}",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.other_office = Office.objects.create(
            name=f"Legal Office {uuid.uuid4().hex[:6]}",
            code=f"LEG-O-{uuid.uuid4().hex[:6]}",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

        # The assistant sits in another directorate, so nothing but the
        # delegation can open the record for them.
        self.outside_directorate = Directorate.objects.create(
            name=f"Marine {uuid.uuid4().hex[:6]}", code=f"MAR-{uuid.uuid4().hex[:6]}"
        )
        self.outside_division = Division.objects.create(
            name=f"Marine Ops {uuid.uuid4().hex[:6]}",
            code=f"MAR-OPS-{uuid.uuid4().hex[:6]}",
            directorate=self.outside_directorate,
        )
        self.outside_department = Department.objects.create(
            name=f"Marine Registry {uuid.uuid4().hex[:6]}",
            code=f"MAR-REG-{uuid.uuid4().hex[:6]}",
            division=self.outside_division,
        )

        self.principal_role = Role.objects.create(
            name=f"DelegationPrincipal {uuid.uuid4().hex[:6]}",
            permissions={
                "can_minute_correspondence": True,
                "can_treat_correspondence": True,
                "can_view_all_correspondence": True,
            },
        )
        # Staff role: no org-wide visibility, so only a delegation can open the
        # record for the assistant. can_approve is present so approval failures
        # can only come from the delegation gate being tested.
        self.staff_role = Role.objects.create(
            name=f"DelegationStaff {uuid.uuid4().hex[:6]}",
            permissions={
                "can_minute_correspondence": True,
                "can_treat_correspondence": True,
                "can_approve": True,
            },
        )

        self.principal = User.objects.create_user(
            username=f"perm_principal_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="MSS1",
            system_role=self.principal_role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.assistant = User.objects.create_user(
            username=f"perm_assistant_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="SSS1",
            system_role=self.staff_role,
            directorate=self.outside_directorate,
            division=self.outside_division,
            department=self.outside_department,
        )
        self.outsider = User.objects.create_user(
            username=f"perm_outsider_{uuid.uuid4().hex[:6]}",
            password="x",
            grade_level="SSS1",
            system_role=self.staff_role,
            directorate=self.outside_directorate,
            division=self.outside_division,
            department=self.outside_department,
        )
        OfficeMembership.objects.create(
            user=self.principal,
            office=self.office,
            assignment_role="principal",
            is_primary=True,
            is_active=True,
            can_approve=True,
        )

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/PERM/{uuid.uuid4().hex[:8].upper()}",
            subject="Delegation permissions",
            sender_name="Test sender",
            created_by=self.principal,
            owning_office=self.office,
            current_office=self.office,
            current_approver=self.principal,
            status=Correspondence.Status.IN_PROGRESS,
            priority=Correspondence.Priority.MEDIUM,
            division=self.division,
            department=self.department,
        )

    def _assign(self, assistant=None, assistant_type="TA", **flags):
        permissions = {
            "can_view": flags.pop("can_view", True),
            "can_forward": flags.pop("can_forward", True),
            "can_respond": flags.pop("can_respond", False),
            "can_minute": flags.pop("can_minute", False),
            "can_approve": flags.pop("can_approve", False),
        }
        return Delegation.objects.create(
            principal=self.principal,
            assistant=assistant or self.assistant,
            assistant_type=assistant_type,
            active=True,
            **permissions,
        )

    def _delegate(self, assignment=None, assistant=None, expires_in=timedelta(hours=1)):
        return CorrespondenceDelegation.objects.create(
            correspondence=self.correspondence,
            principal=self.principal,
            assistant=assistant or self.assistant,
            delegation=assignment,
            status=CorrespondenceDelegation.Status.ACTIVE,
            expires_at=timezone.now() + expires_in,
        )

    def _post_minute(self, action_type="minute", text="Delegated action", to_office=None):
        self.client.force_authenticate(user=self.assistant)
        return self.client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(self.correspondence.id),
                "user_id": str(self.assistant.id),
                "action_type": action_type,
                "minute_text": text,
                "to_office_id": str((to_office or self.other_office).id),
            },
            format="json",
        )

    def test_a_technical_assistant_cannot_minute_a_record_they_may_only_forward(self):
        assignment = self._assign(assistant_type="TA", can_minute=False, can_forward=True)
        self._delegate(assignment)

        response = self._post_minute(action_type="minute")

        self.assertEqual(response.status_code, 403, response.data)
        self.assertEqual(response.data["details"].get("reason"), "delegation_permission_denied")
        self.assertEqual(response.data["details"].get("permission"), "minute")
        self.assertFalse(
            Minute.objects.filter(
                correspondence=self.correspondence, minute_text="Delegated action"
            ).exists()
        )

    def test_a_technical_assistant_may_still_forward(self):
        assignment = self._assign(assistant_type="TA", can_minute=False, can_forward=True)
        self._delegate(assignment)

        response = self._post_minute(action_type="forward", text="Forwarded under delegation")

        self.assertEqual(response.status_code, 201, response.data)
        minute = Minute.objects.get(
            correspondence=self.correspondence, minute_text="Forwarded under delegation"
        )
        self.assertEqual(minute.user_id, self.principal.id)
        self.assertEqual(minute.performed_by_id, self.assistant.id)

    def test_a_personal_assistant_with_the_minute_grant_can_minute(self):
        assignment = self._assign(assistant_type="PA", can_minute=True, can_respond=True)
        self._delegate(assignment)

        response = self._post_minute(action_type="minute")

        self.assertEqual(response.status_code, 201, response.data)
        minute = Minute.objects.get(
            correspondence=self.correspondence, minute_text="Delegated action"
        )
        self.assertEqual(minute.user_id, self.principal.id)

    def test_a_delegation_without_the_view_grant_does_not_open_the_record(self):
        assignment = self._assign(can_view=False)
        self._delegate(assignment)

        self.client.force_authenticate(user=self.assistant)
        detail = self.client.get(
            reverse("api_v1:correspondence-detail", args=[self.correspondence.id])
        )
        listed = self.client.get(reverse("api_v1:correspondence-delegation-my-delegated-items"))

        self.assertEqual(detail.status_code, 404)
        self.assertEqual(listed.status_code, 200, listed.data)
        self.assertEqual(len(listed.data), 0)

    def test_a_delegation_to_someone_without_an_assignment_is_rejected(self):
        self.client.force_authenticate(user=self.principal)
        response = self.client.post(
            reverse("api_v1:correspondence-delegation-list"),
            {
                "correspondence_id": str(self.correspondence.id),
                "principal_id": str(self.principal.id),
                "assistant_id": str(self.outsider.id),
                "assistant_type": "PA",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("assistant", response.data["details"])
        self.assertFalse(
            CorrespondenceDelegation.objects.filter(
                correspondence=self.correspondence, assistant=self.outsider
            ).exists()
        )

    def test_an_unrelated_user_cannot_list_the_assignment_pairs(self):
        self._assign()

        self.client.force_authenticate(user=self.outsider)
        response = self.client.get(reverse("api_v1:delegation-list"))

        self.assertEqual(response.status_code, 200, response.data)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 0)

    def test_an_assistant_cannot_widen_their_own_assignment(self):
        assignment = self._assign(can_minute=False)

        self.client.force_authenticate(user=self.assistant)
        response = self.client.patch(
            reverse("api_v1:delegation-detail", args=[assignment.id]),
            {"can_approve": True, "can_minute": True},
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)
        assignment.refresh_from_db()
        self.assertFalse(assignment.can_approve)
        self.assertFalse(assignment.can_minute)

    def test_an_assistant_cannot_extend_their_own_delegation_expiry(self):
        delegation = self._delegate(self._assign(can_minute=True))
        original_expiry = delegation.expires_at

        self.client.force_authenticate(user=self.assistant)
        response = self.client.patch(
            reverse("api_v1:correspondence-delegation-detail", args=[delegation.id]),
            {"expires_at": (timezone.now() + timedelta(days=30)).isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)
        delegation.refresh_from_db()
        self.assertEqual(delegation.expires_at, original_expiry)

    def test_a_delegate_outside_the_org_unit_can_endorse_because_the_delegation_puts_it_in_reach(self):
        """The reach gate accepts the delegate instead of refusing them as out of scope."""
        self.correspondence.required_approval_level = (
            Correspondence.RequiredApprovalLevel.EXECUTIVE
        )
        self.correspondence.save(update_fields=["required_approval_level"])
        assignment = self._assign(
            assistant_type="PA",
            can_view=True,
            can_minute=True,
            can_respond=True,
            can_approve=True,
        )
        self._delegate(assignment)

        self.client.force_authenticate(user=self.assistant)
        response = self.client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(self.correspondence.id),
                "user_id": str(self.assistant.id),
                "action_type": "approve",
                "minute_text": "Endorsed on behalf of the principal",
                "to_office_id": str(self.other_office.id),
            },
            format="json",
        )

        # A non-MD delegate may record an endorsement; org scope must not be
        # the reason they are refused.
        self.assertEqual(response.status_code, 201, response.data)
        minute = Minute.objects.get(
            correspondence=self.correspondence,
            minute_text="Endorsed on behalf of the principal",
        )
        self.assertEqual(minute.approval_level, Minute.ApprovalLevel.DEPARTMENTAL)
        self.assertEqual(minute.approval_role, Minute.ApprovalRole.ENDORSEMENT)
