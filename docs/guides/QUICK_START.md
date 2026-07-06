# NPA ECM — Quick Start Guide

**Last updated:** June 2026

## Start the full stack (recommended)

From the repo root:

```bash
scripts/local/env-manager.sh start
# or: docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3002 |
| API | http://localhost:8002/api/v1 |
| Swagger | http://localhost:8002/api/docs |
| Health (liveness) | http://localhost:8002/api/v1/health/live/ |

### Dev login users

Created automatically on backend start (`ensure_dev_login_users`):

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `ChangeMe123!` | System admin |
| `md` | `ChangeMe123!` | Managing Director |
| `edfa` | `ChangeMe123!` | Executive Director |
| `gmict` | `ChangeMe123!` | GM ICT |
| `pamd` | `ChangeMe123!` | PA to MD |

### Demo data (optional)

```bash
scripts/local/env-manager.sh seed
# or: docker exec ecm-backend-local python manage.py seed_demo_data
```

---

## Main routes

### Workspace
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Overview and quick stats |
| My Work | `/tasks` | Priority queue (SLA, approvals) |
| My Inbox | `/inbox` | Personal correspondence inbox |
| Search | `/search` | Full-text + semantic toggle |
| Notifications | `/notifications` | In-app alerts |

### Correspondence
| Page | URL |
|------|-----|
| Register | `/correspondence/register` |
| My Inbox | `/correspondence/inbox` |
| Outbox | `/correspondence/outbox` |
| Cases | `/analytics/cases` |
| FOIA | `/foia` |

### Documents
| Page | URL |
|------|-----|
| Document library | `/dms` (canonical; `/documents` redirects) |
| Capture hub | `/capture` |
| Workspaces | `/workspaces` |
| Physical records | `/physical-documents` |

### Support & admin
| Page | URL | Who |
|------|-----|-----|
| Get Support | `/helpdesk` | All users |
| Support Queue | `/admin/helpdesk` | ICT / helpdesk staff |
| Records governance | `/admin/records-governance` | Records admins |
| DRM policies | `/admin/drm-policies` | ICT / system admin |
| Legacy import | `/admin/legacy-import` | ICT |
| System Health | `/admin/system-health` | ICT |
| Audit & compliance | `/audit` | Compliance officers |
| PA Calendar | `/assistant/calendar` | PAs / executives |

Full admin hub: `/admin` (organization, users, workflow, templates).

---

## Frontend-only dev (API already running)

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
npm install
npm run dev                  # port 3002
```

---

## Troubleshooting

**Port in use:**
```bash
lsof -ti:3002 | xargs kill -9
```

**Login fails with empty DB:** Ensure migrations ran and `ensure_dev_login_users` completed (check backend container logs).

**API unreachable:** Confirm stack health:
```bash
scripts/local/env-manager.sh status
curl -s http://localhost:8002/api/v1/health/live/
```

---

## Further reading

- [NPA ECM Setup Guide](./NPA_ECM_SETUP_GUIDE.md) — org structure and access levels
- [Backend README](../../backend/README.md) — API auth and tests
- [AGENTS.md](../../AGENTS.md) — conventions for contributors
- [Remaining Work Backlog](../procurement/REMAINING_WORK_BACKLOG.md) — what's still open
