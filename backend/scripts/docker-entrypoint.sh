#!/bin/sh
set -eu

# Scaled replicas set SKIP_ENTRYPOINT_SETUP=true; the compose `migrate` service
# owns migrate/collectstatic so replicas do not race.
if [ "${SKIP_ENTRYPOINT_SETUP:-false}" = "true" ]; then
  echo "[entrypoint] Skipping setup (migrate service owns DB/static bootstrap)"
  echo "[entrypoint] Starting application: $*"
  exec "$@"
fi

echo "[entrypoint] Applying database migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Seeding role permissions (idempotent)..."
python manage.py setup_role_permissions --force || echo "[entrypoint] setup_role_permissions skipped"

echo "[entrypoint] Seeding Celery beat schedules (idempotent)..."
python manage.py setup_celery_beat || echo "[entrypoint] setup_celery_beat skipped"

if [ "${ENSURE_DEV_LOGIN_USERS:-false}" = "true" ]; then
  echo "[entrypoint] Ensuring dev login users..."
  python manage.py ensure_dev_login_users || echo "[entrypoint] ensure_dev_login_users skipped"
fi

echo "[entrypoint] Checking environment parity..."
python manage.py check_environment_parity --skip-env || echo "[entrypoint] parity check reported issues"

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput

echo "[entrypoint] Starting application: $*"
exec "$@"


