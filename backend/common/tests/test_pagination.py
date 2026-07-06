from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from common.pagination import CatalogPageNumberPagination, StandardPageNumberPagination

User = get_user_model()


class PaginationConfigTests(TestCase):
    def test_standard_pagination_defaults(self):
        paginator = StandardPageNumberPagination()
        self.assertEqual(paginator.page_size, 50)
        self.assertEqual(paginator.page_size_query_param, "page_size")
        self.assertEqual(paginator.max_page_size, 100)

    def test_catalog_pagination_defaults(self):
        paginator = CatalogPageNumberPagination()
        self.assertEqual(paginator.page_size, 100)
        self.assertEqual(paginator.max_page_size, 500)


class UserListPaginationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username="pagadmin",
            email="pagadmin@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.admin)
        for index in range(3):
            User.objects.create_user(
                username=f"user{index}",
                email=f"user{index}@example.com",
                password="testpass123",
            )

    def test_users_list_honors_page_size(self):
        response = self.client.get("/api/v1/accounts/users/?page=1&page_size=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertGreaterEqual(response.data["count"], 4)

    def test_users_list_caps_page_size_at_catalog_max(self):
        response = self.client.get("/api/v1/accounts/users/?page=1&page_size=9999")
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(response.data["results"]), 500)
