#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/stack/stop.sh <environment> [options] [-- docker args]

Options:
  --prune   Prune stopped containers and dangling images after down
USAGE
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

ENVIRONMENT="$1"
shift || true

SHOULD_PRUNE=false
DOWN_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --prune)
            SHOULD_PRUNE=true
            shift
            ;;
        --)
            shift
            DOWN_ARGS+=("$@")
            break
            ;;
        *)
            DOWN_ARGS+=("$1")
            shift
            ;;
    esac
done

stack_init_env "$ENVIRONMENT"

echo "Stopping ${STACK_ENVIRONMENT} stack"
if [[ ${#DOWN_ARGS[@]} -gt 0 ]]; then
    stack_compose down "${DOWN_ARGS[@]}"
else
    stack_compose down
fi

if [[ "$SHOULD_PRUNE" == true ]]; then
    docker container prune -f >/dev/null
    docker image prune -f >/dev/null
fi
