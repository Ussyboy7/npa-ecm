# Sprint S1 — SSR Stability & Permissions Explainability

**Sprint:** Phase 1, Month 2 (S1)  
**Status:** Complete (June 2026)  
**Last updated:** June 2026  
**Related:** [REMAINING_WORK_BACKLOG.md](../procurement/REMAINING_WORK_BACKLOG.md) §8 P0

---

## Goals

| # | Goal | Exit criteria |
|---|------|----------------|
| 1 | **SSR / production build stability** | `npm run build` passes; broken route re-exports fixed; detail routes opt out of static prerender where needed |
| 2 | **Permission explainability** | 403/404 on detail pages show structured “why blocked” + suggestion (not generic “not found”) |
| 3 | **Deploy permissions seed** | `setup_role_permissions --force` on entrypoint; CI already runs `--force` |

---

## Scope

### In scope
- Fix frontend build failures affecting staging/prod deploys
- `GET /api/v1/accounts/auth/permissions/explain-access/?context=…`
- Reuse `PermissionDeniedCard` + `usePermissionCheck` pattern on:
  - `/correspondence/[id]`
  - `/dms/[id]`
- `lib/api-errors.ts` — shared 403/404 detection from `apiFetch`
- Entrypoint: `setup_role_permissions --force`

### Out of scope (S2+)
- SSO / Active Directory
- Full backend-driven permissions for every action
- Playwright E2E suite
- Load testing

---

## Technical notes

### SSR / build
- Detail pages are `"use client"` but Next.js still pre-renders route shells at build time.
- Broken re-export (`dms/new` → wrong path to `documents/new`) caused **full build failure** → staging 500s.
- Detail routes use `export const dynamic = "force-dynamic"` to avoid stale static generation.

### Permission explainability
- **Named permissions:** `GET /accounts/auth/permissions/check/?permission=can_register_correspondence` (existing).
- **Resource access:** `GET /accounts/auth/permissions/explain-access/?context=document_view|correspondence_view` when detail fetch returns 403/404.
- DMS returns **404** when queryset excludes document (sensitivity/sharing) — UI treats 404 on detail as access denied.

---

## Tasks

| Task | Status |
|------|--------|
| Sprint doc (this file) | ✅ |
| Fix `dms/new/page.tsx` re-export | ✅ |
| `explain_access_context` API + tests | ✅ |
| `lib/api-errors.ts` + `useAccessExplanation` hook | ✅ |
| Wire correspondence + DMS detail pages | ✅ |
| `setup_role_permissions --force` in entrypoint | ✅ |
| Fix build blockers (records-governance, division analytics types) | ✅ |
| Verify `npm run build` | ✅ |

---

## Delivered (summary)

### Build / SSR fixes
- Fixed broken `dms/new` re-export path (`../../documents/new/page`)
- `export const dynamic = "force-dynamic"` on `/correspondence/[id]` and `/dms/[id]`
- Type fixes: `records-governance` disposition action, `sla-client` division rows, `capture-storage` OCR unwrap
- Excluded `playwright.config.ts` from `tsc` until Playwright is installed (S6)

### Permission explainability
- `GET /api/v1/accounts/auth/permissions/explain-access/?context=document_view|correspondence_view`
- `ResourceAccessDenied` + `useAccessExplanation` on DMS and correspondence detail pages
- `lib/api-errors.ts` — `isAccessDeniedError()` for 403/404

### Ops
- `docker-entrypoint.sh`: `setup_role_permissions --force`

---

## Verification

```bash
# Frontend build
cd frontend && npm run build

# Permission explain API (with valid JWT)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8002/api/v1/accounts/auth/permissions/explain-access/?context=document_view"

# Backend tests
make test-backend
```

**Manual:** Open a document/correspondence you cannot access → see role name, reason, and suggestion.

---

## Follow-on (S2)

Identity: SSO/OIDC staging, login MFA enablement, connector encryption.
