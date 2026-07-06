"""Tests for search related items API."""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from correspondence.models import Correspondence
from dms.models import Document


class RelatedSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="searchuser",
            email="search@npa.gov.ng",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def test_related_correspondence_by_sender(self):
        Correspondence.objects.create(
            subject="Port dues inquiry",
            reference_number=f"IN-{uuid.uuid4().hex[:6].upper()}",
            sender_organization="Ministry of Finance",
            sender_name="MOF",
            created_by=self.user,
        )
        target = Correspondence.objects.create(
            subject="Harbour fee follow-up",
            reference_number=f"IN-{uuid.uuid4().hex[:6].upper()}",
            sender_organization="Ministry of Finance",
            sender_name="MOF",
            created_by=self.user,
        )
        response = self.client.post(
            "/api/v1/search/operations/related/",
            {"type": "correspondence", "id": str(target.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["total_count"], 1)
        related_ids = {item["id"] for item in data["related"]}
        self.assertTrue(related_ids)

    def test_related_documents_requires_auth(self):
        self.client.force_authenticate(user=None)
        doc = Document.objects.create(title="Test Doc", author=self.user)
        response = self.client.post(
            "/api/v1/search/operations/related/",
            {"type": "document", "id": str(doc.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
