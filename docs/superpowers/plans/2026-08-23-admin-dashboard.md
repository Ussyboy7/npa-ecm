# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin dashboard at `/admin/dashboard` with system status, users by role, audit activity, alerts, and quick actions.

**Architecture:** 3 new backend endpoints in `common/`, 1 new frontend page with 6 components, sidebar/navigation updates. Reuses existing audit log API and health check logic.

**Tech Stack:** Django REST Framework, Next.js App Router, TypeScript, existing permission system

## Global Constraints

- Backend views go in `backend/common/views.py` (not a new Django app)
- Use `last_activity` (indexed) for online user detection, NOT `last_login`
- Backup detection is new logic — scan `./backups/<ENV>/` for `db-*.sql`, `predeploy_*.sql`, `*.dump`
- No `license_expiry` field exists in NPA ECM — use ECM-native alerts instead
- Audit section only shown when user has `can_access_audit_compliance`
- Quick actions use real routes (`/audit` not `/admin/audit`)
- Admin dashboard visibility: `showAdminDashboard` (new field, not `showDashboard` which is the user dashboard)

---

### Task 1: Backend — Admin Dashboard Overview Endpoint

**Files:**
- Modify: `backend/common/views.py` (add `AdminDashboardOverviewView` after `SystemStatusView`)
- Modify: `backend/common/urls.py` (add route)

**Interfaces:**
- Produces: `GET /api/v1/platform/admin-dashboard/overview` → `{ status, online_users, services_degraded, last_updated }`

- [ ] **Step 1: Add the view class to common/views.py**

```python
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

        return Response({
            "status": "healthy" if overall_healthy else "degraded",
            "online_users": online_users,
            "services_degraded": degraded,
            "last_updated": timezone.now().isoformat(),
        })
```

- [ ] **Step 2: Add URL route to common/urls.py**

```python
from .views import SystemStatusView, AdminDashboardOverviewView

urlpatterns = [
    path("system-status/", SystemStatusView.as_view(), name="system-status"),
    path("admin-dashboard/overview/", AdminDashboardOverviewView.as_view(), name="admin-dashboard-overview"),
    path("protected-media/<path:path>", ProtectedMediaView.as_view(), name="protected-media"),
]
```

- [ ] **Step 3: Test the endpoint**

Run: `curl -H "Authorization: Bearer <token>" http://localhost:8002/api/v1/platform/admin-dashboard/overview/`
Expected: 200 with `{ status, online_users, services_degraded, last_updated }`

- [ ] **Step 4: Commit**

```bash
git add backend/common/views.py backend/common/urls.py
git commit -m "feat(admin-dashboard): add overview endpoint"
```

---

### Task 2: Backend — Users by Role Endpoint

**Files:**
- Modify: `backend/common/views.py` (add `UsersByRoleView`)
- Modify: `backend/common/urls.py` (add route)

**Interfaces:**
- Produces: `GET /api/v1/platform/admin-dashboard/users-by-role` → `{ roles: [{ id, name, count }], total_users }`

- [ ] **Step 1: Add the view class**

```python
class UsersByRoleView(APIView):
    """Admin dashboard: user counts grouped by system role."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from organization.permission_utils import require_permission
        require_permission(request.user, "can_manage_users")

        from accounts.models import User
        from django.db.models import Count

        total_users = User.objects.filter(is_active=True).count()

        role_counts = (
            User.objects.filter(is_active=True)
            .values("system_role__id", "system_role__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        roles = []
        for row in role_counts:
            roles.append({
                "id": row["system_role__id"],
                "name": row["system_role__name"] or "Unassigned",
                "count": row["count"],
            })

        if not any(r["id"] is None for r in roles):
            roles.append({"id": None, "name": "Unassigned", "count": 0})

        return Response({
            "roles": roles,
            "total_users": total_users,
        })
```

- [ ] **Step 2: Add URL route**

