# NPA-ECM Scripts

**Organized script collection for NPA Electronic Content Management system operations.**

---

## 📁 Script Organization

Scripts are organized by category for better maintainability:

```
scripts/
├── utilities/          # Main control scripts
├── production/         # Service management & deployment
├── monitoring/         # Health checks & monitoring
├── backup/             # Database backup operations
├── security/           # Security-related scripts (if any)
├── testing/            # Testing and validation scripts
└── archive/            # Obsolete scripts (preserved)
```

---

## 🚀 Main Control Script

### `utilities/ecm` - Primary Control Interface

**Purpose**: Unified command-line interface for all ECM operations

**Usage**:
```bash
./scripts/utilities/ecm <command> <environment> [options]
```

**Examples**:
```bash
# Development
./scripts/utilities/ecm up local
./scripts/utilities/ecm status local
./scripts/utilities/ecm logs local backend

# Staging
./scripts/utilities/ecm up stag -- --build
./scripts/utilities/ecm restart stag
./scripts/utilities/ecm migrate stag

# Production
./scripts/utilities/ecm up prod
./scripts/utilities/ecm backup prod
./scripts/utilities/ecm monitor prod
```

**Supported Commands**:
- `up` - Start services
- `down` - Stop services
- `restart` - Restart services
- `status` - Show service status
- `logs` - View service logs
- `migrate` - Run database migrations
- `backup` - Create database backup
- `monitor` - Show monitoring dashboard

---

## 🏭 Production Management

**Location**: `scripts/production/`

### Service Management
- `start-local.sh` - Start local development stack
- `start-stag.sh` - Start staging environment
- `start-prod.sh` - Start production environment
- `stop-stack.sh` - Stop all services
- `restart-stack.sh` - Restart all services

### Backend Services
- `start-backend-local.sh` - Start local backend
- `start-backend-stag.sh` - Start staging backend
- `start-backend-prod.sh` - Start production backend

### Async Services
- `start-celery-local.sh` - Start local Celery workers
- `start-celery-stag.sh` - Start staging Celery workers
- `start-celery-prod.sh` - Start production Celery workers

### Deployment & Maintenance
- `deploy-staging.sh` - Deploy to staging environment
- `collect-static.sh` - Collect Django static files
- `seed-data.sh` - Seed database with demo data
- `stack-utils.sh` - Stack utility functions

### Testing
- `test-docker-compose.sh` - Test Docker Compose configuration

---

## 👀 Monitoring & Health Checks

**Location**: `scripts/monitoring/`

### Health Monitoring
- `check-health.sh` - General system health check
- `check-backend-status.sh` - Backend service status
- `check-staging-services.sh` - Staging environment checks

---

## 💾 Backup Operations

**Location**: `scripts/backup/`

### Database Backups
- `backup-db.sh` - Create database backup

---

## 📚 Documentation

**Location**: `scripts/` (root level)

- `README.md` - This documentation
- `BACKEND_STARTUP_GUIDE.md` - Backend server startup guide

---

## 🏃 Running Scripts

### Prerequisites
- Bash shell (all scripts are shell scripts)
- Docker and Docker Compose (for containerized operations)
- Appropriate environment variables set

### Execution
```bash
# Make scripts executable (if needed)
chmod +x scripts/**/*.sh
chmod +x scripts/utilities/ecm

# Run any script
./scripts/production/start-local.sh
./scripts/utilities/ecm status local
./scripts/monitoring/check-health.sh
```

### Environment Variables

**Required for most scripts:**
- `COMPOSE_FILE` - Path to docker-compose file
- `STACK_NAME` - Stack identifier
- Database connection variables
- Service endpoint URLs

---

## 🔄 Script Categories Comparison

| Category | EMR Structure | NPA-ECM Structure | Status |
|----------|----------------|-------------------|--------|
| **Main Control** | `infra/scripts/` | `scripts/utilities/` | ✅ Organized |
| **Production** | `infra/scripts/production/` | `scripts/production/` | ✅ Organized |
| **Monitoring** | `infra/scripts/monitoring/` | `scripts/monitoring/` | ✅ Organized |
| **Backup** | `infra/scripts/backup/` | `scripts/backup/` | ✅ Organized |
| **Security** | `infra/scripts/security/` | `scripts/security/` | ✅ Ready |
| **Testing** | `infra/scripts/testing/` | `scripts/testing/` | ✅ Ready |

---

## 📝 Maintenance Guidelines

### Adding New Scripts

1. **Choose appropriate category** based on script purpose
2. **Follow naming conventions** (use `-` separators, `.sh` extension)
3. **Add executable permissions** (`chmod +x`)
4. **Update this README** with new script documentation
5. **Test thoroughly** before committing

### Script Standards

- **Header comments**: Include purpose, usage, and examples
- **Error handling**: Use `set -e` for strict error checking
- **Logging**: Use consistent log formats
- **Environment variables**: Document required variables
- **Idempotent operations**: Scripts should be safe to run multiple times

---

## 🚨 Archived Scripts

**Location**: `scripts/archive/`

Contains obsolete scripts that have been replaced or are no longer needed:

- Development automation scripts (TypeScript fixing, console cleanup)
- One-time migration scripts (user hierarchy fixes)
- Installation scripts (system dependencies)
- Legacy utility scripts

**Purpose**: Historical reference - do not use for current operations.

---

## 🔗 Integration with Documentation

Scripts are referenced throughout the project documentation:

- **Setup guides** reference startup scripts
- **Deployment docs** reference production scripts
- **Monitoring guides** reference health check scripts
- **Backup procedures** reference backup scripts

---

**This script organization provides a clean, maintainable structure that matches industry best practices and enables efficient operations management.**

