#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BACKEND_DIR="$PROJECT_ROOT"
VENV_DIR="$BACKEND_DIR/.venv"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

pip install --upgrade pip
pip install -r "$BACKEND_DIR/requirements.txt"

python manage.py migrate
python manage.py seed_demo_data

cat <<'EONOTE'
Backend setup complete ✔

Default credentials created:
  - username: superadmin / password: ChangeMe123!
  - username: md         / password: ChangeMe123!

Remember to run the Postgres bootstrap script once:
  psql -U postgres -f backend/scripts/bootstrap_postgres.sql
EONOTE
