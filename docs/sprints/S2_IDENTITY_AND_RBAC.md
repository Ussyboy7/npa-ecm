# Sprint S2 — Identity & RBAC

**Sprint:** Phase 1, Month 3 (S2)  
**Status:** Complete (June 2026 close-out)  
**Last updated:** June 2026  
**Related:** [REMAINING_WORK_BACKLOG.md](../procurement/REMAINING_WORK_BACKLOG.md) §8 P0 — Full RBAC

---

## Goals

| # | Goal | Exit criteria |
|---|------|----------------|
| 1 | **Backend-driven RBAC** | Sensitive write APIs enforce `user_has_permission`; denials return structured explain payload |
| 2 | **Admin permission matrix** | Matrix UI shows all catalog keys × roles; toggles sync to `Role.permissions` |
| 3 | **Permission-first navigation** | Sidebar visibility driven by `rolePermissions` from `/auth/me`, not grade alone |
| 4 | **ICT ops keys** | System health, DRM, records governance, audit export, integration hub have dedicated keys |

---

## Architecture

### Before (hybrid)
- Grade checks (`use-role-checks`) controlled most admin menus
- Backend enforced `can_register_correspondence` only; other actions used ad-hoc rules
- Role admin UI used static frontend catalog

### After (S2 target)
- **Catalog:** `backend/organization/permissions_catalog.py` (+6 ICT/admin keys → 36 total)
- **`/auth/me`:** returns normalized `permissions` dict
- **Enforcement:** `require_permission(user, key)` on correspondence minutes/archive, DMS CRUD, users, roles, records, audit, system health, DRM
- **Frontend:** `use-sidebar-visibility` reads `currentUser.rolePermissions`; grade kept for seals, scope, routing — not menu access
- **Admin:** Users & Roles → **Matrix** tab + role form synced to `GET /auth/permissions/catalog/`

### Adding a new permission (developer workflow)
1. Add key + label to `permissions_catalog.py` `PERMISSION_KEYS` / `PERMISSION_LABELS`
2. Add matching entry to `frontend/lib/role-permissions.ts`
3. Call `require_permission(request.user, "key")` on the API
4. Optionally wire UI via `getPermissionProfile` or `has("key")` in sidebar
5. Run `setup_role_permissions --force` in deploy/entrypoint to seed presets

Administrators can toggle **existing** keys per role from **Users & Roles → Matrix** without a deploy.

---

## Scope

### In scope (this sprint)
- `require_permission()` helper
- Enforcement on: register (existing), minute/treat/approve/reject, distribute, archive, DMS create/edit/delete/bulk, user management, role management, records governance, audit export, system health, DRM policies
- Permission matrix tab
- Sidebar refactor to permission-driven defaults
- Role presets updated for MD/ED/GM/System Administrator

### Out of scope (S3+)
- SSO / Active Directory
- Per-resource ACL UI (document/correspondence sharing remains separate)
- Playwright RBAC E2E suite
- Removing all grade checks from business logic (seals, sensitivity, routing)

---

## Tasks

| Task | Status |
|------|--------|
| Sprint doc (this file) | ✅ |
| ICT/admin permission keys in catalog | ✅ |
| `require_permission` + tests | ✅ |
| Backend enforcement (top write APIs) | ✅ |
| Permission matrix UI + catalog API sync | ✅ |
| `use-sidebar-visibility` permission refactor | ✅ |
| `permissions.ts` profile extensions | ✅ |
| Re-run `setup_role_permissions --force` on deploy | ✅ (existing entrypoint) |
| Extend explainability to named permission denials on more pages | ✅ (PermissionGate on analytics, integrations) |
| Remove remaining grade gates on admin pages | ✅ (templates hub; sidebar S2) |
| Backend: integrations, analytics, org structure, share, approvals | ✅ |

---

## API reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/accounts/auth/permissions/catalog/` | Canonical permission keys for admin UI |
| `GET /api/v1/accounts/auth/permissions/check/?permission=` | Explain single permission for current user |
| `GET /api/v1/organization/roles/permission-catalog/` | Same catalog (organization module) |
| `PATCH /api/v1/organization/roles/{id}/` | Update `permissions` JSON (requires `can_manage_roles`) |

### Enforcement pattern

```python
from organization.permission_utils import require_permission

require_permission(request.user, "can_minute_correspondence")
```

On denial, API returns 403 with structured body from `explain_permission_denial()`.

---

## Verification

```bash
# Backend tests (Postgres)
make test-backend TESTS=organization.tests.test_permission_utils

# Frontend build
cd frontend && npm run build

# After deploy — refresh role presets
python manage.py setup_role_permissions --force
```

Manual checks:
1. Users & Roles → **Matrix** — toggle `can_register_correspondence` on Officer role; registry page should reflect change after re-login
2. User without `can_archive` — bulk archive correspondence returns 403 with reason
3. ICT user with `can_access_system_health` — System Health page loads; without it, denied card

---

## Related

- [S1_STABILITY_AND_PERMISSIONS.md](./S1_STABILITY_AND_PERMISSIONS.md) — explainability foundation
- [REMAINING_WORK_BACKLOG.md](../procurement/REMAINING_WORK_BACKLOG.md)
