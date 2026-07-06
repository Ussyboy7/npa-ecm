# NPA Electronic Content Management System (ECM)

A modern, full-featured electronic content management system (ECM) built with Django REST Framework and Next.js.

## 🚀 Features

### Core Features
- **Document Upload & Management** - Upload, organize, and manage documents with version control
- **Category Organization** - Hierarchical folder structure for document organization
- **Advanced Search** - Full-text search with optional semantic re-rank (MVP)
- **Version Control** - Track document versions, diff viewer
- **Access Control** - Role-based permissions, DRM policy layer, document sharing
- **Approval Workflows** - Customizable document approval processes
- **Audit Trail** - Comprehensive logging of all document activities
- **Document Preview** - Built-in preview for various file types
- **Bulk Operations** - Upload, download, and manage multiple documents

### Technical Features
- **RESTful API** - Well-documented API with Swagger/OpenAPI
- **Async Processing** - Celery for background tasks (OCR, thumbnails, etc.)
- **WebSocket Support** - Real-time notifications via Django Channels
- **S3/MinIO Storage** - Scalable cloud storage support
- **PostgreSQL** - Robust relational database
- **Redis** - Caching and message broker
- **Docker** - Containerized deployment

## 📋 Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

## 🛠️ Technology Stack

### Backend
- Django 4.2
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- Channels (WebSocket)
- JWT Authentication

### Frontend
- Next.js 16
- TypeScript
- Tailwind CSS
- Shadcn/ui Components
- Native fetch via `lib/api-client.ts`

## 📦 Installation

### Method 1: Docker (Recommended)

1. **Clone and enter the repository**
```bash
cd npa-ecm
```

2. **Configure environment**
```bash
cp backend/env/local.env.example backend/env/local.env
# Edit backend/env/local.env
```

3. **Start the local stack**
```bash
scripts/local/env-manager.sh start
# or: docker compose up -d
```

4. **Seed demo data (optional)**
```bash
scripts/local/env-manager.sh seed
```

Dev login users (`superadmin`, `md`, `edfa`, `gmict`, `pamd` / `ChangeMe123!`) are created automatically on backend start via `ensure_dev_login_users`.

5. **Access the applications**
- Frontend: http://localhost:3002
- Backend API: http://localhost:8002/api/v1
- API docs: http://localhost:8002/api/docs
- Admin: http://localhost:8002/admin
- Health (liveness): http://localhost:8002/api/v1/health/live/

### Method 2: Manual Installation

Prefer Docker (Method 1). For bare-metal dev:

#### Backend Setup

```bash
make backend-install          # creates backend/.venv + installs deps
cp backend/env/local.env.example backend/env/local.env
make backend-migrate
make backend-seed             # optional demo data
make backend-run              # http://localhost:8002
```

Celery (separate terminals, from repo root with venv active):

```bash
backend/.venv/bin/celery -A ecm_backend worker -l info
backend/.venv/bin/celery -A ecm_backend beat -l info
```

#### Frontend Setup

```bash
cd frontend && npm install
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
npm run dev                   # http://localhost:3002
```

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/env/local.env`)

See `backend/env/local.env.example`. Key values for local Docker:

```env
DB_NAME=npa_ecm_local
DB_USER=ecmadmin
DB_PASSWORD=ecmadmin
DB_HOST=postgres        # localhost when running manage.py on host
DB_PORT=5432            # 5433 on host → mapped postgres container
CORS_ALLOWED_ORIGINS=http://localhost:3002
```

#### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
PORT=3002
```

## 📚 API Documentation

- Swagger UI: http://localhost:8002/api/docs/
- ReDoc: http://localhost:8002/api/redoc/
- OpenAPI Schema: http://localhost:8002/api/schema/
- Liveness: http://localhost:8002/api/v1/health/live/

### Key Endpoints

All routes use the `/api/v1/` prefix. See [API Reference](./docs/api/API_REFERENCE.md) and Swagger UI for the full list.

#### Authentication
- `POST /api/v1/accounts/auth/token/` - Login (JWT)
- `POST /api/v1/accounts/auth/token/refresh/` - Refresh token

#### Documents (DMS)
- `GET /api/v1/dms/documents/` - List documents
- `GET /api/v1/dms/document-versions/{id}/diff/` - Version diff

#### Search
- `GET /api/v1/search/` - Unified search (`search_mode=semantic` for MVP re-rank)

#### Audit & records
- `GET /api/v1/audit/activity-logs/compliance-export/` - Tamper-evident audit bundle
- `GET /api/v1/records/legal-holds/{id}/ediscovery-export/` - Legal hold ZIP

## 🚢 Deployment

### Production Checklist

1. **Security**
   - Change `DJANGO_SECRET_KEY`
   - Set `DJANGO_DEBUG=False`
   - Update `ALLOWED_HOSTS`
   - Configure HTTPS
   - Set secure cookies

2. **Database**
   - Use production PostgreSQL
   - Configure backups
   - Set strong passwords

3. **Storage**
   - Configure S3/MinIO for media files
   - Set up CDN for static files

4. **Performance**
   - Configure caching
   - Set up load balancer
   - Optimize database queries

5. **Monitoring**
   - Set up logging
   - Configure error tracking (Sentry)
   - Monitor Celery tasks

### Docker Production Deployment

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🧪 Testing

```bash
# Full suite (Postgres required on localhost:5433 for host runs)
make test

# Or individually
make test-backend
make test-frontend

# Mirror CI locally
make ci
```

Backend tests use `ecm_backend.settings_test` (Postgres test DB, in-memory Channels/Celery). See `AGENTS.md` and `backend/README.md`.

## 📝 Development

### Code Style

```bash
# Backend
black .
isort .
flake8

# Frontend
npm run lint
npm run format
```

### Pre-commit Hooks

```bash
pip install pre-commit
pre-commit install
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📚 Documentation

Complete documentation is available in the `docs/` directory:

- **[📖 Documentation Home](./docs/README.md)**: Overview and navigation guide
- **[📋 Remaining Work Backlog](./docs/procurement/REMAINING_WORK_BACKLOG.md)**: P0/P1/P2 status (Phase 9–11 MVPs, AI deferred)
- **[🧩 Component Reference](./docs/components/COMPONENTS_REFERENCE.md)**: Technical documentation for all components
- **[👤 User Guides](./docs/user-guides/USER_GUIDES.md)**: Step-by-step guides for end users
- **[🔌 API Reference](./docs/api/API_REFERENCE.md)**: Complete API documentation and examples
- **[🚀 Quick Start](./docs/guides/QUICK_START.md)**: Docker stack, routes, dev login

## 📄 License

This project is proprietary software of NPA.

## 🆘 Support

For support, email support@npa.com or contact the development team.

## 👥 Authors

- NPA Development Team

## 🙏 Acknowledgments

- Built with Django and Next.js
- UI components from Shadcn/ui
- Icons from Lucide React







# NPA ECM System - Deployed Wed Oct 22 17:08:02 WAT 2025
