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

The seeding step mirrors the mock data the frontend relied on so the new REST API remains consistent.

Default accounts created during seeding:

| Username   | Password     | Role                |
|------------|--------------|---------------------|
| superadmin | ChangeMe123! | Superuser           |
| md         | ChangeMe123! | Managing Director   |
| edfa       | ChangeMe123! | Executive Director  |
| gmict      | ChangeMe123! | General Manager ICT |
| pamd       | ChangeMe123! | Personal Assistant  |

## 3. Running the backend

```bash
source backend/.venv/bin/activate
python backend/manage.py runserver 0.0.0.0:8000
```

The API is served under `http://localhost:8000/api/`.

Authentication endpoints (JWT):

```
POST /api/accounts/auth/token/
POST /api/accounts/auth/token/refresh/
GET  /api/accounts/auth/me/
```

## 4. Optional helpers

- `python backend/manage.py seed_demo_data` – re-seed when you reset the database.
- `python backend/manage.py createsuperuser` – add additional admin accounts.
- `docker-compose.local.yml` – spin up PostgreSQL/Redis and run the backend in containers.

## 5. Environment variables

Copy `.env` templates from `backend/env/` for the environment you are targeting, e.g.:

```bash
cp backend/env/local.env backend/.env.local
```

Update sensitive values before deploying outside of local development.
