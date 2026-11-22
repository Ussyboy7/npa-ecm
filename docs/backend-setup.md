# Backend Setup Guide

This document captures the end-to-end steps for bringing up the Django + PostgreSQL stack locally.

## 1. Create the database

```bash
psql -U postgres -f backend/scripts/bootstrap_postgres.sql
```

This assigns a login role (`npa_ecm_local` / password `changeme`) and creates the matching database. Adjust credentials to match your local security requirements.

## 2. Install dependencies and seed demo data

```bash
chmod +x backend/scripts/setup_backend.sh
backend/scripts/setup_backend.sh
```

The script will:
- create/activate a virtualenv in `backend/.venv`
- install `requirements.txt`
- run `python manage.py migrate`
- execute `python manage.py seed_demo_data`

The seeding step creates the NPA organisation structure and imports staff accounts from the nominal roll (`backend/scripts/nominal_roll.xlsx`), then maps their roles and primary offices. No mock staff accounts are created.

The only bootstrap login is the break-glass administrator:

| Username   | Password     | Role      |
|------------|--------------|-----------|
| superadmin | ChangeMe123! | Superuser |

Staff sign in with their own imported account (`b.idowu`, `md`, …). New accounts receive the initial password `ChangeMe123!` unless the import is run with `--password ""` to issue one-time set-password links instead.

## 3. Running the backend

```bash
source backend/.venv/bin/activate
python backend/manage.py runserver 0.0.0.0:8002
```

The API is served under `http://localhost:8002/api/v1/` (legacy alias: `/api/`).

Authentication endpoints (JWT):

```
POST /api/v1/accounts/auth/token/
POST /api/v1/accounts/auth/token/refresh/
GET  /api/v1/accounts/auth/me/
```

## 4. Optional helpers

- `python backend/manage.py ensure_dev_login_users` – bootstrap dev login users (Docker entrypoint).
- `python backend/manage.py seed_demo_data` – re-seed structure and nominal-roll accounts (`--with-demo-content` for sample records).
- `python backend/manage.py createsuperuser` – add additional admin accounts.
- `docker-compose.local.yml` – spin up PostgreSQL/Redis and run the backend in containers.

## 5. Environment variables

Copy environment templates from `backend/env/`:

```bash
cp backend/env/local.env.example backend/env/local.env
```

For Docker local dev, `backend/env/local.env` is loaded by compose and Django (`DJANGO_ENV=local`).
