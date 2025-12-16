#!/usr/bin/env bash
# Start backend server on staging with Daphne (supports WebSockets)
# This is for staging server without Docker

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

# Load environment variables from stag.env
if [[ -f "env/stag.env" ]]; then
    set -a
    source env/stag.env
    set +a
else
    echo "Warning: env/stag.env not found. Using default environment variables."
fi

# Set default port if not set
export PORT="${PORT:-8000}"

echo "Starting backend server with Daphne on port ${PORT} (staging)..."
echo "  - Supports HTTP and WebSocket connections"
echo "  - WebSocket endpoint: ws://localhost:${PORT}/ws/notifications/"
echo ""

# Run migrations first
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start Daphne
echo "Starting Daphne server..."
daphne -b 0.0.0.0 -p "${PORT}" ecm_backend.asgi:application

