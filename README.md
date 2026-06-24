# NPA Electronic Content Management System (ECM)

A modern, full-featured electronic content management system (ECM) built with Django REST Framework and Next.js.

## 🚀 Features

### Core Features
- **Document Upload & Management** - Upload, organize, and manage documents with version control
- **Category Organization** - Hierarchical folder structure for document organization
- **Advanced Search** - Full-text search with filters and tags
- **Version Control** - Track document versions and changes
- **Access Control** - Role-based permissions and document sharing
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

#### Authentication
- `POST /api/auth/login/` - Login
- `POST /api/auth/refresh/` - Refresh token

#### Documents
- `GET /api/documents/` - List documents
- `POST /api/documents/` - Create document
- `GET /api/documents/{id}/` - Get document
- `PATCH /api/documents/{id}/` - Update document
- `DELETE /api/documents/{id}/` - Delete document
- `POST /api/documents/{id}/approve/` - Approve document
- `POST /api/documents/{id}/reject/` - Reject document
- `POST /api/documents/{id}/download/` - Download document

#### Categories
- `GET /api/categories/` - List categories
- `POST /api/categories/` - Create category

#### Users
- `GET /api/users/` - List users
- `POST /api/users/` - Create user

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
- **[🧩 Component Reference](./docs/components/COMPONENTS_REFERENCE.md)**: Technical documentation for all components
- **[👤 User Guides](./docs/user-guides/USER_GUIDES.md)**: Step-by-step guides for end users
- **[🔌 API Reference](./docs/api/API_REFERENCE.md)**: Complete API documentation and examples

### Key Features Recently Added

#### Completion Summary Modal
- View comprehensive completion details for correspondence
- Document preview with full content rendering
- Process timeline and statistics
- Export and sharing capabilities

#### Actions Panel
- Dynamic, context-aware action buttons
- Permission-based UI customization
- Delegation management and tracking
- Status indicators and workflow guidance

#### Document Upload System
- Advanced file upload with validation
- Version control and management
- Progress tracking and error recovery
- Support for multiple file formats (PDF, Word, Excel, etc.)

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
