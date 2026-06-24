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
docker compose -f docker-compose.prod.yml config --quiet

echo "Compose files OK."
