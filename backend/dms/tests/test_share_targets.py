"""One audience rule per share target — the canonical document share model.

person                          -> that person
office                          -> that office's seat holders
                                   (principal / acting / secretariat), nobody else
department / division           -> every active user beneath it
directorate                     -> everyone whose unit sits in it
grade level                     -> every active user of that grade

Each target is checked three ways: who gets a notification, who sees the
document in Documents > Shared with me, and who can open it.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from dms.models import Document
from notifications.models import Notification
from organization.models import (
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    Role,
)

User = get_user_model()


class DocumentShareTargetTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Document share target role",
            permissions={
                "can_access_document_management": True,
                "can_create_documents": True,
                "can_share_documents": True,
            },
        )
        self.directorate = Directorate.objects.create(name="Marine Directorate", code="SHT-MDIR")
        self.division = Division.objects.create(
            directorate=self.directorate, name="Division A", code="SHT-DIVA"
        )
        self.other_division = Division.objects.create(
            directorate=self.directorate, name="Division B", code="SHT-DIVB"
        )
        self.department = Department.objects.create(
            division=self.division, name="Department A", code="SHT-DEPA"
        )
        self.office = Office.objects.create(
            name="Division A Office",
            code="SHT-OFF-DIVA",
            office_type=Office.OfficeTier.DIVISION,
            division=self.division,
        )

        self.author = self._user("sht_author", grade="MSS2", division=self.division)
        self.principal = self._user("sht_principal", grade="MSS4", division=self.division)
        self.staff_member = self._user("sht_staff", grade="SSS3", division=self.division)
        self.secretary = self._user("sht_secretary", grade="SSS2", division=self.division)
        self.outsider = self._user("sht_outsider", grade="MSS3", division=self.other_division)

        OfficeMembership.objects.create(
            office=self.office,
            user=self.principal,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )
        OfficeMembership.objects.create(
            office=self.office,
            user=self.staff_member,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )
        OfficeMembership.objects.create(
            office=self.office,
            user=self.secretary,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT,
        )

        self.document = Document.objects.create(
            title="Share Target Memo",
            document_type=Document.DocumentType.MEMO,
            status=Document.DocumentStatus.DRAFT,
            sensitivity=Document.Sensitivity.INTERNAL,
            author=self.author,
            division=self.division,
        )

    def _user(self, username, *, grade, division=None, department=None):
        return User.objects.create_user(
            username=username,
            email=f"{username}@npa.gov.ng",
            password="pass12345",
            grade_level=grade,
            division=division,
            department=department,
            directorate=self.directorate if division or department else None,
            system_role=self.role,
        )

    def _share(self, **payload):
        self.client.force_authenticate(user=self.author)
        return self.client.post(
            reverse("api_v1:document-permission-list"),
            {"document": str(self.document.id), "access": "read", **payload},
            format="json",
        )

    def _notified(self, user):
        return Notification.objects.filter(
            recipient=user,
            related_object_type="document",
            related_object_id=str(self.document.id),
        ).exists()

    def _shared_ids(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("api_v1:document-list"), {"shared_with_me": "1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        return {str(item["id"]) for item in rows}

    def _can_open(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("api_v1:document-detail", args=[self.document.id]))
        return response.status_code == status.HTTP_200_OK

    def test_person_share_reaches_only_that_person(self):
        response = self._share(user_ids=[str(self.staff_member.id)])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(self._notified(self.staff_member))
        self.assertFalse(self._notified(self.principal))
        self.assertFalse(self._notified(self.outsider))
        self.assertIn(str(self.document.id), self._shared_ids(self.staff_member))
        self.assertNotIn(str(self.document.id), self._shared_ids(self.principal))

    def test_office_share_reaches_seat_holders_and_not_the_posts(self):
        response = self._share(office_ids=[str(self.office.id)])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(self._notified(self.principal), "principal holds the office")
        self.assertTrue(self._notified(self.secretary), "secretariat runs the office queue")
        self.assertFalse(self._notified(self.staff_member), "a posted staff officer is not the office")
        self.assertFalse(self._notified(self.outsider))

        self.assertIn(str(self.document.id), self._shared_ids(self.principal))
        self.assertNotIn(str(self.document.id), self._shared_ids(self.staff_member))
        self.assertTrue(self._can_open(self.principal))
        self.assertFalse(self._can_open(self.staff_member))

    def test_division_share_reaches_every_user_under_it(self):
        department_only = self._user(
            "sht_department_only", grade="SSS2", department=self.department
        )

        response = self._share(division_ids=[str(self.division.id)])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        for member in (self.principal, self.staff_member, department_only):
            self.assertTrue(self._notified(member), f"{member.username} sits under the division")
        self.assertFalse(self._notified(self.outsider), "another division is untouched")
        self.assertIn(str(self.document.id), self._shared_ids(department_only))

    def test_directorate_share_reaches_accounts_beneath_it(self):
        division_only = self._user("sht_division_only", grade="SSS2", division=self.other_division)
        department_only = self._user(
            "sht_dept_only", grade="SSS2", department=self.department
        )

        response = self._share(directorate_ids=[str(self.directorate.id)])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(self._notified(division_only), "division-only accounts inherit it")
        self.assertTrue(self._notified(department_only), "department-only accounts inherit it")
        self.assertIn(str(self.document.id), self._shared_ids(division_only))

    def test_grade_share_notifies_the_grade_instead_of_nobody(self):
        peer = self._user("sht_peer_mss3", grade="MSS3", division=self.other_division)

        response = self._share(grade_levels=["MSS3"])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(self._notified(self.outsider), "MSS3 account is told about it")
        self.assertTrue(self._notified(peer))
        self.assertFalse(self._notified(self.principal), "MSS4 is outside the grade")
        self.assertIn(str(self.document.id), self._shared_ids(self.outsider))

    def test_share_does_not_notify_the_person_sharing(self):
        self._share(user_ids=[str(self.author.id), str(self.staff_member.id)])

        self.assertFalse(self._notified(self.author))
        self.assertTrue(self._notified(self.staff_member))
