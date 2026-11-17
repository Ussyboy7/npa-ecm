import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from correspondence.models import Correspondence, CorrespondenceDistribution, DispatchRecord, Minute
from correspondence.sidebar_counts_cache import get_sidebar_counts_cache_key
from organization.models import Directorate, Division, Office, OfficeMembership

User = get_user_model()


class MySentEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="sentuser",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.routed_corr = Correspondence.objects.create(
            reference_number=f"NPA/SNT/{uuid.uuid4().hex[:8].upper()}",
            subject="Routed internally",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.COMPLETED,
        )
        Minute.objects.create(
            correspondence=self.routed_corr,
            user=self.user,
            minute_text="Please treat.",
            action_type=Minute.ActionType.MINUTE,
            dispatched_at=timezone.now(),
        )

        self.dispatched_corr = Correspondence.objects.create(
            reference_number=f"NPA/EXT/{uuid.uuid4().hex[:8].upper()}",
            subject="Dispatched externally",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.DISPATCHED,
            dispatch_date=date.today(),
        )
        DispatchRecord.objects.create(
            correspondence=self.dispatched_corr,
            dispatch_mode=DispatchRecord.DispatchMode.EMAIL,
            dispatched_date=date.today(),
            dispatched_by=self.user,
        )

        self.active_corr = Correspondence.objects.create(
            reference_number=f"NPA/ACT/{uuid.uuid4().hex[:8].upper()}",
            subject="Still active",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )

    def test_my_sent_returns_routed_and_dispatched_items(self):
        url = reverse("api_v1:correspondence-my-sent")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.routed_corr.reference_number, refs)
        self.assertIn(self.dispatched_corr.reference_number, refs)
        self.assertNotIn(self.active_corr.reference_number, refs)

    def test_my_sent_internal_filter(self):
        url = reverse("api_v1:correspondence-my-sent")
        response = self.client.get(url, {"sent_type": "internal"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.routed_corr.reference_number, refs)
        self.assertNotIn(self.dispatched_corr.reference_number, refs)

    def test_my_sent_external_filter(self):
        url = reverse("api_v1:correspondence-my-sent")
        response = self.client.get(url, {"sent_type": "external"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.dispatched_corr.reference_number, refs)
        self.assertNotIn(self.routed_corr.reference_number, refs)


class OfficeSentEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="officesentuser",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.dispatched = Correspondence.objects.create(
            reference_number=f"NPA/OFD/{uuid.uuid4().hex[:8].upper()}",
            subject="Office sent log item",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.DISPATCHED,
            dispatch_date=date.today(),
        )
        DispatchRecord.objects.create(
            correspondence=self.dispatched,
            dispatch_mode=DispatchRecord.DispatchMode.COURIER,
            dispatched_date=date.today(),
            dispatched_by=self.user,
            tracking_number="TRK-001",
        )

        self.pending = Correspondence.objects.create(
            reference_number=f"NPA/PND/{uuid.uuid4().hex[:8].upper()}",
            subject="Not sent yet",
            sender_name="Sender",
            created_by=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )

    def test_office_sent_returns_dispatched_items(self):
        url = reverse("api_v1:correspondence-office-sent")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refs = {item["reference_number"] for item in response.data["results"]}
        self.assertIn(self.dispatched.reference_number, refs)
        self.assertNotIn(self.pending.reference_number, refs)
        self.assertGreaterEqual(response.data["summary"]["total"], 1)

    def test_sidebar_counts_return_only_consumed_fields(self):
        url = reverse("api_v1:correspondence-sidebar-counts")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data),
            {
                "officeInbox",
                "myInbox",
                "delegated",
                "pendingApprovals",
                "pendingSignatures",
            },
        )

    def test_sidebar_counts_include_pending_approvals(self):
        Minute.objects.create(
            correspondence=self.pending,
            user=self.user,
            to_user=self.user,
            purpose="approval",
            minute_text="Approval requested",
            action_type=Minute.ActionType.APPROVE,
        )
        url = reverse("api_v1:correspondence-sidebar-counts")
        response = self.client.get(url, {"refresh": "1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["pendingApprovals"], 1)


class SidebarCountsOfficeLookupTests(TestCase):
    def test_sidebar_counts_combine_membership_and_office_metadata_lookup(self):
        user = User.objects.create_user(username="sidebar-office-user", password="testpass123")
        directorate = Directorate.objects.create(name="Test Directorate", code="TEST-DIR")
        division = Division.objects.create(
            directorate=directorate,
            name="Test Division",
            code="TEST-DIV",
        )
        office = Office.objects.create(
            name="Test Staff Office",
            code="TEST-OFFICE",
            directorate=directorate,
            division=division,
        )
        OfficeMembership.objects.create(
            user=user,
            office=office,
            is_active=True,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
        )
        correspondence = Correspondence.objects.create(
            reference_number=f"NPA/DIST/{uuid.uuid4().hex[:8].upper()}",
            subject="Division distribution",
            sender_name="Sender",
            created_by=user,
            status=Correspondence.Status.IN_PROGRESS,
        )
        CorrespondenceDistribution.objects.create(
            correspondence=correspondence,
            recipient_type=CorrespondenceDistribution.RecipientType.DIVISION,
            division=division,
            added_by=user,
        )

        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:correspondence-sidebar-counts")
        with CaptureQueriesContext(connection) as queries:
            response = client.get(url, {"refresh": "1"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["officeInbox"], 0)
        self.assertEqual(response.data["myInbox"], 1)
        office_lookup_queries = [
            query
            for query in queries.captured_queries
            if "organization_officemembership" in query["sql"].lower()
            or '"organization_office"' in query["sql"].lower()
        ]
        self.assertEqual(len(office_lookup_queries), 1)


class SidebarCountsCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="sidebar-cache-user",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def test_correspondence_write_invalidates_cached_sidebar_counts(self):
        url = reverse("api_v1:correspondence-sidebar-counts")

        first_response = self.client.get(url)
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        cached_key = get_sidebar_counts_cache_key(self.user.id)
        self.assertIsNotNone(cache.get(cached_key))
        before_count = first_response.data["myInbox"]

        Correspondence.objects.create(
            reference_number=f"NPA/CACHE/{uuid.uuid4().hex[:8].upper()}",
            subject="Cache invalidation check",
            sender_name="Sender",
            created_by=self.user,
            current_approver=self.user,
            status=Correspondence.Status.IN_PROGRESS,
        )

        self.assertNotEqual(get_sidebar_counts_cache_key(self.user.id), cached_key)

        refreshed_response = self.client.get(url)
        self.assertEqual(refreshed_response.status_code, status.HTTP_200_OK)
        self.assertEqual(refreshed_response.data["myInbox"], before_count + 1)
