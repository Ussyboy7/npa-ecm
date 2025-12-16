#!/usr/bin/env bash
# Start all backend services for local development
# This starts both the backend server (Daphne) and Celery worker

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting ECM Backend Services for Local Development${NC}"
echo ""

# Check if Redis is running
if ! redis-cli ping &>/dev/null; then
    echo -e "${YELLOW}Warning: Redis is not running. Starting Redis...${NC}"
    if command -v brew &> /dev/null; then
        brew services start redis || redis-server --daemonize yes
    else
        echo -e "${YELLOW}Please start Redis manually: redis-server${NC}"
    fi
    sleep 2
fi

# Check Redis connection
if redis-cli ping &>/dev/null; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠ Redis connection failed. Some features may not work.${NC}"
fi

echo ""
echo -e "${BLUE}Starting services in background...${NC}"
echo ""

# Start backend server in background
echo -e "${BLUE}1. Starting backend server (Daphne)...${NC}"
"${SCRIPT_DIR}/start-backend-local.sh" &
BACKEND_PID=$!
echo -e "${GREEN}   Backend server started (PID: $BACKEND_PID)${NC}"

# Wait a bit for backend to start
sleep 3

# Start Celery worker in background
echo -e "${BLUE}2. Starting Celery worker...${NC}"
"${SCRIPT_DIR}/start-celery-local.sh" &
CELERY_PID=$!
echo -e "${GREEN}   Celery worker started (PID: $CELERY_PID)${NC}"

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""
echo "Services:"
echo "  - Backend (Daphne): http://localhost:8002"
echo "  - WebSocket: ws://localhost:8002/ws/notifications/"
echo "  - Celery Worker: Processing async tasks"
echo ""
echo "To stop all services:"
echo "  pkill -f 'daphne.*ecm_backend'"
echo "  pkill -f 'celery.*ecm_backend'"
echo ""
echo "Or press Ctrl+C to stop this script (services will continue running)"

# Wait for user interrupt
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $CELERY_PID 2>/dev/null; exit" INT TERM

# Keep script running
wait

