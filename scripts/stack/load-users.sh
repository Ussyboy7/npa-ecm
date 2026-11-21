#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/stack/load-users.sh <environment> <nominal-roll.xlsx> [options]

Imports the nominal roll into user accounts (identity fields only), then maps
roles and primary offices. Without --apply both steps are dry runs.

Options:
  --apply            Write changes. Existing roles, offices, and passwords are kept.
  --password VALUE   Initial password for new/unusable accounts
                     (default: ChangeMe123!). Pass --password "" to generate
                     one-time set-password links instead.
  --no-roles         Skip the role/office mapping step.
USAGE
}

if [[ $# -lt 2 ]]; then
    usage
    exit 1
fi

ENVIRONMENT="$1"
ROLL_FILE="$2"
shift 2

APPLY=false
PASSWORD_SET=false
PASSWORD=""
ASSIGN_ROLES=true

while [[ $# -gt 0 ]]; do
    case "$1" in
        --apply) APPLY=true ;;
        --password)
            [[ $# -ge 2 ]] || { usage; exit 1; }
            PASSWORD="$2"
            PASSWORD_SET=true
            shift
            ;;
        --no-roles) ASSIGN_ROLES=false ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
    shift
done

[[ -f "$ROLL_FILE" ]] || { echo "Nominal roll not found: $ROLL_FILE" >&2; exit 1; }
shopt -s nocasematch
case "$ROLL_FILE" in
    *.xlsx|*.xlsm) ;;
    *) echo "Expected an .xlsx or .xlsm nominal-roll workbook: $ROLL_FILE" >&2; exit 1 ;;
esac

stack_init_env "$ENVIRONMENT"

CONTAINER_ID="$(stack_compose ps -q "$STACK_BACKEND_SERVICE")"
if [[ -z "$CONTAINER_ID" ]]; then
    echo "Backend service '${STACK_BACKEND_SERVICE}' is not running in ${STACK_ENVIRONMENT}." >&2
    echo "Start or deploy the stack first." >&2
    exit 1
fi

if ! docker exec "$CONTAINER_ID" python -c 'import openpyxl' >/dev/null 2>&1; then
    echo "The backend image is missing openpyxl, which import_nominal_roll requires." >&2
    echo "Redeploy so backend/requirements.txt is installed, then retry." >&2
    exit 1
fi

CONTAINER_ROLL="/tmp/$(basename "$ROLL_FILE")"
cleanup() {
    docker exec "$CONTAINER_ID" rm -f "$CONTAINER_ROLL" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker cp "$ROLL_FILE" "${CONTAINER_ID}:${CONTAINER_ROLL}"

IMPORT_ARGS=(import_nominal_roll "$CONTAINER_ROLL")
if $PASSWORD_SET; then
    IMPORT_ARGS+=(--password "$PASSWORD")
fi
if $APPLY; then
    IMPORT_ARGS+=(--apply)
fi

echo "Importing users from $(basename "$ROLL_FILE") into ${STACK_ENVIRONMENT}..."
stack_backend_manage "${IMPORT_ARGS[@]}"

if $ASSIGN_ROLES; then
    ROLE_ARGS=(assign_nominal_roll_roles "$CONTAINER_ROLL")
    if $APPLY; then
        ROLE_ARGS+=(--apply)
    fi
    echo "Mapping roles and primary offices..."
    stack_backend_manage "${ROLE_ARGS[@]}"
fi

if $APPLY; then
    echo "User load complete. New accounts use the configured initial password."
else
    echo "Dry run only. Re-run with --apply to write the changes."
fi
