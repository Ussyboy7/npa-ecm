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

# Written out literally, deliberately not imported from common.grade_utils: this
# is the contract, so a change to GRADE_ORDER has to be made here on purpose.
CANONICAL_GRADES: tuple[tuple[str, int], ...] = (
    ("MDCS", 0),
    ("EDCS", 1),
    ("MSS1", 2),
    ("MSS2", 3),
    ("MSS3", 4),
    ("MSS4", 5),
    ("MSS5", 6),
    ("SSS1", 7),
    ("SSS2", 8),
    ("SSS3", 9),
    ("SSS4", 10),
    ("JSS1", 11),
    ("JSS2", 12),
    ("JSS3", 13),
)


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

    def test_serves_exactly_the_canonical_codes_and_ranks(self):
        grades = self._fetch_grades()

        self.assertEqual(
            [(row["code"], row["rank"]) for row in grades],
            list(CANONICAL_GRADES),
        )
        self.assertEqual(len(grades), 14)
        self.assertFalse({"GMCS", "AGMCS"} & {row["code"] for row in grades})

    def test_pins_the_key_leadership_tiers(self):
        rows = {row["code"]: row for row in self._fetch_grades()}

        for code in ("MDCS", "EDCS"):
            self.assertTrue(rows[code]["executive"], msg=f"{code} is executive")
        for code in ("MSS1", "MSS2", "MSS3", "SSS1", "SSS4"):
            self.assertFalse(rows[code]["executive"], msg=f"{code} is not executive")

        self.assertTrue(rows["MSS1"]["division_leadership"])
        self.assertFalse(rows["MSS2"]["division_leadership"])
        self.assertFalse(rows["MSS3"]["division_leadership"])

        self.assertTrue(rows["MSS2"]["department_leadership"])
        self.assertFalse(rows["MSS1"]["department_leadership"])
        self.assertFalse(rows["MSS3"]["department_leadership"])

    def test_serves_exactly_the_tiers_consumers_read(self):
        row = self._fetch_grades()[0]

        self.assertEqual(
            set(row) - {"code", "rank"},
            {tier for tier, _ in GRADE_TIERS},
        )
