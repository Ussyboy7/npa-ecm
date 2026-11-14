"""Registered correspondence uses the same boundary as search and archives."""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import Correspondence
from organization.models import Department, Directorate, Division

User = get_user_model()


class RegisteredScopeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.directorate = Directorate.objects.create(name="Registered Dir", code="RDIR")
        self.division = Division.objects.create(
            directorate=self.directorate, name="Registered Div", code="RDIV"
        )
        self.other_division = Division.objects.create(
            directorate=self.directorate, name="Other Div", code="ODIV"
        )
        self.department = Department.objects.create(
            division=self.division, name="Registered Dept", code="RDEP"
        )
        self.sibling_department = Department.objects.create(
            division=self.division, name="Sibling Dept", code="SDEP"
        )
        self.foreign_department = Department.objects.create(
            division=self.other_division, name="Foreign Dept", code="FDEP"
        )

        self.gm = User.objects.create_user(
            username="scope_gm",
            email="scope_gm@npa.gov.ng",
            password="pass12345",
            grade_level="GMCS",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.agm = User.objects.create_user(
            username="scope_agm",
            email="scope_agm@npa.gov.ng",
            password="pass12345",
            grade_level="AGMCS",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )

        # Registered by someone else, so participation (created_by) cannot
        # accidentally grant sight of another division.
        self.registrar = User.objects.create_user(
            username="scope_registrar",
            email="scope_registrar@npa.gov.ng",
            password="pass12345",
            grade_level="MSS3",
            department=self.foreign_department,
        )

        def make(subject, department):
            return Correspondence.objects.create(
                reference_number=f"NPA/REG/{uuid.uuid4().hex[:8].upper()}",
                subject=subject,
                sender_name="Sender",
                created_by=self.registrar,
                status=Correspondence.Status.PENDING,
                direction=Correspondence.Direction.DOWNWARD,
                division=department.division,
                department=department,
            )

        self.sibling_item = make("Sibling department item", self.sibling_department)
        self.foreign_item = make("Foreign division item", self.foreign_department)
        self.own_item = make("Own department item", self.department)

    def _ids(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("api_v1:correspondence-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        rows = response.data.get("results", response.data)
        return {str(item["id"]) for item in rows}

    def test_gm_with_department_set_sees_the_whole_division(self):
        # Previously the list checked department first, so a GM with a
        # department_id only saw that department while search showed division.
        ids = self._ids(self.gm)
        self.assertIn(str(self.own_item.id), ids)
        self.assertIn(str(self.sibling_item.id), ids)
        self.assertNotIn(str(self.foreign_item.id), ids)

    def test_agm_sees_only_their_department(self):
        ids = self._ids(self.agm)
        self.assertIn(str(self.own_item.id), ids)
        self.assertNotIn(str(self.sibling_item.id), ids)
        self.assertNotIn(str(self.foreign_item.id), ids)
