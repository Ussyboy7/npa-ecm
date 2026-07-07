#!/usr/bin/env bash
# Unified ECM operations CLI — local, staging, and production.
# Usage: scripts/ops/env-manager.sh <env> <command> [args]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"
# shellcheck source=../lib/ui.sh
source "${SCRIPT_DIR}/../lib/ui.sh"

usage() {
    cat <<'USAGE'
ECM Environment Manager

Usage: scripts/ops/env-manager.sh <env> <command> [args]

Environments: local | stag | prod

Commands:
  start            docker compose up -d
  stop             docker compose down
  restart          Rolling restart
  status           Service snapshot
  health           HTTP health probes
  logs [svc]       Tail logs
  backend-status   Backend + DB smoke check
  shell            Shell into backend container
  migrate          Run Django migrations
  seed             seed_demo_data
  seed-reset       Wipe + reseed (prompts)
  backup           Database snapshot (scripts/backup/backup-db.sh)
  verify-backup    Verify latest SQL backup integrity
  restore-backup   Restore from backup (scripts/backup/restore_backup.sh)
  collectstatic    Run collectstatic in the backend container
  deploy           Pull + rebuild + health wait + rollback (stag/prod only)
  update           Alias for deploy
  diagnostics      Dump services + recent logs

Examples:
  scripts/ops/env-manager.sh local start
  scripts/ops/env-manager.sh stag deploy
  scripts/ops/env-manager.sh local logs backend --follow
USAGE
}

