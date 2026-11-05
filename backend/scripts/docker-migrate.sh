#!/bin/sh
# One-shot migrate / bootstrap for scaled backend replicas.
# Used by the compose `migrate` service so replicas do not race on migrate.
set -eu

echo "[migrate] Applying database migrations..."
python manage.py migrate --noinput

echo "[migrate] Seeding role permissions (idempotent)..."
python manage.py setup_role_permissions --force || echo "[migrate] setup_role_permissions skipped"

echo "[migrate] Seeding Celery beat schedules (idempotent)..."
python manage.py setup_celery_beat || echo "[migrate] setup_celery_beat skipped"

if [ "${ENSURE_DEV_LOGIN_USERS:-false}" = "true" ]; then
  echo "[migrate] Ensuring dev login users..."
  python manage.py ensure_dev_login_users || echo "[migrate] ensure_dev_login_users skipped"
fi

echo "[migrate] Collecting static files..."
python manage.py collectstatic --noinput

echo "[migrate] Done."
