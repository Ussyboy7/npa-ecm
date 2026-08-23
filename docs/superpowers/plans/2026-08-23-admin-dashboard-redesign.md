# Admin Dashboard Redesign — EMR-Style Consolidated Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current admin dashboard with a single consolidated page matching the EMR's pattern — Infrastructure (API Server, Database, File Storage), Backups with download, Performance metrics (response time, error rate, media), and Online Users modal.

**Architecture:** Backend adds `ApiTimingMiddleware` for response time tracking, `presence.py` for online user detection, and new views for metrics/online-users/backup-download. Frontend consolidates into a single `/admin` page with two-column layout: left (Users by Role, System Alerts), right (System Health, Performance, Quick Actions).

**Tech Stack:** Django middleware, Redis cache buckets, DRF views, Next.js App Router, shadcn/ui

## Global Constraints

- Backend views in `backend/common/` (not a new app)
- Use `last_activity` (indexed) for online user detection, NOT `last_login`
- No `license_expiry` field in NPA ECM — skip that section
- Quick actions use real routes (`/audit` not `/admin/audit`)
- Admin dashboard visibility: `showAdminDashboard` (already exists)
- Presence window: 2 minutes (matching EMR)
- API timing: 5-bucket rolling window (60s each)

---

### Task 1: Backend — ApiTimingMiddleware

**Files:**
- Modify: `backend/common/middleware.py` (create if not exists, or add to existing)
- Modify: `backend/ecm_backend/settings.py` (add to MIDDLEWARE)

**Interfaces:**
- Produces: `ApiTimingMiddleware` class, `read_api_timing_window()` function

- [ ] **Step 1: Create middleware.py with ApiTimingMiddleware**

```python
"""Api timing middleware for admin dashboard performance metrics."""

from __future__ import annotations

import time
from typing import Callable

from django.core.cache import cache
from django.http import HttpRequest, HttpResponse


API_TIMING_CACHE_PREFIX = "api_timing"
API_TIMING_BUCKET_SECONDS = 60
API_TIMING_WINDOW_BUCKETS = 5
API_TIMING_BUCKET_TTL = (API_TIMING_WINDOW_BUCKETS + 2) * API_TIMING_BUCKET_SECONDS


def _timing_bucket_key(field: str, minute_epoch: int) -> str:
    return f"{API_TIMING_CACHE_PREFIX}:{field}:{minute_epoch}"


class ApiTimingMiddleware:
    """Record per-minute response time and error counters."""

    _SKIP_PREFIXES = (
        "/health",
        "/api/v1/health",
        "/api/v1/platform/admin-dashboard",
        "/static/",
        "/media/",
    )

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def _should_record(self, path: str) -> bool:
        if not path.startswith("/api/"):
            return False
        for prefix in self._SKIP_PREFIXES:
            if path.startswith(prefix):
                return False
        return True

    def __call__(self, request: HttpRequest) -> HttpResponse:
        path = request.path
        track = self._should_record(path)
        start = time.perf_counter() if track else None

        response = self.get_response(request)

        if track and start is not None:
            try:
                elapsed_ms = int((time.perf_counter() - start) * 1000)
                minute_epoch = int(time.time() // API_TIMING_BUCKET_SECONDS)
                self._record(minute_epoch, elapsed_ms, response.status_code)
            except Exception:
                pass

        return response

    @staticmethod
    def _record(minute_epoch: int, elapsed_ms: int, status_code: int) -> None:
        sum_key = _timing_bucket_key("sum_ms", minute_epoch)
        count_key = _timing_bucket_key("count", minute_epoch)

        try:
            if cache.add(count_key, 0, timeout=API_TIMING_BUCKET_TTL):
                pass
            cache.incr(count_key, 1)
        except ValueError:
            cache.add(count_key, 1, timeout=API_TIMING_BUCKET_TTL)

        try:
            if cache.add(sum_key, 0, timeout=API_TIMING_BUCKET_TTL):
                pass
            cache.incr(sum_key, elapsed_ms)
        except ValueError:
            cache.add(sum_key, elapsed_ms, timeout=API_TIMING_BUCKET_TTL)

        if status_code >= 500:
            err_key = _timing_bucket_key("errors", minute_epoch)
            try:
                if cache.add(err_key, 0, timeout=API_TIMING_BUCKET_TTL):
                    pass
                cache.incr(err_key, 1)
            except ValueError:
                cache.add(err_key, 1, timeout=API_TIMING_BUCKET_TTL)


def read_api_timing_window() -> dict:
    """Aggregate the last 5 one-minute buckets."""
    now = int(time.time() // API_TIMING_BUCKET_SECONDS)
    total_count = 0
    total_sum_ms = 0
    total_errors = 0

    for offset in range(API_TIMING_WINDOW_BUCKETS):
        minute = now - offset
        count = cache.get(_timing_bucket_key("count", minute), 0) or 0
        sum_ms = cache.get(_timing_bucket_key("sum_ms", minute), 0) or 0
        errors = cache.get(_timing_bucket_key("errors", minute), 0) or 0
        total_count += int(count)
        total_sum_ms += int(sum_ms)
        total_errors += int(errors)

    if total_count <= 0:
        return {}
    return {
        "avg_ms": round(total_sum_ms / total_count),
        "error_rate_pct": round((total_errors / total_count) * 100, 2),
        "sample": total_count,
    }
```

