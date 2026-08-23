"""Common views and utilities."""

from __future__ import annotations

import glob
import os
import time

from datetime import timedelta

from django.conf import settings
from django.db import connection
from django.db.models import Count
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

_START_TIME = time.time()


def _check_services() -> tuple[dict[str, str], bool]:
    """Check database, cache, and celery broker health."""
    services: dict[str, str] = {}
    overall_healthy = True

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        services["database"] = "healthy"
    except Exception as e:
        services["database"] = f"unhealthy: {e}"
        overall_healthy = False

    try:
        cache.set("health_probe", "1", 10)
        services["cache"] = "healthy" if cache.get("health_probe") == "1" else "unhealthy"
        if services["cache"] != "healthy":
            overall_healthy = False
    except Exception as e:
        services["cache"] = f"unhealthy: {e}"
        overall_healthy = False

    try:
        import redis

        broker_url = getattr(settings, "CELERY_BROKER_URL", "")
        if broker_url.startswith("redis://"):
            client = redis.from_url(broker_url, socket_connect_timeout=2, socket_timeout=2)
            services["celery_broker"] = "healthy" if client.ping() else "unhealthy"
        else:
            services["celery_broker"] = "skipped"
    except Exception as e:
        services["celery_broker"] = f"unhealthy: {e}"
        overall_healthy = False

    return services, overall_healthy


