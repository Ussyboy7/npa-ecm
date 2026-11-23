"""The served grade catalogue is the hierarchy the server routes on.

Routing suggestions, delegation scope and the frontend role checks read this
endpoint instead of keeping their own order or management sets, so every row is
checked against `common.grade_utils` rather than against a literal.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from common.grade_utils import GRADE_ORDER, GRADE_TIERS

User = get_user_model()


class GradeCatalogTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="catalogue_reader", password="x", grade_level="MSS2"
        )

    def _fetch_grades(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("api_v1:grade-catalog"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        return response.data["grades"]

    def test_requires_authentication(self):
        response = self.client.get(reverse("api_v1:grade-catalog"))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_serves_the_hierarchy_in_order(self):
        grades = self._fetch_grades()

        self.assertEqual([row["code"] for row in grades], list(GRADE_ORDER))
        self.assertEqual(
            [row["rank"] for row in grades], list(range(len(GRADE_ORDER)))
        )

    def test_each_tier_is_the_grades_the_rule_contains(self):
        for row in self._fetch_grades():
            for tier, members in GRADE_TIERS:
                self.assertEqual(
                    row[tier],
                    row["code"] in members,
                    msg=f"{tier} disagrees with grade_utils for {row['code']}",
                )

    def test_serves_exactly_the_tiers_consumers_read(self):
        row = self._fetch_grades()[0]

        self.assertEqual(
            set(row) - {"code", "rank"},
            {tier for tier, _ in GRADE_TIERS},
        )
