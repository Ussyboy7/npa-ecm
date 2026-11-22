#!/usr/bin/env bash
# Restore ECM database from a plain SQL backup (pg_dump output).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"
# shellcheck source=../lib/db-restore.sh
source "${SCRIPT_DIR}/../lib/db-restore.sh"

BACKUP_ROOT="${BACKUP_ROOT:-${PROJECT_ROOT}/backups}"
RECOVERY_LOG="${RECOVERY_LOG:-${BACKUP_ROOT}/recovery.log}"
ENVIRONMENT="${RESTORE_ENV:-staging}"
ASSUME_YES=0
BACKUP_FILE=""
BACKUP_CHOICE=""

usage() {
  cat <<'USAGE'
Usage: scripts/backup/restore_backup.sh [options]

Options:
  --env <local|stag|prod>   Target environment (default: staging)
  --backup-file <path>      SQL file to restore
  --backup latest           Use newest file in BACKUP_ROOT
  --yes                     Skip confirmation prompt
USAGE
}

log() {
  mkdir -p "$(dirname "$RECOVERY_LOG")"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$RECOVERY_LOG"
}

error_exit() {
  log "ERROR: $1"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENVIRONMENT="$2"; shift 2 ;;
    --backup-file) BACKUP_FILE="$2"; shift 2 ;;
    --backup) BACKUP_CHOICE="$2"; shift 2 ;;
    --yes) ASSUME_YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) error_exit "Unknown option: $1" ;;
  esac
done

stack_init_env "$ENVIRONMENT"
stack_load_env_vars 2>/dev/null || true

DB_USER="${DB_USER:-ecmadmin}"
DB_NAME="${DB_NAME:-npa_ecm_stag}"
PG_SERVICE="${STACK_POSTGRES_SERVICE:-postgres}"
BACKUP_ROOT="${BACKUP_ROOT:-${PROJECT_ROOT}/backups/${STACK_ENVIRONMENT}}"

if [[ -z "$BACKUP_FILE" ]]; then
  if [[ "$BACKUP_CHOICE" == "latest" || -z "$BACKUP_CHOICE" ]]; then
    BACKUP_FILE=$(find "$BACKUP_ROOT" -maxdepth 1 -type f -name '*.sql' -print 2>/dev/null | sort | tail -1)
  else
    BACKUP_FILE="${BACKUP_ROOT}/${BACKUP_CHOICE}"
  fi
fi

[[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]] || error_exit "Backup file not found: ${BACKUP_FILE:-<unset>}"

log "Restore target: env=${STACK_ENVIRONMENT} db=${DB_NAME} file=${BACKUP_FILE}"

if [[ "$ASSUME_YES" -ne 1 ]]; then
  echo "WARNING: This will overwrite database ${DB_NAME} on ${STACK_ENVIRONMENT}."
  read -r -p "Type 'RESTORE' to continue: " confirm
  [[ "$confirm" == "RESTORE" ]] || { log "Aborted by user"; exit 1; }
fi

log "Stopping backend services"
stack_compose stop "$STACK_BACKEND_SERVICE" celery-worker celery-beat 2>/dev/null || true

log "Restoring database (recreating ${DB_NAME})"
stack_compose up -d "$PG_SERVICE"
PG_CONTAINER="${PG_CONTAINER:-$(stack_compose ps -q "$PG_SERVICE" 2>/dev/null | head -1)}"
[[ -n "$PG_CONTAINER" ]] || error_exit "Postgres container for ${PG_SERVICE} is not running"
db_restore_wait_ready "$PG_CONTAINER" "$DB_USER" || error_exit "Postgres did not become ready"
db_restore_snapshot "$PG_CONTAINER" "$DB_USER" "$DB_NAME" "$BACKUP_FILE" >>"$RECOVERY_LOG" 2>&1 \
  || error_exit "Restore failed — see ${RECOVERY_LOG}"
log "Restored ${DB_NAME} and realigned sequences"

log "Starting stack"
stack_compose up -d

log "Recovery complete — verify ${STACK_HEALTH_URL}"
