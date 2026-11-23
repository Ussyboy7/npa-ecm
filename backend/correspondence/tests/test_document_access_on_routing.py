"""A document sent through correspondence belongs to the office it was sent to.

Correspondence is the office channel: the record is addressed to an office, the
seat holders of that office work it, and the document the record carries is
openable by that same audience — nothing else.

The access is derived from the minute trail, never written per user:

- the record's owning office, its current custodian and every office a minute
  was addressed to (`to_office`) may review the document;
- a person a minute named directly (`to_user`) may review it;
- the classification gate still applies, so routing a RESTRICTED document to an
  office does not hand its seat holder a grade they do not hold.

Because nothing is stored, the office's copy follows the seat: handing the seat
to someone else hands over the reviewability with it, and the person who left
keeps nothing.
"""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework.exceptions import ValidationError

from correspondence.models import Correspondence, CorrespondenceDocumentLink, Minute
from correspondence.services import MinuteRouterService, find_office_recipient
from dms.drm import resolve_effective_document_rights
from dms.models import Document, DocumentPermission
from dms.visibility import documents_visible_to
from organization.models import (
    Department,
    Directorate,
    Division,
    Office,
    OfficeMembership,
    Role,
)

User = get_user_model()


class CorrespondenceDocumentCustodyTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(
            name="Correspondence custody role",
            permissions={"can_access_document_management": True},
        )
        self.directorate = Directorate.objects.create(
            name="Custody Directorate", code="CUS-DIR"
        )
        self.division = Division.objects.create(
            directorate=self.directorate, name="Custody Division", code="CUS-DIV"
        )
        self.department = Department.objects.create(
            division=self.division, name="Custody Department", code="CUS-DEPT"
        )
        self.office = Office.objects.create(
            name="Custody Office",
            code="CUS-OFF",
            office_type=Office.OfficeTier.DIVISION,
            division=self.division,
        )
        self.next_office = Office.objects.create(
            name="Custody Next Office",
            code="CUS-OFF-2",
            office_type=Office.OfficeTier.DEPARTMENT,
            department=self.department,
        )

        self.author = self._user("custody_author", grade="MSS2")
        self.principal = self._user("custody_principal", grade="MSS4")
        self.secretary = self._user("custody_secretary", grade="SSS2")
        self.staff = self._user("custody_staff", grade="SSS3")
        self.next_principal = self._user("custody_next_principal", grade="MSS3")
        self.outsider = self._user("custody_outsider", grade="MSS4")

        self.principal_seat = OfficeMembership.objects.create(
            office=self.office,
            user=self.principal,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )
        OfficeMembership.objects.create(
            office=self.office,
            user=self.secretary,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT,
        )
        OfficeMembership.objects.create(
            office=self.office,
            user=self.staff,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )
        OfficeMembership.objects.create(
            office=self.next_office,
            user=self.next_principal,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/ACL/{uuid.uuid4().hex[:8].upper()}",
            subject="Routing document access",
            sender_name="Test sender",
            created_by=self.author,
            owning_office=self.office,
            current_office=self.office,
        )
        self.document = Document.objects.create(
            title="Linked memo",
            document_type=Document.DocumentType.MEMO,
            status=Document.DocumentStatus.DRAFT,
            sensitivity=Document.Sensitivity.INTERNAL,
            author=self.author,
            division=self.division,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=self.correspondence,
            document=self.document,
        )

    def _user(self, username, *, grade):
        return User.objects.create_user(
            username=username,
            email=f"{username}@npa.gov.ng",
            password="testpass123",
            grade_level=grade,
            division=self.division,
            system_role=self.role,
        )

    def _minute(self, **kwargs):
        return Minute.objects.create(
            correspondence=self.correspondence,
            user=self.author,
            minute_text="Forwarded",
            action_type=Minute.ActionType.MINUTE,
            step_number=kwargs.pop("step_number", 1),
            **kwargs,
        )

    def _can_open(self, user):
        return documents_visible_to(
            Document.objects.filter(pk=self.document.pk), user
        ).exists()

    def test_office_seat_can_open_what_the_office_received(self):
        self.assertTrue(self._can_open(self.principal), "the principal holds the office")
        self.assertTrue(self._can_open(self.secretary), "the secretariat runs the office queue")
        self.assertFalse(self._can_open(self.staff), "a posted officer is not the office")
        self.assertFalse(self._can_open(self.outsider), "another office is untouched")

    def test_custody_is_readable_through_the_effective_rights_used_by_the_api(self):
        rights = resolve_effective_document_rights(self.document, self.principal)

        self.assertEqual(rights["access_level"], "read")
        self.assertTrue(rights["can_view"])
        self.assertFalse(rights["can_manage_sharing"], "custody never shares onward")

        self.assertIsNone(
            resolve_effective_document_rights(self.document, self.staff)["access_level"]
        )

    def test_delivery_writes_no_permission_row(self):
        """The modal's contract: routing a document is not sharing it."""
        self._minute()

        self.assertFalse(
            DocumentPermission.objects.filter(document=self.document).exists(),
            "office delivery is custody derived from the trail, not an ACL row",
        )
        self.assertTrue(self._can_open(self.principal))

    def test_forwarded_office_reviews_it_and_the_sending_office_keeps_reviewing_it(self):
        self._minute(to_office=self.next_office)

        self.assertTrue(self._can_open(self.next_principal), "the office it went to")
        self.assertTrue(self._can_open(self.principal), "the office that sent it still reviews it")
        self.assertFalse(self._can_open(self.outsider))

    def test_a_named_recipient_may_open_it_without_a_share(self):
        self._minute(to_user=self.staff)

        self.assertTrue(self._can_open(self.staff), "a minute named this person")
        self.assertFalse(
            DocumentPermission.objects.filter(document=self.document).exists(),
            "naming a person on a minute is not a share record either",
        )

    def test_review_follows_the_seat_not_the_person(self):
        self.assertTrue(self._can_open(self.principal))

        self.principal_seat.is_active = False
        self.principal_seat.save(update_fields=["is_active"])
        successor = self._user("custody_successor", grade="MSS4")
        OfficeMembership.objects.create(
            office=self.office,
            user=successor,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
        )

        self.assertFalse(self._can_open(self.principal), "the former holder keeps nothing")
        self.assertTrue(self._can_open(successor), "the office's copy moved with the seat")

    def test_dispatch_minute_may_name_the_office_the_record_sits_in(self):
        """Delivering a record to the office it is addressed to is not a loop."""
        MinuteRouterService.prevent_self_loop(
            self.author, None, self.office, self.office, is_dispatch=True
        )

        with self.assertRaises(ValidationError):
            MinuteRouterService.prevent_self_loop(
                self.author, None, self.office, self.office
            )

    def test_office_recipient_is_the_seat_not_the_most_senior_post(self):
        seatless = Office.objects.create(
            name="Custody Seatless Office",
            code="CUS-OFF-3",
            office_type=Office.OfficeTier.DEPARTMENT,
            department=self.department,
        )
        posted = self._user("custody_posted_mss1", grade="MSS1")
        runner = self._user("custody_runner", grade="SSS2")
        OfficeMembership.objects.create(
            office=seatless,
            user=posted,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )
        OfficeMembership.objects.create(
            office=seatless,
            user=runner,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT,
        )

        recipient, _is_acting = find_office_recipient(seatless)

        self.assertEqual(recipient, runner)

    def test_classification_gate_still_applies_to_custody(self):
        self.document.sensitivity = Document.Sensitivity.RESTRICTED
        self.document.save(update_fields=["sensitivity"])

        self.assertFalse(
            self._can_open(self.principal),
            "an MSS4 seat holder reaches CONFIDENTIAL, not RESTRICTED",
        )

        cleared = self._user("custody_cleared", grade="EDCS")
        OfficeMembership.objects.create(
            office=self.office,
            user=cleared,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT,
        )

        self.assertTrue(self._can_open(cleared), "a cleared seat holder can review it")
