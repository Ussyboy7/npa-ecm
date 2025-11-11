"""URL routes for the analytics app."""

from rest_framework.routers import DefaultRouter

from .views import ReportSnapshotViewSet, UsageMetricViewSet


router = DefaultRouter()
router.register(r"reports", ReportSnapshotViewSet, basename="report-snapshot")
router.register(r"metrics", UsageMetricViewSet, basename="usage-metric")


urlpatterns = router.urls