```python
from .views import SystemStatusView, AdminDashboardOverviewView, UsersByRoleView

urlpatterns = [
    path("system-status/", SystemStatusView.as_view(), name="system-status"),
    path("admin-dashboard/overview/", AdminDashboardOverviewView.as_view(), name="admin-dashboard-overview"),
    path("admin-dashboard/users-by-role/", UsersByRoleView.as_view(), name="admin-dashboard-users-by-role"),
    path("protected-media/<path:path>", ProtectedMediaView.as_view(), name="protected-media"),
]
```

- [ ] **Step 3: Test the endpoint**

Run: `curl -H "Authorization: Bearer <token>" http://localhost:8002/api/v1/platform/admin-dashboard/users-by-role/`
Expected: 200 with `{ roles: [...], total_users: 140 }`

- [ ] **Step 4: Commit**

```bash
git add backend/common/views.py backend/common/urls.py
git commit -m "feat(admin-dashboard): add users-by-role endpoint"
```

---

### Task 3: Backend — Alerts Endpoint (with backup detection)

**Files:**
- Modify: `backend/common/views.py` (add `AdminDashboardAlertsView`)
- Modify: `backend/common/urls.py` (add route)

**Interfaces:**
- Produces: `GET /api/v1/platform/admin-dashboard/alerts` → `{ backup, pending_escalations, integration_failures_24h, celery_beat_disabled, degraded_services }`

- [ ] **Step 1: Add backup detection helper**

```python
import os
import glob

def _check_backup_status() -> dict:
    """Scan BACKUP_DIR for the most recent backup file."""
    backup_dir = getattr(settings, "BACKUP_DIR", os.path.join(settings.BASE_DIR, "backups", "local"))
    
    result = {"status": "missing", "last_backup": None, "file_size_mb": 0, "age_hours": None, "filename": None}
    
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
        "last_backup": timezone.datetime.fromtimestamp(stat.st_mtime, tz=timezone.get_current_timezone()).isoformat(),
        "file_size_mb": round(stat.st_size / (1024 * 1024), 2),
        "age_hours": round(age_hours, 1),
        "filename": os.path.basename(latest),
    }
```

- [ ] **Step 2: Add the view class**

```python
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
        degraded_services = [name for name, status in services.items() if status != "healthy"]

        return Response({
            "backup": backup,
            "pending_escalations": pending_escalations,
            "integration_failures_24h": integration_failures_24h,
            "celery_beat_disabled": celery_beat_disabled,
            "degraded_services": degraded_services,
        })
```

- [ ] **Step 3: Add URL route**

```python
from .views import (
    SystemStatusView, AdminDashboardOverviewView,
    UsersByRoleView, AdminDashboardAlertsView,
)

urlpatterns = [
    path("system-status/", SystemStatusView.as_view(), name="system-status"),
    path("admin-dashboard/overview/", AdminDashboardOverviewView.as_view(), name="admin-dashboard-overview"),
    path("admin-dashboard/users-by-role/", UsersByRoleView.as_view(), name="admin-dashboard-users-by-role"),
    path("admin-dashboard/alerts/", AdminDashboardAlertsView.as_view(), name="admin-dashboard-alerts"),
    path("protected-media/<path:path>", ProtectedMediaView.as_view(), name="protected-media"),
]
```

- [ ] **Step 4: Test the endpoint**

Run: `curl -H "Authorization: Bearer <token>" http://localhost:8002/api/v1/platform/admin-dashboard/alerts/`
Expected: 200 with `{ backup: {...}, pending_escalations, integration_failures_24h, celery_beat_disabled, degraded_services }`

- [ ] **Step 5: Commit**

```bash
git add backend/common/views.py backend/common/urls.py
git commit -m "feat(admin-dashboard): add alerts endpoint with backup detection"
```

---

### Task 4: Frontend — API Client + Types

**Files:**
- Create: `frontend/lib/admin-dashboard-api.ts`

