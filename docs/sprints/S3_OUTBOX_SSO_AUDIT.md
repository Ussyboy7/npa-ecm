# Sprint S3 — Outbox APIs, SSO/MFA Staging & Audit RBAC

**Sprint:** Phase 1, Month 4 (S3)  
**Status:** Complete (June 2026)  
**Last updated:** June 2026  
**Related:** [REMAINING_WORK_BACKLOG.md](../procurement/REMAINING_WORK_BACKLOG.md) §8 P0

---

## Goals

| # | Goal | Exit criteria |
|---|------|----------------|
| 1 | **Outbox cancel / resend draft** | Dedicated APIs + UI for cancel → edit → resend loop |
| 2 | **SSO staging readiness** | OIDC status endpoint; login hides AD button when unconfigured |
| 3 | **Login MFA** | Already implemented (S2 backend + settings UI); document rollout |
| 4 | **Audit log RBAC** | Activity log queryset uses permission keys, not grade names |

---

## Delivered

### Outbox draft APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/correspondence/items/{id}/cancel-draft/` | Cancel **pending** draft → `withdrawn` (reason required in body) |
| `POST /api/v1/correspondence/items/{id}/resend-draft/` | Restore **withdrawn** draft → `pending` for edit/dispatch |
| `POST …/withdraw/` | Legacy; still supports pending + in-progress |
| `POST …/resend-reminder/` | Reminder to current approver (unchanged) |

Frontend: outbox list, detail, and office-outbox use `cancel-draft`; withdrawn rows show **Resend Draft**.

Tests: `correspondence/tests/test_outbox_draft_actions.py`

### SSO / OIDC staging

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/accounts/auth/oidc/status/` | `{ "enabled": true/false }` — no auth required |
| `GET /api/v1/accounts/auth/oidc/login/` | Redirect to IdP (existing) |
| `GET /api/v1/accounts/auth/oidc/callback/` | Token handoff to `/auth/callback` (existing) |

Login page shows **Sign in with NPA Active Directory** only when `oidc/status` reports enabled.

**Staging env** (`backend/env/local.env.example`):

```env
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://login.microsoftonline.com/{tenant}/v2.0
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=https://api.staging.example/api/v1/accounts/auth/oidc/callback/
FRONTEND_BASE_URL=https://ecm.staging.example
```

### Login MFA rollout

| Setting | Effect |
|---------|--------|
| `LOGIN_MFA_REQUIRED=true` | All users challenged at login |
| Per-user | Settings → Security → Login MFA (`LoginMFASection`) |
| Per-user `mfa_required` | Admin can flag accounts via `LoginSecuritySettings` |

Login flow: password → MFA challenge → `/auth/token/mfa/` (existing).

### Audit log permission scoping

`ActivityLogViewSet.get_queryset()`:

- `can_access_audit_compliance` or `can_access_administration` → all logs
- `can_manage_org_structure` → division scope + own
- Else → own logs (+ case filter when `object_type=case`)

---

## Tasks

| Task | Status |
|------|--------|
| `cancel-draft` + `resend-draft` APIs | ✅ |
| Frontend outbox wiring | ✅ |
| OIDC status + conditional login button | ✅ |
| Audit log permission scoping | ✅ |
| Sprint doc (this file) | ✅ |
| Staging IdP cutover (ops) | 🟡 ICT action |
| `LOGIN_MFA_REQUIRED=true` in production | 🟡 phased rollout |

---

## Verification

```bash
# Outbox draft tests (Postgres)
make test-backend TESTS=correspondence.tests.test_outbox_draft_actions

# OIDC status (local)
curl -s http://localhost:8002/api/v1/accounts/auth/oidc/status/

# Frontend
cd frontend && npm run build
```

Manual:
1. Create pending correspondence → Outbox → Cancel draft → row shows withdrawn → Resend draft → pending again
2. With `OIDC_ENABLED=false`, login has no AD button; set env true → button appears
3. User without `can_access_audit_compliance` sees only own audit entries

---

## Related

- [S2_IDENTITY_AND_RBAC.md](./S2_IDENTITY_AND_RBAC.md)
- [S1_STABILITY_AND_PERMISSIONS.md](./S1_STABILITY_AND_PERMISSIONS.md)
