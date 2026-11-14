"""Initial action access for an unassigned inward record at its receiving office."""

import uuid
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory

from accounts.models import User
from correspondence.models import Correspondence
from correspondence.serializers import CorrespondenceSerializer
from organization.models import ActingAppointment, Office, OfficeMembership, Role


class InitialOfficeTurnTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role, _ = Role.objects.get_or_create(
            name="InitialTurnTestRole",
            defaults={"permissions": {"can_minute_correspondence": True, "can_treat_correspondence": True}},
        )
        self.role.permissions = {
            "can_minute_correspondence": True,
            "can_treat_correspondence": True,
        }
        self.role.save(update_fields=["permissions"])

        self.receiving_office = Office.objects.create(name="Receiving Office Initial", code="REC-INIT")
        self.other_office = Office.objects.create(name="Other Office Initial", code="OTH-INIT")
        self.empty_office = Office.objects.create(name="No Principal Initial", code="EMPTY-INIT")

        self.principal = User.objects.create_user(
            username="initial_principal",
            password="x",
            grade_level="MSS2",
            system_role=self.role,
        )
        OfficeMembership.objects.create(
            user=self.principal,
            office=self.receiving_office,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
            is_active=True,
        )

        self.acting = User.objects.create_user(
            username="initial_acting",
            password="x",
            grade_level="MSS3",
            system_role=self.role,
        )
        OfficeMembership.objects.create(
            user=self.acting,
            office=self.receiving_office,
            assignment_role=OfficeMembership.AssignmentRole.ACTING,
            is_active=True,
        )

        self.staff = User.objects.create_user(
            username="initial_staff",
            password="x",
            grade_level="SSS1",
            system_role=self.role,
        )
        OfficeMembership.objects.create(
            user=self.staff,
            office=self.receiving_office,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
            is_active=True,
        )

        self.creator = User.objects.create_user(
            username="initial_creator",
            password="x",
            grade_level="MDCS",
            system_role=self.role,
        )
        OfficeMembership.objects.create(
            user=self.creator,
            office=self.other_office,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
            is_active=True,
        )

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/INIT/{uuid.uuid4().hex[:8].upper()}",
            subject="Unassigned inward record",
            sender_name="External sender",
            direction=Correspondence.Direction.UPWARD,
            status=Correspondence.Status.PENDING,
            priority=Correspondence.Priority.MEDIUM,
            created_by=self.creator,
            owning_office=self.receiving_office,
            current_office=self.receiving_office,
            current_approver=None,
        )

    def _post_initial_minute(self, user):
        self.client.force_authenticate(user=user)
        return self.client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(self.correspondence.id),
                "user_id": str(user.id),
                "action_type": "minute",
                "minute_text": "Initial action from the receiving office.",
                "to_office_id": str(self.other_office.id),
            },
            format="json",
        )

    def _serializer_flag(self, user):
        request = APIRequestFactory().get("/")
        request.user = user
        serializer = CorrespondenceSerializer(
            self.correspondence,
            context={"request": request},
        )
        return serializer.data["can_take_initial_action"]

    def test_principal_can_take_initial_action(self):
        response = self._post_initial_minute(self.principal)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def test_staff_member_cannot_take_initial_action(self):
        response = self._post_initial_minute(self.staff)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)

    def test_active_acting_principal_can_take_initial_action(self):
        ActingAppointment.objects.create(
            office=self.receiving_office,
            principal=self.principal,
            acting_user=self.acting,
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(hours=1),
            is_active=True,
        )

        response = self._post_initial_minute(self.acting)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def test_expired_acting_principal_cannot_take_initial_action(self):
        ActingAppointment.objects.create(
            office=self.receiving_office,
            principal=self.principal,
            acting_user=self.acting,
            starts_at=timezone.now() - timedelta(days=2),
            ends_at=timezone.now() - timedelta(days=1),
            is_active=True,
        )

        response = self._post_initial_minute(self.acting)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)

    def test_serializer_marks_only_eligible_office_actors(self):
        self.assertTrue(self._serializer_flag(self.principal))
        self.assertFalse(self._serializer_flag(self.staff))

    def test_serializer_marks_active_acting_principal(self):
        ActingAppointment.objects.create(
            office=self.receiving_office,
            principal=self.principal,
            acting_user=self.acting,
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=None,
            is_active=True,
        )

        self.assertTrue(self._serializer_flag(self.acting))

    def test_office_without_principal_or_acting_rejects_initial_action(self):
        no_principal_correspondence = Correspondence.objects.create(
            reference_number=f"NPA/INIT/{uuid.uuid4().hex[:8].upper()}",
            subject="No seat holder",
            sender_name="External sender",
            direction=Correspondence.Direction.UPWARD,
            status=Correspondence.Status.PENDING,
            priority=Correspondence.Priority.MEDIUM,
            created_by=self.creator,
            owning_office=self.empty_office,
            current_office=self.empty_office,
            current_approver=None,
        )
        self.client.force_authenticate(user=self.principal)
        response = self.client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(no_principal_correspondence.id),
                "user_id": str(self.principal.id),
                "action_type": "minute",
                "minute_text": "Attempt without a receiving-office principal.",
                "to_office_id": str(self.other_office.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
