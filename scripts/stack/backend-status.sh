#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <local|stag|prod>" >&2
    exit 1
fi

stack_init_env "$1"

POSTGRES_CONTAINER="ecm-postgres-${STACK_ENVIRONMENT/local/local}"
case "$STACK_ENVIRONMENT" in
    staging) POSTGRES_CONTAINER="ecm-postgres-stag" ;;
    production) POSTGRES_CONTAINER="ecm-postgres-prod" ;;
esac

echo "=== ECM Backend Status (${STACK_ENVIRONMENT}) ==="
echo

if docker ps --format '{{.Names}}' | grep -q "^${STACK_BACKEND_CONTAINER}$"; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "$STACK_BACKEND_CONTAINER" || true
    echo "✓ Backend container running"
else
    echo "✗ Backend container '${STACK_BACKEND_CONTAINER}' not running"
    exit 1
fi

echo
echo "=== Recent backend logs ==="
docker logs --tail 20 "$STACK_BACKEND_CONTAINER" 2>&1 || true

echo
if docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo "✓ Postgres container running (${POSTGRES_CONTAINER})"
    stack_backend_manage check --database default >/dev/null 2>&1 && echo "✓ Database connection OK" || echo "! Database check failed"
else
    echo "! Postgres container '${POSTGRES_CONTAINER}' not running"
fi
