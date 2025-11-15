"""URL routes for the analytics app."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AnalyticsExportView,
    ExecutiveAnalyticsView,
    ExecutivePortfolioView,
    ExecutiveRecordsSearchView,
    PerformanceAnalyticsView,
    ReportSnapshotViewSet,
    ReportsAnalyticsView,
    UsageMetricViewSet,
)

router = DefaultRouter()
router.register(r"reports", ReportSnapshotViewSet, basename="report-snapshot")
router.register(r"metrics", UsageMetricViewSet, basename="usage-metric")

urlpatterns = router.urls + [
    path("performance/", PerformanceAnalyticsView.as_view(), name="analytics-performance"),
    path("executive/", ExecutiveAnalyticsView.as_view(), name="analytics-executive"),
    path("executive/portfolio/", ExecutivePortfolioView.as_view(), name="analytics-executive-portfolio"),
    path("executive/records/", ExecutiveRecordsSearchView.as_view(), name="analytics-executive-records"),
    path("insights/", ReportsAnalyticsView.as_view(), name="analytics-insights"),
    path("export/", AnalyticsExportView.as_view(), name="analytics-export"),
]
