#!/usr/bin/env bash
# Run Playwright smoke tests (frontend SSR + optional API health).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}/frontend"

if ! command -v npx &>/dev/null; then
  echo "npx not found" >&2
  exit 127
fi

npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3002}"
export PLAYWRIGHT_API_URL="${PLAYWRIGHT_API_URL:-${NEXT_PUBLIC_API_URL:-http://127.0.0.1:8002/api/v1}}"

npx playwright test "$@"
