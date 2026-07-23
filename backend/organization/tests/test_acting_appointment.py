"""Tests for office acting appointment seat succession."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate

from correspondence.models import Correspondence
from correspondence.services import find_office_recipient
from organization.acting_services import (
    appoint_acting,
    end_acting,
    get_active_appointment_for_office,
)
from organization.acting_views import ActingAppointmentViewSet
from organization.models import Office, OfficeMembership

User = get_user_model()


class ActingAppointmentServiceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_acting",
            email="admin_acting@example.com",
            password="pass12345",
        )
        self.principal = User.objects.create_user(
            username="fatima",
            email="fatima@example.com",
            password="pass12345",
            first_name="Fatima",
            last_name="AGM",
        )
        self.acting = User.objects.create_user(
            username="ahmed",
            email="ahmed@example.com",
            password="pass12345",
            first_name="Ahmed",
            last_name="PM",
        )
        self.office = Office.objects.create(name="AGM HR", code="AGM-HR", is_active=True)
        OfficeMembership.objects.create(
            office=self.office,
            user=self.principal,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_active=True,
            is_primary=True,
            can_approve=True,
        )
        OfficeMembership.objects.create(
            office=self.office,
            user=self.acting,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
            is_active=True,
            can_approve=True,
        )
        self.open_item = Correspondence.objects.create(
            reference_number="HR-ACT-001",
            subject="Open seat item",
            status=Correspondence.Status.IN_PROGRESS,
            priority=Correspondence.Priority.MEDIUM,
            current_office=self.office,
            owning_office=self.office,
            current_approver=self.principal,
            created_by=self.admin,
        )
        self.own_item = Correspondence.objects.create(
            reference_number="PM-OWN-001",
            subject="Ahmed own item",
            status=Correspondence.Status.IN_PROGRESS,
            priority=Correspondence.Priority.MEDIUM,
            current_office=self.office,
            current_approver=self.acting,
            created_by=self.admin,
        )

    def test_appoint_reassigns_and_end_reclaims(self):
        appointment = appoint_acting(
            office=self.office,
            principal=self.principal,
            acting_user=self.acting,
            appointed_by=self.admin,
            reason="Leave",
        )
        self.open_item.refresh_from_db()
        self.own_item.refresh_from_db()

        self.assertTrue(appointment.is_active)
        self.assertEqual(self.open_item.current_approver_id, self.acting.id)
        self.assertEqual(self.open_item.acting_appointment_id, appointment.id)
        self.assertEqual(self.open_item.acting_original_approver_id, self.principal.id)
        self.assertEqual(self.own_item.current_approver_id, self.acting.id)
        self.assertIsNone(self.own_item.acting_appointment_id)

        active = get_active_appointment_for_office(self.office)
        self.assertEqual(active.id, appointment.id)

        recipient, is_acting = find_office_recipient(self.office, None)
        self.assertEqual(recipient.id, self.acting.id)
        self.assertTrue(is_acting)

        recipient, is_acting = find_office_recipient(self.office, self.principal)
        self.assertEqual(recipient.id, self.acting.id)
        self.assertTrue(is_acting)

        end_acting(appointment, ended_by=self.admin, reason="Returned")
        self.open_item.refresh_from_db()
        self.own_item.refresh_from_db()
        appointment.refresh_from_db()

        self.assertFalse(appointment.is_active)
        self.assertEqual(self.open_item.current_approver_id, self.principal.id)
        self.assertIsNone(self.open_item.acting_appointment_id)
        self.assertEqual(self.own_item.current_approver_id, self.acting.id)

    def test_cannot_create_second_active_appointment(self):
        appoint_acting(
            office=self.office,
            principal=self.principal,
            acting_user=self.acting,
            appointed_by=self.admin,
        )
        with self.assertRaises(ValidationError):
            appoint_acting(
                office=self.office,
                principal=self.principal,
                acting_user=self.acting,
                appointed_by=self.admin,
            )

    def test_appoint_api(self):
        factory = APIRequestFactory()
        view = ActingAppointmentViewSet.as_view({"post": "appoint"})
        request = factory.post(
            "/api/v1/organization/acting-appointments/appoint/",
            {
                "office": str(self.office.id),
                "principal": str(self.principal.id),
                "acting_user": str(self.acting.id),
                "reason": "Emergency",
            },
            format="json",
        )
        force_authenticate(request, user=self.admin)
        response = view(request)
        self.assertEqual(response.status_code, 201)
        self.open_item.refresh_from_db()
        self.assertEqual(self.open_item.current_approver_id, self.acting.id)
