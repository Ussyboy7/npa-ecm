"""URL routes for common platform endpoints."""

from django.urls import path

from .protected_media import ProtectedMediaView
from .views import (
    SystemStatusView,
    AdminDashboardOverviewView,
    UsersByRoleView,
    AdminDashboardAlertsView,
    OnlineUsersView,
    SystemMetricsView,
    BackupLatestDownloadView,
    LiveDashboardView,
)

urlpatterns = [
    path("system-status/", SystemStatusView.as_view(), name="system-status"),
    path(
        "admin-dashboard/overview/",
        AdminDashboardOverviewView.as_view(),
        name="admin-dashboard-overview",
    ),
    path(
        "admin-dashboard/users-by-role/",
        UsersByRoleView.as_view(),
        name="admin-dashboard-users-by-role",
    ),
    path(
        "admin-dashboard/alerts/",
        AdminDashboardAlertsView.as_view(),
        name="admin-dashboard-alerts",
    ),
    path(
        "admin-dashboard/online-users/",
        OnlineUsersView.as_view(),
        name="admin-dashboard-online-users",
    ),
    path(
        "admin-dashboard/metrics/",
        SystemMetricsView.as_view(),
        name="admin-dashboard-metrics",
    ),
    path(
        "admin-dashboard/backup/download/",
        BackupLatestDownloadView.as_view(),
        name="admin-dashboard-backup-download",
    ),
    path(
        "admin-dashboard/live/",
        LiveDashboardView.as_view(),
        name="admin-dashboard-live",
    ),
    path("protected-media/<path:path>", ProtectedMediaView.as_view(), name="protected-media"),
]
