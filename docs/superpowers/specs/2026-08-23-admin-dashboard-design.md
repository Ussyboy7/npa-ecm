# Admin Dashboard Design

## Overview

A new admin dashboard at `/admin/dashboard` that gives administrators a single-glance operational view. The existing `/admin/system-health` page remains for deep infrastructure monitoring.

## Architecture

### Page Structure

```
/admin/dashboard
├── System Status Banner     (operational indicator + online users)
├── Users by Role            (card grid with counts, clickable)
├── Recent Audit Activity    (table, last 10 entries)
├── System Alerts            (backup, escalations, integrations, celery, degraded services)
└── Quick Actions            (icon links to admin pages)
```

### Backend API

Three new endpoints mounted in `backend/common/urls.py` (not a new Django app):

#### 1. `GET /api/v1/platform/admin-dashboard/overview`

```json
{
  "status": "healthy",
  "online_users": 12,
  "services_degraded": [],
  "last_updated": "2026-08-23T16:50:00Z"
}
```

- `online_users` uses `last_activity__gte=now - 5min` (indexed), NOT `last_login`
- Permission: `can_access_system_health`

#### 2. `GET /api/v1/platform/admin-dashboard/users-by-role`

```json
{
  "roles": [
    { "id": "uuid-gm", "name": "General Manager", "count": 27 },
    { "id": null, "name": "Unassigned", "count": 0 }
  ],
  "total_users": 140
}
```

- Includes `id` (UUID) for deep-link filtering
- Users with `system_role=None` grouped as "Unassigned"
- Permission: `can_manage_users`

#### 3. `GET /api/v1/platform/admin-dashboard/alerts`

```json
{
  "backup": { "status": "healthy", "last_backup": "...", "file_size_mb": 12.54, "age_hours": 19.1 },
  "pending_escalations": 0,
  "integration_failures_24h": 2,
  "celery_beat_disabled": 0,
  "degraded_services": []
}
```

- Backup detection: new logic scanning `./backups/<ENV>/` for `db-*.sql`, `predeploy_*.sql`, `*.dump`
- No license expirations (NPA ECM has no `license_expiry`)
- Permission: `can_access_system_health`

#### 4. Audit: Reuse `GET /api/v1/audit/logs/?page_size=10` — only shown when user has `can_access_audit_compliance`

### Section Visibility Matrix

| Section | `can_manage_users` | `can_access_system_health` | `can_access_audit_compliance` |
|---------|-------------------|---------------------------|------------------------------|
| Status banner | Hide | Show | Show |
| Users by role | Show | Hide | Hide |
| Recent audit | Hide | Hide | Show |
| System alerts | Hide | Show | Show |
| Quick actions | Subset | Subset | Subset |

### Sidebar

`showAdminDashboard = can_access_system_health || can_manage_users`

### Admin Home Redirect

`getAdminHomePath()` returns `/admin/dashboard` when `showAdminDashboard` is true.

### Quick Actions (visibility-gated)

| Action | Route | Required visibility |
|--------|-------|-------------------|
| Users & Roles | `/admin/users-roles` | `showUsersRoles` |
| Organization | `/admin/organization` | `showOrganizationOffices` |
| System Health | `/admin/system-health` | `showSystemHealth` |
| Audit & Compliance | `/audit` | `showAuditCompliance` |
| Integrations | `/admin/integrations` | `showIntegrationHub` |
| Templates | `/admin/templates-hub` | `showTemplates` |

## Files

### Backend (extend existing `backend/common/`)
- `backend/common/views.py` — Add `AdminDashboardOverviewView`, `UsersByRoleView`, `AdminDashboardAlertsView`
- `backend/common/urls.py` — Add 3 new routes

### Frontend
- `frontend/app/admin/dashboard/page.tsx`
- `frontend/components/admin/SystemStatusBanner.tsx`
- `frontend/components/admin/UsersByRoleGrid.tsx`
- `frontend/components/admin/RecentActivityTable.tsx`
- `frontend/components/admin/SystemAlertsPanel.tsx`
- `frontend/components/admin/QuickActionsGrid.tsx`
- `frontend/lib/admin-dashboard-api.ts`

### Updates
- `frontend/hooks/use-sidebar-visibility.ts` — Add `showAdminDashboard`
- `frontend/components/AppSidebar.tsx` — Add dashboard link
- `frontend/lib/admin-navigation.ts` — Update `getAdminHomePath()`
