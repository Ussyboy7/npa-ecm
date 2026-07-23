# NPA Electronic Content Management System — Setup Guide

**Last updated:** June 2026

> **Fastest path:** [QUICK_START.md](./QUICK_START.md) — Docker stack, ports 8002/3002, dev login users.

## Overview

Setup and orientation for NPA ECM: local development, organizational structure, access levels, and smoke testing. For API details see [API_REFERENCE.md](../api/API_REFERENCE.md); for deployment see [MANUAL_DEPLOYMENT.md](./MANUAL_DEPLOYMENT.md).

---

## Prerequisites

| Layer | Requirement |
|-------|-------------|
| Backend | Python 3.11+, PostgreSQL 16+ (**required**), Redis 7+, optional Tesseract |
| Frontend | Node.js 20+, npm |
| Ops | Docker & Docker Compose (recommended) |

SQLite is **not** supported (`DB_ENGINE=sqlite` is rejected in settings).

---

## Quick Start (Docker — recommended)

```bash
cd npa-ecm
cp backend/env/local.env.example backend/env/local.env
scripts/local/env-manager.sh start
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3002 |
| API | http://localhost:8002/api/v1 |
| Swagger | http://localhost:8002/api/docs |
| Admin | http://localhost:8002/admin |

**Dev login** (auto via `ensure_dev_login_users`): `superadmin`, `md`, `edfa`, `gmict`, `pamd` / `ChangeMe123!`

**Full demo org:** `scripts/local/env-manager.sh seed`

---

## Quick Start (manual)

```bash
# Backend
make backend-install
cp backend/env/local.env.example backend/env/local.env
# DB_HOST=localhost DB_PORT=5433 when using Docker Postgres only
make backend-migrate
python backend/manage.py ensure_dev_login_users
make backend-seed          # optional
make backend-run           # :8002

# Frontend
cd frontend && npm install
cp .env.example .env.local # NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
npm run dev                # :3002
```

Celery (separate terminals):

```bash
backend/.venv/bin/celery -A ecm_backend worker -l info
backend/.venv/bin/celery -A ecm_backend beat -l info
```

---

## Organizational structure (after `seed_demo_data`)

### Ports (8)
Lagos (LPC), Onne, Lekki, Tin Can (TCIPC), Port Harcourt, Warri, Calabar, Headquarters.

### Divisions (23+)
HR, Finance, Procurement, Administration, Medical, Superannuation, Marine & Operations, Security, HSE, Regulatory, PPP, Engineering & Technical, ICT, Lands & Assets, Corporate Planning, Communications, Audit, Legal, Tariff & Billing, Monitoring, SERVICOM, ERM, Admin Support & Liaison, Special Duties.

### Sample accounts

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `ChangeMe123!` | System administrator |
| `md` | `ChangeMe123!` | Managing Director |
| `edfa` | `ChangeMe123!` | Executive Director |
| `gmict` | `ChangeMe123!` | GM ICT |
| `pamd` | `ChangeMe123!` | PA to MD |

`seed_demo_data` creates the full hierarchy and additional port/division users.

### Hierarchy (summary)

```
Managing Director (MD)
├── Executive Director, Finance & Administration
│   ├── HR, Finance, Procurement, Administration, Medical, Superannuation
├── Executive Director, Marine & Operations
│   ├── Marine & Operations (+ port managers), Security, HSE, Regulatory, PPP
├── Executive Director, Engineering & Technical Services
│   ├── Engineering, ICT, Lands & Assets
└── Corporate Services (direct to MD)
    ├── Planning, Communications, Audit, Legal, Tariff, Monitoring, SERVICOM, ERM, …
```

See `docs/architecture/org-hierarchy.md` for routing implications.

---

## Access control & sensitivity

Document sensitivity maps to grade levels (see `common/grade_utils.py`):

| Level | Typical audience | Examples |
|-------|------------------|----------|
| Confidential | MD, EDs | Board papers, strategic plans |
| Restricted | GMs+ | Divisional reports, budgets |
| Internal | AGMs+ | Department reports, operational memos |
| General | All staff | Circulars, announcements |

Office-based routing means queues attach to **offices** (MD, ED, GM, AGM), not individuals — acting officers inherit backlog.

---

## Development workflow

### Adding a user (Django admin or API)

```bash
python backend/manage.py createsuperuser   # break-glass admin
# or use /admin/users-roles in the app (ICT)
```

Programmatic example:

```python
from accounts.models import User
from organization.models import Department

