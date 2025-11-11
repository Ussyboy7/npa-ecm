# NPA ECM CI/CD Pipeline

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the NPA ECM (Electronic Content Management) system.

## 🏗️ Pipeline Overview

The CI/CD pipeline consists of the following stages:

1. **Quality Assurance** - Code linting, type checking, and testing
2. **Security Scanning** - Vulnerability assessment and security checks
3. **Build & Test** - Docker image building and validation
4. **Staging Deployment** - Automated deployment to staging environment
5. **Performance Testing** - Load testing and performance validation
6. **Production Deployment** - Manual approval for production deployment

## 🚀 GitHub Actions Workflow

### Trigger Conditions
- **Push to `main` branch**: Full pipeline execution
- **Push to `develop` branch**: QA and build stages only
- **Pull Requests**: QA and build stages only

### Required Secrets

Set up the following secrets in your GitHub repository:

```bash
# Staging Server Access
STAGING_HOST_USER=your-staging-server-user
STAGING_HOST=your-staging-server-ip
STAGING_SSH_PRIVATE_KEY=your-ssh-private-key

# Notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

## 🐳 Docker Compose Environments

### Staging Environment (`docker-compose.stag.yml`)

The staging environment includes:
- **PostgreSQL 15** - Database
- **Redis 7** - Cache and session storage
- **Django Backend** - API server
- **Next.js Frontend** - React application
- **Nginx** - Reverse proxy and load balancer
- **Celery Workers** - Background task processing
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboard

### Services Configuration

#### Backend Service
```yaml
- Port: internal (8000 via Nginx)
- Health Check: /api/health/
- Environment: staging
```

#### Frontend Service
```yaml
- Port: 4646
- External URL: http://172.16.0.46:4646
- Health Check: /api/health
- API URL: http://backend_stag:8000/api
```

#### Monitoring
```yaml
- Prometheus: http://localhost:9091
- Grafana: http://localhost:3002 (admin/staging_admin_2024)
- Nginx: http://localhost:4646
```

## 📋 Deployment Scripts

### Staging Deployment Script

The `scripts/deploy-staging.sh` script handles:
- Pre-deployment health checks
- Database backup creation
- Service stopping and cleanup
- New service deployment
- Health verification
- Automatic rollback on failure

#### Usage
```bash
# Local deployment
./scripts/deploy-staging.sh

# Remote deployment (from CI/CD)
scp scripts/deploy-staging.sh user@staging-server:/opt/npa-ecm/
ssh user@staging-server "cd /opt/npa-ecm && ./deploy-staging.sh"
```

### Health Check Script

The `scripts/health-check.sh` script provides comprehensive health monitoring:

```bash
# Run health checks
./scripts/health-check.sh

# Output includes:
# - Docker service status
# - Database connectivity
# - API endpoint responses
# - Resource usage statistics
# - Comprehensive health report
```

## 🔧 Configuration Files

### Nginx Configuration (`nginx/stag.conf`)
- Reverse proxy setup
- SSL/TLS configuration (commented for staging)
- Rate limiting and security headers
- Static file serving
- Health check endpoints

### Prometheus Configuration (`monitoring/prometheus.yml`)
- Service discovery for all containers
- Metrics collection intervals
- Alerting rules configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://npa_user:staging_password_2024@postgres_stag:5432/npa_ecm_stag

# Redis
REDIS_URL=redis://redis_stag:6379/0

# Django
SECRET_KEY=django-insecure-staging-key-2024-npa-ecm
DEBUG=False
ENVIRONMENT=staging

# Frontend
NEXT_PUBLIC_API_URL=http://backend_stag:8000/api
NEXT_PUBLIC_ENVIRONMENT=staging
```

## 🧪 Testing Strategy

### Quality Assurance Stage
- **Frontend**: ESLint, TypeScript checking, Next.js build
- **Backend**: Black, Flake8, Django tests
- **Security**: Bandit security scanning, Safety vulnerability checks

### Performance Testing Stage
- **K6 Load Testing**: API endpoint performance validation
- **Response Time Monitoring**: 95th percentile < 500ms
- **Error Rate Monitoring**: < 10% failure rate

