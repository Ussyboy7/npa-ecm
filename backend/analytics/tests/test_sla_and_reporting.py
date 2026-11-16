from datetime import timedelta
from uuid import uuid4

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from analytics.services import (
    AnalyticsService,
    compute_performance_metrics,
    compute_report_metrics,
)
from correspondence.models import Correspondence
from organization.models import Directorate, Division, Role


class SLATargetPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role = Role.objects.create(
            name="Inbox User",
            permissions={"can_access_analytics": True},
        )
        self.user = User.objects.create_user(
            username="inbox-user",
            password="test-password",
            system_role=self.role,
        )
        self.client.force_authenticate(user=self.user)

    def test_authenticated_user_can_read_sla_targets_without_org_admin_permission(self):
        response = self.client.get("/api/v1/analytics/sla-config/targets/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {"urgent", "high", "medium", "low"})

    def test_sla_configuration_writes_still_require_org_admin_permission(self):
        response = self.client.post(
            "/api/v1/analytics/sla-config/bulk_update/",
            {"urgent": 24},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["details"]["permission"], "can_manage_org_structure")


class SLAHourComparisonTests(TestCase):
    def _medium_item(self, *, status: str, completed: bool = False):
        return Correspondence.objects.create(
            reference_number=f"SLA-TEST-{uuid4().hex[:12]}",
            subject="SLA hour comparison regression",
            received_date=timezone.localdate() - timedelta(days=3),
            status=status,
            priority=Correspondence.Priority.MEDIUM,
            completed_at=timezone.now() if completed else None,
        )

    def test_pending_medium_item_older_than_48_hours_is_breached(self):
        self._medium_item(status=Correspondence.Status.PENDING)

        payload = AnalyticsService.build_enhanced_sla_payload(range_days=30)
        medium = next(
            row for row in payload["byPriority"] if row["priority"] == "medium"
        )

        self.assertEqual(payload["summary"]["compliant"], 0)
        self.assertEqual(payload["summary"]["breached"], 1)
        self.assertEqual(medium["compliant"], 0)
        self.assertEqual(medium["breached"], 1)

    def test_completed_medium_item_taking_longer_than_48_hours_is_breached(self):
        self._medium_item(
            status=Correspondence.Status.COMPLETED,
            completed=True,
        )

        performance = compute_performance_metrics(range_days=30)
        report = compute_report_metrics(range_days=30)

        self.assertEqual(performance["sla"]["total"], 1)
        self.assertEqual(performance["sla"]["compliant"], 0)
        self.assertEqual(performance["sla"]["breached"], 1)
        self.assertEqual(report["sla"]["compliant"], 0)
        self.assertEqual(report["sla"]["breached"], 1)

    def test_sla_status_uses_hours_for_pending_medium_item(self):
        item = self._medium_item(status=Correspondence.Status.PENDING)

        status = AnalyticsService._sla_status(
            item,
            timezone.now(),
            {"medium": 48},
        )

        self.assertEqual(status, "breach")


class DivisionSLAAlignmentTests(TestCase):
    def test_archived_items_are_excluded_and_division_sla_matches_summary(self):
        directorate = Directorate.objects.create(
            name="SLA Alignment Directorate",
            code="SLAD",
        )
        division = Division.objects.create(
            name="SLA Alignment Division",
            code="SLA-DIV",
            directorate=directorate,
        )

        # Active and compliant: received today, completed now.
        Correspondence.objects.create(
            reference_number=f"SLA-ALIGN-{uuid4().hex[:8]}-OK",
            subject="Active compliant item",
            received_date=timezone.localdate(),
            status=Correspondence.Status.COMPLETED,
            priority=Correspondence.Priority.MEDIUM,
            completed_at=timezone.now(),
            division=division,
        )
        # Active and breached: more than 48 hours old.
        Correspondence.objects.create(
            reference_number=f"SLA-ALIGN-{uuid4().hex[:8]}-BREACH",
            subject="Active breached item",
            received_date=timezone.localdate() - timedelta(days=3),
            status=Correspondence.Status.PENDING,
            priority=Correspondence.Priority.MEDIUM,
            division=division,
        )
        # Archived and breached: must not appear in either payload.
        Correspondence.objects.create(
            reference_number=f"SLA-ALIGN-{uuid4().hex[:8]}-ARCHIVED",
            subject="Archived breached item",
            received_date=timezone.localdate() - timedelta(days=3),
            status=Correspondence.Status.ARCHIVED,
            priority=Correspondence.Priority.MEDIUM,
            division=division,
        )

        sla_payload = AnalyticsService.build_enhanced_sla_payload(range_days=30)
        division_payload = AnalyticsService.build_enhanced_division_performance(
            range_days=30
        )
        division_metric = next(
            row for row in division_payload["divisions"] if row["id"] == str(division.id)
        )

        self.assertEqual(sla_payload["summary"]["total"], 2)
        self.assertEqual(sla_payload["summary"]["compliant"], 1)
        self.assertEqual(sla_payload["summary"]["breached"], 1)

        self.assertEqual(division_metric["workload"], 2)
        self.assertEqual(division_metric["completed"], 1)
        self.assertEqual(division_metric["pending"], 1)
        self.assertEqual(division_metric["slaCompliant"], 1)
        self.assertEqual(division_metric["slaBreached"], 1)
        self.assertEqual(division_metric["slaAtRisk"], 0)

        self.assertEqual(
            sum(row["slaCompliant"] for row in division_payload["divisions"]),
            sla_payload["summary"]["compliant"],
        )
        self.assertEqual(
            sum(row["slaBreached"] for row in division_payload["divisions"]),
            sla_payload["summary"]["breached"],
        )
        self.assertEqual(
            sum(row["slaAtRisk"] for row in division_payload["divisions"]),
            sla_payload["summary"]["atRisk"],
        )