class SystemStatusView(APIView):
    """ICT admin dashboard aggregate: health, activity, and integration summary."""

    permission_classes = [IsAuthenticated]

    def _ensure_ict_admin(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_system_health")

    def get(self, request):
        self._ensure_ict_admin(request)
        now = timezone.now()
        since_24h = now - timedelta(hours=24)

        services, overall_healthy = _check_services()

        from accounts.models import User
        from audit.models import ActivityLog
        from audit.serializers import ActivityLogSerializer
        from correspondence.models import Correspondence
        from integrations.models import IntegrationLog
        from analytics.models import Escalation

        users_total = User.objects.filter(is_active=True).count()
        users_active_24h = User.objects.filter(last_login__gte=since_24h).count()

        correspondence_active = Correspondence.objects.filter(is_deleted=False).exclude(
            status=Correspondence.Status.COMPLETED
        ).count()
        correspondence_completed_24h = Correspondence.objects.filter(
            completed_at__gte=since_24h,
            is_deleted=False,
        ).count()

        integration_summary = {
            log_type: {"success": 0, "failed": 0, "pending": 0}
            for log_type, _label in IntegrationLog.LogType.choices
        }
        for row in (
            IntegrationLog.objects.filter(created_at__gte=since_24h)
            .values("log_type", "status")
            .annotate(count=Count("id"))
        ):
            bucket = integration_summary.setdefault(row["log_type"], {"success": 0, "failed": 0, "pending": 0})
            bucket[row["status"]] = row["count"]

        recent_logs = ActivityLog.objects.select_related("user").order_by("-timestamp")[:15]
        escalations_pending = Escalation.objects.filter(
            status__in=[Escalation.Status.PENDING, Escalation.Status.SENT]
        ).count()

        beat_tasks_enabled = 0
        beat_tasks_total = 0
        try:
            from django_celery_beat.models import PeriodicTask

            beat_tasks_total = PeriodicTask.objects.count()
            beat_tasks_enabled = PeriodicTask.objects.filter(enabled=True).count()
        except Exception:
            pass

        return Response(
            {
                "status": "healthy" if overall_healthy else "unhealthy",
                "services": services,
                "uptime_seconds": int(time.time() - _START_TIME),
                "generated_at": now.isoformat(),
                "users": {
                    "active_total": users_total,
                    "logged_in_last_24h": users_active_24h,
                },
                "correspondence": {
                    "active": correspondence_active,
                    "completed_last_24h": correspondence_completed_24h,
                },
                "integrations": {
                    "last_24h": integration_summary,
                },
                "escalations_pending": escalations_pending,
                "celery_beat": {
                    "enabled": beat_tasks_enabled,
                    "total": beat_tasks_total,
                },
                "recent_activity": ActivityLogSerializer(recent_logs, many=True).data,
            }
        )


class AdminDashboardOverviewView(APIView):
    """Admin dashboard: system health summary + online user count."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_system_health")

        services, overall_healthy = _check_services()
        degraded = [name for name, status in services.items() if status != "healthy"]

        from accounts.models import User

        online_cutoff = timezone.now() - timedelta(minutes=5)
        online_users = User.objects.filter(last_activity__gte=online_cutoff).count()

        return Response(
            {
                "status": "healthy" if overall_healthy else "degraded",
                "online_users": online_users,
                "services_degraded": degraded,
                "last_updated": timezone.now().isoformat(),
            }
        )


class UsersByRoleView(APIView):
    """Admin dashboard: user counts grouped by system role."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_manage_users")

        from accounts.models import User

        total_users = User.objects.filter(is_active=True).count()

        role_counts = (
            User.objects.filter(is_active=True)
            .values("system_role__id", "system_role__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        roles = []
        for row in role_counts:
            roles.append(
                {
                    "id": row["system_role__id"],
                    "name": row["system_role__name"] or "Unassigned",
                    "count": row["count"],
                }
            )

        if not any(r["id"] is None for r in roles):
            roles.append({"id": None, "name": "Unassigned", "count": 0})

        return Response(
            {
                "roles": roles,
                "total_users": total_users,
            }
        )


def _check_backup_status() -> dict:
    """Scan BACKUP_DIR for the most recent backup file."""
    backup_dir = getattr(
        settings,
        "BACKUP_DIR",
        os.path.join(settings.BASE_DIR, "backups", "local"),
    )

    result = {
        "status": "missing",
        "last_backup": None,
        "file_size_mb": 0,
        "age_hours": None,
        "filename": None,
    }

    if not os.path.isdir(backup_dir):
        return result

    patterns = ["db-*.sql", "predeploy_*.sql", "*.dump"]
    backup_files = []
    for pattern in patterns:
        backup_files.extend(glob.glob(os.path.join(backup_dir, pattern)))

    if not backup_files:
        return result

    latest = max(backup_files, key=os.path.getmtime)
    stat = os.stat(latest)
    age_hours = (timezone.now().timestamp() - stat.st_mtime) / 3600

    if age_hours < 24:
        status = "healthy"
    elif age_hours < 48:
        status = "warning"
    else:
        status = "missing"

    return {
        "status": status,
        "last_backup": timezone.datetime.fromtimestamp(
            stat.st_mtime, tz=timezone.get_current_timezone()
        ).isoformat(),
        "file_size_mb": round(stat.st_size / (1024 * 1024), 2),
        "age_hours": round(age_hours, 1),
        "filename": os.path.basename(latest),
    }


class AdminDashboardAlertsView(APIView):
    """Admin dashboard: alerts needing admin attention."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission

        require_permission(request.user, "can_access_system_health")

        from analytics.models import Escalation
        from integrations.models import IntegrationLog

        now = timezone.now()

        backup = _check_backup_status()

        pending_escalations = Escalation.objects.filter(
            status__in=[Escalation.Status.PENDING, Escalation.Status.SENT]
        ).count()

        integration_failures_24h = IntegrationLog.objects.filter(
            created_at__gte=now - timedelta(hours=24),
            status="failed",
        ).count()

        celery_beat_disabled = 0
        try:
            from django_celery_beat.models import PeriodicTask

            celery_beat_disabled = PeriodicTask.objects.filter(enabled=False).count()
        except Exception:
            pass

        services, _ = _check_services()
        degraded_services = [
            name for name, status in services.items() if status != "healthy"
        ]

        return Response(
            {
                "backup": backup,
                "pending_escalations": pending_escalations,
                "integration_failures_24h": integration_failures_24h,
                "celery_beat_disabled": celery_beat_disabled,
                "degraded_services": degraded_services,
            }
        )


@require_http_methods(["GET"])
def health_live(request):
    """
    Minimal liveness for Docker/K8s: no DB or cache checks.
    Use /api/v1/health/ for full readiness (database + cache).
    """
    return JsonResponse({"status": "ok"})


@require_http_methods(["GET"])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancers.

    Returns:
        - 200 OK: All services are healthy
        - 503 Service Unavailable: One or more services are unhealthy
    """
    services, overall_healthy = _check_services()
    http_status = 200 if overall_healthy else 503
    return JsonResponse(
        {
            "status": "healthy" if overall_healthy else "unhealthy",
            "services": services,
        },
        status=http_status,
    )
