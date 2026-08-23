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
    """Scan for the most recent backup file across known locations."""
    configured = getattr(
        settings,
        "BACKUP_DIR",
        os.path.join(settings.BASE_DIR, "backups", "local"),
    )

    # Also check common host-side locations when running inside Docker
    backup_dirs = [configured]
    for candidate in [
        os.path.join(settings.BASE_DIR, "backups", "local"),
        os.path.join(settings.BASE_DIR, "backups", "stag"),
        os.path.join(settings.BASE_DIR, "backups"),
        "/backups",
        os.path.expanduser("~/ecm_backups"),
        os.path.expanduser("~/ecm-predeploy-backups"),
    ]:
        if candidate not in backup_dirs:
            backup_dirs.append(candidate)

    result = {
        "status": "missing",
        "last_backup": None,
        "file_size_mb": 0,
        "age_hours": None,
        "filename": None,
    }

    patterns = ["db-*.sql", "predeploy_*.sql", "*.dump", "*.json"]
    backup_files: list[str] = []
    for d in backup_dirs:
        if not os.path.isdir(d):
            continue
        for pattern in patterns:
            backup_files.extend(glob.glob(os.path.join(d, pattern)))
        # Also scan for any file that looks like a backup (contains backup/dump)
        try:
            for name in os.listdir(d):
                lower = name.lower()
                if "backup" in lower or "dump" in lower:
                    full = os.path.join(d, name)
                    if os.path.isfile(full) and full not in backup_files:
                        backup_files.append(full)
                # Recursive scan: check one level deeper
                full_sub = os.path.join(d, name)
                if os.path.isdir(full_sub) and not name.startswith("."):
                    for subname in os.listdir(full_sub):
                        sublower = subname.lower()
                        if "backup" in sublower or sublower.endswith((".sql", ".dump", ".json")):
                            full = os.path.join(full_sub, subname)
                            if os.path.isfile(full) and full not in backup_files:
                                backup_files.append(full)
        except PermissionError:
            continue

    if not backup_files:
        return result

    latest = max(backup_files, key=os.path.getmtime)
    stat = os.stat(latest)
    age_hours = (timezone.now().timestamp() - stat.st_mtime) / 3600

    if age_hours < 36:
        status = "healthy"
    elif age_hours < 96:
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


class OnlineUsersView(APIView):
    """List currently online users."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission
        from accounts.presence import list_online_users, presence_window_seconds

        require_permission(request.user, "can_access_system_health")

        users = list_online_users()
        return Response(
            {
                "users": users,
                "count": len(users),
                "presenceWindowSeconds": presence_window_seconds(),
            }
        )


class SystemMetricsView(APIView):
    """Infrastructure metrics, performance, and backup status."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission
        from common.middleware import read_api_timing_window

        require_permission(request.user, "can_access_system_health")

        import shutil

        api_uptime_seconds = int(time.time() - _START_TIME)
        api_uptime_hours = api_uptime_seconds // 3600
        api_uptime_minutes = (api_uptime_seconds % 3600) // 60
        if api_uptime_hours > 0:
            api_uptime_text = f"{api_uptime_hours}h {api_uptime_minutes}m"
        else:
            api_uptime_text = f"{api_uptime_minutes}m"

        db_uptime_text = None
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT now() - pg_postmaster_start_time()")
                row = cursor.fetchone()
                if row and row[0]:
                    interval = row[0]
                    if hasattr(interval, "total_seconds"):
                        secs = int(interval.total_seconds())
                    else:
                        secs = 0
                    db_hours = secs // 3600
                    db_days = db_hours // 24
                    if db_days > 0:
                        db_uptime_text = f"{db_days}d {db_hours % 24}h"
                    else:
                        db_uptime_text = f"{db_hours}h"
        except Exception:
            pass

        db_engine = "PostgreSQL"

        media_root = getattr(settings, "MEDIA_ROOT", "/app/media")
        disk_info = {"total_gb": 0, "free_gb": 0, "used_pct": 0}
        try:
            usage = shutil.disk_usage(str(media_root))
            total_gb = round(usage.total / (1024**3), 1)
            free_gb = round(usage.free / (1024**3), 1)
            used_pct = round(((usage.total - usage.free) / usage.total) * 100, 1)
            disk_info = {"total_gb": total_gb, "free_gb": free_gb, "used_pct": used_pct}
        except Exception:
            pass

        media_size_gb = 0
        try:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(str(media_root)):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if os.path.isfile(fp):
                        total_size += os.path.getsize(fp)
            media_size_gb = round(total_size / (1024**3), 2)
        except Exception:
            pass

        timing = read_api_timing_window()

        backup = _check_backup_status()

        return Response(
            {
                "systemHealth": [
                    {
                        "name": "API Server",
                        "status": "healthy",
                        "icon": "Server",
                        "uptime": api_uptime_text,
                        "detail": f"Process started {timezone.now().strftime('%H:%M')}",
                    },
                    {
                        "name": "Database",
                        "status": "healthy" if db_uptime_text else "unknown",
                        "icon": "Database",
                        "uptime": db_uptime_text,
                        "detail": f"Engine: {db_engine}",
                    },
                    {
                        "name": "File Storage",
                        "status": "healthy" if disk_info["used_pct"] < 90 else "warning",
                        "icon": "HardDrive",
                        "uptime": None,
                        "detail": f"{disk_info['free_gb']} GB free of {disk_info['total_gb']} GB ({disk_info['used_pct']}% used)",
                        "diskUsage": disk_info,
                    },
                ],
                "performance": {
                    "responseTimeMs": timing.get("avg_ms"),
                    "errorRate": timing.get("error_rate_pct"),
                    "responseTimeSample": timing.get("sample"),
                    "mediaStorageGb": media_size_gb,
                },
                "backup": backup,
                "uptimeSeconds": api_uptime_seconds,
            }
        )


