# NPA ECM Backend

Django REST API for the Electronic Content Management system.

## Prerequisites

- Python 3.11+
- PostgreSQL 16+ (required — SQLite is not supported)
- Redis 7+ (caching, Celery, Channels)

## First-time setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

Copy `env/local.env.example` to `env/local.env` and adjust secrets.

Or from repo root:

```bash
make backend-install
```

## Database

```bash
# With Docker stack running (recommended)
make local-start
make backend-migrate
make backend-seed

# Manual Postgres
createdb npa_ecm_local
export DB_NAME=npa_ecm_local DB_USER=ecmadmin DB_PASSWORD=ecmadmin DB_HOST=localhost DB_PORT=5433
python manage.py migrate
python manage.py seed_demo_data
```

Demo users (password `ChangeMe123!`): `superadmin`, `md`, `edfa`, `gmict`, `pamd`.

## Running the API

```bash
# Local Docker (Daphne + WebSockets on 8002)
make local-start

# Dev server without Docker
make backend-run   # http://localhost:8002
```

## Authentication

JWT endpoints under `/api/v1/accounts/auth/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/accounts/auth/token/` | POST | Obtain access/refresh tokens |
| `/api/v1/accounts/auth/token/refresh/` | POST | Refresh access token |
| `/api/v1/accounts/auth/token/blacklist/` | POST | Revoke refresh token |
| `/api/v1/accounts/auth/me/` | GET | Current user profile |

## Health

| Endpoint | Purpose |
|----------|---------|
| `/health/live/` | Liveness (Docker healthchecks) |
| `/api/v1/health/live/` | Liveness (versioned) |
| `/api/v1/health/` | Readiness (database + Redis) |

## Tests

```bash
# From repo root — requires Postgres (local Docker on :5433)
make test-backend

# Or directly
export DJANGO_SETTINGS_MODULE=ecm_backend.settings_test
export DB_HOST=localhost DB_PORT=5433 DB_NAME=npa_ecm_local DB_USER=ecmadmin DB_PASSWORD=ecmadmin
bash scripts/ci/run-backend-tests.sh
```

`settings_test.py` uses in-memory Channels/Celery and a separate test database.

## Useful commands

| Command | Description |
|---------|-------------|
| `python manage.py seed_demo_data` | Demo org, correspondence, DMS, workflows |
| `python manage.py makemigrations --check --dry-run` | Verify migrations are committed |
| `make security-check` | bandit + pip-audit |

## API docs

- Swagger: `http://localhost:8002/api/docs/`
- OpenAPI schema: `http://localhost:8002/api/schema/`
