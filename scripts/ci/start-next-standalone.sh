#!/usr/bin/env bash
# Start the Next.js standalone server for CI Playwright tests.
# Next's standalone output does not include static assets or public files,
# so stage them next to server.js before starting it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
STANDALONE_DIR="${FRONTEND_DIR}/.next/standalone/frontend"

if [[ ! -f "${STANDALONE_DIR}/server.js" ]]; then
  echo "Standalone server not found at ${STANDALONE_DIR}/server.js" >&2
  echo "Run 'npm run build' before starting the CI smoke server." >&2
  exit 1
fi

mkdir -p "${STANDALONE_DIR}/.next"
rm -rf "${STANDALONE_DIR}/.next/static" "${STANDALONE_DIR}/public"
cp -R "${FRONTEND_DIR}/.next/static" "${STANDALONE_DIR}/.next/static"
if [[ -d "${FRONTEND_DIR}/public" ]]; then
  cp -R "${FRONTEND_DIR}/public" "${STANDALONE_DIR}/public"
fi

cd "${STANDALONE_DIR}"
exec env PORT="${PORT:-3000}" HOSTNAME="${NEXT_HOSTNAME:-127.0.0.1}" node server.js
