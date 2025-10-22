# Manual Deployment Guide - NPA ECM

Since the server is on a private network, automated deployment from GitHub Actions is not possible. Use this guide to deploy manually.

## Prerequisites

- SSH access to your server (`172.16.0.46`)
- Docker and Docker Compose installed on the server
- Git installed on the server

## Deployment Steps

### 1. Connect to Server

```bash
ssh user@172.16.0.46  # Replace 'user' with your actual username
```

### 2. Navigate to Deployment Directory

```bash
cd /opt/npa-ecm/staging
```

### 3. Pull Latest Code

```bash
# If using git
git pull origin main

# Or if deploying manually, copy files from your local machine
# scp -r /path/to/npa-ecm user@172.16.0.46:/opt/npa-ecm/staging/
```

### 4. Run Deployment Script

```bash
# Make script executable (first time only)
chmod +x scripts/deploy-staging.sh

# Run deployment
./scripts/deploy-staging.sh
```

### 5. Verify Deployment

The script will automatically check service health. Once complete, your application will be available at:

- **Frontend**: http://172.16.0.46:4646
- **Backend API**: http://172.16.0.46:8001/api/
- **Admin Panel**: http://172.16.0.46:8001/admin/
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
netstat -tlnp | grep :8001
```

2. Stop conflicting services and try again.

## Alternative Deployment Options

### Option 1: Self-Hosted GitHub Runner
Set up a GitHub Actions runner on your private network that can access `172.16.0.46`.

### Option 2: Cloud Deployment
Deploy to a cloud provider (AWS, GCP, Azure) with public IP for automated CI/CD.

### Option 3: VPN Setup
Configure a VPN to allow GitHub Actions to access your private network.

## Current CI/CD Status

The CI/CD pipeline now only builds and tests the code. Deployment must be done manually using this guide.
