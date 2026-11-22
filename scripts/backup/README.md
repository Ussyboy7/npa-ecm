# Backup & Restore Runbook

Operational scripts for ECM database backups.

## Scripts

| Script | Purpose |
|--------|---------|
| `backup-db.sh` | Create a plain SQL dump via `pg_dump` |
| `verify_backup.sh` | Restore into a throwaway DB, then check tables, migration state, and `migrate --check` |
| `restore_backup.sh` | Disaster recovery — recreate the DB, restore SQL, realign sequences |

## Backup layout

```text
backups/
  local/
    db-local-20260624T120000.sql
  staging/
    db-staging-20260624T120000.sql
  predeploy_staging_20260624T120000.sql   # created before deploy
```

## Usage

```bash
# Create backup
scripts/local/env-manager.sh backup

# Verify latest backup (local)
scripts/local/env-manager.sh verify-backup

# Restore (interactive)
scripts/staging/env-manager.sh restore-backup --backup latest

# Non-interactive restore
BACKUP_ROOT=/srv/npa-ecm/backups scripts/backup/restore_backup.sh --env stag --backup latest --yes
```

## Notes

- Backups are **plain SQL** (`pg_dump` stdout), not custom format — use `psql` to restore.
- Restores always **drop and recreate** the target database first. Restoring into a
  populated database merges rows, ignores duplicate-key errors, and leaves the
  `django_migrations` sequence behind — the cause of the staging duplicate-key
  outage. `scripts/lib/db-restore.sh` owns this flow for both manual restores and
  deploy rollback.
- After restoring, every sequence is realigned to `MAX(column)` (including
  `django_migrations_id_seq`), so migrations can insert without colliding.
- `verify_backup.sh` creates a throwaway database, restores into it with
  `ON_ERROR_STOP=1`, checks the table count and migration state, runs
  `manage.py migrate --check` against it (requires the backend container), and
  drops the database afterward. Results are written to `verify.log`
  next to the backup.
- Always take a pre-deploy snapshot before `env-manager deploy` (enabled by default).
