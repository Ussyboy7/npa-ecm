#!/bin/bash

# Diagnostic script to check staging services

echo "=== Checking Docker Containers ==="
docker ps --filter "name=ecm-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Checking Nginx Logs ==="
docker logs ecm-nginx-stag --tail 20

echo ""
echo "=== Checking Backend Health ==="
docker exec ecm-backend-stag curl -s http://localhost:8000/api/health/ || echo "Backend not responding on port 8000"

echo ""
echo "=== Checking Frontend Health ==="
docker exec ecm-frontend-stag curl -s http://localhost:3000/ | head -5 || echo "Frontend not responding on port 3000"

echo ""
echo "=== Checking Nginx Configuration ==="
docker exec ecm-nginx-stag nginx -t

echo ""
echo "=== Testing Nginx Connectivity to Backend ==="
docker exec ecm-nginx-stag ping -c 2 backend_stag || echo "Cannot reach backend_stag"

echo ""
echo "=== Testing Nginx Connectivity to Frontend ==="
docker exec ecm-nginx-stag ping -c 2 frontend_stag || echo "Cannot reach frontend_stag"

echo ""
echo "=== Checking Docker Network ==="
docker network ls | grep ecm
docker inspect ecm-nginx-stag | grep -A 10 "Networks"

echo ""
echo "=== Checking Media Files ==="
ls -la /srv/npa-ecm/backend/media/ | head -10 || echo "Media directory not found or empty"

echo ""
echo "=== Checking Backend Logs (last 20 lines) ==="
docker logs ecm-backend-stag --tail 20

echo ""
echo "=== Checking Frontend Logs (last 20 lines) ==="
docker logs ecm-frontend-stag --tail 20