if [[ $# -lt 2 ]]; then
    usage
    exit 1
fi

stack_init_env "$1"
stack_load_env_vars 2>/dev/null || true
shift
CMD="$1"
shift || true

LOG_DIR="${PROJECT_ROOT}/logs/${STACK_ENVIRONMENT}"
MONITOR_LOG="${LOG_DIR}/env-manager.log"
_BACKUP_DIR_EXPLICIT=false
[[ -n "${BACKUP_DIR+x}" ]] && _BACKUP_DIR_EXPLICIT=true
BACKUP_DIR="${BACKUP_DIR:-$HOME/ecm_backups}"
mkdir -p "$LOG_DIR" 2>/dev/null || true

log() { ui_log "$MONITOR_LOG" "$@"; }

cmd_start() {
    if [[ "$STACK_ENVIRONMENT" == "local" ]]; then
        stack_stop_stag_on_mac
    fi
    ui_header "Starting ECM ${STACK_ENVIRONMENT_TITLE}"
    stack_compose up -d
    sleep 10
    cmd_status
}

cmd_stop() {
    ui_header "Stopping ECM ${STACK_ENVIRONMENT_TITLE}"
    stack_compose down --remove-orphans
    if [[ "$STACK_ENVIRONMENT" != "local" ]]; then
        _deploy_purge_stale_containers
    fi
}

cmd_restart() {
    ui_header "Restarting ECM ${STACK_ENVIRONMENT_TITLE}"
    stack_compose restart
    sleep 10
    cmd_status
}

cmd_status() {
    "${SCRIPT_DIR}/status.sh" "$STACK_ENVIRONMENT"
}

cmd_health() {
    "${SCRIPT_DIR}/../stack/health.sh" "$STACK_ENVIRONMENT" "$@"
}

cmd_logs() {
    "${SCRIPT_DIR}/logs.sh" "$STACK_ENVIRONMENT" "$@"
}

cmd_backend_status() {
    "${SCRIPT_DIR}/../stack/backend-status.sh" "$STACK_ENVIRONMENT"
}

cmd_shell() {
    stack_compose exec "$STACK_BACKEND_SERVICE" /bin/bash || \
        stack_compose exec "$STACK_BACKEND_SERVICE" /bin/sh
}

cmd_migrate() {
    stack_backend_manage migrate --noinput
}

cmd_seed() {
    "${SCRIPT_DIR}/../stack/seed.sh" "$STACK_ENVIRONMENT" "$@"
}

cmd_seed_reset() {
    ui_warning "This will DELETE existing seeded domain data."
    read -r -p "Type 'YES' to continue: " confirm
    [[ "$confirm" == "YES" ]] || return 0
    "${SCRIPT_DIR}/../stack/seed.sh" "$STACK_ENVIRONMENT" -- --reset
}

cmd_backup() {
    "${PROJECT_ROOT}/scripts/backup/backup-db.sh" "$STACK_ENVIRONMENT"
}

cmd_verify_backup() {
    BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups/${STACK_ENVIRONMENT}}" \
        "${PROJECT_ROOT}/scripts/backup/verify_backup.sh" "$@"
}

cmd_restore_backup() {
    "${PROJECT_ROOT}/scripts/backup/restore_backup.sh" "$@"
}

cmd_collectstatic() {
    "${SCRIPT_DIR}/../stack/collect-static.sh" "$STACK_ENVIRONMENT" "$@"
}

cmd_diagnostics() {
    ui_header "ECM ${STACK_ENVIRONMENT_TITLE} Diagnostics"
    stack_compose ps || true
    echo
    stack_compose logs --tail=30 || true
}

cmd_deploy() {
    if [[ "$STACK_ENVIRONMENT" == "local" ]]; then
        ui_error "Use scripts/local/env-manager.sh start for local development."
        return 1
    fi

    local DO_BACKUP=true DO_PULL=true DO_ROLLBACK=true DO_HEALTH=true
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --no-backup)   DO_BACKUP=false ;;
            --no-pull)     DO_PULL=false ;;
            --no-rollback) DO_ROLLBACK=false ;;
            --skip-health) DO_HEALTH=false ;;
            *) ui_error "Unknown deploy option: $1"; return 1 ;;
        esac
        shift
    done

    local PG_CONTAINER DB_USER DB_NAME LOCAL_HEALTH_URL
    case "$STACK_ENVIRONMENT" in
        staging)
            DEPLOY_PATH="${DEPLOY_PATH:-/srv/npa-ecm}"
            SERVER_IP="${SERVER_IP:-172.16.0.46}"
            $_BACKUP_DIR_EXPLICIT || BACKUP_DIR="${DEPLOY_PATH}/backups"
            PG_CONTAINER="ecm-postgres-stag"
            DB_USER="ecmadmin"
            DB_NAME="npa_ecm_stag"
            LOCAL_HEALTH_URL="http://localhost:4646/api/v1/health/"
            ;;
        production)
            DEPLOY_PATH="${DEPLOY_PATH:-/srv/npa-ecm-prod}"
            SERVER_IP="${SERVER_IP:-}"
            $_BACKUP_DIR_EXPLICIT || BACKUP_DIR="${HOME}/ecm-predeploy-backups"
            PG_CONTAINER="ecm-postgres-prod"
            DB_USER="${DB_USER:-npa_ecm_prod}"
            DB_NAME="${DB_NAME:-npa_ecm_prod}"
            LOCAL_HEALTH_URL="http://localhost/api/v1/health/"
            ;;
    esac

    ui_header "ECM ${STACK_ENVIRONMENT_TITLE} Deployment"
    _deploy_check_server
    _deploy_ensure_repo
    $DO_BACKUP && _deploy_backup_database "$PG_CONTAINER" "$DB_USER" "$DB_NAME" || true
    $DO_PULL && _deploy_pull_latest || { $DO_ROLLBACK && _deploy_rollback "$PG_CONTAINER" "$DB_USER" "$DB_NAME"; return 1; }
    _deploy_prepare_media
    _deploy_stop_stack
    _deploy_build_up || { $DO_ROLLBACK && _deploy_rollback "$PG_CONTAINER" "$DB_USER" "$DB_NAME"; return 1; }
    $DO_HEALTH && _deploy_wait_healthy || { $DO_ROLLBACK && _deploy_rollback "$PG_CONTAINER" "$DB_USER" "$DB_NAME"; return 1; }
    _deploy_show_summary
    ui_success "ECM ${STACK_ENVIRONMENT} deployment complete"
}

