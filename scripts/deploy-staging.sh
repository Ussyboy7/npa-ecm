#!/bin/bash

# NPA ECM Staging Deployment Script
# This script handles the deployment of the NPA ECM system to staging environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="npa-ecm"
STAGING_DIR="/opt/${PROJECT_NAME}/staging"
DOCKER_COMPOSE_FILE="docker-compose.stag.yml"

# Logging
LOG_FILE="${STAGING_DIR}/deploy_$(date +%Y%m%d_%H%M%S).log"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."

    # Check if required files exist
    local required_files=("$DOCKER_COMPOSE_FILE" "backend/Dockerfile.prod" "frontend/Dockerfile.prod")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file missing: $file"
            exit 1
        fi
    done

    # Validate Docker Compose configuration
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" config --quiet; then
        error "Invalid Docker Compose configuration"
        exit 1
    fi

    success "Pre-deployment checks completed"
}

# Backup current deployment
backup_current_deployment() {
    log "💾 Creating backup of current deployment..."

    local backup_dir="${STAGING_DIR}/backups/$(date +%Y%m%d_%H%M%S)"

    mkdir -p "$backup_dir"

    # Backup database if it exists
    if docker ps | grep -q "npa-ecm-postgres-stag"; then
        log "Backing up PostgreSQL database..."
        docker exec npa-ecm-postgres-stag pg_dump -U npa_user npa_ecm_stag > "${backup_dir}/database_backup.sql" 2>/dev/null || warning "Database backup failed"
    fi

    # Backup Docker Compose configuration
    cp "$DOCKER_COMPOSE_FILE" "${backup_dir}/" 2>/dev/null || true

    success "Backup completed: $backup_dir"
}

# Stop existing services
stop_services() {
    log "🛑 Stopping existing services..."

    if [[ -f "${STAGING_DIR}/${DOCKER_COMPOSE_FILE}" ]]; then
        cd "$STAGING_DIR"
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --timeout 30 || warning "Some containers failed to stop gracefully"
        cd - > /dev/null
    fi

    success "Services stopped"
}

# Clean up unused Docker resources
cleanup_docker() {
    log "🧹 Cleaning up Docker resources..."

    # Remove unused containers
    docker container prune -f

    # Remove unused images
    docker image prune -f

    # Remove unused volumes (be careful with this)
    # docker volume prune -f

    success "Docker cleanup completed"
}

# Deploy new services
deploy_services() {
    log "🚀 Deploying new services..."

    cd "$STAGING_DIR"

    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build

    # Wait for services to be healthy
    log "⏳ Waiting for services to start..."
    sleep 30

    success "Services deployed successfully"
}

# Health checks
run_health_checks() {
    log "🔍 Running health checks..."

    local max_attempts=10
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts"

        local healthy=true

        # Check PostgreSQL
        if ! docker exec npa-ecm-postgres-stag pg_isready -U npa_user -d npa_ecm_stag >/dev/null 2>&1; then
            warning "PostgreSQL is not healthy"
            healthy=false
        fi

        # Check Redis
        if ! docker exec npa-ecm-redis-stag redis-cli ping >/dev/null 2>&1; then
            warning "Redis is not healthy"
            healthy=false
        fi

        # Check Backend
        if ! curl -f -s http://localhost:8001/api/health/ >/dev/null 2>&1; then
            warning "Backend is not healthy"
            healthy=false
        fi

        # Check Frontend
        if ! curl -f -s http://localhost:4646 >/dev/null 2>&1; then
            warning "Frontend is not healthy"
            healthy=false
        fi

        if [[ "$healthy" == true ]]; then
            success "All services are healthy!"
            return 0
        fi

        sleep 10
        ((attempt++))
    done

    error "Health checks failed after $max_attempts attempts"
    return 1
}

# Post-deployment tasks
post_deployment_tasks() {
    log "📋 Running post-deployment tasks..."

    # Run database migrations if needed
    log "Running database migrations..."
    docker exec npa-ecm-backend-stag python manage.py migrate --noinput || warning "Migration failed"

    # Collect static files
    log "Collecting static files..."
    docker exec npa-ecm-backend-stag python manage.py collectstatic --noinput --clear || warning "Static files collection failed"

    # Create superuser if it doesn't exist (for staging)
    log "Ensuring superuser exists..."
    docker exec npa-ecm-backend-stag python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@staging.npa-ecm.com', 'admin123')
    print('Superuser created')
else:
    print('Superuser already exists')
" 2>/dev/null || warning "Superuser creation check failed"

    success "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    error "Deployment failed! Starting rollback..."

    stop_services

    # Find latest backup
    local latest_backup=$(find "${STAGING_DIR}/backups" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)

    if [[ -n "$latest_backup" && -d "$latest_backup" ]]; then
        log "Rolling back to backup: $latest_backup"

        # Restore Docker Compose configuration
        cp "${latest_backup}/${DOCKER_COMPOSE_FILE}" "${STAGING_DIR}/" 2>/dev/null || true

        # Restart services from backup
        cd "$STAGING_DIR"
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
        cd - > /dev/null

        success "Rollback completed"
    else
        error "No backup found for rollback"
    fi
}

# Main deployment function
main() {
    log "🚀 Starting NPA ECM Staging Deployment"
    log "Project: $PROJECT_NAME"
    log "Staging Directory: $STAGING_DIR"
    log "Log File: $LOG_FILE"

    # Trap errors for rollback
    trap rollback ERR

    pre_deployment_checks
    backup_current_deployment
    stop_services
    cleanup_docker
    deploy_services

    if run_health_checks; then
        post_deployment_tasks
        success "🎉 Deployment completed successfully!"
        success "Application is available at:"
        success "  Frontend: http://172.16.0.46:4646"
        success "  Backend API: http://localhost:8001/api/"
        success "  Admin: http://localhost:8001/admin/"
        success "  Grafana: http://localhost:3002 (admin/staging_admin_2024)"
        success "  Prometheus: http://localhost:9091"
    else
        error "Deployment failed - health checks did not pass"
        exit 1
    fi
}

# Run main function
main "$@"
