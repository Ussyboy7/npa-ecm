import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from organization.models import Directorate, Division, Office, OfficeMembership

from correspondence.models import Correspondence, Minute


class RoutingSuggestionTests(TestCase):
    def setUp(self):
        self.directorate = Directorate.objects.create(name="Operations", code="OPS")
        self.other_directorate = Directorate.objects.create(name="Finance", code="FIN")
        self.division = Division.objects.create(
            directorate=self.directorate,
            name="Operations Division",
            code="OPS-DIV",
        )
        self.other_division = Division.objects.create(
            directorate=self.other_directorate,
            name="Finance Division",
            code="FIN-DIV",
        )
        self.office = Office.objects.create(
            name="Operations Office",
            code="OPS-OFF",
            office_type=Office.OfficeTier.DIVISION,
            directorate=self.directorate,
            division=self.division,
            allow_lateral_routing=True,
        )

        self.current_user = self._user(
            "routing-current",
            "MSS3",
            self.division,
            self.directorate,
        )
        OfficeMembership.objects.create(
            user=self.current_user,
            office=self.office,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
            is_active=True,
        )

        self.lower_same_division = self._user(
            "routing-lower-same",
            "MSS4",
            self.division,
            self.directorate,
        )
        self.lower_other_directorate = self._user(
            "routing-lower-other",
            "MSS4",
            self.other_division,
            self.other_directorate,
        )
        self.peer = self._user(
            "routing-peer",
            "MSS3",
            self.other_division,
            self.other_directorate,
        )
        self.higher_same_division = self._user(
            "routing-higher-same",
            "MSS2",
            self.division,
            self.directorate,
        )
        self.higher_other_directorate = self._user(
            "routing-higher-other",
            "MSS2",
            self.other_division,
            self.other_directorate,
        )
        self.executive = self._user(
            "routing-executive",
            "EDCS",
            self.other_division,
            self.other_directorate,
        )

        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/ROUTE/{uuid.uuid4().hex[:8].upper()}",
            subject="Routing suggestions",
            sender_name="Test sender",
            created_by=self.current_user,
            division=self.division,
            direction=Correspondence.Direction.DOWNWARD,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.current_user)

    def _user(self, username, grade, division, directorate):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="testpass123",
            grade_level=grade,
            division=division,
            directorate=directorate,
            is_active=True,
        )

    def _suggestions(self, direction):
        response = self.client.get(
            f"/api/v1/correspondence/items/{self.correspondence.id}/routing-suggestions/",
            {"routing_direction": direction},
        )
        self.assertEqual(response.status_code, 200, response.data)
        return {user["id"] for user in response.data["suggestions"]}

    def test_downward_keeps_lower_grades_in_the_same_division(self):
        Minute.objects.create(
            correspondence=self.correspondence,
            user=self.lower_same_division,
            minute_text="Already handled",
            action_type=Minute.ActionType.MINUTE,
            step_number=1,
        )

        suggestions = self._suggestions(Correspondence.Direction.DOWNWARD)

        self.assertNotIn(self.lower_same_division.id, suggestions)
        self.assertNotIn(self.lower_other_directorate.id, suggestions)
        self.assertNotIn(self.peer.id, suggestions)
        self.assertNotIn(self.higher_same_division.id, suggestions)

    def test_downward_returns_lower_same_division_colleagues(self):
        suggestions = self._suggestions(Correspondence.Direction.DOWNWARD)

        self.assertIn(self.lower_same_division.id, suggestions)

    def test_upward_keeps_higher_division_and_executive_candidates_plus_peers(self):
        suggestions = self._suggestions(Correspondence.Direction.UPWARD)

        self.assertIn(self.higher_same_division.id, suggestions)
        self.assertIn(self.executive.id, suggestions)
        self.assertIn(self.peer.id, suggestions)
        self.assertNotIn(self.higher_other_directorate.id, suggestions)
        self.assertNotIn(self.lower_same_division.id, suggestions)

    def test_upward_uses_the_shared_catalogue_order(self):
        # GMCS sat outside the module's old private order, so an MSS3 sender
        # never reached a GMCS in the same division. The served order ranks it
        # between the executive director and MSS1.
        general_manager = self._user(
            "routing-gmcs", "GMCS", self.division, self.directorate
        )

        suggestions = self._suggestions(Correspondence.Direction.UPWARD)

        self.assertIn(general_manager.id, suggestions)

    def test_upward_reaches_agmcs_through_the_shared_order(self):
        # AGMCS was missing from the module's old private order too, so it was
        # never offered upward to an MSS3 sender in the same division.
        department_head = self._user(
            "routing-agmcs", "AGMCS", self.division, self.directorate
        )

        suggestions = self._suggestions(Correspondence.Direction.UPWARD)

        self.assertIn(department_head.id, suggestions)

    def test_lateral_respects_the_office_permission(self):
        self.office.allow_lateral_routing = False
        self.office.save(update_fields=["allow_lateral_routing"])

        self.assertEqual(self._suggestions(Correspondence.Direction.LATERAL), set())
