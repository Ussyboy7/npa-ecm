#!/usr/bin/env bash
# Verify an ECM SQL backup by restoring it into a throwaway database and
# checking that it is usable: tables present, migration state intact, and no
# migrations missing for the current code.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"
# shellcheck source=../lib/db-restore.sh
source "${SCRIPT_DIR}/../lib/db-restore.sh"

ENVIRONMENT="${VERIFY_ENV:-local}"
stack_init_env "${ENVIRONMENT}" 2>/dev/null || true
stack_load_env_vars 2>/dev/null || true

BACKUP_ROOT="${BACKUP_DIR:-${PROJECT_ROOT}/backups/${STACK_ENVIRONMENT}}"
TEST_DB="${TEST_DB_NAME:-npa_ecm_verify_restore}"
LOG_FILE="${BACKUP_ROOT}/verify.log"

DB_USER="${DB_USER:-ecmadmin}"
PG_SERVICE="${STACK_POSTGRES_SERVICE:-postgres}"
PG_CONTAINER="${PG_CONTAINER:-}"

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

fail() {
  log "ERROR: $1"
  exit 1
}

find_latest_backup() {
  local latest dir
  # Backups live in the project tree, but deploys historically wrote predeploy
  # snapshots to $HOME/ecm_backups. Check both before giving up.
  local candidates=("$BACKUP_ROOT" "${PROJECT_ROOT}/backups/${STACK_ENVIRONMENT}" "${HOME}/ecm_backups")
  for dir in "${candidates[@]}"; do
    [[ -d "$dir" ]] || continue
    latest=$(find "$dir" -maxdepth 1 -type f -name 'db-*.sql' -print 2>/dev/null | sort | tail -1)
    if [[ -z "$latest" ]]; then
      latest=$(find "$dir" -maxdepth 1 -type f -name 'predeploy_*.sql' -print 2>/dev/null | sort | tail -1)
    fi
    if [[ -n "$latest" ]]; then
      LOG_FILE="${dir}/verify.log"
      echo "$latest"
      return 0
    fi
  done
  fail "No .sql backups found in ${BACKUP_ROOT}"
}

psql_scratch() {
  docker exec -i "$PG_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -v ON_ERROR_STOP=1 "$@"
}

drop_scratch_db() {
  [[ -n "$PG_CONTAINER" ]] || return 0
  docker exec -i "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -q \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS \"${TEST_DB}\";" >>"$LOG_FILE" 2>&1 || true
}

cleanup() {
  drop_scratch_db
}
trap cleanup EXIT

check_migrations() {
  local status applied sequence
  status=$(db_restore_migration_status "$PG_CONTAINER" "$DB_USER" "$TEST_DB" 2>>"$LOG_FILE" || true)
  case "$status" in
    missing)
      fail "Restored database has no django_migrations table"
      ;;
    "")
      fail "Could not read migration state from the restored database"
      ;;
  esac

  applied=${status%% *}
  sequence=${status##* }
  log "Applied migrations in restored database: ${applied}"
  [[ "$sequence" == "sequence_ok" ]] \
    || fail "django_migrations sequence is behind the restored rows (${sequence})"
  [[ "$applied" =~ ^[0-9]+$ && "$applied" -gt 0 ]] \
    || fail "Restored database has no applied migrations"
}

check_migrate_check() {
  local backend_id
  backend_id=$(stack_compose ps -q "$STACK_BACKEND_SERVICE" 2>/dev/null | head -1)
  if [[ -z "$backend_id" ]]; then
    log "SKIPPED: ${STACK_BACKEND_SERVICE} is not running; start the stack to compare migrations"
    return 0
  fi

  if stack_compose exec -T \
      -e DB_HOST="$PG_SERVICE" -e DB_PORT=5432 -e DB_NAME="$TEST_DB" \
      "$STACK_BACKEND_SERVICE" python manage.py migrate --check >>"$LOG_FILE" 2>&1; then
    log "migrate --check: PASSED (backup needs no unapplied migrations)"
  else
    fail "migrate --check failed: the backup is missing migrations required by the current code"
  fi
}

main() {
  log "=== ECM backup verification started (${STACK_ENVIRONMENT}) ==="
  local backup_file
  backup_file=$(find_latest_backup)
  log "Using backup: ${backup_file}"

  [[ -s "$backup_file" ]] || fail "Backup file is empty"
  db_restore_validate_identifier "$TEST_DB" || fail "Invalid TEST_DB_NAME: ${TEST_DB}"

  PG_CONTAINER="${PG_CONTAINER:-$(stack_compose ps -q "$PG_SERVICE" 2>/dev/null | head -1)}"
  [[ -n "$PG_CONTAINER" ]] || fail "${PG_SERVICE} is not running for ${STACK_ENVIRONMENT}"
  db_restore_wait_ready "$PG_CONTAINER" "$DB_USER" || fail "Postgres did not become ready"

  log "Recreating test database ${TEST_DB}"
  drop_scratch_db
  docker exec -i "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -q \
    -c "CREATE DATABASE \"${TEST_DB}\";" >>"$LOG_FILE" 2>&1 \
    || fail "Could not create ${TEST_DB}"

  log "Restoring backup into ${TEST_DB}"
  if psql_scratch <"$backup_file" >>"$LOG_FILE" 2>&1; then
    log "Restore test: PASSED"
  else
    fail "Restore test failed — see ${LOG_FILE}"
  fi

  local table_count
  table_count=$(psql_scratch -t -A -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
  log "Public tables in restored database: ${table_count:-unknown}"
  [[ "${table_count:-0}" =~ ^[0-9]+$ && "${table_count:-0}" -gt 0 ]] \
    || fail "Restored database has no public tables"

  check_migrations
  check_migrate_check

  log "=== ECM backup verification completed ==="
}

main "$@"
