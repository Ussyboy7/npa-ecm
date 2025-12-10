"""URL configuration for records management module."""

from rest_framework.routers import DefaultRouter

from records.views import (
    DispositionViewSet,
    LegalHoldViewSet,
    RetentionPolicyViewSet,
    RetentionScheduleViewSet,
)

router = DefaultRouter()
router.register(r"policies", RetentionPolicyViewSet, basename="retention-policy")
router.register(r"legal-holds", LegalHoldViewSet, basename="legal-hold")
router.register(r"dispositions", DispositionViewSet, basename="disposition")
router.register(r"schedules", RetentionScheduleViewSet, basename="retention-schedule")

urlpatterns = router.urls

