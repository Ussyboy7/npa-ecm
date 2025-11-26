"""URL routes for the analytics app."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AnalyticsExportView,
    DivisionPerformanceSnapshotViewSet,
    EfficiencyAnalysisView,
    EnhancedDivisionPerformanceView,
    EnhancedSLAAnalyticsView,
    EscalationRuleViewSet,
    EscalationViewSet,
    ExecutiveAnalyticsView,
    ExecutivePortfolioView,
    ExecutiveRecordsSearchView,
    PerformanceAnalyticsView,
    ReportSnapshotViewSet,
    ReportsAnalyticsView,
    SLAConfigurationViewSet,
    StaffPerformanceSnapshotViewSet,
    UsageMetricViewSet,
)

router = DefaultRouter()
router.register(r"reports", ReportSnapshotViewSet, basename="report-snapshot")
router.register(r"metrics", UsageMetricViewSet, basename="usage-metric")
router.register(r"sla-config", SLAConfigurationViewSet, basename="sla-config")
router.register(r"escalation-rules", EscalationRuleViewSet, basename="escalation-rule")
router.register(r"escalations", EscalationViewSet, basename="escalation")
router.register(r"division-snapshots", DivisionPerformanceSnapshotViewSet, basename="division-snapshot")
router.register(r"staff-snapshots", StaffPerformanceSnapshotViewSet, basename="staff-snapshot")

urlpatterns = router.urls + [
    # Original analytics endpoints
    path("performance/", PerformanceAnalyticsView.as_view(), name="analytics-performance"),
    path("executive/", ExecutiveAnalyticsView.as_view(), name="analytics-executive"),
    path("executive/portfolio/", ExecutivePortfolioView.as_view(), name="analytics-executive-portfolio"),
    path("executive/records/", ExecutiveRecordsSearchView.as_view(), name="analytics-executive-records"),
    path("insights/", ReportsAnalyticsView.as_view(), name="analytics-insights"),
    path("export/", AnalyticsExportView.as_view(), name="analytics-export"),
    
    # Enhanced analytics endpoints
    path("sla/", EnhancedSLAAnalyticsView.as_view(), name="analytics-sla"),
    path("division-performance/", EnhancedDivisionPerformanceView.as_view(), name="analytics-division-performance"),
    path("efficiency/", EfficiencyAnalysisView.as_view(), name="analytics-efficiency"),
]