- [ ] **Step 2: Add to MIDDLEWARE in settings.py**

Find the MIDDLEWARE list and add `'common.middleware.ApiTimingMiddleware'` after the existing middleware.

- [ ] **Step 3: Commit**

```bash
git add backend/common/middleware.py backend/ecm_backend/settings.py
git commit -m "feat(admin-dashboard): add ApiTimingMiddleware for performance metrics"
```

---

### Task 2: Backend — Online Users View + Presence Helpers

**Files:**
- Create: `backend/accounts/presence.py`
- Modify: `backend/common/views.py` (add `OnlineUsersView`)
- Modify: `backend/common/urls.py` (add route)

**Interfaces:**
- Produces: `OnlineUsersView`, `count_online_users()`, `list_online_users()`

- [ ] **Step 1: Create presence.py**

```python
"""Online presence helpers for admin dashboards."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

ONLINE_PRESENCE_WINDOW = timedelta(minutes=2)


def online_presence_cutoff():
    return timezone.now() - ONLINE_PRESENCE_WINDOW


def count_online_users() -> int:
    from accounts.models import User

    return User.objects.filter(
        is_active=True,
        last_activity__gte=online_presence_cutoff(),
    ).count()


def list_online_users():
    from accounts.models import User

    users = User.objects.filter(
        is_active=True,
        last_activity__gte=online_presence_cutoff(),
    ).select_related("system_role")

    result = []
    for u in users:
        role_label = ""
        if u.is_superuser:
            role_label = "Super Admin"
        elif u.system_role:
            role_label = u.system_role.name
        result.append({
            "id": u.id,
            "name": u.get_full_name() or u.email,
            "email": u.email,
            "role": role_label,
            "lastActivity": u.last_activity.isoformat() if u.last_activity else None,
        })
    return result


def presence_window_seconds() -> int:
    return int(ONLINE_PRESENCE_WINDOW.total_seconds())
```

- [ ] **Step 2: Add OnlineUsersView to common/views.py**

```python
class OnlineUsersView(APIView):
    """List currently online users."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission
        from accounts.presence import list_online_users, presence_window_seconds

        require_permission(request.user, "can_access_system_health")

        return Response({
            "users": list_online_users(),
            "count": len(list_online_users()),
            "presenceWindowSeconds": presence_window_seconds(),
        })
```

- [ ] **Step 3: Add URL route**

```python
path("admin-dashboard/online-users/", OnlineUsersView.as_view(), name="admin-dashboard-online-users"),
```

- [ ] **Step 4: Commit**

```bash
git add backend/accounts/presence.py backend/common/views.py backend/common/urls.py
git commit -m "feat(admin-dashboard): add online users endpoint with presence tracking"
```

---

### Task 3: Backend — System Metrics View (Infrastructure + Performance)

**Files:**
- Modify: `backend/common/views.py` (add `SystemMetricsView`)
- Modify: `backend/common/urls.py` (add route)

**Interfaces:**
- Produces: `GET /api/v1/platform/admin-dashboard/metrics/` → infrastructure, performance, backup data

- [ ] **Step 1: Add SystemMetricsView**

