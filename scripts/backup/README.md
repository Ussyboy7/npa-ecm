# Backup & Restore Runbook

Operational scripts for ECM database backups.

## Scripts

| Script | Purpose |
|--------|---------|
| `backup-db.sh` | Create a plain SQL dump via `pg_dump` |
| `verify_backup.sh` | Restore into a temporary DB to verify integrity |
| `restore_backup.sh` | Disaster recovery — restore production/staging from SQL |

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
- `verify_backup.sh` creates a throwaway database and drops it after validation.
- Always take a pre-deploy snapshot before `env-manager deploy` (enabled by default).
