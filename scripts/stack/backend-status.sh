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

POSTGRES_CONTAINER="ecm-postgres-local"
case "$STACK_ENVIRONMENT" in
    staging) POSTGRES_CONTAINER="ecm-postgres-stag" ;;
    production) POSTGRES_CONTAINER="ecm-postgres-prod" ;;
esac

echo "=== ECM Backend Status (${STACK_ENVIRONMENT}) ==="
echo

backend_ids="$(stack_compose ps -q backend 2>/dev/null || true)"
if [[ -n "$backend_ids" ]]; then
    count=0
    while IFS= read -r id; do
        [[ -z "$id" ]] && continue
        docker ps --filter "id=$id" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        count=$((count + 1))
    done <<< "$backend_ids"
    echo "✓ Backend replica(s) running (${count})"
elif docker ps --format '{{.Names}}' | grep -q "^${STACK_BACKEND_CONTAINER}$"; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "$STACK_BACKEND_CONTAINER" || true
    echo "✓ Backend container running"
else
    echo "✗ Backend service not running"
    exit 1
fi

echo
echo "=== Recent backend logs ==="
if [[ -n "$backend_ids" ]]; then
    stack_compose logs --tail 20 backend 2>&1 || true
else
    docker logs --tail 20 "$STACK_BACKEND_CONTAINER" 2>&1 || true
fi

echo
if docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo "✓ Postgres container running (${POSTGRES_CONTAINER})"
    stack_backend_manage check --database default >/dev/null 2>&1 && echo "✓ Database connection OK" || echo "! Database check failed"
else
    echo "! Postgres container '${POSTGRES_CONTAINER}' not running"
fi
