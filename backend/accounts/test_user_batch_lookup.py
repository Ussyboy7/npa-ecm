from django.test import TestCase
from rest_framework.test import APIClient

from .models import User


class UserBatchLookupTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username="batch-admin",
            email="batch-admin@example.com",
            password="testpass123",
        )
        self.first = User.objects.create_user(
            username="batch-first",
            email="batch-first@example.com",
            password="testpass123",
        )
        self.second = User.objects.create_user(
            username="batch-second",
            email="batch-second@example.com",
            password="testpass123",
        )
        User.objects.create_user(
            username="batch-unrelated",
            email="batch-unrelated@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.admin)

    def test_ids_filter_returns_only_requested_users(self):
        response = self.client.get(
            f"/api/v1/accounts/users/?ids={self.first.id},{self.second.id}&page_size=500"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {user["id"] for user in response.data["results"]},
            {self.first.id, self.second.id},
        )

    def test_empty_or_invalid_ids_filter_does_not_fall_back_to_the_directory(self):
        for query in ("ids=", "ids=not-a-number"):
            with self.subTest(query=query):
                response = self.client.get(f"/api/v1/accounts/users/?{query}")

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["results"], [])
                self.assertEqual(response.data["count"], 0)