**Interfaces:**
- Produces: `fetchDashboardOverview()`, `fetchUsersByRole()`, `fetchDashboardAlerts()` + TypeScript types

- [ ] **Step 1: Create the API client**

```typescript
import { apiFetch, hasTokens } from "@/lib/api-client";
import { ERROR_AUTHENTICATION_REQUIRED, ERROR_UNKNOWN } from "@/lib/constants";

export interface DashboardOverview {
  status: "healthy" | "degraded";
  online_users: number;
  services_degraded: string[];
  last_updated: string;
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

export interface BackupStatus {
  status: "healthy" | "warning" | "missing";
  last_backup: string | null;
  file_size_mb: number;
  age_hours: number | null;
  filename: string | null;
}

export interface DashboardAlerts {
  backup: BackupStatus;
  pending_escalations: number;
  integration_failures_24h: number;
  celery_beat_disabled: number;
  degraded_services: string[];
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardOverview>("/platform/admin-dashboard/overview/");
}

export async function fetchUsersByRole(): Promise<UsersByRoleResponse> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<UsersByRoleResponse>("/platform/admin-dashboard/users-by-role/");
}

export async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
  return apiFetch<DashboardAlerts>("/platform/admin-dashboard/alerts/");
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/admin-dashboard-api.ts
git commit -m "feat(admin-dashboard): add frontend API client and types"
```

---

### Task 5: Frontend — SystemStatusBanner Component

**Files:**
- Create: `frontend/components/admin/SystemStatusBanner.tsx`

**Interfaces:**
- Consumes: `DashboardOverview` from admin-dashboard-api
- Produces: `<SystemStatusBanner overview={overview} />`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardOverview } from "@/lib/admin-dashboard-api";

interface SystemStatusBannerProps {
  overview: DashboardOverview | null;
  onRefresh?: () => void;
  loading?: boolean;
}

export function SystemStatusBanner({ overview, onRefresh, loading }: SystemStatusBannerProps) {
  const isHealthy = overview?.status === "healthy";

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Badge variant={isHealthy ? "default" : "destructive"} className="text-sm">
            {isHealthy ? "All systems operational" : "Degraded"}
          </Badge>
          {overview?.services_degraded && overview.services_degraded.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {overview.services_degraded.join(", ")} degraded
            </span>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {overview?.online_users ?? 0} online now
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overview?.last_updated && (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(overview.last_updated).toLocaleTimeString()}
            </span>
          )}
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/admin/SystemStatusBanner.tsx
git commit -m "feat(admin-dashboard): add SystemStatusBanner component"
```

---

### Task 6: Frontend — UsersByRoleGrid Component

**Files:**
- Create: `frontend/components/admin/UsersByRoleGrid.tsx`

**Interfaces:**
- Consumes: `UsersByRoleResponse` from admin-dashboard-api
- Produces: `<UsersByRoleGrid data={data} />`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import Link from "next/link";
import type { UsersByRoleResponse } from "@/lib/admin-dashboard-api";

interface UsersByRoleGridProps {
  data: UsersByRoleResponse | null;
}

export function UsersByRoleGrid({ data }: UsersByRoleGridProps) {
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Users by Role
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.roles.map((role) => (
            <Link
              key={role.id ?? "unassigned"}
              href={role.id ? `/admin/users-roles?tab=users&role=${role.id}` : "/admin/users-roles?tab=users"}
              className="block"
            >
              <div className="rounded-lg border p-3 hover:bg-accent transition-colors">
                <div className="text-2xl font-bold">{role.count}</div>
                <div className="text-xs text-muted-foreground truncate">{role.name}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Total: {data.total_users} users
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/admin/UsersByRoleGrid.tsx
git commit -m "feat(admin-dashboard): add UsersByRoleGrid component"
```

---

### Task 7: Frontend — RecentActivityTable Component

**Files:**
- Create: `frontend/components/admin/RecentActivityTable.tsx`

