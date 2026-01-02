# Database Persistence Guide

## ⚠️ CRITICAL: Preventing Data Loss

### The Problem
If database data (users, departments, divisions, directorates) is being wiped after deployments, it's likely because:

1. **Docker volumes are being removed** - Using `docker-compose down -v` removes volumes
2. **Database is being dropped/recreated** - Running bootstrap scripts that drop the database
3. **Seed script with --reset flag** - Running `seed_demo_data --reset` wipes organization data

### Solutions

#### 1. Never Remove Volumes
```bash
# ❌ WRONG - This removes volumes and wipes the database!
docker-compose -f docker-compose.stag.yml down -v

# ✅ CORRECT - This preserves volumes
docker-compose -f docker-compose.stag.yml down
```

#### 2. Never Run Bootstrap Scripts in Production/Staging
The `bootstrap_postgres.sql` script contains:
```sql
DROP DATABASE IF EXISTS npa_ecm_stag;
CREATE DATABASE npa_ecm_stag OWNER ecmadmin;
```

**This will wipe all data!** Only run this script on a fresh setup, never on an existing database.

#### 3. Never Use --reset Flag in Production/Staging
```bash
# ❌ WRONG - This wipes organization data!
scripts/seed-data.sh stag -- --reset

# ✅ CORRECT - Only seed if needed, without reset
scripts/seed-data.sh stag
```

#### 4. Check Volume Status
```bash
# List volumes
docker volume ls | grep postgres_stag_data

# Inspect volume
docker volume inspect npa-ecm_postgres_stag_data

# Check if volume exists and has data
docker exec ecm-postgres-stag psql -U ecmadmin -d npa_ecm_stag -c "SELECT COUNT(*) FROM accounts_user;"
```

#### 5. Backup Before Deployment
Always backup the database before deployments:
```bash
# Create backup
docker exec ecm-postgres-stag pg_dump -U ecmadmin npa_ecm_stag > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use the backup script
scripts/backup-db.sh stag
```

### Deployment Checklist

Before deploying:
- [ ] Backup database
- [ ] Verify volumes exist: `docker volume ls | grep postgres`
- [ ] Check data exists: `docker exec ecm-postgres-stag psql -U ecmadmin -d npa_ecm_stag -c "SELECT COUNT(*) FROM accounts_user;"`

During deployment:
- [ ] Use `docker-compose down` (NOT `down -v`)
- [ ] Run migrations: `python manage.py migrate` (NOT `migrate --run-syncdb` or `--reset`)
- [ ] Never run `seed_demo_data --reset` in staging/production

After deployment:
- [ ] Verify data still exists
- [ ] Check user count matches pre-deployment
- [ ] Test login with existing users

### Recovery

If data is lost:
1. Stop services: `docker-compose -f docker-compose.stag.yml down`
2. Restore from backup: `gunzip < backup.sql.gz | docker exec -i ecm-postgres-stag psql -U ecmadmin npa_ecm_stag`
3. Restart services: `docker-compose -f docker-compose.stag.yml up -d`

### Volume Location

Docker volumes are stored at:
- Linux: `/var/lib/docker/volumes/`
- The volume name is: `npa-ecm_postgres_stag_data` (or similar)

To check volume location:
```bash
docker volume inspect npa-ecm_postgres_stag_data
```

