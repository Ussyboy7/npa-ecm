"""The served classification policy must be the gate the server enforces.

The share warning, the sensitivity picker and its clearance badges read this
endpoint instead of keeping their own grade lists, so every row is checked
against `dms.visibility` rather than against a literal copied into the test.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from common.grade_utils import (
    GRADE_ORDER,
    SENSITIVITY_HIGH_CONFIDENTIAL_GRADES,
    SENSITIVITY_HIGH_RESTRICTED_GRADES,
)
from dms.models import Document
from dms.visibility import sensitivity_grade_requirements, visible_sensitivities

User = get_user_model()


class ClassificationPolicyEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="policy_reader", password="x", grade_level="MSS2"
        )

    def _fetch_policy(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("api_v1:classification-policy"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        return {row["value"]: row for row in response.data["sensitivities"]}

    def test_requires_authentication(self):
        response = self.client.get(reverse("api_v1:classification-policy"))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_serves_every_classification_with_its_grade_list(self):
        policy = self._fetch_policy()

        self.assertEqual(set(policy), set(Document.Sensitivity.values))
        self.assertEqual(
            policy[Document.Sensitivity.CONFIDENTIAL]["grades"],
            [
                grade
                for grade in GRADE_ORDER
                if grade in SENSITIVITY_HIGH_CONFIDENTIAL_GRADES
            ],
        )
        self.assertEqual(
            policy[Document.Sensitivity.RESTRICTED]["grades"],
            [
                grade
                for grade in GRADE_ORDER
                if grade in SENSITIVITY_HIGH_RESTRICTED_GRADES
            ],
        )
        self.assertEqual(
            policy[Document.Sensitivity.CONFIDENTIAL]["label"],
            Document.Sensitivity.CONFIDENTIAL.label,
        )

    def test_open_classifications_are_served_as_unrestricted(self):
        policy = self._fetch_policy()

        for value in (Document.Sensitivity.PUBLIC, Document.Sensitivity.INTERNAL):
            self.assertEqual(policy[value]["grades"], [])
            self.assertTrue(policy[value]["unrestricted"])

        for value in (
            Document.Sensitivity.CONFIDENTIAL,
            Document.Sensitivity.RESTRICTED,
        ):
            self.assertFalse(policy[value]["unrestricted"])

    def test_served_policy_agrees_with_the_gate_for_every_grade(self):
        requirements = sensitivity_grade_requirements()

        for grade in (*GRADE_ORDER, "", "UNKNOWN"):
            allowed = visible_sensitivities(User(grade_level=grade))
            for sensitivity, grades in requirements.items():
                expected = grade in grades if grades else True
                self.assertEqual(
                    sensitivity in allowed,
                    expected,
                    msg=f"{sensitivity} reach for grade {grade!r} disagrees with the gate",
                )
