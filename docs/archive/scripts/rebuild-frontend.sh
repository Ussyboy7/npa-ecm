#!/bin/bash
# Rebuild frontend without cache to pick up new environment variables
cd /srv/npa-ecm
docker compose -f docker-compose.stag.yml build --no-cache frontend_stag
docker compose -f docker-compose.stag.yml up -d frontend_stag
docker compose -f docker-compose.stag.yml restart nginx_stag
echo "✅ Frontend rebuilt and services restarted"