## 🚦 Pipeline Stages

### 1. Quality Assurance
```yaml
- name: Run Frontend Linting
  run: cd frontend && npm run lint

- name: Run Backend Linting
  run: black --check . && flake8 .
```

### 2. Security Scanning
```yaml
- name: Run Bandit Security Scan
  run: bandit -r backend -f json -o bandit-report.json

- name: Run Safety Vulnerability Check
  run: safety check --json > safety-report.json
```

### 3. Build & Test
```yaml
- name: Build Backend Docker image
  uses: docker/build-push-action@v5

- name: Build Frontend Docker image
  uses: docker/build-push-action@v5
```

### 4. Staging Deployment
```yaml
- name: Deploy to Staging Server
  run: |
    scp docker-compose.stag.yml user@staging:/opt/npa-ecm/
    ssh user@staging "cd /opt/npa-ecm && docker-compose up -d --build"
```

### 5. Performance Testing
```yaml
- name: Run Performance Tests
  run: k6 run performance-test.js
```

## 📊 Monitoring & Alerting

### Health Checks
- Service availability monitoring
- Database connectivity checks
- API endpoint response validation
- Resource usage monitoring

### Metrics Collection
- Application performance metrics
- System resource utilization
- Error rates and response times
- Database query performance

### Alerting
- Slack notifications for deployment status
- Automatic rollback on deployment failures
- Performance degradation alerts

## 🔒 Security Considerations

### Staging Environment
- Isolated network segments
- Development credentials only
- No production data access
- Rate limiting and security headers

### CI/CD Security
- Secrets management via GitHub Secrets
- SSH key authentication for deployments
- Docker image scanning (future enhancement)
- Dependency vulnerability scanning

## 🚀 Deployment Strategy

### Blue-Green Deployment
```bash
# Future enhancement: Implement blue-green deployment
docker-compose -f docker-compose.stag.yml -p green up -d
# Health checks...
docker-compose -f docker-compose.stag.yml -p blue down
```

### Rollback Strategy
- Automatic rollback on health check failures
- Database backup before deployment
- Service restart capability
- Manual intervention options

## 📈 Scaling Considerations

### Horizontal Scaling
```yaml
# Multiple backend instances
backend_stag:
  scale: 3
  depends_on:
    - postgres_stag
    - redis_stag
```

### Load Balancing
- Nginx upstream configuration
- Session affinity for stateful operations
- Health check-based routing

## 🔧 Maintenance Tasks

### Regular Maintenance
```bash
# Clean up Docker resources
docker system prune -f

# Backup databases
docker exec postgres pg_dump > backup.sql

# Update dependencies
npm audit fix
pip install --upgrade -r requirements.txt
```

### Monitoring Maintenance
```bash
# Check logs
docker-compose logs -f

# Monitor resources
docker stats

# Health check
./scripts/health-check.sh
```

## 📚 Troubleshooting

### Common Issues

#### Deployment Failures
```bash
# Check deployment logs
docker-compose logs backend_stag

# Verify environment variables
docker exec backend_stag env

# Test connectivity
docker exec backend_stag curl localhost:8000/api/health/
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Monitor database queries
docker exec postgres pg_stat_activity

# Check Redis memory
docker exec redis redis-cli info memory
```

#### Network Issues
```bash
# Check service connectivity
docker network ls
docker network inspect npa-ecm-stag

# Test inter-service communication
docker exec backend_stag ping frontend_stag
```

## 🎯 Future Enhancements

- [ ] **Production Deployment Automation**
- [ ] **Blue-Green Deployment Strategy**
- [ ] **Database Migration Automation**
- [ ] **Advanced Monitoring with ELK Stack**
- [ ] **Container Orchestration with Kubernetes**
- [ ] **Automated Testing with Cypress**
- [ ] **Performance Regression Testing**
- [ ] **Security Scanning Integration**

---

## 📞 Support

For CI/CD pipeline issues:
1. Check GitHub Actions logs
2. Review deployment scripts output
3. Verify environment configuration
4. Contact DevOps team

**Last Updated:** October 22, 2025