**Interfaces:**
- Consumes: audit log data (fetched from existing `/api/v1/audit/logs/?page_size=10`)
- Produces: `<RecentActivityTable activities={activities} />`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import Link from "next/link";

interface Activity {
  id: string;
  timestamp: string;
  user_name?: string;
  action: string;
  module: string;
  description: string;
}

interface RecentActivityTableProps {
  activities: Activity[];
  loading?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivityTable({ activities, loading }: RecentActivityTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
        <Link href="/audit" className="text-xs text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recent activity</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{activity.user_name || "System"}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <Badge variant="outline" className="text-xs">{activity.action}</Badge>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{activity.description}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {timeAgo(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/admin/RecentActivityTable.tsx
git commit -m "feat(admin-dashboard): add RecentActivityTable component"
```

---

### Task 8: Frontend — SystemAlertsPanel Component

**Files:**
- Create: `frontend/components/admin/SystemAlertsPanel.tsx`

**Interfaces:**
- Consumes: `DashboardAlerts` from admin-dashboard-api
- Produces: `<SystemAlertsPanel alerts={alerts} />`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { DashboardAlerts, BackupStatus } from "@/lib/admin-dashboard-api";

interface SystemAlertsPanelProps {
  alerts: DashboardAlerts | null;
}

function BackupBadge({ backup }: { backup: BackupStatus }) {
  if (backup.status === "missing") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <XCircle className="h-4 w-4 text-destructive" />
        <span>No backup found</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      {backup.status === "healthy" ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      )}
      <span>Last backup {backup.age_hours}h ago ({backup.file_size_mb} MB)</span>
    </div>
  );
}

export function SystemAlertsPanel({ alerts }: SystemAlertsPanelProps) {
  if (!alerts) return null;

  const hasAlerts =
    alerts.backup.status !== "healthy" ||
    alerts.pending_escalations > 0 ||
    alerts.integration_failures_24h > 0 ||
    alerts.celery_beat_disabled > 0 ||
    alerts.degraded_services.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAlerts ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            No active incidents
          </div>
        ) : (
          <>
            {alerts.backup.status !== "healthy" && (
              <div className="flex items-center justify-between">
                <BackupBadge backup={alerts.backup} />
                <Badge variant={alerts.backup.status === "warning" ? "secondary" : "destructive"}>
                  {alerts.backup.status}
                </Badge>
              </div>
            )}
            {alerts.pending_escalations > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.pending_escalations} pending escalation(s)</span>
                <Badge variant="destructive">Escalations</Badge>
              </div>
            )}
            {alerts.integration_failures_24h > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.integration_failures_24h} integration failure(s) in 24h</span>
                <Badge variant="destructive">Integrations</Badge>
              </div>
            )}
            {alerts.celery_beat_disabled > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.celery_beat_disabled} disabled beat task(s)</span>
                <Badge variant="secondary">Celery</Badge>
              </div>
            )}
            {alerts.degraded_services.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.degraded_services.join(", ")} degraded</span>
                <Badge variant="destructive">Services</Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/admin/SystemAlertsPanel.tsx
git commit -m "feat(admin-dashboard): add SystemAlertsPanel component"
```

---

### Task 9: Frontend — QuickActionsGrid Component

**Files:**
- Create: `frontend/components/admin/QuickActionsGrid.tsx`

**Interfaces:**
- Consumes: `SidebarVisibility` from use-sidebar-visibility
- Produces: `<QuickActionsGrid visibility={visibility} />`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Activity, Shield, Puzzle, HelpCircle, Zap } from "lucide-react";
import Link from "next/link";
import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

interface QuickActionsGridProps {
  visibility: SidebarVisibility;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  show: boolean;
}

export function QuickActionsGrid({ visibility }: QuickActionsGridProps) {
  const actions: QuickAction[] = [
    { label: "Users & Roles", href: "/admin/users-roles", icon: Users, show: visibility.showUsersRoles },
    { label: "Organization", href: "/admin/organization", icon: Building2, show: visibility.showOrganizationOffices },
    { label: "System Health", href: "/admin/system-health", icon: Activity, show: visibility.showSystemHealth },
    { label: "Audit & Compliance", href: "/audit", icon: Shield, show: visibility.showAuditCompliance },
    { label: "Integrations", href: "/admin/integrations", icon: Puzzle, show: visibility.showIntegrationHub },
    { label: "Templates", href: "/admin/templates-hub", icon: Zap, show: visibility.showTemplates },
    { label: "Helpdesk", href: "/helpdesk", icon: HelpCircle, show: visibility.showHelpdeskQueue },
  ].filter((a) => a.show);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors text-sm"
            >
              <action.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/admin/QuickActionsGrid.tsx
git commit -m "feat(admin-dashboard): add QuickActionsGrid component"
```

---

### Task 10: Frontend — Admin Dashboard Page

**Files:**
- Create: `frontend/app/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: all 5 components + API client + useSidebarVisibility
- Produces: `/admin/dashboard` page

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { SystemStatusBanner } from "@/components/admin/SystemStatusBanner";
import { UsersByRoleGrid } from "@/components/admin/UsersByRoleGrid";
import { RecentActivityTable } from "@/components/admin/RecentActivityTable";
import { SystemAlertsPanel } from "@/components/admin/SystemAlertsPanel";
import { QuickActionsGrid } from "@/components/admin/QuickActionsGrid";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  fetchDashboardOverview,
  fetchUsersByRole,
  fetchDashboardAlerts,
  type DashboardOverview,
  type UsersByRoleResponse,
  type DashboardAlerts,
} from "@/lib/admin-dashboard-api";
import { apiFetch, hasTokens } from "@/lib/api-client";

function AdminDashboardPage() {
  const { currentUser, hydrated } = useCurrentUser();
  const visibility = useSidebarVisibility();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [usersByRole, setUsersByRole] = useState<UsersByRoleResponse | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [recentActivity, setRecentActivity] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!hydrated || !currentUser) return;
    setLoading(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (visibility.showSystemHealth) {
        promises.push(fetchDashboardOverview(), fetchDashboardAlerts());
      } else {
        promises.push(Promise.resolve(null), Promise.resolve(null));
      }

      if (visibility.showUsersRoles) {
        promises.push(fetchUsersByRole());
      } else {
        promises.push(Promise.resolve(null));
      }

      if (visibility.showAuditCompliance && hasTokens()) {
        promises.push(
          apiFetch<{ results: unknown[] }>("/audit/logs/?page_size=10").then((r) => r.results)
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [ov, al, ur, act] = await Promise.all(promises);
      setOverview(ov as DashboardOverview | null);
      setAlerts(al as DashboardAlerts | null);
      setUsersByRole(ur as UsersByRoleResponse | null);
      setRecentActivity(act as unknown[]);
    } finally {
      setLoading(false);
    }
  }, [hydrated, currentUser, visibility]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!visibility.showSystemHealth) return;
    const interval = setInterval(() => {
      fetchDashboardOverview().then(setOverview).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [visibility.showSystemHealth]);

  return (
    <AdminPageShell
      title="Administration Dashboard"
      subtitle="Enterprise system monitoring and user management"
    >
      <div className="space-y-6">
        {(visibility.showSystemHealth || visibility.showAuditCompliance) && (
          <SystemStatusBanner overview={overview} onRefresh={loadData} loading={loading} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibility.showUsersRoles && <UsersByRoleGrid data={usersByRole} />}
          {visibility.showAuditCompliance && (
            <RecentActivityTable activities={recentActivity as any} loading={loading} />
          )}
        </div>

        {(visibility.showSystemHealth || visibility.showAuditCompliance) && (
          <SystemAlertsPanel alerts={alerts} />
        )}

        <QuickActionsGrid visibility={visibility} />
      </div>
    </AdminPageShell>
  );
}

export default AdminDashboardPage;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/admin/dashboard/page.tsx
git commit -m "feat(admin-dashboard): add admin dashboard page"
```

---

### Task 11: Sidebar + Navigation Updates

**Files:**
- Modify: `frontend/hooks/use-sidebar-visibility.ts` (add `showAdminDashboard` field)
- Modify: `frontend/components/AppSidebar.tsx` (add dashboard link)
- Modify: `frontend/lib/admin-navigation.ts` (update `getAdminHomePath`)

**Interfaces:**
- Consumes: existing `SidebarVisibility` type
- Produces: `showAdminDashboard` boolean, dashboard sidebar entry, updated admin home redirect

- [ ] **Step 1: Add showAdminDashboard to SidebarVisibility type**

In `frontend/hooks/use-sidebar-visibility.ts`, add to the `SidebarVisibility` interface under Administration section:

```typescript
  // Administration
  showAdministration: boolean;
  showAdminDashboard: boolean;  // NEW
  showOrganizationOffices: boolean;
```

- [ ] **Step 2: Set showAdminDashboard in the visibility calculation**

Find the section where `showAdministration` is computed and add:

```typescript
const showAdminDashboard =
  hasPermission(user, "can_access_system_health") ||
  hasPermission(user, "can_manage_users");
```

Then add it to the returned object.

- [ ] **Step 3: Add sidebar link in AppSidebar.tsx**

After the `showAdministration` block, add a new `AdminNavItem` for Dashboard:

```tsx
{visibility.showAdminDashboard && (
  <AdminNavItem
    href="/admin/dashboard"
    icon={LayoutDashboard}
    label="Dashboard"
    isActive={isActivePath('/admin/dashboard')}
    isCollapsed={isCollapsed}
  />
)}
```

Import `LayoutDashboard` from lucide-react.

- [ ] **Step 4: Update getAdminHomePath in admin-navigation.ts**

```typescript
export function getAdminHomePath(visibility: SidebarVisibility): string {
  if (visibility.showAdminDashboard) return "/admin/dashboard";
  if (visibility.showOrganizationOffices) return "/admin/organization";
  if (visibility.showUsersRoles) return "/admin/users-roles";
  if (visibility.showWorkflowSLA) return "/admin/workflow-sla";
  if (visibility.showRecordsGovernance) return "/admin/records-governance";
  if (visibility.showTemplates) return "/admin/templates-hub";
  if (visibility.showAuditCompliance) return "/audit";
  return "/dashboard";
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/hooks/use-sidebar-visibility.ts frontend/components/AppSidebar.tsx frontend/lib/admin-navigation.ts
git commit -m "feat(admin-dashboard): add sidebar link and admin home redirect"
```

---

### Task 12: Type Check + Lint + Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript type check**

Run: `cd frontend && npm run type-check`
Expected: PASS

- [ ] **Step 2: Run ESLint**

Run: `cd frontend && npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Run backend syntax check**

Run: `python3 -c "import ast; ast.parse(open('backend/common/views.py').read()); print('OK')"`
Expected: OK

- [ ] **Step 4: Test all 3 endpoints manually**

```bash
# Overview
curl -H "Authorization: Bearer <token>" http://localhost:8002/api/v1/platform/admin-dashboard/overview/

# Users by role
curl -H "Authorization: Bearer <token>" http://localhost:8002/api/v1/platform/admin-dashboard/users-by-role/

# Alerts
curl -H "Authorization: Bearer <token>" http://localhost:8002/api/v1/platform/admin-dashboard/alerts/
```

- [ ] **Step 5: Verify dashboard page loads**

Navigate to `http://localhost:3002/admin/dashboard` — should render all sections.

- [ ] **Step 6: Commit any fixups**

```bash
git add -A
git commit -m "fix(admin-dashboard): type check and lint fixes"
```