```python
class SystemMetricsView(APIView):
    """Infrastructure metrics, performance, and backup status."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission
        from common.middleware import read_api_timing_window

        require_permission(request.user, "can_access_system_health")

        import shutil

        # API Server uptime
        api_uptime_seconds = int(time.time() - _START_TIME)
        api_uptime_hours = api_uptime_seconds // 3600
        api_uptime_minutes = (api_uptime_seconds % 3600) // 60
        api_uptime_text = f"{api_uptime_hours}h {api_uptime_minutes}m" if api_uptime_hours > 0 else f"{api_uptime_minutes}m"

        # Database uptime
        db_uptime_text = None
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT now() - pg_postmaster_start_time()")
                row = cursor.fetchone()
                if row and row[0]:
                    interval = row[0]
                    if hasattr(interval, 'total_seconds'):
                        secs = int(interval.total_seconds())
                    else:
                        secs = int(str(interval).split(' days')[0]) * 86400 if ' days' in str(interval) else 0
                    db_hours = secs // 3600
                    db_days = db_hours // 24
                    db_uptime_hours = db_hours % 24
                    db_uptime_text = f"{db_days}d {db_uptime_hours}h" if db_days > 0 else f"{db_hours}h"
        except Exception:
            pass

        # Database engine
        db_engine = connection.ops.mysql_version if hasattr(connection.ops, 'mysql_version') else 'PostgreSQL'

        # File storage
        media_root = getattr(settings, 'MEDIA_ROOT', '/app/media')
        disk_info = {"total_gb": 0, "free_gb": 0, "used_pct": 0}
        try:
            usage = shutil.disk_usage(media_root)
            total_gb = round(usage.total / (1024**3), 1)
            free_gb = round(usage.free / (1024**3), 1)
            used_pct = round(((usage.total - usage.free) / usage.total) * 100, 1)
            disk_info = {"total_gb": total_gb, "free_gb": free_gb, "used_pct": used_pct}
        except Exception:
            pass

        # Media storage size
        media_size_gb = 0
        try:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(media_root):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if os.path.isfile(fp):
                        total_size += os.path.getsize(fp)
            media_size_gb = round(total_size / (1024**3), 2)
        except Exception:
            pass

        # Performance metrics from timing middleware
        timing = read_api_timing_window()

        # Backup status
        backup = _check_backup_status()

        return Response({
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
        })
```

- [ ] **Step 2: Add URL route**

```python
path("admin-dashboard/metrics/", SystemMetricsView.as_view(), name="admin-dashboard-metrics"),
```

- [ ] **Step 3: Commit**

```bash
git add backend/common/views.py backend/common/urls.py
git commit -m "feat(admin-dashboard): add system metrics endpoint with infrastructure and performance"
```

---

### Task 4: Backend — Backup Download View

**Files:**
- Modify: `backend/common/views.py` (add `BackupLatestDownloadView`)
- Modify: `backend/common/urls.py` (add route)

**Interfaces:**
- Produces: `GET /api/v1/platform/admin-dashboard/backup/download/` → streams file

- [ ] **Step 1: Add BackupLatestDownloadView**

```python
from django.http import FileResponse, Http404

class BackupLatestDownloadView(APIView):
    """Download the latest backup file (superuser only)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Superuser access required.")

        backup_dir = getattr(
            settings,
            "BACKUP_DIR",
            os.path.join(settings.BASE_DIR, "backups", "local"),
        )

        if not os.path.isdir(backup_dir):
            raise Http404("No backup directory found.")

        patterns = ["db-*.sql", "predeploy_*.sql", "*.dump"]
        backup_files = []
        for pattern in patterns:
            backup_files.extend(glob.glob(os.path.join(backup_dir, pattern)))

        if not backup_files:
            raise Http404("No backup files found.")

        latest = max(backup_files, key=os.path.getmtime)
        return FileResponse(
            open(latest, "rb"),
            as_attachment=True,
            filename=os.path.basename(latest),
        )
```

- [ ] **Step 2: Add URL route**

```python
path("admin-dashboard/backup/download/", BackupLatestDownloadView.as_view(), name="admin-dashboard-backup-download"),
```

- [ ] **Step 3: Commit**

```bash
git add backend/common/views.py backend/common/urls.py
git commit -m "feat(admin-dashboard): add backup download endpoint"
```

---

### Task 5: Backend — Live Dashboard Endpoint

**Files:**
- Modify: `backend/common/views.py` (add `LiveDashboardView`)
- Modify: `backend/common/urls.py` (add route)

**Interfaces:**
- Produces: `GET /api/v1/platform/admin-dashboard/live/` → lightweight 30s poll

- [ ] **Step 1: Add LiveDashboardView**

