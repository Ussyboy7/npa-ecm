#!/usr/bin/env bash
set -euo pipefail
CONTAINER="${CONTAINER:-ecm-backend-local}"
SINCE="${1:-30s}"
LABEL="${2:-API hits}"

echo ""
echo "========== $LABEL (since $SINCE) =========="
docker logs "$CONTAINER" --since "$SINCE" 2>&1 \
  | rg -o 'GET /api/v1/[^ ]+' \
  | sed 's/GET //' \
  | sed 's/\?.*$//' \
  | sort \
  | uniq -c \
  | sort -rn \
  || true

TOTAL=$(docker logs "$CONTAINER" --since "$SINCE" 2>&1 | rg -c '"GET /api/v1/' || true)
TEMPLATES=$(docker logs "$CONTAINER" --since "$SINCE" 2>&1 | rg -c 'correspondence/templates' || true)
SIG=$(docker logs "$CONTAINER" --since "$SINCE" 2>&1 | rg -c '/accounts/signature' || true)
UNREAD=$(docker logs "$CONTAINER" --since "$SINCE" 2>&1 | rg -c 'unread_count' || true)
ORG_USERS=$(docker logs "$CONTAINER" --since "$SINCE" 2>&1 | rg -c '/accounts/users/' || true)

echo "---"
echo "total_api_gets=$TOTAL templates=$TEMPLATES signature_related=$SIG unread_count=$UNREAD org_users=$ORG_USERS"
echo "--- WS / Redis ---"
docker logs "$CONTAINER" --since "$SINCE" 2>&1 | rg -i 'WSCONNECT|WSDISCONNECT|Timeout reading from redis' || echo "(none)"
