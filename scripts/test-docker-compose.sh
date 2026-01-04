#!/bin/bash

# Test Docker Compose Configuration
# This script validates the Docker Compose files and performs basic tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Test Docker Compose configuration
test_compose_config() {
    log "🔍 Testing Docker Compose configuration..."

    local compose_files=("docker-compose.local.yml" "docker-compose.prod.yml" "docker-compose.stag.yml")

    for file in "${compose_files[@]}"; do
        if [[ -f "$file" ]]; then
            log "Testing $file..."
            if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
                if docker compose -f "$file" config --quiet; then
                    success "✓ $file configuration is valid"
                else
                    error "✗ $file configuration is invalid"
                    return 1
                fi
            elif command -v docker-compose >/dev/null 2>&1; then
                if docker-compose -f "$file" config --quiet; then
                    success "✓ $file configuration is valid"
                else
                    error "✗ $file configuration is invalid"
                    return 1
                fi
            else
                warning "! Docker Compose command not available, skipping validation"
            fi
        else
            warning "! $file not found"
        fi
    done

    return 0
}

# Test Docker images exist
test_docker_images() {
    log "🔍 Testing Docker image availability..."

    if ! command -v docker >/dev/null 2>&1; then
        warning "! Docker command not available, skipping image checks"
        return 0
    fi

    # Check if required base images are available
    local base_images=("postgres:16-alpine" "redis:7-alpine" "nginx:alpine" "node:20-alpine" "python:3.13-slim")

    for image in "${base_images[@]}"; do
        if docker images "$image" --format "table {{.Repository}}:{{.Tag}}" 2>/dev/null | grep -q "$image"; then
            success "✓ $image is available locally"
        else
            warning "! $image not available locally (will be pulled on first run)"
        fi
    done
}

# Test Docker build contexts
test_build_contexts() {
    log "🔍 Testing Docker build contexts..."

    # Check if required directories exist
    local required_dirs=("backend" "frontend")

    for dir in "${required_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            success "✓ Build context $dir exists"

            # Check for Dockerfile
            if [[ -f "$dir/Dockerfile" ]] || [[ -f "$dir/Dockerfile.prod" ]]; then
                success "✓ Dockerfile found in $dir"
            else
                error "✗ No Dockerfile found in $dir"
                return 1
            fi
        else
            error "✗ Build context $dir not found"
            return 1
        fi
    done

    return 0
}

# Test environment files
test_environment_files() {
    log "🔍 Testing environment configuration..."

    # Check for required files
    local required_files=("backend/requirements.txt" "frontend/package.json" "frontend/package-lock.json")

    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            success "✓ $file exists"
        else
            warning "! $file not found"
        fi
    done
}

# Test networking configuration
test_networking() {
    log "🔍 Testing networking configuration..."

    # Check if required ports are available (basic check)
    local ports=(5432 6379 8000 3000 80 4646 8002 3002)

    for port in "${ports[@]}"; do
        if lsof -i :"$port" >/dev/null 2>&1; then
            warning "! Port $port is already in use"
        else
            success "✓ Port $port is available"
        fi
    done
}

# Test volume mounts
test_volumes() {
    log "🔍 Testing volume mount points..."

    local volume_paths=("nginx/stag.conf" "nginx/prod.conf" "monitoring/prometheus.yml")

    for path in "${volume_paths[@]}"; do
        if [[ -f "$path" ]]; then
            success "✓ Volume mount $path exists"
        else
            error "✗ Volume mount $path not found"
            return 1
        fi
    done
}

# Generate test report
generate_test_report() {
    log "📊 Docker Compose Test Report"
    echo "========================================"
    echo "NPA ECM Docker Compose Validation"
    echo "========================================"
    echo "Date: $(date)"
    echo ""
    echo "System Information:"
    if command -v docker >/dev/null 2>&1; then
        echo "Docker Version: $(docker --version 2>/dev/null || echo 'Not available')"
    else
        echo "Docker Version: Not installed"
    fi
    if command -v docker-compose >/dev/null 2>&1; then
        echo "Docker Compose Version: $(docker-compose --version 2>/dev/null || echo 'Not available')"
    else
        echo "Docker Compose Version: Not installed"
    fi
    echo ""
    echo "Available Resources:"
    if command -v nproc >/dev/null 2>&1; then
        echo "CPU Cores: $(nproc 2>/dev/null || echo 'Unknown')"
    else
        echo "CPU Cores: Unknown"
    fi
    if command -v free >/dev/null 2>&1; then
        echo "Total Memory: $(free -h 2>/dev/null | grep '^Mem:' | awk '{print $2}' || echo 'Unknown')"
    else
        echo "Total Memory: Unknown"
    fi
    echo "Disk Space: $(df -h . 2>/dev/null | tail -1 | awk '{print $4}' || echo 'Unknown') available"
    echo ""
    echo "========================================"
}

# Main function
main() {
    log "🧪 Starting Docker Compose validation tests"

    local overall_status=0

    test_compose_config || overall_status=1
    echo ""

    test_docker_images || overall_status=1
    echo ""

    test_build_contexts || overall_status=1
    echo ""

    test_environment_files || overall_status=1
    echo ""

    test_networking || overall_status=1
    echo ""

    test_volumes || overall_status=1
    echo ""

    generate_test_report

    if [[ $overall_status -eq 0 ]]; then
        success "🎉 All Docker Compose validation tests passed!"
        echo ""
        log "Next steps:"
        log "1. Run './scripts/deploy-staging.sh' to deploy to staging"
        log "2. Run './scripts/ecm health stag' to verify deployment"
        log "3. Access the application at http://172.16.0.46:4646"
        exit 0
    else
        error "❌ Some validation tests failed!"
        echo ""
        log "Please fix the issues above before deploying."
        exit 1
    fi
}

# Run main function
main "$@"
