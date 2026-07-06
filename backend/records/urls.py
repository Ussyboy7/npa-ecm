"""URL routes for records governance."""

from rest_framework.routers import DefaultRouter

from .views import (
    DisposalRequestViewSet,
    LegalHoldViewSet,
    RecordsReportViewSet,
    RetentionScheduleViewSet,
)

router = DefaultRouter()
router.register(r"retention-schedules", RetentionScheduleViewSet, basename="retention-schedule")
router.register(r"legal-holds", LegalHoldViewSet, basename="legal-hold")
router.register(r"disposal-requests", DisposalRequestViewSet, basename="disposal-request")
router.register(r"reports", RecordsReportViewSet, basename="records-report")

urlpatterns = router.urls
