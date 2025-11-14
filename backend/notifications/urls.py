"""URL routes for notifications."""

from rest_framework.routers import DefaultRouter

from .views import NotificationPreferencesViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"preferences", NotificationPreferencesViewSet, basename="notification-preference")

urlpatterns = router.urls

