#!/usr/bin/env bash
# Run the full backend test suite (CI and local via Makefile).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VERBOSITY="${TEST_VERBOSITY:-1}"

APPS=($("${SCRIPT_DIR}/backend-test-apps.sh"))

cd "${PROJECT_ROOT}/backend"
if [[ -n "${PYTHON:-}" ]]; then
  PYTHON_BIN="${PYTHON}"
elif [[ -x "${PROJECT_ROOT}/backend/.venv/bin/python" ]]; then
  PYTHON_BIN="${PROJECT_ROOT}/backend/.venv/bin/python"
elif command -v python3 &>/dev/null; then
  PYTHON_BIN=python3
elif command -v python &>/dev/null; then
  PYTHON_BIN=python
else
  echo "No Python interpreter found (set PYTHON= or run make backend-install)" >&2
  exit 127
fi
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-ecm_backend.settings_test}"
"${PYTHON_BIN}" manage.py test "${APPS[@]}" --verbosity="${VERBOSITY}" --noinput
