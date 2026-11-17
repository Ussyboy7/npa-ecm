#!/usr/bin/env bash
# Mirror GitHub CI checks locally before push.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
QUICK=false

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=true ;;
    -h|--help)
      echo "Usage: $0 [--quick]"
      echo "  --quick  Validate compose files only"
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

step() {
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "▶ $1"
  echo "════════════════════════════════════════════════════════════"
}

cd "${PROJECT_ROOT}"

step "Validate Docker Compose files"
bash scripts/ci/validate-compose.sh

if [[ "$QUICK" == true ]]; then
  echo ""
  echo "Quick CI finished (compose validation only)."
  exit 0
fi

_resolve_python() {
  if [[ -n "${PYTHON:-}" ]]; then
    echo "${PYTHON}"
  elif [[ -x "${PROJECT_ROOT}/backend/.venv/bin/python" ]]; then
    echo "${PROJECT_ROOT}/backend/.venv/bin/python"
  elif command -v python3 &>/dev/null; then
    echo python3
  else
    echo python
  fi
}
PYTHON_BIN="$(_resolve_python)"

step "Backend — missing migrations check"
(
  cd backend
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-ecm_backend.settings}"
  "${PYTHON_BIN}" manage.py makemigrations --check --dry-run
)

step "Backend tests"
if [[ -n "${CI_SKIP_BACKEND_TESTS:-}" ]]; then
  echo "Skipping backend tests (CI_SKIP_BACKEND_TESTS is set)"
else
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-ecm_backend.settings_test}"
  export DB_HOST="${DB_HOST:-localhost}"
  export DB_PORT="${DB_PORT:-5433}"
  export DB_NAME="${DB_NAME:-npa_ecm_local}"
  export DB_USER="${DB_USER:-ecmadmin}"
  export DB_PASSWORD="${DB_PASSWORD:-ecmadmin}"
  bash scripts/ci/run-backend-tests.sh || {
    echo "Backend tests failed. Ensure Postgres is running (make local-start) or set CI_SKIP_BACKEND_TESTS=1."
    exit 1
  }
fi

step "Frontend — Vitest"
cd frontend && npm test
cd "${PROJECT_ROOT}"

step "Frontend lint"
cd frontend && npm run lint
cd "${PROJECT_ROOT}"

step "Frontend type-check"
cd frontend && npm run type-check
cd "${PROJECT_ROOT}"

step "Frontend production build"
(
  cd frontend
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8002/api/v1}" npm run build
)

step "Frontend — Playwright SSR smoke"
(
  cd frontend
  npx playwright install chromium
  CI=true NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8002/api/v1}" \
    npx playwright test e2e/smoke.spec.ts
)

step "Security — install scan tools"
"${PYTHON_BIN}" -m pip install -q -r backend/requirements-dev.txt

step "Security — Bandit"
"${PYTHON_BIN}" -m bandit -r \
  backend/accounts backend/analytics backend/audit backend/capture \
  backend/common backend/correspondence backend/dms backend/ecm_backend \
  backend/forms backend/integrations backend/notifications \
  backend/organization backend/search backend/support backend/workflow \
  -lll -q

step "Security — pip-audit"
"${PYTHON_BIN}" -m pip_audit -r backend/requirements.txt

step "Security — npm audit (critical)"
(
  cd frontend
  npm audit --audit-level=critical
)

echo ""
echo "Local CI finished successfully."