dept = Department.objects.filter(code="ICT").first()
user = User.objects.create_user(
    username="john.doe",
    email="john.doe@npa.gov.ng",
    password="ChangeMe123!",  # force change in production
    first_name="John",
    last_name="Doe",
)
# Assign office membership and role via organization APIs or admin UI
```

### Role permissions after deploy

```bash
python manage.py setup_role_permissions --force
python manage.py check_environment_parity --strict
```

CI and `docker-entrypoint.sh` run `setup_role_permissions` on promote.

### Key Django apps

| App | Purpose |
|-----|---------|
| `accounts` | Users, JWT, seals, login MFA settings |
| `organization` | Hierarchy, roles, office membership |
| `correspondence` | Letters, minutes, routing, cases |
| `dms` | Documents, versions, DRM, workspaces |
| `records` | Retention, legal hold, eDiscovery export |
| `audit` | Activity log, compliance export |
| `search` | FTS + semantic MVP re-rank |
| `support` | Helpdesk tickets |
| `integrations` | Webhooks, email/ERP/HRMS connectors |

---

## API endpoints (canonical `/api/v1/`)

| Area | Method | Path |
|------|--------|------|
| Login | POST | `/api/v1/accounts/auth/token/` |
| Refresh | POST | `/api/v1/accounts/auth/token/refresh/` |
| Profile | GET | `/api/v1/accounts/auth/me/` |
| Documents | GET/POST | `/api/v1/dms/documents/` |
| Version diff | GET | `/api/v1/dms/versions/{id}/diff/?compare_with={id}` |
| Search | GET | `/api/v1/search/?q=…&search_mode=semantic` |
| Compliance export | GET | `/api/v1/audit/activity-logs/compliance-export/` |
| eDiscovery | GET | `/api/v1/records/legal-holds/{id}/ediscovery-export/` |
| Helpdesk | POST | `/api/v1/support/tickets/` |

Full schema: http://localhost:8002/api/docs/

---

## Smoke test checklist

1. **Login** — `md` / `ChangeMe123!` at `/login`
2. **Upload** — `/dms` → upload PDF, set sensitivity
3. **Register** — `/correspondence/register` → create memo
4. **Route** — minute/approve from `/inbox` or `/tasks`
5. **Search** — `/search` with semantic toggle
6. **Audit** — `/audit` as `superadmin`; optional compliance export
7. **Helpdesk** — `/helpdesk` → submit ticket
8. **Health** — `curl http://localhost:8002/api/v1/health/`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| DB connection | Ensure Postgres on `:5433` (Docker) or update `backend/env/local.env` |
| Login fails (empty DB) | Check backend logs for `ensure_dev_login_users`; run `make backend-migrate` |
| Port in use | `lsof -ti:8002 \| xargs kill -9` or `lsof -ti:3002 \| xargs kill -9` |
| Migration drift | `python manage.py makemigrations --check --dry-run` |
| Missing role presets | `python manage.py setup_role_permissions --force` |

---

## Production checklist

1. Set `DJANGO_DEBUG=False`, strong `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`
2. Configure production `backend/env/prod.env` and secrets (never commit)
3. Run deploy via `scripts/production/env-manager.sh deploy`
4. Mandatory post-deploy: `migrate`, `setup_role_permissions`, `check_environment_parity --strict`
5. Configure backups (`scripts/backup/`) and monitoring
6. See [NATIONAL_ROLLOUT_RUNBOOK.md](../rollout/NATIONAL_ROLLOUT_RUNBOOK.md) for port cutover

---

## Related documentation

- [QUICK_START.md](./QUICK_START.md)
- [DESIGN.md](./DESIGN.md)
- [API_REFERENCE.md](../api/API_REFERENCE.md)
- [REMAINING_WORK_BACKLOG.md](../procurement/REMAINING_WORK_BACKLOG.md)
- [Feature docs](../features/) (incl. [rich-text-editor.md](../features/rich-text-editor.md), [cases.md](../features/cases.md))
- [WCAG_AUDIT_CHECKLIST.md](./WCAG_AUDIT_CHECKLIST.md)
