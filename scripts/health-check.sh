#!/bin/bash

# NPA ECM Health Check Script
# This script performs comprehensive health checks on all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.stag.yml"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check Docker services status
check_docker_services() {
    log "🔍 Checking Docker services status..."

    local services=("ecm-postgres-stag" "ecm-redis-stag" "ecm-backend-stag" "ecm-frontend-stag" "ecm-nginx-stag")

    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^${service}$"; then
            success "✓ $service is running"
        else
            error "✗ $service is not running"
            return 1
        fi
    done

    return 0
}

# Check PostgreSQL health
check_postgres() {
    log "🔍 Checking PostgreSQL health..."

    if docker exec ecm-postgres-stag pg_isready -U npa_user -d npa_ecm_stag >/dev/null 2>&1; then
        success "✓ PostgreSQL is healthy"

        # Check database size and connections
        local db_size=$(docker exec ecm-postgres-stag psql -U npa_user -d npa_ecm_stag -t -c "SELECT pg_size_pretty(pg_database_size('npa_ecm_stag'));")
        local active_connections=$(docker exec ecm-postgres-stag psql -U npa_user -d npa_ecm_stag -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")

        log "  Database size: $db_size"
        log "  Active connections: $active_connections"

        return 0
    else
        error "✗ PostgreSQL is not healthy"
        return 1
    fi
}

# Check Redis health
check_redis() {
    log "🔍 Checking Redis health..."

    if docker exec ecm-redis-stag redis-cli ping | grep -q "PONG"; then
        success "✓ Redis is healthy"

        # Check Redis stats
        local connected_clients=$(docker exec ecm-redis-stag redis-cli info clients | grep "connected_clients" | cut -d: -f2)
        local used_memory=$(docker exec ecm-redis-stag redis-cli info memory | grep "used_memory_human" | cut -d: -f2)

        log "  Connected clients: $connected_clients"
        log "  Used memory: $used_memory"

        return 0
    else
        error "✗ Redis is not healthy"
        return 1
    fi
}

# Check Backend health
check_backend() {
    log "🔍 Checking Backend health..."

    # Test health endpoint
    if curl -f -s --max-time 10 http://localhost:4646/api/health/ >/dev/null 2>&1; then
        success "✓ Backend API is responding"

        # Test specific endpoints
        local api_status=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:4646/api/)
        if [[ "$api_status" == "200" ]]; then
            success "✓ API root endpoint is accessible"
        else
            warning "! API root endpoint returned status $api_status"
        fi

        # Check Django admin
        local admin_status=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:4646/admin/)
        if [[ "$admin_status" == "200" || "$admin_status" == "302" ]]; then
            success "✓ Django admin is accessible"
        else
            warning "! Django admin returned status $admin_status"
        fi

        return 0
    else
        error "✗ Backend API is not responding"
        return 1
    fi
}

# Check Frontend health
check_frontend() {
    log "🔍 Checking Frontend health..."

    # Test main page
    if curl -f -s --max-time 10 http://localhost:3001 >/dev/null 2>&1; then
        success "✓ Frontend is responding"

        # Test health endpoint if it exists
        if curl -f -s --max-time 5 http://localhost:3001/api/health >/dev/null 2>&1; then
            success "✓ Frontend health endpoint is accessible"
        else
            log "  (Frontend health endpoint not available - this is normal)"
        fi

        return 0
    else
        error "✗ Frontend is not responding"
        return 1
    fi
}

# Check Nginx
check_nginx() {
    log "🔍 Checking Nginx health..."

    if curl -f -s --max-time 5 http://localhost:80/health >/dev/null 2>&1; then
        success "✓ Nginx is responding"

        # Test proxy to backend
        if curl -f -s --max-time 5 http://localhost/api/health/ >/dev/null 2>&1; then
            success "✓ Nginx proxy to backend is working"
        else
            warning "! Nginx proxy to backend failed"
        fi

        # Test static file serving
        local static_status=$(curl -s -w "%{http_code}" -o /dev/null http://localhost/_next/static/)
        if [[ "$static_status" == "200" || "$static_status" == "404" ]]; then
            success "✓ Static file serving is configured"
        else
            warning "! Static file serving returned status $static_status"
        fi

        return 0
    else
        error "✗ Nginx is not responding"
        return 1
    fi
}

# Check Celery workers
check_celery() {
    log "🔍 Checking Celery workers..."

    if docker ps --format "table {{.Names}}" | grep -q "ecm-celery-worker-stag"; then
        success "✓ Celery worker is running"

        # Check Celery status (if possible)
        local celery_status=$(docker exec ecm-celery-worker-stag celery -A ecm inspect active 2>/dev/null | head -5 || echo "Status check failed")
        if [[ "$celery_status" != "Status check failed" ]]; then
            success "✓ Celery worker is active"
        else
            warning "! Celery worker status check failed"
        fi

        return 0
    else
        warning "! Celery worker is not running"
        return 1
    fi
}

# Check monitoring services
check_monitoring() {
    log "🔍 Checking monitoring services..."

    # Check Prometheus
    if curl -f -s --max-time 5 http://localhost:9091/-/healthy >/dev/null 2>&1; then
        success "✓ Prometheus is healthy"
    else
        warning "! Prometheus health check failed"
    fi

    # Check Grafana
    if curl -f -s --max-time 5 http://localhost:3002/api/health >/dev/null 2>&1; then
        success "✓ Grafana is accessible"
    else
        warning "! Grafana health check failed"
    fi
}

# Generate report
generate_report() {
    log "📊 Generating health report..."

    echo "=========================================="
    echo "NPA ECM Health Check Report"
    echo "=========================================="
    echo "Timestamp: $(date)"
    echo "Environment: Staging"
    echo ""

    # Docker services status
    echo "Docker Services:"
    docker-compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    # Resource usage
    echo "Resource Usage:"
    echo "Container CPU/Memory Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    echo ""

    # Disk usage
    echo "Disk Usage:"
    df -h / | tail -1
    echo ""

    echo "=========================================="
}

# Main function
main() {
    log "🏥 Starting NPA ECM Health Check"

    local overall_status=0

    # Run all checks
    check_docker_services || overall_status=1
    echo ""

    check_postgres || overall_status=1
    echo ""

    check_redis || overall_status=1
    echo ""

    check_backend || overall_status=1
    echo ""

    check_frontend || overall_status=1
    echo ""

    check_nginx || overall_status=1
    echo ""

    check_celery || overall_status=1
    echo ""

    check_monitoring || overall_status=1
    echo ""

    generate_report

    if [[ $overall_status -eq 0 ]]; then
        success "🎉 All health checks passed!"
        exit 0
    else
        error "❌ Some health checks failed!"
        exit 1
    fi
}

# Run main function
main "$@"
