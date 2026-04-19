#!/usr/bin/env bash

# Quick script to check backend service status

echo "=== Backend Container Status ==="
docker ps | grep backend_stag || echo "❌ Backend container not running"

echo ""
echo "=== Backend Container Logs (last 50 lines) ==="
docker logs --tail 50 ecm-backend-stag 2>&1 | tail -50

echo ""
echo "=== Backend Health Check ==="
curl -s http://172.16.0.46:4646/api/health/ || echo "❌ Health check failed"

echo ""
echo "=== Database Connection Test ==="
docker exec ecm-postgres-stag psql -U ecmadmin -d npa_ecm_stag -c "SELECT COUNT(*) as user_count FROM accounts_user;" 2>&1

echo ""
echo "=== Nginx Status ==="
docker ps | grep nginx_stag || echo "❌ Nginx container not running"

echo ""
echo "=== All Container Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|ecm-"

