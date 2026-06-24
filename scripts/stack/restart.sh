#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    cat <<'USAGE'
Usage: scripts/stack/restart.sh <environment> [options]
USAGE
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

ENVIRONMENT="$1"
shift || true

STOP_ARGS=""
START_ARGS=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --prune)
            STOP_ARGS="--prune"
            shift
            ;;
        *)
            START_ARGS="$START_ARGS $1"
            shift
            ;;
    esac
done

# shellcheck disable=SC2086
"${SCRIPT_DIR}/stop.sh" "$ENVIRONMENT" $STOP_ARGS
# shellcheck disable=SC2086
"${SCRIPT_DIR}/start.sh" "$ENVIRONMENT" $START_ARGS
