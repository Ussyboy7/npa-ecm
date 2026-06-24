#!/usr/bin/env bash
# Verify ECM SQL backup integrity by restoring into a temporary database.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"

BACKUP_ROOT="${BACKUP_DIR:-${PROJECT_ROOT}/backups/local}"
TEST_DB="${TEST_DB_NAME:-npa_ecm_verify_restore}"
LOG_FILE="${BACKUP_ROOT}/verify.log"
ENVIRONMENT="${VERIFY_ENV:-local}"

stack_init_env "${ENVIRONMENT}" 2>/dev/null || true
stack_load_env_vars 2>/dev/null || true

DB_USER="${DB_USER:-ecmadmin}"
PG_SERVICE="${STACK_POSTGRES_SERVICE:-postgres}"

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

find_latest_backup() {
  local latest
  latest=$(find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'db-*.sql' -print 2>/dev/null | sort | tail -1)
  if [[ -z "$latest" ]]; then
    latest=$(find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'predeploy_*.sql' -print 2>/dev/null | sort | tail -1)
  fi
  [[ -n "$latest" ]] || { log "ERROR: No .sql backups found in ${BACKUP_ROOT}"; exit 1; }
  echo "$latest"
}

main() {
  log "=== ECM backup verification started ==="
  local backup_file
  backup_file=$(find_latest_backup)
  log "Using backup: ${backup_file}"

  if [[ ! -s "$backup_file" ]]; then
    log "ERROR: Backup file is empty"
    exit 1
  fi

  log "Creating test database ${TEST_DB}"
  stack_compose exec -T "$PG_SERVICE" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" >>"$LOG_FILE" 2>&1
  stack_compose exec -T "$PG_SERVICE" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${TEST_DB};" >>"$LOG_FILE" 2>&1

  log "Restoring backup into ${TEST_DB}"
  if stack_compose exec -T "$PG_SERVICE" psql -U "$DB_USER" -d "$TEST_DB" <"$backup_file" >>"$LOG_FILE" 2>&1; then
    log "Restore test: PASSED"
  else
    log "ERROR: Restore test failed — see ${LOG_FILE}"
    exit 1
  fi

  local table_count
  table_count=$(stack_compose exec -T "$PG_SERVICE" psql -U "$DB_USER" -d "$TEST_DB" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
  log "Public tables in restored database: ${table_count:-unknown}"

  stack_compose exec -T "$PG_SERVICE" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" >>"$LOG_FILE" 2>&1
  log "=== ECM backup verification completed ==="
}

main "$@"
