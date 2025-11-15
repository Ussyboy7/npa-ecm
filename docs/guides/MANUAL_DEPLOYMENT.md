# Deployment Guide - NPA ECM

This guide covers both **automated deployment** (recommended) using the self-hosted GitHub Actions runner and **manual deployment** as a fallback option.

## Automated Deployment (Recommended)

With the self-hosted GitHub Actions runner installed on your server, deployments are now **fully automated**:

### How It Works
1. Push code changes to the `main` branch
2. GitHub Actions automatically runs quality checks (linting, testing, building)
3. The self-hosted runner on your server performs the deployment
4. Services are updated and health checks are performed
5. Performance testing runs against the staging environment

### Current Status
- ✅ **Quality Assurance**: Linting, type checking, and building
- ✅ **Docker Image Building**: Frontend and backend images
- ✅ **Staging Deployment**: Automated deployment to `/srv/npa-ecm`
- ✅ **Health Checks**: Automatic testing of all services
- ✅ **Performance Testing**: K6 load testing on staging
- ✅ **Notifications**: Slack notifications on deployment status

### Access URLs
- **Frontend**: http://172.16.0.46:4646
- **Backend API**: http://172.16.0.46:4646/api/
- **Admin Panel**: http://172.16.0.46:4646/admin/
- **Grafana**: http://172.16.0.46:3002 (admin/staging_admin_2024)
- **Prometheus**: http://172.16.0.46:9091

### Triggering Deployment
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The CI/CD pipeline will automatically handle the rest!

## Manual Deployment (Fallback)

If automated deployment fails, use this manual deployment process:

## Prerequisites

- SSH access to your server (`172.16.0.46`)
- Docker and Docker Compose installed on the server
- Git installed on the server

## Deployment Steps

### 1. Connect to Server

```bash
ssh user@172.16.0.46  # Replace 'user' with your actual username
```

### 2. Navigate to Project Directory

```bash
cd /srv/npa-ecm
```

### 3. Pull Latest Code

```bash
git pull origin main
```

### 4. Run Deployment Script

```bash
# Make script executable (first time only)
chmod +x scripts/deploy-staging.sh

# Run deployment
./scripts/deploy-staging.sh
```

### Alternative: Direct Docker Commands

If you prefer to run commands directly:

```bash
cd /srv/npa-ecm

# Stop existing containers
docker compose -f docker-compose.stag.yml down

# Clean up
docker image prune -f

# Start services
docker compose -f docker-compose.stag.yml up -d --build

# Check status
docker compose -f docker-compose.stag.yml ps
```

### 5. Verify Deployment

The script will automatically check service health. Once complete, your application will be available at:

- **Frontend**: http://172.16.0.46:4646
- **Backend API**: http://172.16.0.46:4646/api/
- **Admin Panel**: http://172.16.0.46:4646/admin/
- **Grafana**: http://172.16.0.46:3002 (admin/staging_admin_2024)
- **Prometheus**: http://172.16.0.46:9091

## Troubleshooting

### If deployment fails:

1. Check Docker logs:
```bash
docker compose -f docker-compose.stag.yml logs
```

2. Check specific service logs:
```bash
docker compose -f docker-compose.stag.yml logs backend_stag
docker compose -f docker-compose.stag.yml logs frontend_stag
```

3. Restart services:
```bash
docker compose -f docker-compose.stag.yml restart
```

### If services don't start:

1. Check if ports are available:
```bash
netstat -tlnp | grep :4646
netstat -tlnp | grep :4646
```

2. Stop conflicting services and try again.

## Alternative Deployment Options

### Option 1: Cloud Deployment
Deploy to a cloud provider (AWS, GCP, Azure) with public IP for automated CI/CD.

### Option 2: VPN Setup
Configure a VPN to allow GitHub Actions to access your private network.

### Option 3: Multiple Self-hosted Runners
Set up additional runners for different environments (staging, production).

## Current CI/CD Status

✅ **Automated Deployment Active**: Self-hosted runner enables full CI/CD pipeline
- Quality assurance, building, deployment, testing, and monitoring all automated
- Deployments triggered by pushes to `main` branch
- Manual deployment available as fallback option

## Self-hosted Runner Information

The GitHub Actions self-hosted runner is installed at `/srv/npa-ecm` and runs all deployment jobs locally on the server. This provides:

- Direct access to Docker and system resources
- No network restrictions for private deployments
- Faster deployments (no file transfers needed)
- Secure execution within your infrastructure
