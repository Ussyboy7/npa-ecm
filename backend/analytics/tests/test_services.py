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
