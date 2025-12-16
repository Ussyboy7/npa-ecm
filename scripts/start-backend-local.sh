#!/usr/bin/env bash
# Start backend server locally with Daphne (supports WebSockets)
# This is for local development without Docker

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"

cd "${BACKEND_DIR}"

# Activate virtual environment if it exists
if [[ -d ".venv" ]]; then
    source .venv/bin/activate
elif [[ -d "venv" ]]; then
    source venv/bin/activate
fi

# Check if daphne is installed
if ! command -v daphne &> /dev/null; then
    echo "Error: daphne is not installed. Installing..."
    pip install daphne>=4.0
fi

# Load environment variables from local.env if it exists
if [[ -f "env/local.env" ]]; then
    set -a
    source env/local.env
    set +a
fi

# Set default port if not set
export PORT="${PORT:-8002}"

echo "Starting backend server with Daphne on port ${PORT}..."
echo "  - Supports HTTP and WebSocket connections"
echo "  - WebSocket endpoint: ws://localhost:${PORT}/ws/notifications/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Daphne
daphne -b 0.0.0.0 -p "${PORT}" ecm_backend.asgi:application

