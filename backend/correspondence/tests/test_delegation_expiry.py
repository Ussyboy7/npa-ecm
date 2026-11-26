"""Delegation authority is time-bounded, and it is what opens the record."""

import uuid
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, CorrespondenceDelegation, Minute
from organization.models import Department, Directorate, Division, Office, OfficeMembership, Role


class DelegationExpiryTests(TestCase):
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

        # A separate directorate for an assistant who is outside the record's
        # org unit, so visibility has to come from the delegation itself.
        self.outside_directorate = Directorate.objects.create(
            name=f"Marine {uuid.uuid4().hex[:6]}",
            code=f"MAR-{uuid.uuid4().hex[:6]}",
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

        role, _ = Role.objects.get_or_create(
            name="DelegationExpiry",
            defaults={
                "permissions": {
                    "can_minute_correspondence": True,
                    "can_view_all_correspondence": True,
                }
            },
        )
        role.permissions = {
            "can_minute_correspondence": True,
            "can_view_all_correspondence": True,
        }
        role.save(update_fields=["permissions"])

        self.principal = User.objects.create_user(
            username="del_principal",
            password="x",
            grade_level="MSS1",
            system_role=role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.assistant = User.objects.create_user(
            username="del_assistant",
            password="x",
            grade_level="SSS1",
            system_role=role,
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

        # Staff in another directorate: no boundary overlap with the record, and
        # no org-wide visibility permission, so only a delegation can open it.
        staff_role, _ = Role.objects.get_or_create(
            name="DelegationStaff",
            defaults={"permissions": {"can_minute_correspondence": True}},
        )
        staff_role.permissions = {"can_minute_correspondence": True}
        staff_role.save(update_fields=["permissions"])
        self.outsider = User.objects.create_user(
            username="del_outsider",
            password="x",
            grade_level="SSS1",
            system_role=staff_role,
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
            reference_number=f"NPA/DEL/{uuid.uuid4().hex[:8].upper()}",
            subject="Delegation expiry",
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

    def _delegate(self, *, expires_at, assistant=None):
        return CorrespondenceDelegation.objects.create(
            correspondence=self.correspondence,
            principal=self.principal,
            assistant=assistant or self.assistant,
            status=CorrespondenceDelegation.Status.ACTIVE,
            expires_at=expires_at,
        )

    def _open_record_as(self, user):
        self.client.force_authenticate(user=user)
        return self.client.get(
            reverse("api_v1:correspondence-detail", args=[self.correspondence.id])
        )

    def _post_minute_as_assistant(self, text):
        self.client.force_authenticate(user=self.assistant)
        return self.client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(self.correspondence.id),
                "user_id": str(self.assistant.id),
                "action_type": "minute",
                "minute_text": text,
                "to_office_id": str(self.other_office.id),
            },
            format="json",
        )

    def test_expired_delegation_no_longer_records_a_minute_on_behalf_of_the_principal(self):
        self._delegate(expires_at=timezone.now() - timedelta(minutes=1))

        response = self._post_minute_as_assistant("Filed while expired")

        self.assertEqual(response.status_code, 201, response.data)
        minute = Minute.objects.get(correspondence=self.correspondence, minute_text="Filed while expired")
        self.assertEqual(minute.user_id, self.assistant.id)
        self.assertFalse(minute.acted_by_assistant)

    def test_live_delegation_still_records_the_minute_on_behalf_of_the_principal(self):
        self._delegate(expires_at=timezone.now() + timedelta(hours=1))

        response = self._post_minute_as_assistant("Filed under delegation")

        self.assertEqual(response.status_code, 201, response.data)
        minute = Minute.objects.get(
            correspondence=self.correspondence, minute_text="Filed under delegation"
        )
        self.assertEqual(minute.user_id, self.principal.id)
        self.assertEqual(minute.performed_by_id, self.assistant.id)
        self.assertTrue(minute.acted_by_assistant)

    def test_expired_delegation_cannot_complete_the_correspondence(self):
        Minute.objects.create(
            correspondence=self.correspondence,
            user=self.principal,
            action_type=Minute.ActionType.MINUTE,
            minute_text="Dispatch",
            direction=self.correspondence.direction,
            step_number=1,
            from_office=self.office,
            acknowledged_at=timezone.now(),
        )
        self._delegate(expires_at=timezone.now() - timedelta(minutes=1))

        self.client.force_authenticate(user=self.assistant)
        response = self.client.post(
            reverse("api_v1:correspondence-complete-correspondence", args=[self.correspondence.id]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)
        # The API's error handler normalises payloads into message + details.
        self.assertIn("expired", response.data["message"].lower())
        self.assertEqual(response.data["details"].get("reason"), "delegation_expired")

    def test_live_delegation_can_complete_the_correspondence(self):
        Minute.objects.create(
            correspondence=self.correspondence,
            user=self.principal,
            action_type=Minute.ActionType.MINUTE,
            minute_text="Dispatch",
            direction=self.correspondence.direction,
            step_number=1,
            from_office=self.office,
            acknowledged_at=timezone.now(),
        )
        self._delegate(expires_at=timezone.now() + timedelta(hours=1))

        self.client.force_authenticate(user=self.assistant)
        response = self.client.post(
            reverse("api_v1:correspondence-complete-correspondence", args=[self.correspondence.id]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.correspondence.refresh_from_db()
        self.assertEqual(self.correspondence.status, Correspondence.Status.COMPLETED)

    def test_expired_delegation_is_not_listed_for_the_delegate(self):
        self._delegate(expires_at=timezone.now() - timedelta(minutes=1))

        self.client.force_authenticate(user=self.assistant)
        response = self.client.get(reverse("api_v1:correspondence-delegation-my-delegated-items"))

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 0)

    def test_expired_delegation_is_not_returned_as_an_active_delegation(self):
        self._delegate(expires_at=timezone.now() - timedelta(minutes=1))

        self.client.force_authenticate(user=self.assistant)
        response = self.client.get(
            reverse("api_v1:correspondence-delegation-list"),
            {"correspondence": str(self.correspondence.id), "status": "active"},
        )

        self.assertEqual(response.status_code, 200, response.data)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 0)

    def test_live_delegation_lets_an_outside_assistant_open_the_record(self):
        self._delegate(
            expires_at=timezone.now() + timedelta(hours=1), assistant=self.outsider
        )

        response = self._open_record_as(self.outsider)

        # The notification link must open the record for the delegate, even
        # though they sit outside its org unit.
        self.assertEqual(response.status_code, 200, response.data)

    def test_expired_delegation_does_not_open_the_record(self):
        self._delegate(
            expires_at=timezone.now() - timedelta(minutes=1), assistant=self.outsider
        )

        response = self._open_record_as(self.outsider)

        self.assertEqual(response.status_code, 404)

    def test_staff_outside_the_record_cannot_open_it_without_a_delegation(self):
        response = self._open_record_as(self.outsider)

        self.assertEqual(response.status_code, 404)
