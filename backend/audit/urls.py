"""URL routes for audit logs."""

from rest_framework.routers import DefaultRouter

from .views import ActivityLogViewSet

router = DefaultRouter()
router.register(r"logs", ActivityLogViewSet, basename="activity-log")

urlpatterns = router.urls

