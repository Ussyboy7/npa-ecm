#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

echo "Validating docker-compose.local.yml..."
docker compose -f docker-compose.local.yml config --quiet

echo "Validating docker-compose.stag.yml..."
docker compose -f docker-compose.stag.yml config --quiet

echo "Validating compose.yaml (default local)..."
docker compose -f compose.yaml config --quiet

echo "Validating docker-compose.prod.yml..."
export DB_NAME="${DB_NAME:-npa_ecm_prod}"
export DB_USER="${DB_USER:-npa_ecm_prod}"
export DB_PASSWORD="${DB_PASSWORD:-ci_password}"
# Validation-only value; real deployments must supply the confirmed hop count.
export THROTTLE_NUM_PROXIES="${THROTTLE_NUM_PROXIES:-1}"
docker compose -f docker-compose.prod.yml config --quiet

echo "Checking frontend API base URLs..."
# The backend serves /api/v1/ only; a base ending in /api makes every API call 404.
for file in docker-compose.stag.yml docker-compose.prod.yml docker-compose.local.yml; do
  if grep -nE 'NEXT_PUBLIC_API_URL:.*/api(\}|[[:space:]]*$)' "$file"; then
    echo "${file}: NEXT_PUBLIC_API_URL must end with /api/v1" >&2
    exit 1
  fi
done

echo "Compose files OK."