class BackupLatestDownloadView(APIView):
    """Download the latest backup file (superuser only)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Superuser access required.")

        configured = getattr(
            settings,
            "BACKUP_DIR",
            os.path.join(settings.BASE_DIR, "backups", "local"),
        )
        backup_dirs = [configured]
        for candidate in [
            os.path.join(settings.BASE_DIR, "backups", "local"),
            os.path.join(settings.BASE_DIR, "backups", "stag"),
            os.path.join(settings.BASE_DIR, "backups"),
            "/backups",
            os.path.expanduser("~/ecm_backups"),
            os.path.expanduser("~/ecm-predeploy-backups"),
        ]:
            if candidate not in backup_dirs:
                backup_dirs.append(candidate)

        patterns = ["db-*.sql", "predeploy_*.sql", "*.dump", "*.json"]
        backup_files: list[str] = []
        for d in backup_dirs:
            if not os.path.isdir(d):
                continue
            for pattern in patterns:
                backup_files.extend(glob.glob(os.path.join(d, pattern)))
            try:
                for name in os.listdir(d):
                    lower = name.lower()
                    if "backup" in lower or "dump" in lower:
                        full = os.path.join(d, name)
                        if os.path.isfile(full) and full not in backup_files:
                            backup_files.append(full)
                    full_sub = os.path.join(d, name)
                    if os.path.isdir(full_sub) and not name.startswith("."):
                        for subname in os.listdir(full_sub):
                            sublower = subname.lower()
                            if "backup" in sublower or sublower.endswith((".sql", ".dump", ".json")):
                                full = os.path.join(full_sub, subname)
                                if os.path.isfile(full) and full not in backup_files:
                                    backup_files.append(full)
            except PermissionError:
                continue

        if not backup_files:
            from django.http import Http404

            raise Http404("No backup files found.")

        latest = max(backup_files, key=os.path.getmtime)
        from django.http import FileResponse

        return FileResponse(
            open(latest, "rb"),
            as_attachment=True,
            filename=os.path.basename(latest),
        )


class LiveDashboardView(APIView):
    """Lightweight 30s poll: online count + system health only."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission
        from accounts.presence import count_online_users, presence_window_seconds

        require_permission(request.user, "can_access_system_health")

        services, _ = _check_services()

        return Response(
            {
                "onlineNow": count_online_users(),
                "presenceWindowSeconds": presence_window_seconds(),
                "systemHealth": [
                    {"name": name, "status": status} for name, status in services.items()
                ],
                "serverTime": timezone.now().isoformat(),
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
