# `scripts/` — ECM Operations Toolkit

Shell entry-points for running, deploying, and troubleshooting the ECM stack across **local**, **staging**, and **production**.

## Design

One generic CLI (`ops/env-manager.sh`), thin per-env wrappers, shared `lib/`.

```
scripts/
├── lib/
│   ├── stack-utils.sh    # Compose file, env file, URLs, Mac staging guard
│   └── ui.sh             # Colours and log helpers
├── stack/                # Lifecycle primitives (<env> as first arg)
│   ├── start.sh
│   ├── stop.sh
│   ├── restart.sh
│   ├── health.sh
│   ├── seed.sh
│   ├── collect-static.sh
│   └── backend-status.sh
├── ops/
│   ├── env-manager.sh    # Canonical CLI (all subcommands)
│   ├── status.sh
│   └── logs.sh
├── local/env-manager.sh      # exec ops/env-manager.sh local "$@"
├── staging/env-manager.sh    # exec ops/env-manager.sh stag "$@"
├── production/env-manager.sh # exec ops/env-manager.sh prod "$@"
├── ci/                       # validate-compose, run-backend-tests, run-local-ci
├── backup/
│   ├── backup-db.sh
│   ├── verify_backup.sh
│   ├── restore_backup.sh
│   └── README.md
├── monitoring/               # legacy shims
│   ├── check-health.sh       # → stack/health.sh
│   ├── check-backend-status.sh  # → stack/backend-status.sh stag
│   └── check-staging-services.sh  # → staging/env-manager.sh diagnostics
├── utilities/ecm               # shortcut → ops/env-manager.sh
└── production/                 # legacy shims → stack/ or ops/
```

## Cheat sheet

```bash
# Local (Mac)
scripts/local/env-manager.sh start   # runs migrate + ensure_dev_login_users via entrypoint
scripts/local/env-manager.sh stop
scripts/local/env-manager.sh status
scripts/local/env-manager.sh logs backend --follow
scripts/local/env-manager.sh seed
docker compose up -d                    # same stack via compose.yaml

# Staging (on server 172.16.0.46, checkout /srv/npa-ecm)
scripts/staging/env-manager.sh deploy
scripts/staging/env-manager.sh health
scripts/staging/env-manager.sh logs backend_stag --follow

# Production
scripts/production/env-manager.sh deploy
scripts/production/env-manager.sh status
```

Equivalent generic form:

```bash
scripts/ops/env-manager.sh local start
scripts/ops/env-manager.sh stag deploy
```

## Environment files

Copy templates before first run:

```bash
cp backend/env/local.env.example backend/env/local.env
cp backend/env/stag.env.example backend/env/stag.env   # on staging server
cp backend/env/prod.env.example backend/env/prod.env     # on production server
```

Docker Compose and Django both use `backend/env/<env>.env`.

## `env-manager` commands

| Command | Description |
|---------|-------------|
| `start` | `docker compose up -d` |
| `stop` | `docker compose down` |
| `restart` | Rolling restart |
| `status` | Services + HTTP probes |
| `health` | Backend (+ optional frontend) curl checks |
| `logs [svc]` | Tail logs (`--follow`, `--tail N`) |
| `backend-status` | Container + DB smoke check |
| `shell` | Shell in backend container |
| `migrate` | `manage.py migrate --noinput` |
| `seed` | `seed_demo_data` |
| `backup` | `scripts/backup/backup-db.sh` |
| `verify-backup` | `scripts/backup/verify_backup.sh` (integrity check on latest dump) |
| `restore-backup` | `scripts/backup/restore_backup.sh` (destructive — see `scripts/backup/README.md`) |
| `collectstatic` | `collectstatic --noinput` in backend container |
| `deploy` | Pull, rebuild, health wait, rollback (stag/prod) |
| `diagnostics` | `ps` + recent logs |

## Staging deploy

Run **on the staging server**:

```bash
cd /srv/npa-ecm
scripts/staging/env-manager.sh deploy
```

`deploy` does: optional pre-deploy DB snapshot, `git pull`, media dir prep, `compose down`, `up --build`, Docker health wait on `/health/live/`, rollback on failure.

Flags: `--no-backup`, `--no-pull`, `--no-rollback`, `--skip-health`

## Legacy scripts

Removed bare-metal starters (`start-backend-local.sh`, etc.) — see `scripts/archive/README.md`.

Shims kept for compatibility:

- `production/start-stack.sh` → `stack/start.sh`
- `production/deploy-staging.sh` → `staging/env-manager.sh deploy`
- `production/test-docker-compose.sh` → `ci/validate-compose.sh`
- `production/collect-static.sh` → `stack/collect-static.sh`
- `monitoring/check-health.sh` → `stack/health.sh`
- `monitoring/check-backend-status.sh` → `stack/backend-status.sh stag`
- `monitoring/check-staging-services.sh` → `staging/env-manager.sh diagnostics`

## Local CI

Mirror GitHub Actions before push:

```bash
make ci          # full: compose, migrations, backend tests, vitest, lint, type-check, build
make ci-quick    # compose validation only
make test        # backend + frontend unit tests
make test-backend
make test-frontend
make security-check
```

Set `CI_SKIP_BACKEND_TESTS=1` to skip Django tests when Postgres is not running.

## Adding a new operation

1. Implement in `stack/` or `ops/` using `stack_init_env`
2. Add a `cmd_*` handler in `ops/env-manager.sh`
3. Document here — do not add new per-env shell files
