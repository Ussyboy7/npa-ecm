"""URL routes for common platform endpoints."""

from django.urls import path

from .protected_media import ProtectedMediaView
from .views import SystemStatusView

urlpatterns = [
    path("system-status/", SystemStatusView.as_view(), name="system-status"),
    path("protected-media/<path:path>", ProtectedMediaView.as_view(), name="protected-media"),
]