cmd_update() { cmd_deploy "$@"; }

_deploy_check_server() {
    [[ -n "${SERVER_IP:-}" ]] || return 0
    local ips
    ips=$(hostname -I 2>/dev/null || true)
    if echo " $ips " | grep -q " ${SERVER_IP} "; then
        return 0
    fi
    if [[ "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
        ui_warning "Expected host IP ${SERVER_IP}; found: ${ips:-none} (continuing in CI)"
        return 0
    fi
    ui_warning "Expected host IP ${SERVER_IP}; found: ${ips:-none}"
    read -r -p "Continue anyway? (y/N): " reply
    [[ "$reply" =~ ^[Yy]$ ]] || exit 1
}

_deploy_ensure_repo() {
    [[ -d "$DEPLOY_PATH" ]] || { ui_error "DEPLOY_PATH $DEPLOY_PATH does not exist"; exit 1; }
    cd "$DEPLOY_PATH"
    PROJECT_ROOT="$(pwd)"
    case "$STACK_ENVIRONMENT" in
        staging)
            STACK_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.stag.yml"
            STACK_ENV_FILE="${PROJECT_ROOT}/backend/env/stag.env"
            ;;
        production)
            STACK_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
            STACK_ENV_FILE="${PROJECT_ROOT}/backend/env/prod.env"
            ;;
    esac
    stack_load_env_vars 2>/dev/null || ui_warning "Could not load ${STACK_ENV_FILE}"
    ui_info "Working directory: $(pwd)"
}

_deploy_backup_database() {
    local pg_container="$1" db_user="$2" db_name="$3"
    mkdir -p "$BACKUP_DIR" 2>/dev/null || { ui_warning "Cannot write to BACKUP_DIR"; return 0; }
    local backup_file="${BACKUP_DIR}/predeploy_${STACK_ENVIRONMENT}_$(stack_timestamp).sql"
    if docker ps --format '{{.Names}}' | grep -q "^${pg_container}$"; then
        if docker exec "$pg_container" pg_dump -U "$db_user" "$db_name" > "$backup_file" 2>/dev/null; then
            ui_success "Pre-deploy snapshot: ${backup_file}"
            echo "$backup_file" > "${BACKUP_DIR}/.latest_predeploy_${STACK_ENVIRONMENT}"
        else
            ui_warning "pg_dump failed; continuing"
            rm -f "$backup_file"
        fi
    else
        ui_warning "${pg_container} not running — skipping snapshot"
    fi
}

_deploy_pull_latest() {
    ui_step "git pull"
    [[ -d .git ]] || { ui_warning "Not a git checkout"; return 0; }
    git fetch --all --prune
    git reset --hard "origin/$(git rev-parse --abbrev-ref HEAD)"
    git clean -fd
    ui_success "At $(git rev-parse --short HEAD)"
}

_deploy_prepare_media() {
    if [[ -d backend/media ]]; then
        sudo rm -rf backend/media/correspondence_attachments 2>/dev/null || true
    fi
    mkdir -p backend/media
    chmod 755 backend/media 2>/dev/null || true
}

_deploy_purge_stale_containers() {
    ui_step "Removing stale ECM containers"
    local line purge_ok=true
    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        if [[ "$line" == Failed* ]]; then
            ui_error "$line"
            purge_ok=false
        else
            ui_info "$line"
        fi
    done < <(stack_purge_fixed_containers 2>&1 || true)
    $purge_ok || ui_warning "Some stale containers could not be removed — run: docker rm -f \$(docker ps -aq --filter name=ecm-.*-stag)"
}

_deploy_stop_stack() {
    ui_step "Stopping existing stack"
    stack_compose down --timeout 30 --remove-orphans || true
    _deploy_purge_stale_containers
}

