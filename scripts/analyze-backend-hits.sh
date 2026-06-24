#!/usr/bin/env bash
# Parse daphne access logs and summarize API hits (with duplicate detection).
set -euo pipefail

CONTAINER="${1:-ecm-backend-local}"
SINCE="${2:-30s}"

docker logs "$CONTAINER" --since "$SINCE" 2>&1 \
  | rg '"GET |"POST |"PUT |"PATCH |"DELETE ' \
  | sed -E 's/^.*"((GET|POST|PUT|PATCH|DELETE) [^"]+)".*$/\1/' \
  | sed -E 's/\?.*$//' \
  | sort \
  | uniq -c \
  | sort -rn
