"""Analytics endpoints."""

from __future__ import annotations

import csv
import io
from typing import Any, Iterable, Sequence

from django.http import HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    DivisionPerformanceSnapshot,
    Escalation,
    EscalationRule,
    ReportSnapshot,
    SLAConfiguration,
    StaffPerformanceSnapshot,
    UsageMetric,
)
from .serializers import (
    DivisionPerformanceSnapshotSerializer,
    EscalationAcknowledgeSerializer,
    EscalationResolveSerializer,
    EscalationRuleCreateUpdateSerializer,
    EscalationRuleSerializer,
    EscalationSerializer,
    ReportSnapshotSerializer,
    SLAConfigurationCreateUpdateSerializer,
    SLAConfigurationSerializer,
    StaffPerformanceSnapshotSerializer,
    UsageMetricSerializer,
)
from .services import AnalyticsService


class WorkflowAdminMixin:
    """SLA and escalation rule administration."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_manage_org_structure")


class AnalyticsReadMixin:
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_analytics")


class ReportSnapshotViewSet(viewsets.ModelViewSet):
    queryset = ReportSnapshot.objects.select_related("generated_for")
    serializer_class = ReportSnapshotSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["slug", "generated_for"]
    search_fields = ["title", "description", "slug"]
    ordering_fields = ["generated_at", "created_at"]
    ordering = ["-generated_at"]

    def perform_create(self, serializer):
        owner = serializer.validated_data.get("generated_for") or self.request.user
        serializer.save(generated_for=owner)


class UsageMetricViewSet(viewsets.ModelViewSet):
    queryset = UsageMetric.objects.all()
    serializer_class = UsageMetricSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["metric"]
    ordering_fields = ["recorded_at", "value"]
    ordering = ["-recorded_at"]


# =============================================================================
# SLA Configuration ViewSet
# =============================================================================


class SLAConfigurationViewSet(WorkflowAdminMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing SLA configurations.
    """

    queryset = SLAConfiguration.objects.select_related("division").order_by(
        "priority", "correspondence_type", "-created_at"
    )
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for admin viewset
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["priority", "correspondence_type", "division", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["priority", "target_days", "created_at"]
    ordering = ["priority", "-created_at"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return SLAConfigurationCreateUpdateSerializer
        return SLAConfigurationSerializer

    @action(detail=False, methods=["get"])
    def targets(self, request):
        """Get the current global SLA targets as a simple dict."""
        targets = SLAConfiguration.get_default_sla_targets()
        return Response(targets)

    @action(detail=False, methods=["post"])
    def bulk_update(self, request):
        """
        Bulk update global SLA targets.
        Expected format: {"urgent": 2, "high": 3, "medium": 5, "low": 7}
        """
        data = request.data
        updated = []
        
        for priority, target_days in data.items():
            if priority not in SLAConfiguration.Priority.values:
                continue
            
            sla, created = SLAConfiguration.objects.update_or_create(
                priority=priority,
                correspondence_type=SLAConfiguration.CorrespondenceType.ALL,
                division=None,
                defaults={
                    "name": f"Global {priority.title()} SLA",
                    "target_days": target_days,
                    "is_active": True,
                },
            )
            updated.append(SLAConfigurationSerializer(sla).data)
        
        return Response({"updated": updated})

    @action(detail=False, methods=["get"])
    def choices(self, request):
        """Get available choices for priority and correspondence type."""
        return Response({
            "priorities": [
                {"value": choice[0], "label": choice[1]}
                for choice in SLAConfiguration.Priority.choices
            ],
            "correspondence_types": [
                {"value": choice[0], "label": choice[1]}
                for choice in SLAConfiguration.CorrespondenceType.choices
            ],
        })


# =============================================================================
# Escalation Rule ViewSet
# =============================================================================


class EscalationRuleViewSet(WorkflowAdminMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing escalation rules.
    """

    queryset = EscalationRule.objects.prefetch_related("divisions").order_by(
        "priority_order", "name"
    )
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for admin viewset
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["trigger_type", "action_type", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["priority_order", "name", "created_at"]
    ordering = ["priority_order", "name"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return EscalationRuleCreateUpdateSerializer
        return EscalationRuleSerializer

    @action(detail=False, methods=["get"])
    def choices(self, request):
        """Get available choices for trigger and action types."""
        return Response({
            "trigger_types": [
                {"value": choice[0], "label": choice[1]}
                for choice in EscalationRule.TriggerType.choices
            ],
            "action_types": [
                {"value": choice[0], "label": choice[1]}
                for choice in EscalationRule.ActionType.choices
            ],
        })

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        """
        Test an escalation rule against current data.
        Returns a list of correspondence items that would match.
        """
        rule = self.get_object()
        from correspondence.models import Correspondence
        
        # Get pending items
        items = Correspondence.objects.filter(
            status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]
        ).select_related("division")[:100]
        
        matches = []
        for item in items:
            if rule.matches_correspondence(item):
                matches.append({
                    "id": str(item.id),
                    "reference": item.reference_number,
                    "subject": item.subject,
                    "priority": item.priority,
                    "division": item.division.name if item.division else None,
                })
        
        return Response({
            "rule_id": str(rule.id),
            "rule_name": rule.name,
            "matches_count": len(matches),
            "matches": matches[:20],  # Limit preview
        })

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        """Toggle the active status of a rule."""
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save(update_fields=["is_active", "updated_at"])
        return Response(EscalationRuleSerializer(rule).data)


# =============================================================================
# Escalation ViewSet
# =============================================================================


class EscalationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing escalations.
    """

    queryset = Escalation.objects.select_related(
        "correspondence", "rule", "acknowledged_by", "resolved_by"
    ).order_by("-triggered_at")
    serializer_class = EscalationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for admin viewset
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "rule", "correspondence"]
    search_fields = ["correspondence__reference_number", "correspondence__subject", "trigger_reason"]
    ordering_fields = ["triggered_at", "status"]
    ordering = ["-triggered_at"]
    http_method_names = ["get", "post", "patch", "head", "options"]  # No PUT or DELETE

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        """Acknowledge an escalation."""
        escalation = self.get_object()
        
        if escalation.status not in [Escalation.Status.PENDING, Escalation.Status.SENT]:
            return Response(
                {"error": "Can only acknowledge pending or sent escalations"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        escalation.status = Escalation.Status.ACKNOWLEDGED
        escalation.acknowledged_at = timezone.now()
        escalation.acknowledged_by = request.user
        escalation.save(update_fields=["status", "acknowledged_at", "acknowledged_by", "updated_at"])
        
        return Response(EscalationSerializer(escalation).data)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Resolve an escalation."""
        escalation = self.get_object()
        serializer = EscalationResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        escalation.status = Escalation.Status.RESOLVED
        escalation.resolved_at = timezone.now()
        escalation.resolved_by = request.user
        escalation.resolution_notes = serializer.validated_data.get("resolution_notes", "")
        escalation.save(update_fields=[
            "status", "resolved_at", "resolved_by", "resolution_notes", "updated_at"
        ])
        
        return Response(EscalationSerializer(escalation).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get escalation summary statistics."""
        now = timezone.now()
        today = now.date()
        week_ago = today - timezone.timedelta(days=7)
        
        total = Escalation.objects.count()
        pending = Escalation.objects.filter(status=Escalation.Status.PENDING).count()
        sent = Escalation.objects.filter(status=Escalation.Status.SENT).count()
        acknowledged = Escalation.objects.filter(status=Escalation.Status.ACKNOWLEDGED).count()
        resolved_today = Escalation.objects.filter(
            status=Escalation.Status.RESOLVED,
            resolved_at__date=today,
        ).count()
        triggered_this_week = Escalation.objects.filter(triggered_at__date__gte=week_ago).count()
        
        return Response({
            "total": total,
            "pending": pending,
            "sent": sent,
            "acknowledged": acknowledged,
            "resolved_today": resolved_today,
            "triggered_this_week": triggered_this_week,
            "active": pending + sent + acknowledged,
        })


# =============================================================================
# Performance Snapshot ViewSets
# =============================================================================


class DivisionPerformanceSnapshotViewSet(AnalyticsReadMixin, viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for division performance snapshots."""

    queryset = DivisionPerformanceSnapshot.objects.select_related("division").order_by(
        "-snapshot_date", "division"
    )
    serializer_class = DivisionPerformanceSnapshotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["division", "snapshot_date"]
    ordering_fields = ["snapshot_date", "sla_compliance_rate", "efficiency_score"]
    ordering = ["-snapshot_date"]

    @action(detail=False, methods=["get"])
    def latest(self, request):
        """Get the latest snapshot for each division."""
        from django.db.models import Max, Subquery, OuterRef
        
        latest_dates = DivisionPerformanceSnapshot.objects.values("division").annotate(
            latest_date=Max("snapshot_date")
        )
        
        snapshots = DivisionPerformanceSnapshot.objects.filter(
            snapshot_date__in=Subquery(
                DivisionPerformanceSnapshot.objects.filter(
                    division=OuterRef("division")
                ).values("snapshot_date").order_by("-snapshot_date")[:1]
            )
        ).select_related("division")
        
        return Response(DivisionPerformanceSnapshotSerializer(snapshots, many=True).data)

    @action(detail=False, methods=["get"])
    def trend(self, request):
        """Get performance trend for a division over time."""
        division_id = request.query_params.get("division_id")
        days = int(request.query_params.get("days", 30))
        
        if not division_id:
            return Response(
                {"error": "division_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        snapshots = DivisionPerformanceSnapshot.objects.filter(
            division_id=division_id,
            snapshot_date__gte=start_date,
        ).order_by("snapshot_date")
        
        return Response(DivisionPerformanceSnapshotSerializer(snapshots, many=True).data)


class StaffPerformanceSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for staff performance snapshots."""

    queryset = StaffPerformanceSnapshot.objects.select_related("user").order_by(
        "-week_start", "user"
    )
    serializer_class = StaffPerformanceSnapshotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["user", "week_start"]
    ordering_fields = ["week_start", "items_completed", "sla_compliance_rate"]
    ordering = ["-week_start"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Non-admin users can only see their own performance
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=False, methods=["get"])
    def my_performance(self, request):
        """Get performance snapshots for the current user."""
        snapshots = StaffPerformanceSnapshot.objects.filter(
            user=request.user
        ).order_by("-week_start")[:12]  # Last 12 weeks
        
        return Response(StaffPerformanceSnapshotSerializer(snapshots, many=True).data)

    @action(detail=False, methods=["get"])
    def leaderboard(self, request):
        """Get top performers for the current week."""
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_analytics")
        from django.db.models import F
        
        # Get the most recent week
        latest = StaffPerformanceSnapshot.objects.order_by("-week_start").first()
        if not latest:
            return Response([])
        
        top_performers = StaffPerformanceSnapshot.objects.filter(
            week_start=latest.week_start,
        ).select_related("user").order_by("-items_completed")[:10]
        
        return Response(StaffPerformanceSnapshotSerializer(top_performers, many=True).data)


# =============================================================================
# Original Analytics Views
# =============================================================================


class PerformanceAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_analytics")
        range_days = int(request.query_params.get("range", 30))
        data = AnalyticsService.build_performance_payload(range_days=range_days)
        return Response(data)


class ExecutiveAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_executive_dashboard")
        range_days = int(request.query_params.get("range", 30))
        data = AnalyticsService.build_executive_payload(range_days=range_days)
        return Response(data)


class ExecutivePortfolioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_executive_dashboard")
        range_days = int(request.query_params.get("range", 30))
        records_limit = int(request.query_params.get("records", 8))
        records_query = request.query_params.get("records_query")
        data = AnalyticsService.build_executive_portfolio(
            user=request.user,
            range_days=range_days,
            records_limit=max(1, min(records_limit, 25)),
            records_query=records_query,
        )
        return Response(data)


class ExecutiveRecordsSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_executive_dashboard")
        query = (request.query_params.get("query") or "").strip()
        limit = int(request.query_params.get("limit", 20))
        data = AnalyticsService.search_executive_records(
            user=request.user,
            query=query,
            limit=max(1, min(limit, 50)),
        )
        return Response(data)


class ReportsAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_reports")
        range_days = int(request.query_params.get("range", 30))
        division_id = request.query_params.get("divisionId")
        data = AnalyticsService.build_reports_payload(range_days=range_days, division_id=division_id)
        return Response(data)


# =============================================================================
# Enhanced Analytics Views
# =============================================================================


class EnhancedSLAAnalyticsView(APIView):
    """
    Enhanced SLA analytics with detailed breakdown.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        range_days = int(request.query_params.get("range", 30))
        division_id = request.query_params.get("division_id")
        
        require_permission(request.user, "can_access_analytics")
        data = AnalyticsService.build_enhanced_sla_payload(
            range_days=range_days,
            division_id=division_id,
        )
        return Response(data)


class EnhancedDivisionPerformanceView(APIView):
    """
    Enhanced division performance analytics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_analytics")
        range_days = int(request.query_params.get("range", 30))
        directorate_id = request.query_params.get("directorate_id")
        
        data = AnalyticsService.build_enhanced_division_performance(
            range_days=range_days,
            directorate_id=directorate_id,
        )
        return Response(data)


class CaseStatisticsView(APIView):
    """
    Case statistics and analytics.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_analytics")
        from correspondence.models import Case
        from django.db.models import Count, Q, Avg
        from django.utils import timezone
        from datetime import timedelta
        
        range_days = int(request.query_params.get("range", 30))
        division_id = request.query_params.get("division_id")
        
        # Date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=range_days)
        
        # Base queryset
        queryset = Case.objects.filter(is_deleted=False, opened_at__gte=start_date)
        
        if division_id:
            queryset = queryset.filter(division_id=division_id)
        
        # Total cases
        total_cases = queryset.count()
        
        # Cases by status
        cases_by_status = queryset.values('status').annotate(count=Count('id')).order_by('status')
        status_breakdown = {item['status']: item['count'] for item in cases_by_status}
        
        # Cases by type
        cases_by_type = queryset.values('case_type').annotate(count=Count('id')).order_by('case_type')
        type_breakdown = {item['case_type']: item['count'] for item in cases_by_type}
        
        # Cases by priority
        cases_by_priority = queryset.values('priority').annotate(count=Count('id')).order_by('priority')
        priority_breakdown = {item['priority']: item['count'] for item in cases_by_priority}
        
        # Average resolution time (for resolved/closed cases)
        resolved_cases = queryset.filter(
            status__in=[Case.Status.RESOLVED, Case.Status.CLOSED],
            resolved_at__isnull=False
        )
        avg_resolution_days = None
        if resolved_cases.exists():
            resolution_times = []
            for case in resolved_cases:
                if case.resolved_at and case.opened_at:
                    delta = case.resolved_at - case.opened_at
                    resolution_times.append(delta.total_seconds() / 86400)  # Convert to days
            if resolution_times:
                avg_resolution_days = sum(resolution_times) / len(resolution_times)
        
        # Cases opened over time (daily)
        from django.db.models.functions import TruncDate
        cases_over_time = queryset.annotate(
            date=TruncDate('opened_at')
        ).values('date').annotate(count=Count('id')).order_by('date')
        
        # Cases by division
        cases_by_division = queryset.filter(division__isnull=False).values(
            'division__id', 'division__name'
        ).annotate(count=Count('id')).order_by('-count')[:10]
        
        # Cases by department
        cases_by_department = queryset.filter(department__isnull=False).values(
            'department__id', 'department__name'
        ).annotate(count=Count('id')).order_by('-count')[:10]
        
        # Top assigned users
        top_assigned = queryset.filter(assigned_to__isnull=False).values(
            'assigned_to__id', 'assigned_to__first_name', 'assigned_to__last_name'
        ).annotate(count=Count('id')).order_by('-count')[:10]
        
        # Cases with completion packages
        cases_with_packages = queryset.filter(completion_package__isnull=False).count()
        
        data = {
            "summary": {
                "total_cases": total_cases,
                "open_cases": status_breakdown.get(Case.Status.OPEN, 0),
                "in_progress_cases": status_breakdown.get(Case.Status.IN_PROGRESS, 0),
                "resolved_cases": status_breakdown.get(Case.Status.RESOLVED, 0),
                "closed_cases": status_breakdown.get(Case.Status.CLOSED, 0),
                "archived_cases": status_breakdown.get(Case.Status.ARCHIVED, 0),
                "cases_with_packages": cases_with_packages,
                "avg_resolution_days": round(avg_resolution_days, 2) if avg_resolution_days else None,
            },
            "breakdown": {
                "by_status": status_breakdown,
                "by_type": type_breakdown,
                "by_priority": priority_breakdown,
            },
            "trends": {
                "cases_over_time": [
                    {
                        "date": item["date"].isoformat() if item["date"] else None,
                        "count": item["count"]
                    }
                    for item in cases_over_time
                ],
            },
            "top_assignments": {
                "by_division": [
                    {
                        "id": item["division__id"],
                        "name": item["division__name"],
                        "count": item["count"]
                    }
                    for item in cases_by_division
                ],
                "by_department": [
                    {
                        "id": item["department__id"],
                        "name": item["department__name"],
                        "count": item["count"]
                    }
                    for item in cases_by_department
                ],
                "by_user": [
                    {
                        "id": item["assigned_to__id"],
                        "name": f"{item['assigned_to__first_name']} {item['assigned_to__last_name']}".strip(),
                        "count": item["count"]
                    }
                    for item in top_assigned
                ],
            },
            "range_days": range_days,
        }
        
        return Response(data)


class EfficiencyAnalysisView(APIView):
    """
    Detailed efficiency analysis including staff metrics and bottlenecks.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_analytics")
        range_days = int(request.query_params.get("range", 30))
        division_id = request.query_params.get("division_id")
        
        data = AnalyticsService.build_efficiency_analysis(
            range_days=range_days,
            division_id=division_id,
        )
        return Response(data)


# =============================================================================
# Export View
# =============================================================================


class AnalyticsExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        export_type = request.query_params.get("type", "executive").lower()
        export_format = request.query_params.get("format", "csv").lower()
        range_days = int(request.query_params.get("range", 30))
        division_id = request.query_params.get("divisionId")

        if export_type in {"performance", "sla"}:
            require_permission(request.user, "can_access_analytics")
        elif export_type == "reports":
            require_permission(request.user, "can_access_reports")
        elif export_type == "executive":
            require_permission(request.user, "can_access_executive_dashboard")
        else:
            require_permission(request.user, "can_access_reports")

        dataset = self._build_dataset(export_type, range_days, division_id)
        filename = f"analytics-{export_type}-{range_days}d"

        if export_format == "csv":
            return self._csv_response(filename + ".csv", dataset["headers"], dataset["rows"])
        if export_format == "pdf":
            return self._pdf_response(filename + ".pdf", dataset["title"], dataset["headers"], dataset["rows"])

        raise ValidationError({"format": "Unsupported export format"})

    def _build_dataset(self, export_type: str, range_days: int, division_id: str | None) -> dict[str, Any]:
        if export_type == "performance":
            payload = AnalyticsService.build_performance_payload(range_days=range_days)
            headers = ["Division", "Workload", "Completed", "Completion Rate", "Avg Turnaround"]
            rows = [
                [
                    entry.get("fullName") or entry["name"],
                    entry["workload"],
                    entry["completed"],
                    f"{entry['completionRate']}%",
                    entry["avgTurnaround"],
                ]
                for entry in payload.get("divisionPerformance", [])
            ]
            title = f"Performance Summary - Last {range_days} days"
        elif export_type == "reports":
            payload = AnalyticsService.build_reports_payload(range_days=range_days, division_id=division_id)
            headers = ["Division", "Total", "Completed", "Pending", "Completion Rate"]
            rows = [
                [entry["name"], entry["total"], entry["completed"], entry["pending"], f"{entry['rate']}%"]
                for entry in payload.get("divisionSummary", [])
            ]
            title = f"Correspondence Reports - Last {range_days} days"
        elif export_type == "executive":
            payload = AnalyticsService.build_executive_payload(range_days=range_days)
            headers = ["Division", "Documents", "Avg Turnaround", "High Priority", "Backlog"]
            rows = [
                [
                    entry.get("fullName") or entry["name"],
                    entry["workload"],
                    entry["avgTurnaround"],
                    entry.get("highPriority", 0),
                    entry.get("backlog", 0),
                ]
                for entry in payload.get("divisionMetrics", [])
            ]
            title = f"Executive Dashboard Snapshot - Last {range_days} days"
        elif export_type == "sla":
            payload = AnalyticsService.build_enhanced_sla_payload(range_days=range_days, division_id=division_id)
            headers = ["Division", "Total", "Compliant", "Breached", "At Risk", "Compliance Rate"]
            rows = [
                [
                    entry["name"],
                    entry["total"],
                    entry["compliant"],
                    entry["breached"],
                    entry.get("atRisk", 0),
                    f"{entry['complianceRate']}%",
                ]
                for entry in payload.get("byDivision", [])
            ]
            title = f"SLA Report - Last {range_days} days"
        else:
            raise ValidationError({"type": "Unsupported export type"})

        return {"headers": headers, "rows": rows, "title": title}

    def _csv_response(self, filename: str, headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> HttpResponse:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    def _pdf_response(self, filename: str, title: str, headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> HttpResponse:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        text_object = c.beginText(40, height - 50)
        text_object.setFont("Helvetica-Bold", 14)
        text_object.textLine(title)
        text_object.moveCursor(0, 20)
        text_object.setFont("Helvetica", 11)
        text_object.textLine(", ".join(headers))
        text_object.moveCursor(0, 10)

        for row in rows:
            text_object.textLine(", ".join(str(value) for value in row))
            if text_object.getY() <= 40:
                c.drawText(text_object)
                c.showPage()
                text_object = c.beginText(40, height - 50)
                text_object.setFont("Helvetica", 11)

        c.drawText(text_object)
        c.showPage()
        c.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