_deploy_build_up() {
    ui_step "Building and starting stack"
    docker image prune -f >/dev/null 2>&1 || true
    _deploy_purge_stale_containers
    stack_compose up -d --build
}

_deploy_wait_healthy() {
    ui_step "Waiting for backend health (${STACK_BACKEND_CONTAINER})"
    ui_info "Manual check URL: ${STACK_HEALTH_URL}"
    local initial_sleep=5
    local attempts=40
    local interval=3
    sleep "$initial_sleep"
    local i
    for ((i = 1; i <= attempts; i++)); do
        if ! docker ps --format '{{.Names}}' | grep -q "^${STACK_BACKEND_CONTAINER}$"; then
            ui_warning "Container ${STACK_BACKEND_CONTAINER} is not running (attempt ${i}/${attempts})"
            echo "  attempt ${i}/${attempts}…"
            sleep "$interval"
            continue
        fi

        local health
        health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$STACK_BACKEND_CONTAINER" 2>/dev/null || echo "missing")
        case "$health" in
            healthy)
                ui_success "Backend health is healthy"
                return 0
                ;;
            unhealthy)
                ui_error "Backend container is unhealthy."
                docker inspect -f '{{range .State.Health.Log}}{{println .End .ExitCode .Output}}{{end}}' "$STACK_BACKEND_CONTAINER" 2>/dev/null | tail -5 || true
                docker logs --tail 60 "$STACK_BACKEND_CONTAINER" || true
                return 1
                ;;
            none|missing)
                ui_error "No Docker healthcheck on ${STACK_BACKEND_CONTAINER}. Define one in compose (backend.healthcheck) and redeploy."
                return 1
                ;;
        esac
        echo "  attempt ${i}/${attempts}… (status: ${health})"
        sleep "$interval"
    done
    ui_error "Backend did not become healthy in time"
    stack_compose ps || true
    return 1
}

_deploy_show_summary() {
    stack_compose ps
    echo
    echo "  Frontend: ${STACK_FRONTEND_URL}"
    echo "  Health:   ${STACK_HEALTH_URL}"
}

_deploy_rollback() {
    local pg_container="$1" db_user="$2" db_name="$3"
    ui_error "Deployment failed — attempting rollback"
    _deploy_stop_stack
    local latest
    latest=$(cat "${BACKUP_DIR}/.latest_predeploy_${STACK_ENVIRONMENT}" 2>/dev/null || true)
    if [[ -n "$latest" && -f "$latest" ]]; then
        stack_compose up -d "$STACK_POSTGRES_SERVICE"
        sleep 10
        if docker ps --format '{{.Names}}' | grep -q "^${pg_container}$"; then
            docker exec -i "$pg_container" psql -U "$db_user" -d "$db_name" < "$latest" >/dev/null 2>&1 || ui_warning "Restore reported errors"
        fi
        stack_compose up -d
    fi
    return 1
}

case "$CMD" in
    start)          cmd_start ;;
    stop)           cmd_stop ;;
    restart)        cmd_restart ;;
    status)         cmd_status "$@" ;;
    health)         cmd_health "$@" ;;
    logs)           cmd_logs "$@" ;;
    backend-status) cmd_backend_status ;;
    shell)          cmd_shell ;;
    migrate)        cmd_migrate ;;
    seed)           cmd_seed "$@" ;;
    seed-reset)     cmd_seed_reset ;;
    backup)         cmd_backup ;;
    verify-backup)  cmd_verify_backup "$@" ;;
    restore-backup) cmd_restore_backup "$@" ;;
    collectstatic)  cmd_collectstatic "$@" ;;
    deploy|update)  cmd_deploy "$@" ;;
    diagnostics)    cmd_diagnostics ;;
    help|-h|--help) usage ;;
    *)
        ui_error "Unknown command: $CMD"
        usage
        exit 1
        ;;
esac
