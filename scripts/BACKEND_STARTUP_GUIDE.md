# Backend Server Startup Guide

The ECM backend now uses **Daphne** (ASGI server) instead of `runserver` to support WebSocket connections for real-time notifications and document collaboration.

## Quick Start

### Local Development (Non-Docker)

**Start All Services (Backend + Celery):**
```bash
# Start both backend (Daphne) and Celery worker together
./scripts/start-local.sh
```

**Or start individually:**
```bash
# Start backend with Daphne (supports WebSockets)
./scripts/start-backend-local.sh

# Start Celery worker in a separate terminal
./scripts/start-celery-local.sh
```

This will:
- **Backend**: Activate the virtual environment, load environment variables from `backend/env/local.env`, start Daphne on port 8002 (default), support both HTTP and WebSocket connections
- **Celery Worker**: Process async tasks like OCR processing, batch uploads, webhook deliveries, etc.

### Staging (Non-Docker)

**Start All Services (Backend + Celery):**
```bash
# Start both backend (Daphne) and Celery worker together
./scripts/start-stag.sh
```

**Or start individually:**
```bash
# Start backend on staging server
./scripts/start-backend-stag.sh

# Start Celery worker in a separate terminal/process
./scripts/start-celery-stag.sh
```

This will:
- **Backend**: Run migrations, collect static files, start Daphne on port 8000 (default, configurable via env)
- **Celery Worker**: Process async tasks (OCR, batch uploads, etc.)

### Production (Non-Docker)

**Start All Services (Backend + Celery):**
```bash
# Start both backend (Daphne) and Celery worker together
./scripts/start-prod.sh
```

**Or start individually:**
```bash
# Start backend in production
./scripts/start-backend-prod.sh

# Start Celery worker in a separate terminal/process (use systemd/supervisor in production)
./scripts/start-celery-prod.sh
```

This will:
- **Backend**: Run migrations, collect static files, start Daphne with access logging
- **Celery Worker**: Process async tasks (OCR, batch uploads, etc.)

**Note**: In production, you should use a process manager like `systemd` or `supervisor` to keep Celery workers running and restart them automatically.

## Docker Compose

### Local Development

```bash
# Start entire stack (includes backend with Daphne and Celery workers)
./scripts/ecm up local
```

The stack includes:
- **Backend**: Uses Daphne automatically (configured in `backend/Dockerfile`)
- **Celery Worker**: Processes async tasks (configured in `docker-compose.local.yml`)
- **Celery Beat**: Runs scheduled tasks (configured in `docker-compose.local.yml`)

### Staging

```bash
# Start staging stack
./scripts/ecm up stag
```

The stack includes:
- **Backend**: Uses Daphne automatically (configured in `backend/Dockerfile.prod`)
- **Celery Worker**: Processes async tasks (configured in `docker-compose.stag.yml`)
- **Celery Beat**: Runs scheduled tasks (configured in `docker-compose.stag.yml`)

### Production

```bash
# Start production stack
./scripts/ecm up prod
```

The stack includes:
- **Backend**: Uses Daphne automatically (configured in `backend/Dockerfile.prod`)
- **Celery Worker**: Processes async tasks (configured in `docker-compose.prod.yml`)
- **Celery Beat**: Runs scheduled tasks (configured in `docker-compose.prod.yml`)

## Manual Start (if needed)

If you need to start Daphne manually:

```bash
cd backend
source .venv/bin/activate  # or: source venv/bin/activate

# Load environment variables
source env/local.env  # or env/stag.env or env/prod.env

# Start Daphne
daphne -b 0.0.0.0 -p 8002 ecm_backend.asgi:application
```

## Port Configuration

- **Local**: Port 8002 (configurable via `PORT` env var or `backend/env/local.env`)
- **Staging**: Port 8000 (configurable via `PORT` env var or `backend/env/stag.env`)
- **Production**: Port 8000 (configurable via `PORT` env var or `backend/env/prod.env`)

## WebSocket Endpoints

Once the server is running with Daphne, WebSocket connections are available at:

- Notifications: `ws://localhost:PORT/ws/notifications/?token=YOUR_JWT_TOKEN`
- Document Collaboration: `ws://localhost:PORT/ws/dms/`

## Required Services

For the ECM system to work fully, you need:

1. **Backend Server** (Daphne) - Handles HTTP and WebSocket requests
2. **Celery Worker** - Processes async tasks (OCR, batch uploads, webhooks)
3. **Redis** - Required for Celery broker and cache
4. **PostgreSQL** - Database
5. **Frontend** - Next.js application

### Starting All Services (Local Development)

**Option 1: Combined Script (Recommended)**
```bash
# Start both backend and Celery together
./scripts/start-local.sh

# Terminal 2: Frontend (if not using Docker)
cd frontend && npm run dev
```

**Option 2: Individual Scripts**
```bash
# Terminal 1: Backend Server
./scripts/start-backend-local.sh

# Terminal 2: Celery Worker
./scripts/start-celery-local.sh

# Terminal 3: Frontend (if not using Docker)
cd frontend && npm run dev
```

**Option 3: Docker Compose**
```bash
# Start everything with Docker
./scripts/ecm up local
```

## Troubleshooting

### Daphne not found

If you get "daphne: command not found", install it:

```bash
pip install daphne>=4.0
```

### Celery not found

If you get "celery: command not found", install it:

```bash
pip install celery>=5.3.0
```

### OCR tasks stuck in "Pending"

If OCR processing stays in "Pending" status:
1. **Check if Celery worker is running**: `ps aux | grep celery`
2. **Start Celery worker**: `./scripts/start-celery-local.sh`
3. **Check Redis is running**: `redis-cli ping` (should return "PONG")
4. **Check worker logs** for errors

### Tasks not processing

If async tasks aren't being processed:
1. Ensure Redis is running and accessible
2. Ensure Celery worker is running
3. Check Celery worker logs for errors
4. Verify `CELERY_BROKER_URL` in your environment file points to Redis

### Port already in use

If the port is already in use, either:
1. Stop the existing process: `pkill -f daphne` or `pkill -f "manage.py runserver"`
2. Change the port in your environment file or use: `PORT=8003 ./scripts/start-backend-local.sh`

### WebSocket connection fails

Ensure:
1. Backend is running with Daphne (not `runserver`)
2. Redis is running (required for WebSocket channels)
3. Frontend is configured to use the correct WebSocket URL

## Differences from runserver

| Feature | runserver | Daphne |
|---------|-----------|--------|
| HTTP requests | ✅ | ✅ |
| WebSocket support | ❌ | ✅ |
| Production ready | ❌ | ✅ |
| ASGI support | ❌ | ✅ |
| Real-time features | ❌ | ✅ |

## Migration from runserver

If you were previously using `runserver`, simply use the new scripts:

**Before:**
```bash
python manage.py runserver 0.0.0.0:8002
```

**After:**
```bash
./scripts/start-backend-local.sh
```

Or with Docker Compose, the change is automatic - just rebuild your containers.

