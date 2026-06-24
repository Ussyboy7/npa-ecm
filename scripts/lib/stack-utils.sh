#!/usr/bin/env bash

# Shared helpers for ECM stack-management scripts.
# Source and call: stack_init_env <local|stag|prod>

STACK_UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "${STACK_UTILS_DIR}/../.." && pwd)}"

STACK_COMPOSE_CMD=()

stack_is_macos() {
    [[ "$(uname -s)" == "Darwin" ]]
}

stack_assert_stag_host() {
    if [[ "${STACK_ENVIRONMENT}" != "staging" ]]; then
        return 0
    fi
    if [[ "${ECM_ALLOW_LOCAL_STAG:-}" == "1" ]]; then
        return 0
    fi
    if stack_is_macos; then
        cat >&2 <<'EOF'
Refusing to start the staging stack on macOS.

Staging runs on the remote server (172.16.0.46), not on your Mac.
For local development:
  scripts/local/env-manager.sh start
  # or: docker compose up -d

To run staging locally for a one-off test (not recommended):
  ECM_ALLOW_LOCAL_STAG=1 scripts/staging/env-manager.sh start
EOF
        exit 1
    fi
}

stack_stop_stag_on_mac() {
    if ! stack_is_macos; then
        return 0
    fi
    local stag_file="${PROJECT_ROOT}/docker-compose.stag.yml"
    [[ -f "$stag_file" ]] || return 0
    stack_detect_compose_cmd
    local running
    running="$("${STACK_COMPOSE_CMD[@]}" -f "$stag_file" ps -q 2>/dev/null || true)"
    if [[ -n "$running" ]]; then
        echo "Stopping staging containers on this Mac (use the remote server for staging)..."
        "${STACK_COMPOSE_CMD[@]}" -f "$stag_file" down >/dev/null 2>&1 || true
        "${STACK_COMPOSE_CMD[@]}" -p npa-ecm -f "$stag_file" down >/dev/null 2>&1 || true
    fi
}

stack_detect_compose_cmd() {
    if [[ ${#STACK_COMPOSE_CMD[@]} -gt 0 ]]; then
        return 0
    fi
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        STACK_COMPOSE_CMD=(docker compose)
    elif command -v docker-compose >/dev/null 2>&1; then
        STACK_COMPOSE_CMD=(docker-compose)
    else
        echo "Docker Compose is not installed." >&2
        exit 1
    fi
}

stack_init_env() {
    if [[ $# -lt 1 ]]; then
        echo "Environment name is required (local | stag | prod)" >&2
        exit 1
    fi

    local requested_env="$1"
    case "$requested_env" in
        local)
            STACK_ENVIRONMENT="local"
            STACK_ENVIRONMENT_TITLE="Local"
            STACK_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.local.yml"
            STACK_ENV_FILE="${PROJECT_ROOT}/backend/env/local.env"
            STACK_BACKEND_SERVICE="backend"
            STACK_POSTGRES_SERVICE="postgres"
            STACK_BACKEND_CONTAINER="ecm-backend-local"
            STACK_NGINX_CONTAINER=""
            STACK_HEALTH_URL="${STACK_HEALTH_URL_OVERRIDE:-http://localhost:8002/api/v1/health/live/}"
            STACK_FRONTEND_URL="${STACK_FRONTEND_URL_OVERRIDE:-http://localhost:3002}"
            ;;
        stag|staging)
            STACK_ENVIRONMENT="staging"
            STACK_ENVIRONMENT_TITLE="Staging"
            STACK_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.stag.yml"
            STACK_ENV_FILE="${PROJECT_ROOT}/backend/env/stag.env"
            STACK_BACKEND_SERVICE="backend_stag"
            STACK_POSTGRES_SERVICE="postgres_stag"
            STACK_BACKEND_CONTAINER="ecm-backend-stag"
            STACK_NGINX_CONTAINER="ecm-nginx-stag"
            STACK_HEALTH_URL="${STACK_HEALTH_URL_OVERRIDE:-http://172.16.0.46:4646/api/v1/health/live/}"
            STACK_FRONTEND_URL="${STACK_FRONTEND_URL_OVERRIDE:-http://172.16.0.46:4646}"
            ;;
        prod|production)
            STACK_ENVIRONMENT="production"
            STACK_ENVIRONMENT_TITLE="Production"
            STACK_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
            STACK_ENV_FILE="${PROJECT_ROOT}/backend/env/prod.env"
            STACK_BACKEND_SERVICE="backend"
            STACK_POSTGRES_SERVICE="postgres"
            STACK_BACKEND_CONTAINER="ecm-backend-prod"
            STACK_NGINX_CONTAINER="ecm-nginx-prod"
            STACK_HEALTH_URL="${STACK_HEALTH_URL_OVERRIDE:-https://ecm.nigerianports.gov.ng/api/v1/health/live/}"
            STACK_FRONTEND_URL="${STACK_FRONTEND_URL_OVERRIDE:-https://ecm.nigerianports.gov.ng}"
            ;;
        *)
            echo "Unknown environment: ${requested_env}" >&2
            exit 1
            ;;
    esac

    stack_assert_stag_host
    stack_detect_compose_cmd
}

stack_compose() {
    stack_detect_compose_cmd
    local compose_args=()
    if [[ -n "${STACK_ENV_FILE:-}" && -f "$STACK_ENV_FILE" ]]; then
        compose_args+=(--env-file "$STACK_ENV_FILE")
    fi
    compose_args+=(-f "$STACK_COMPOSE_FILE")
    if [[ $# -gt 0 ]]; then
        "${STACK_COMPOSE_CMD[@]}" "${compose_args[@]}" "$@"
    else
        "${STACK_COMPOSE_CMD[@]}" "${compose_args[@]}"
    fi
}

stack_compose_exec() {
    stack_compose exec -T "$@"
}

stack_backend_manage() {
    stack_compose_exec "$STACK_BACKEND_SERVICE" python manage.py "$@"
}

stack_load_env_vars() {
    if [[ -z "${STACK_ENV_FILE:-}" || ! -f "$STACK_ENV_FILE" ]]; then
        echo "Environment file not found for ${STACK_ENVIRONMENT}: ${STACK_ENV_FILE:-}" >&2
        exit 1
    fi
    set -a
    # shellcheck source=/dev/null
    source "$STACK_ENV_FILE"
    set +a
}

stack_timestamp() {
    date +"%Y%m%d_%H%M%S"
}

stack_list_fixed_container_names() {
    [[ -f "${STACK_COMPOSE_FILE:-}" ]] || return 0
    grep 'container_name:' "$STACK_COMPOSE_FILE" 2>/dev/null | awk '{print $NF}' || true
}

# Fixed container_name entries survive compose project renames; remove leftovers before up.
stack_purge_fixed_containers() {
    local name removed=0 failed=0

    while IFS= read -r name; do
        [[ -z "$name" ]] && continue
        if ! docker container inspect "$name" &>/dev/null; then
            continue
        fi
        if docker rm -f "$name" &>/dev/null; then
            echo "Removed ${name}"
            removed=$((removed + 1))
            continue
        fi
        if command -v sudo &>/dev/null && sudo docker rm -f "$name" &>/dev/null; then
            echo "Removed ${name} (sudo)"
            removed=$((removed + 1))
            continue
        fi
        echo "Failed to remove ${name}" >&2
        failed=$((failed + 1))
    done < <(stack_list_fixed_container_names)

    if [[ "$failed" -gt 0 ]]; then
        return 1
    fi
    return 0
}
