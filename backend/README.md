# NPA ECM Backend

## Prerequisites

- Python 3.13
- pip
- (Optional) PostgreSQL 13+ if you want to mirror production. For local lightweight development the project can fall back to SQLite by setting `DB_ENGINE=sqlite`.

## First-time Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env.local` file (or copy from `env/local.env`) and adjust secrets as needed.

## Database

The settings default to PostgreSQL. For a quick local bootstrap you can use SQLite:

```bash
export DB_ENGINE=sqlite
python manage.py migrate
python manage.py seed_demo_data
```

Using PostgreSQL instead:

```bash
createdb npa_ecm_local
createuser npa_ecm_local --pwprompt  # set a password and reuse it below

export DB_ENGINE=postgres
export DB_NAME=npa_ecm_local
export DB_USER=npa_ecm_local
export DB_PASSWORD=changeme
export DB_HOST=localhost
python manage.py migrate
python manage.py seed_demo_data
```

The seed command provisions demo users including:

| Username   | Password      | Role                |
|------------|---------------|---------------------|
| superadmin | ChangeMe123!  | Super Admin         |
| md         | ChangeMe123!  | Managing Director   |
| edfa       | ChangeMe123!  | Executive Director  |
| gmict      | ChangeMe123!  | General Manager ICT |
| pamd       | ChangeMe123!  | Personal Assistant  |

## Running the API

```bash
export DB_ENGINE=sqlite  # or postgres
python manage.py runserver 0.0.0.0:8000
```

## Authentication

The backend exposes JWT endpoints under `/api/accounts/auth/`:

- `POST /api/accounts/auth/token/` – obtain access/refresh pair
- `POST /api/accounts/auth/token/refresh/` – refresh access token
- `POST /api/accounts/auth/token/blacklist/` – revoke refresh token
- `GET /api/accounts/auth/me/` – current user profile (requires Bearer token)

## Useful commands

| Command                         | Description                         |
|---------------------------------|-------------------------------------|
| `python manage.py seed_demo_data` | Load demo organizations, documents, correspondence, workflows, analytics, and support content |
| `python manage.py createsuperuser` | Create an additional admin user |

## Tests

Pytest support is available but no suites have been authored yet:

```bash
pytest
```
