#!/usr/bin/env bash
# Focused test for scripts/lib/db-restore.sh.
# Uses a docker shim so the restore flow is asserted without a live database.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESTORE_LIB="${RESTORE_LIB:-${ROOT_DIR}/scripts/lib/db-restore.sh}"
TEST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ecm-db-restore.XXXXXX")"

cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

fail() {
    printf 'FAIL: %s\n' "$1" >&2
    exit 1
}

mkdir -p "$TEST_DIR/bin"
cat > "$TEST_DIR/bin/docker" <<'SHIM'
#!/usr/bin/env bash
set -euo pipefail

: "${SHIM_LOG:?}" "${SHIM_DIR:?}"

count=$(( $(wc -l < "$SHIM_LOG") + 1 ))
stdin_copy="${SHIM_DIR}/stdin-${count}"
cat > "$stdin_copy"

printf 'ARGV %s\n' "$*" >> "$SHIM_LOG"
prev=""
for arg in "$@"; do
    if [[ "$prev" == "-c" ]]; then
        printf 'C_ARG %s\n' "$arg" >> "$SHIM_LOG"
    fi
    prev="$arg"
done
printf 'STDIN_BYTES %s\n' "$(wc -c < "$stdin_copy" | tr -d ' ')" >> "$SHIM_LOG"
if grep -q 'setval' "$stdin_copy"; then
    printf 'STDIN_HAS_SETVAL\n' >> "$SHIM_LOG"
fi

# Simulate a corrupt dump: the restore into the target database fails.
if [[ "${SHIM_FAIL_RESTORE:-0}" == "1" && "$*" == *" -d npa_ecm_stag"* && -s "$stdin_copy" ]]; then
    if ! grep -q 'pg_terminate_backend' "$stdin_copy"; then
        exit 1
    fi
fi
exit 0
SHIM
chmod +x "$TEST_DIR/bin/docker"

export PATH="$TEST_DIR/bin:$PATH"
# shellcheck source=../lib/db-restore.sh
source "$RESTORE_LIB"

printf '%s\n' 'CREATE TABLE django_migrations (id serial PRIMARY KEY);' > "$TEST_DIR/snapshot.sql"

line_of() {
    grep -n "$1" "$SHIM_LOG" | head -1 | cut -d: -f1
}

# First non-empty stdin capture is the dump; later ones are the sequence SQL.
restore_line() {
    awk '/^STDIN_BYTES / && $2 + 0 > 0 { print NR; exit }' "$SHIM_LOG"
}

run_success_case() {
    export SHIM_LOG="$TEST_DIR/success.log"
    export SHIM_DIR="$TEST_DIR"
    : > "$SHIM_LOG"

    db_restore_snapshot ecm-postgres-stag ecmadmin npa_ecm_stag "$TEST_DIR/snapshot.sql" < /dev/null \
        || fail "restore helper failed on a valid snapshot"

    grep -q 'pg_terminate_backend' "$SHIM_LOG" || fail 'restore did not terminate live connections'
    grep -q 'DROP DATABASE IF EXISTS "npa_ecm_stag"' "$SHIM_LOG" || fail 'restore did not drop the database'
    grep -q 'CREATE DATABASE "npa_ecm_stag" OWNER "ecmadmin"' "$SHIM_LOG" || fail 'restore did not recreate the database'
    grep -q -- '-v ON_ERROR_STOP=1' "$SHIM_LOG" || fail 'restore does not fail on SQL errors'

    local drop_line create_line restore_line sequence_line
    drop_line=$(line_of 'C_ARG DROP DATABASE IF EXISTS')
    create_line=$(line_of 'C_ARG CREATE DATABASE "npa_ecm_stag"')
    local restore_at sequence_line
    restore_at=$(restore_line)
    sequence_line=$(line_of 'STDIN_HAS_SETVAL')

    [[ -n "$drop_line" && -n "$create_line" && -n "$restore_at" && -n "$sequence_line" ]] \
        || fail 'restore flow is missing a drop, create, dump, or sequence step'
    (( drop_line < create_line )) || fail 'database must be dropped before it is recreated'
    (( create_line < restore_at )) || fail 'snapshot restore started before the database was recreated'
    (( restore_at < sequence_line )) || fail 'sequences must be realigned after the restore'
}

run_failure_case() {
    export SHIM_LOG="$TEST_DIR/failure.log"
    export SHIM_DIR="$TEST_DIR"
    export SHIM_FAIL_RESTORE=1
    : > "$SHIM_LOG"

    if db_restore_snapshot ecm-postgres-stag ecmadmin npa_ecm_stag "$TEST_DIR/snapshot.sql" < /dev/null; then
        fail 'restore helper reported success when the snapshot restore failed'
    fi
    if grep -q 'STDIN_HAS_SETVAL' "$SHIM_LOG"; then
        fail 'sequences must not be realigned after a failed restore'
    fi
    unset SHIM_FAIL_RESTORE
}

run_identifier_case() {
    if db_restore_snapshot ecm-postgres-stag ecmadmin 'bad;name' "$TEST_DIR/snapshot.sql" < /dev/null 2>/dev/null; then
        fail 'restore helper accepted an unsafe database identifier'
    fi
}

run_missing_file_case() {
    if db_restore_snapshot ecm-postgres-stag ecmadmin npa_ecm_stag "$TEST_DIR/absent.sql" < /dev/null 2>/dev/null; then
        fail 'restore helper accepted a missing snapshot'
    fi
}

run_success_case
run_failure_case
run_identifier_case
run_missing_file_case

printf 'PASS: restore recreates the database, fails on errors, and realigns sequences\n'
