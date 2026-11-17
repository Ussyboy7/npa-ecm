"""Tests for analytics service helpers."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone

from accounts.models import User
from analytics.services import (
    compute_executive_metrics,
    compute_performance_metrics,
    compute_report_metrics,
)
from correspondence.models import Correspondence, Minute
from dms.models import Document
from organization.models import Department, Directorate, Division


@pytest.fixture()
def org_hierarchy():
    directorate = Directorate.objects.create(name="Marine Ops", code="MO")
    division = Division.objects.create(name="Harbor", code="HB", directorate=directorate)
    department = Department.objects.create(name="Channel", code="CH", division=division)
    return directorate, division, department


@pytest.fixture()
def user():
    return User.objects.create(username="analytics-user", email="analytics@example.com")


def _create_correspondence(division, department, days_ago: int, status: str, priority: str, completed_offset: int | None):
    received_date = (timezone.now() - timedelta(days=days_ago)).date()
    completed_at = timezone.now() - timedelta(days=completed_offset) if completed_offset is not None else None
    return Correspondence.objects.create(
        reference_number=f"REF-{received_date}-{status}-{priority}",
        subject="Test correspondence",
        source=Correspondence.Source.INTERNAL,
        received_date=received_date,
        status=status,
        priority=priority,
        division=division,
        department=department,
        completed_at=completed_at,
    )


@pytest.mark.django_db
def test_performance_analytics_reports_observed_timestamp_gaps_and_omits_invalid_milestones(org_hierarchy, user):
    _, division, department = org_hierarchy
    now = timezone.now()
    completed = _create_correspondence(
        division=division,
        department=department,
        days_ago=10,
        status=Correspondence.Status.COMPLETED,
        priority=Correspondence.Priority.MEDIUM,
        completed_offset=2,
    )
    Correspondence.objects.filter(pk=completed.pk).update(
        created_at=now - timedelta(days=10),
        completed_at=now - timedelta(days=2),
    )
    completed.refresh_from_db()
    route = Minute.objects.create(
        correspondence=completed,
        user=user,
        minute_text="Routed",
        action_type=Minute.ActionType.FORWARD,
        to_user=user,
    )
    Minute.objects.filter(pk=route.pk).update(timestamp=now - timedelta(days=8))
    approval = Minute.objects.create(
        correspondence=completed,
        user=user,
        minute_text="Approved",
        action_type=Minute.ActionType.APPROVE,
    )
    Minute.objects.filter(pk=approval.pk).update(timestamp=now - timedelta(days=5))
    recalled_route = Minute.objects.create(
        correspondence=completed,
        user=user,
        minute_text="Recalled route",
        action_type=Minute.ActionType.FORWARD,
        to_user=user,
        is_recalled=True,
    )
    Minute.objects.filter(pk=recalled_route.pk).update(timestamp=now - timedelta(days=9))
    no_approval = _create_correspondence(
        division=division,
        department=department,
        days_ago=9,
        status=Correspondence.Status.COMPLETED,
        priority=Correspondence.Priority.LOW,
        completed_offset=1,
    )
    Correspondence.objects.filter(pk=no_approval.pk).update(
        created_at=now - timedelta(days=9),
        completed_at=now - timedelta(days=1),
    )
    recalled_only = Minute.objects.create(
        correspondence=no_approval,
        user=user,
        minute_text="Only recalled route",
        action_type=Minute.ActionType.FORWARD,
        to_user=user,
        is_recalled=True,
    )
    Minute.objects.filter(pk=recalled_only.pk).update(timestamp=now - timedelta(days=8))
    out_of_order = _create_correspondence(
        division=division,
        department=department,
        days_ago=7,
        status=Correspondence.Status.COMPLETED,
        priority=Correspondence.Priority.HIGH,
        completed_offset=1,
    )
    Correspondence.objects.filter(pk=out_of_order.pk).update(
        created_at=now - timedelta(days=7),
        completed_at=now - timedelta(days=1),
    )
    later_route = Minute.objects.create(
        correspondence=out_of_order,
        user=user,
        minute_text="Later route",
        action_type=Minute.ActionType.FORWARD,
        to_user=user,
    )
    Minute.objects.filter(pk=later_route.pk).update(timestamp=now - timedelta(days=2))
    earlier_approval = Minute.objects.create(
        correspondence=out_of_order,
        user=user,
        minute_text="Earlier approval",
        action_type=Minute.ActionType.APPROVE,
    )
    Minute.objects.filter(pk=earlier_approval.pk).update(timestamp=now - timedelta(days=4))

    payload = compute_performance_metrics(range_days=30)

    gaps = payload["stageDurations"]
    assert gaps["definition"] == "Observed timestamp gaps"
    assert gaps["registrationToRouting"]["count"] == 2
    assert gaps["registrationToRouting"]["averageHours"] == pytest.approx(84, abs=0.1)
    assert gaps["routingToApproval"]["count"] == 1
    assert gaps["routingToApproval"]["averageHours"] == pytest.approx(72, abs=0.1)
    assert gaps["approvalToCompletion"]["count"] == 2
    assert gaps["approvalToCompletion"]["averageHours"] == pytest.approx(72, abs=0.1)
    assert gaps["endToEnd"]["count"] == 3
    assert gaps["endToEnd"]["averageHours"] == pytest.approx(176, abs=0.1)
    assert route.is_recalled is False and approval.is_recalled is False and recalled_route.is_recalled is True


@pytest.mark.django_db
def test_compute_performance_metrics_counts(org_hierarchy, user):
    _, division, department = org_hierarchy
    completed = _create_correspondence(
        division=division,
        department=department,
        days_ago=5,
        status=Correspondence.Status.COMPLETED,
        priority=Correspondence.Priority.MEDIUM,
        completed_offset=1,
    )
    Minute.objects.create(
        correspondence=completed,
        user=user,
        minute_text="Reviewed",
        acted_by_secretary=True,
        timestamp=timezone.now() - timedelta(days=2),
    )
    _create_correspondence(
        division=division,
        department=department,
        days_ago=3,
        status=Correspondence.Status.PENDING,
        priority=Correspondence.Priority.URGENT,
        completed_offset=None,
    )

    payload = compute_performance_metrics(range_days=30)

    assert payload["totals"]["total"] == 2
    assert payload["sla"]["total"] == 1
    assert payload["divisionPerformance"][0]["workload"] == 2
    assert any(role["role"] == "Secretary" for role in payload["rolePerformance"])


@pytest.mark.django_db
def test_compute_executive_metrics_includes_division_and_documents(org_hierarchy, user):
    _, division, department = org_hierarchy
    corr = _create_correspondence(
        division=division,
        department=department,
        days_ago=10,
        status=Correspondence.Status.COMPLETED,
        priority=Correspondence.Priority.HIGH,
        completed_offset=2,
    )
    Document.objects.create(
        title="Policy Draft",
        document_type=Document.DocumentType.POLICY,
        status=Document.DocumentStatus.PUBLISHED,
        sensitivity=Document.Sensitivity.INTERNAL,
        author=user,
    )

    Minute.objects.create(
        correspondence=corr,
        user=user,
        minute_text="Escalated",
        acted_by_assistant=True,
        timestamp=timezone.now() - timedelta(days=5),
    )

    payload = compute_executive_metrics(range_days=30)

    assert payload["divisionMetrics"]
    assert payload["sensitivityBreakdown"]
    assert payload["weeklyTrend"]


@pytest.mark.django_db
def test_compute_report_metrics_respects_division_filter(org_hierarchy):
    directorate, division, department = org_hierarchy
    other_division = Division.objects.create(name="Port Ops", code="PO", directorate=directorate)

    _create_correspondence(
        division=division,
        department=department,
        days_ago=4,
        status=Correspondence.Status.COMPLETED,
        priority=Correspondence.Priority.MEDIUM,
        completed_offset=1,
    )
    _create_correspondence(
        division=other_division,
        department=None,
        days_ago=2,
        status=Correspondence.Status.PENDING,
        priority=Correspondence.Priority.LOW,
        completed_offset=None,
    )

    all_payload = compute_report_metrics(range_days=30)
    filtered_payload = compute_report_metrics(range_days=30, division_id=str(division.id))

    assert all_payload["metrics"]["total"] == 2
    assert filtered_payload["metrics"]["total"] == 1
    assert filtered_payload["divisionSummary"][0]["name"] in (division.code, division.name)
