#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/stack-utils.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/collect-static.sh <environment> [-- manage.py args]

Runs `python manage.py collectstatic --noinput` inside the backend container.
Pass extra flags after -- if needed (e.g. -- --clear).
USAGE
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

ENVIRONMENT="$1"
shift || true

MANAGE_ARGS=("$@")
stack_init_env "$ENVIRONMENT"

CMD_ARGS=(collectstatic --noinput)
if [[ ${#MANAGE_ARGS[@]} -gt 0 ]]; then
    CMD_ARGS+=("${MANAGE_ARGS[@]}")
fi

echo "Collecting static assets in ${STACK_ENVIRONMENT}..."
stack_backend_manage "${CMD_ARGS[@]}"
