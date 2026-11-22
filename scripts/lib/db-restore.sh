#!/usr/bin/env bash
# Shared PostgreSQL snapshot restore helpers.
#
# A plain `psql < dump` against a populated database leaves it half-restored:
# duplicate-key errors are ignored, rows are merged, and sequences keep the
# dump's older values. Every restore path must drop and recreate the database
# first, then realign sequences so new inserts do not collide.
#
# All helpers talk to a running Postgres container via `docker exec`.

db_restore_validate_identifier() {
    [[ "$1" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || {
        printf 'Invalid PostgreSQL identifier: %s\n' "${1:-<empty>}" >&2
        return 1
    }
}

# db_restore_wait_ready <pg_container> <db_user> [attempts] [interval]
db_restore_wait_ready() {
    local pg_container="$1" db_user="$2" attempts="${3:-30}" interval="${4:-2}" i
    for ((i = 1; i <= attempts; i++)); do
        if docker exec "$pg_container" pg_isready -U "$db_user" -d postgres >/dev/null 2>&1; then
            return 0
        fi
        sleep "$interval"
    done
    printf '%s did not become ready for %s\n' "$pg_container" "$db_user" >&2
    return 1
}

# db_restore_align_sequences <pg_container> <db_user> <db_name>
db_restore_align_sequences() {
    local pg_container="$1" db_user="$2" db_name="$3"
    db_restore_validate_identifier "$db_name" || return 1
    docker exec -i "$pg_container" psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$
DECLARE r record;
        ignored bigint;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE c.relkind = 'r' AND n.nspname = 'public'
      AND pg_get_serial_sequence(
        quote_ident(n.nspname) || '.' || quote_ident(c.relname), a.attname
      ) IS NOT NULL
  LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, %L), GREATEST(COALESCE((SELECT MAX(%I) FROM %I.%I), 1), 1))',
      r.schema_name || '.' || r.table_name, r.column_name,
      r.column_name, r.schema_name, r.table_name
    ) INTO ignored;
  END LOOP;
END $$;
SQL
}

# db_restore_snapshot <pg_container> <db_user> <db_name> <sql_file>
# Drops the database, recreates it, restores the snapshot with ON_ERROR_STOP,
# then realigns sequences. Returns non-zero on any failure.
db_restore_snapshot() {
    local pg_container="$1" db_user="$2" db_name="$3" sql_file="$4"

    [[ -s "$sql_file" ]] || {
        printf 'Backup file is missing or empty: %s\n' "${sql_file:-<unset>}" >&2
        return 1
    }
    db_restore_validate_identifier "$db_name" || return 1
    db_restore_validate_identifier "$db_user" || return 1

    docker exec -i "$pg_container" psql -U "$db_user" -d postgres -v ON_ERROR_STOP=1 -q \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db_name}' AND pid <> pg_backend_pid();" \
        -c "DROP DATABASE IF EXISTS \"${db_name}\";" \
        -c "CREATE DATABASE \"${db_name}\" OWNER \"${db_user}\";" || return 1

    docker exec -i "$pg_container" psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 -q \
        < "$sql_file" || return 1

    db_restore_align_sequences "$pg_container" "$db_user" "$db_name" || return 1
}

# db_restore_migration_status <pg_container> <db_user> <db_name>
# Prints "<applied> <sequence_ok>" for the restored django_migrations table,
# or "missing" when the snapshot has no migration state.
db_restore_migration_status() {
    local pg_container="$1" db_user="$2" db_name="$3"
    docker exec -i "$pg_container" psql -U "$db_user" -d "$db_name" -t -A -v ON_ERROR_STOP=1 <<'SQL'
SELECT
  CASE
    WHEN to_regclass('public.django_migrations') IS NULL THEN 'missing'
    ELSE (
      SELECT (SELECT count(*) FROM django_migrations)
        || ' ' ||
        CASE
          WHEN (SELECT last_value FROM django_migrations_id_seq)
               >= COALESCE((SELECT max(id) FROM django_migrations), 0)
          THEN 'sequence_ok'
          ELSE 'sequence_stale'
        END
    )
  END;
SQL
}
