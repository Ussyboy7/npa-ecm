# AGENTS.md — NPA ECM

Guidance for AI agents working in this repository.

## Repository layout

- `backend/` — Django + DRF + Channels. Settings: `backend/ecm_backend/settings.py`; tests: `ecm_backend.settings_test`
- `frontend/` — Next.js App Router. Entry: `frontend/app/`
- `nginx/` — `stag.conf`, prod configs
- `scripts/` — **single** operational tree (see `scripts/README.md`):
  - `scripts/lib/` — `stack-utils.sh`, `ui.sh` (source these; do not duplicate)
  - `scripts/stack/` — env-aware lifecycle: `start|stop|restart|health|seed|backend-status`
  - `scripts/ops/env-manager.sh` — canonical CLI for all operations
  - `scripts/local|staging|production/env-manager.sh` — thin wrappers pinning the env
  - `scripts/backup/` — `backup-db.sh`, `verify_backup.sh`, `restore_backup.sh`
  - `scripts/ci/` — `run-backend-tests.sh`, `run-local-ci.sh`, `validate-compose.sh`
  - Do **not** add new per-env script sprawl. Add subcommands to `env-manager.sh` instead.
- Docker Compose at repo root: `compose.yaml` (local default), `docker-compose.{local,stag,prod}.yml`
- Project names: `npa-ecm-local`, `npa-ecm-stag` (do not run staging on macOS; use remote server)

## Environment files

- **Canonical backend path:** `backend/env/{local,stag,prod}.env` (not committed)
- **Templates:** `backend/env/*.env.example` — copy and fill secrets
- **Frontend:** `frontend/.env.{local,stag,prod}` (gitignored)
- Django loads `backend/env/{DJANGO_ENV}.env` first
- **PostgreSQL is required** — `DB_ENGINE=sqlite` is rejected in settings

## Backend commands

Run from repo root with venv active (`make backend-install`).

| Command | Description |
|---------|-------------|
| `make backend-migrate` | Run migrations |
| `make backend-seed` | Load demo data |
| `make test-backend` | Django tests via `settings_test` (needs Postgres) |
| `make security-check` | bandit + pip-audit |
| `python manage.py ensure_dev_login_users` | Bootstrap dev login users (local Docker entrypoint) |
| `python manage.py setup_role_permissions --force` | Sync role permission presets (deploy/CI) |
| `cd backend && python manage.py makemigrations --check --dry-run` | Catch missing migrations |

CI uses Postgres service + `ecm_backend.settings_test` with in-memory Channels/Celery.

## Frontend commands

Run from `frontend/` (or repo root with `cd frontend`).

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port **3002** |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript |
| `npm run build` | Production build |

Shared libs: `lib/api-client.ts`, `lib/type-utils.ts`, `lib/pagination-utils.ts`, `hooks/use-pagination.ts`.

## Day-to-day stack

```bash
scripts/local/env-manager.sh start      # or: make local-start
scripts/local/env-manager.sh status
scripts/local/env-manager.sh backup
scripts/local/env-manager.sh verify-backup
docker compose up -d                    # same as local start
make ci                                 # mirror GitHub CI locally
make ci-quick                           # compose validation only
```

Staging deploy (server only): `scripts/staging/env-manager.sh deploy`

## Documentation map

| Topic | Path |
|-------|------|
| Quick start / routes | `docs/guides/QUICK_START.md` |
| Backlog & Phase 9–11 | `docs/procurement/REMAINING_WORK_BACKLOG.md` |
| Feature areas | `docs/features/` |
| Rollout & helpdesk | `docs/rollout/` |
| WCAG checklist | `docs/guides/WCAG_AUDIT_CHECKLIST.md` |

## Staging vs local

| | Local (Mac) | Staging (server) |
|--|-------------|------------------|
| Host | `localhost` | `172.16.0.46` |
| Frontend | `:3002` | `:4646` (nginx) |
| API liveness | `http://localhost:8002/api/v1/health/live/` | `http://172.16.0.46:4646/api/v1/health/live/` |
| Readiness | `…/api/v1/health/` (DB + Redis) | same via nginx |
| Checkout | dev machine | `/srv/npa-ecm` |

Staging is **blocked on macOS** unless `ECM_ALLOW_LOCAL_STAG=1`.

## Health endpoints

- **Liveness** (`/health/live/`, `/api/v1/health/live/`) — process up; used by Docker healthchecks
- **Readiness** (`/api/v1/health/`) — database + Redis checks

Deploy wait uses **Docker healthcheck status only** (no curl fallback).

## CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`):

- **Fails** on test/lint/security/migration drift (no `|| continue`)
- `backend` — Postgres, `makemigrations --check`, Django tests
- `frontend` — Vitest, lint, type-check, build
- `security-scan` — bandit, pip-audit, npm audit (critical)
- `docker-validate` — compose config + image builds
- `deploy-staging` — push to `main` on self-hosted runner
- `deploy-production` — `workflow_dispatch` only

## Conventions

- **TypeScript**: strict mode. Use `lib/type-utils.ts` (`isRecord`, `unwrapResults`) — do not duplicate.
- **API client**: `lib/api-client.ts` + `hasTokens` from same module. Import all symbols explicitly.
- **Pagination**: `StandardPageNumberPagination` (50/100), `fetchAllPaginated`, `use-pagination` hook.
- **API versioning**: `/api/v1/` is canonical; `/api/` is a legacy alias.
- **WebSockets**: require Redis + Daphne; `CHANNEL_LAYERS` uses `socket_timeout: None` in production.

## Safety

- Never commit real secrets or `backend/env/*.env`
- Never commit correspondence attachments or production media
- Backend tests require Postgres — use `settings_test`, not production settings
- Do not weaken CI gates (`|| echo continuing`) without explicit team approval
- Pre-deploy DB snapshots run automatically on `env-manager deploy` (stag/prod)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