```python
class LiveDashboardView(APIView):
    """Lightweight 30s poll: online count + system health only."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission
        from accounts.presence import count_online_users, presence_window_seconds

        require_permission(request.user, "can_access_system_health")

        services, overall_healthy = _check_services()

        return Response({
            "onlineNow": count_online_users(),
            "presenceWindowSeconds": presence_window_seconds(),
            "systemHealth": [
                {"name": name, "status": status}
                for name, status in services.items()
            ],
            "serverTime": timezone.now().isoformat(),
        })
```

- [ ] **Step 2: Add URL route**

```python
path("admin-dashboard/live/", LiveDashboardView.as_view(), name="admin-dashboard-live"),
```

- [ ] **Step 3: Commit**

```bash
git add backend/common/views.py backend/common/urls.py
git commit -m "feat(admin-dashboard): add live dashboard endpoint for 30s polling"
```

---

### Task 6: Frontend — API Client Update

**Files:**
- Modify: `frontend/lib/admin-dashboard-api.ts`

**Interfaces:**
- Produces: `fetchDashboardMetrics()`, `fetchOnlineUsers()`, `fetchDashboardLive()`, `downloadLatestBackup()`

- [ ] **Step 1: Rewrite admin-dashboard-api.ts**

```typescript
import { apiFetch, hasTokens } from "@/lib/api-client";
import { ERROR_AUTHENTICATION_REQUIRED } from "@/lib/constants";

export interface SystemHealthItem {
  name: string;
  status: string;
  icon?: string;
  uptime?: string | null;
  detail?: string;
  diskUsage?: { total_gb: number; free_gb: number; used_pct: number };
}

export interface PerformanceMetrics {
  responseTimeMs: number | null;
  errorRate: number | null;
  responseTimeSample: number | null;
  mediaStorageGb: number;
}

export interface BackupStatus {
  status: "healthy" | "warning" | "missing";
  last_backup: string | null;
  file_size_mb: number;
  age_hours: number | null;
  filename: string | null;
}

export interface DashboardMetrics {
  systemHealth: SystemHealthItem[];
  performance: PerformanceMetrics;
  backup: BackupStatus;
  uptimeSeconds: number;
}

export interface OnlineUser {
  id: number;
  name: string;
  email: string;
  role: string;
  lastActivity: string | null;
}

export interface OnlineUsersResponse {
  users: OnlineUser[];
  count: number;
  presenceWindowSeconds: number;
}

export interface LiveDashboardResponse {
  onlineNow: number;
  presenceWindowSeconds: number;
  systemHealth: { name: string; status: string }[];
  serverTime: string;
}

export interface UserRoleCount {
  id: string | null;
  name: string;
  count: number;
}

export interface UsersByRoleResponse {
  roles: UserRoleCount[];
  total_users: number;
}

export interface DashboardAlerts {
  backup: BackupStatus;
  pending_escalations: number;
  integration_failures_24h: number;
  celery_beat_disabled: number;
  degraded_services: string[];
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardMetrics>("/platform/admin-dashboard/metrics/");
}

export async function fetchOnlineUsers(): Promise<OnlineUsersResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<OnlineUsersResponse>("/platform/admin-dashboard/online-users/");
}

export async function fetchDashboardLive(): Promise<LiveDashboardResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<LiveDashboardResponse>("/platform/admin-dashboard/live/");
}

export async function fetchUsersByRole(): Promise<UsersByRoleResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<UsersByRoleResponse>("/platform/admin-dashboard/users-by-role/");
}

export async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardAlerts>("/platform/admin-dashboard/alerts/");
}

export async function downloadLatestBackup(): Promise<Blob> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<Blob>("/platform/admin-dashboard/backup/download/", {
    responseType: "blob",
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/admin-dashboard-api.ts
git commit -m "feat(admin-dashboard): update API client with metrics, online users, live, and backup download"
```

---

### Task 7: Frontend — Rewrite Admin Dashboard Page

**Files:**
- Rewrite: `frontend/app/admin/page.tsx` (the main admin page, currently a redirect)
- Delete: `frontend/app/admin/dashboard/page.tsx` (no longer needed)

**Interfaces:**
- Consumes: all API client functions
- Produces: consolidated admin dashboard at `/admin`

- [ ] **Step 1: Rewrite admin/page.tsx**

```tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import {
  fetchDashboardMetrics,
  fetchOnlineUsers,
  fetchDashboardLive,
  fetchUsersByRole,
  fetchDashboardAlerts,
  type DashboardMetrics,
  type OnlineUser,
  type UsersByRoleResponse,
  type DashboardAlerts,
} from "@/lib/admin-dashboard-api";
import {
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Server,
  Database,
  HardDrive,
  Settings,
  Shield,
  FolderTree,
  LifeBuoy,
  LayoutDashboard,
  RefreshCw,
  Loader2,
  Download,
  UserCog,
  Archive,
  Webhook,
  Zap,
} from "lucide-react";
import Link from "next/link";

function getStatusColor(status: string) {
  switch (status) {
    case "healthy": return "text-green-500";
    case "warning": return "text-yellow-500";
    case "error": case "unhealthy": return "text-red-500";
    default: return "text-gray-500";
  }
}

function PerfRow({ label, value, sample, hint }: {
  label: string;
  value: string | null;
  sample?: number;
  hint?: string;
}) {
  const isLive = value !== null && sample !== undefined && sample > 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-muted-foreground truncate">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground/70 truncate">{hint}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isLive && <span className="text-sm font-medium tabular-nums">{value}</span>}
        {isLive && (
          <span className="text-[10px] uppercase tracking-wide text-green-700 dark:text-green-300 border border-green-500/40 bg-green-500/10 rounded px-1 py-0.5">Live</span>
        )}
        {value === null && (
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground border border-border bg-muted/40 rounded px-1.5 py-0.5">Not connected</span>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { currentUser, hydrated } = useCurrentUser();
  const visibility = useSidebarVisibility();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [usersByRole, setUsersByRole] = useState<UsersByRoleResponse | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [onlineNow, setOnlineNow] = useState(0);
  const [presenceWindow, setPresenceWindow] = useState(120);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!hydrated || !currentUser) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      const [m, ur, al] = await Promise.all([
        visibility.showSystemHealth ? fetchDashboardMetrics() : null,
        visibility.showUsersRoles ? fetchUsersByRole() : null,
        visibility.showSystemHealth ? fetchDashboardAlerts() : null,
      ]);
      if (!isMountedRef.current) return;
      setMetrics(m);
      setUsersByRole(ur);
      setAlerts(al);
      if (m) {
        setOnlineNow(Math.round((m as any).onlineNow || 0));
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [hydrated, currentUser, visibility]);

  const loadLive = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const live = await fetchDashboardLive();
      if (!isMountedRef.current) return;
      setOnlineNow(live.onlineNow);
      setPresenceWindow(live.presenceWindowSeconds);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      // silent
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadData();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) void loadLive();
    }, 30000);
    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) void loadLive();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadData, loadLive]);

  const openOnlineModal = async () => {
    setShowOnlineModal(true);
    setOnlineUsersLoading(true);
    try {
      const res = await fetchOnlineUsers();
      setOnlineUsers(res.users);
    } catch {
      setOnlineUsers([]);
    }
    setOnlineUsersLoading(false);
  };

  const handleDownloadBackup = async () => {
    try {
      const blob = await (await import("@/lib/admin-dashboard-api")).downloadLatestBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metrics?.backup?.filename || "backup.dump";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const presenceWindowLabel =
    presenceWindow < 60 ? `last ${presenceWindow}s` : `last ${Math.round(presenceWindow / 60)} min`;

  const backupStatus = metrics?.backup;
  const backupHealthy = backupStatus?.status === "healthy";
  const backupWarning = backupStatus?.status === "warning";
  const backupMissing = backupStatus?.status === "missing";

  if (!hydrated || !currentUser) return null;

  return (
    <AdminPageShell
      title="Administration Dashboard"
      subtitle="Enterprise system monitoring and user management"
      icon={LayoutDashboard}
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* System Summary Bar */}
        <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-400">System Status: Operational</span>
              </div>
              <div className="hidden h-4 w-px bg-slate-600 sm:block" />
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <button onClick={() => void openOnlineModal()} className="text-sm text-slate-300 hover:text-white transition-colors">
                  {onlineNow} online now
                  <span className="text-slate-500"> ({presenceWindowLabel})</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Users by Role */}
            {visibility.showUsersRoles && usersByRole && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Users by Role</CardTitle>
                    <Link href="/admin/users-roles">
                      <Button variant="ghost" size="sm">View All</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {usersByRole.roles
                      .filter((r) => r.name !== "Unassigned")
                      .sort((a, b) => b.count - a.count)
                      .map((role) => {
                        const pct = usersByRole.total_users > 0 ? (role.count / usersByRole.total_users) * 100 : 0;
                        return (
                          <div key={role.id ?? "unassigned"} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm truncate">{role.name}</span>
                                <span className="text-sm font-medium">{role.count}</span>
                              </div>
                              <Progress value={pct} className="h-1.5 mt-1" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Total: {usersByRole.total_users} users
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Alerts */}
            {visibility.showSystemHealth && alerts && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">System Alerts</CardTitle>
                  <CardDescription>Backups, escalations, and items needing attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">No active incidents</p>
                    </div>
                  </div>

                  {backupStatus && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <Activity className={`h-5 w-5 flex-shrink-0 ${getStatusColor(backupStatus.status)}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Backup status</p>
                        <p className="text-xs text-muted-foreground">
                          {backupStatus.last_backup
                            ? `Last backup ${backupStatus.age_hours}h ago (${backupStatus.filename})`
                            : "No backup files found"}
                        </p>
                      </div>
                      <Badge variant={backupHealthy ? "default" : backupWarning ? "secondary" : "destructive"}>
                        {backupStatus.status}
                      </Badge>
                    </div>
                  )}

                  {alerts.pending_escalations > 0 && (
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border">
                      <span>{alerts.pending_escalations} pending escalation(s)</span>
                      <Badge variant="destructive">Escalations</Badge>
                    </div>
                  )}

                  {alerts.integration_failures_24h > 0 && (
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border">
                      <span>{alerts.integration_failures_24h} integration failure(s) in 24h</span>
                      <Badge variant="destructive">Integrations</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* System Health (Infrastructure) */}
            {visibility.showSystemHealth && metrics && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Infrastructure</CardTitle>
                    <Link href="/admin/system-health">
                      <Button variant="ghost" size="sm">Details</Button>
                    </Link>
                  </div>
                  <CardDescription>Process uptime, database, and disk volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.systemHealth.map((system) => {
                      const IconComp = system.icon === "Database" ? Database : system.icon === "HardDrive" ? HardDrive : Server;
                      return (
                        <div key={system.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-start gap-3 min-w-0">
                            <IconComp className={`h-5 w-5 ${getStatusColor(system.status)}`} />
                            <div className="min-w-0">
                              <span className="text-sm font-medium">{system.name}</span>
                              {system.uptime && <div className="text-xs text-muted-foreground">Up {system.uptime}</div>}
                              {system.detail && <div className="text-[11px] text-muted-foreground/80 truncate">{system.detail}</div>}
                            </div>
                          </div>
                          <Badge variant={system.status === "healthy" ? "default" : system.status === "warning" ? "secondary" : "destructive"}>
                            {system.status === "healthy" ? "Healthy" : system.status === "warning" ? "Warning" : system.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Backups */}
            {visibility.showSystemHealth && backupStatus && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Backups</CardTitle>
                  <CardDescription>Latest snapshot found on disk</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={backupHealthy ? "default" : backupWarning ? "secondary" : "destructive"}>
                      {backupStatus.status === "healthy" ? "Healthy" : backupStatus.status === "warning" ? "Stale" : "Missing"}
                    </Badge>
                  </div>
                  {backupStatus.last_backup && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last backup</span>
                        <span>{new Date(backupStatus.last_backup).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Age</span>
                        <span>{backupStatus.age_hours} hours ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">File</span>
                        <span className="truncate max-w-[180px]">{backupStatus.filename}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Size</span>
                        <span>{backupStatus.file_size_mb} MB</span>
                      </div>
                    </>
                  )}
                  {currentUser?.isSuperuser && backupStatus.filename && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => void handleDownloadBackup()}>
                      <Download className="h-4 w-4 mr-2" />
                      Download latest ({backupStatus.file_size_mb} MB)
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Performance Metrics */}
            {visibility.showSystemHealth && metrics && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Performance</CardTitle>
                  <CardDescription>Rolling 5-minute API window and uploaded file footprint</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PerfRow
                    label="Response time"
                    value={metrics.performance.responseTimeMs !== null ? `${metrics.performance.responseTimeMs} ms` : null}
                    sample={metrics.performance.responseTimeSample ?? undefined}
                    hint={metrics.performance.responseTimeSample ? `Avg over ${metrics.performance.responseTimeSample} request(s)` : "Waiting for API traffic"}
                  />
                  <PerfRow
                    label="Error rate"
                    value={metrics.performance.errorRate !== null ? `${metrics.performance.errorRate.toFixed(2)}%` : null}
                    sample={metrics.performance.responseTimeSample ?? undefined}
                    hint="5xx share (5 min window)"
                  />
                  <PerfRow
                    label="Uploaded media"
                    value={`${metrics.performance.mediaStorageGb} GB`}
                    hint="Files in MEDIA_ROOT"
                  />
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {visibility.showUsersRoles && (
                    <Link href="/admin/users-roles">
                      <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                        <UserCog className="h-5 w-5 text-blue-500" />
                        <span className="text-xs">Users & Roles</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showOrganizationOffices && (
                    <Link href="/admin/organization">
                      <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                        <FolderTree className="h-5 w-5 text-amber-500" />
                        <span className="text-xs">Organization</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showSystemHealth && (
                    <Link href="/admin/system-health">
                      <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                        <Activity className="h-5 w-5 text-green-500" />
                        <span className="text-xs">System Health</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showAuditCompliance && (
                    <Link href="/audit">
                      <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                        <Shield className="h-5 w-5 text-rose-500" />
                        <span className="text-xs">Audit & Compliance</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showIntegrationHub && (
                    <Link href="/integrations">
                      <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                        <Webhook className="h-5 w-5 text-violet-500" />
                        <span className="text-xs">Integrations</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showTemplates && (
                    <Link href="/admin/templates-hub">
                      <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                        <Zap className="h-5 w-5 text-cyan-500" />
                        <span className="text-xs">Templates</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showHelpdeskQueue && (
                    <Link href="/helpdesk">
                      <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                        <LifeBuoy className="h-5 w-5 text-orange-500" />
                        <span className="text-xs">Helpdesk</span>
                      </Button>
                    </Link>
                  )}
                  <Link href="/settings">
                    <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1">
                      <Settings className="h-5 w-5 text-slate-500" />
                      <span className="text-xs">Settings</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Online Users Modal */}
      <Dialog open={showOnlineModal} onOpenChange={setShowOnlineModal}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Online Users ({onlineUsers.length})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto space-y-2 flex-1">
            {onlineUsersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : onlineUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users currently online</p>
            ) : (
              onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium">{u.role || "Staff"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
```

- [ ] **Step 2: Delete the old dashboard page**

```bash
rm frontend/app/admin/dashboard/page.tsx
rmdir frontend/app/admin/dashboard
```

- [ ] **Step 3: Update admin page redirect**

The old `frontend/app/admin/page.tsx` was a redirect to `getAdminHomePath()`. Now it IS the dashboard. Remove the redirect logic.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(admin-dashboard): consolidate into single admin page with infrastructure, backups, performance, and online users"
```

---

### Task 8: Frontend — Remove Old Dashboard Components

**Files:**
- Delete: `frontend/components/admin/SystemStatusBanner.tsx`
- Delete: `frontend/components/admin/RecentActivityTable.tsx`
- Delete: `frontend/components/admin/SystemAlertsPanel.tsx`
- Delete: `frontend/components/admin/QuickActionsGrid.tsx`

**Interfaces:**
- These are no longer used after the page rewrite

- [ ] **Step 1: Remove unused components**

```bash
rm frontend/components/admin/SystemStatusBanner.tsx
rm frontend/components/admin/RecentActivityTable.tsx
rm frontend/components/admin/SystemAlertsPanel.tsx
rm frontend/components/admin/QuickActionsGrid.tsx
```

- [ ] **Step 2: Keep UsersByRoleGrid.tsx (still used in the page)**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused admin dashboard components"
```

---

### Task 9: Type Check + Lint + Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript type check**

Run: `cd frontend && npm run type-check`
Expected: PASS

- [ ] **Step 2: Run ESLint**

Run: `cd frontend && npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Run backend syntax check**

Run: `python3 -c "import ast; ast.parse(open('backend/common/views.py').read()); ast.parse(open('backend/common/middleware.py').read()); ast.parse(open('backend/accounts/presence.py').read()); print('OK')"`
Expected: OK

- [ ] **Step 4: Verify admin page loads**

Navigate to `http://localhost:3002/admin` — should render the consolidated dashboard.

- [ ] **Step 5: Commit any fixups**

```bash
git add -A
git commit -m "fix(admin-dashboard): type check and lint fixes"
```
