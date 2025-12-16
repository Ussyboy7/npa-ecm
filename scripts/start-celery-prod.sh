#!/usr/bin/env bash
# Start Celery worker and beat for production
# This processes async tasks like OCR, batch uploads, etc.

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

# Check if celery is installed
if ! command -v celery &> /dev/null; then
    echo "Error: celery is not installed. Installing..."
    pip install celery>=5.3.0
fi

# Load environment variables from prod.env
if [[ -f "env/prod.env" ]]; then
    set -a
    source env/prod.env
    set +a
else
    echo "Error: env/prod.env not found. Cannot start production worker."
    exit 1
fi

echo "Starting Celery worker for production..."
echo "  - Processing async tasks (OCR, batch uploads, etc.)"
echo "  - Requires Redis to be running"
echo ""

# Start Celery worker
celery -A ecm_backend worker --loglevel=info

