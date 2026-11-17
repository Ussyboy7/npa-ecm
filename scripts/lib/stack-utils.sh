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
            STACK_BACKEND_REPLICAS="1"
            STACK_CELERY_REPLICAS="1"
            STACK_FRONTEND_REPLICAS="1"
            STACK_HEALTH_URL="${STACK_HEALTH_URL_OVERRIDE:-http://localhost:8002/api/v1/health/live/}"
            STACK_FRONTEND_URL="${STACK_FRONTEND_URL_OVERRIDE:-http://localhost:3002}"
            ;;
        stag|staging)
            STACK_ENVIRONMENT="staging"
            STACK_ENVIRONMENT_TITLE="Staging"
            STACK_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.stag.yml"
            STACK_ENV_FILE="${PROJECT_ROOT}/backend/env/stag.env"
            STACK_BACKEND_SERVICE="backend"
            STACK_POSTGRES_SERVICE="postgres"
            # Scaled services have no fixed container_name; match compose project prefix
            STACK_BACKEND_CONTAINER="npa-ecm-stag-backend"
            STACK_NGINX_CONTAINER="ecm-nginx-stag"
            STACK_BACKEND_REPLICAS="${BACKEND_REPLICAS:-2}"
            STACK_CELERY_REPLICAS="${CELERY_REPLICAS:-2}"
            STACK_FRONTEND_REPLICAS="${FRONTEND_REPLICAS:-2}"
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
            STACK_BACKEND_CONTAINER="npa-ecm-prod-backend"
            STACK_NGINX_CONTAINER="ecm-nginx-prod"
            STACK_BACKEND_REPLICAS="${BACKEND_REPLICAS:-4}"
            STACK_CELERY_REPLICAS="${CELERY_REPLICAS:-4}"
            STACK_FRONTEND_REPLICAS="${FRONTEND_REPLICAS:-2}"
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

# --- nginx config freshness -------------------------------------------------
#
# nginx/stag.conf and nginx/prod.conf are bind-mounted as single files. Docker
# binds the inode, so when git replaces the host file (git pull / reset) the
# container keeps serving the pre-pull copy, and `nginx -s reload` reloads that
# stale copy. Compare what the container is actually serving with the repo and
# restart it (which re-resolves the mount) when they differ.

STACK_NGINX_CONFIG_MOUNT="/etc/nginx/conf.d/default.conf"

stack_nginx_config_file() {
    case "${STACK_ENVIRONMENT:-}" in
        staging)    printf '%s\n' "${PROJECT_ROOT}/nginx/stag.conf" ;;
        production) printf '%s\n' "${PROJECT_ROOT}/nginx/prod.conf" ;;
        *)          return 1 ;;
    esac
}

# stack_ensure_nginx_config_current [--check]
#   --check  report and fail on divergence without touching the container
# Fails (returns 1) when the running config cannot be proven to match the repo.
stack_ensure_nginx_config_current() {
    local check_only=false
    if [[ "${1:-}" == "--check" ]]; then
        check_only=true
    fi

    local container="${STACK_NGINX_CONTAINER:-}"
    local config=""
    config="$(stack_nginx_config_file 2>/dev/null || true)"

    # The local stack has no nginx container; nothing to guard.
    if [[ -z "$container" || -z "$config" ]]; then
        return 0
    fi

    if [[ ! -f "$config" ]]; then
        printf '✗ nginx config missing from the repo: %s\n' "$config" >&2
        return 1
    fi

    if ! docker container inspect "$container" >/dev/null 2>&1; then
        printf 'i %s is not present; skipping nginx config check\n' "$container"
        return 0
    fi

    if [[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo false)" != "true" ]]; then
        printf 'i %s is not running; skipping nginx config check\n' "$container"
        return 0
    fi

    local repo_body="" container_body=""
    repo_body="$(cat "$config")"
    if ! container_body="$(docker exec "$container" cat "$STACK_NGINX_CONFIG_MOUNT" 2>/dev/null)"; then
        printf '✗ cannot read %s from %s\n' "$STACK_NGINX_CONFIG_MOUNT" "$container" >&2
        return 1
    fi

    if [[ "$repo_body" == "$container_body" ]]; then
        printf '✓ %s is serving the config in %s\n' "$container" "$config"
        return 0
    fi

    if [[ "$check_only" == true ]]; then
        printf '✗ %s is serving a STALE config (differs from %s)\n' "$container" "$config" >&2
        printf '  fix: docker restart %s   (a reload alone keeps the old file)\n' "$container" >&2
        return 1
    fi

    printf '! %s is serving a stale config — the bind mount kept the pre-pull file\n' "$container"

    # Never restart into a config that would not start: validate it first.
    local image="" validation=""
    image="$(docker inspect -f '{{.Config.Image}}' "$container" 2>/dev/null || echo nginx:alpine)"
    if ! validation="$(docker run --rm --network none \
        -v "${config}:${STACK_NGINX_CONFIG_MOUNT}:ro" "$image" nginx -t 2>&1)"; then
        printf '✗ %s failed nginx -t; %s was left running untouched\n' "$config" "$container" >&2
        printf '%s\n' "$validation" | tail -n 5 | sed 's/^/    /' >&2
        return 1
    fi

    printf '  restarting %s so the bind mount is re-resolved\n' "$container"
    if ! docker restart "$container" >/dev/null; then
        printf '✗ failed to restart %s\n' "$container" >&2
        return 1
    fi

    local attempt
    for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        sleep 1
        if docker exec "$container" nginx -t >/dev/null 2>&1; then
            break
        fi
        if [[ "$attempt" -eq 15 ]]; then
            printf '✗ %s did not come back with a valid config after restart\n' "$container" >&2
            return 1
        fi
    done

    if ! container_body="$(docker exec "$container" cat "$STACK_NGINX_CONFIG_MOUNT" 2>/dev/null)"; then
        printf '✗ cannot read %s from %s after restart\n' "$STACK_NGINX_CONFIG_MOUNT" "$container" >&2
        return 1
    fi
    if [[ "$repo_body" != "$container_body" ]]; then
        printf '✗ %s STILL differs from %s after restart\n' "$container" "$config" >&2
        return 1
    fi

    printf '✓ %s now serves the config in %s\n' "$container" "$config"
    return 0
}
