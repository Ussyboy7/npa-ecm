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
- PostgreSQL 15+
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
- Next.js 15
- TypeScript
- Tailwind CSS
- Shadcn/ui Components
- Zustand (State Management)
- Axios

## 📦 Installation

### Method 1: Docker (Recommended)

1. **Clone the repository**
```bash
cd npa-dms
```

2. **Configure environment variables**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your settings
```

3. **Run with Docker Compose**
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

4. **Create superuser**
```bash
docker exec -it dms-backend-dev python manage.py createsuperuser
```

5. **Access the applications**
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000/api
- API Docs: http://localhost:8000/api/docs
- Admin Panel: http://localhost:8000/admin

### Method 2: Manual Installation

#### Backend Setup

1. **Create virtual environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure database**
```bash
# Create PostgreSQL database
createdb dms_db

# Update backend/.env with database credentials
```

4. **Run migrations**
```bash
python manage.py migrate
```

5. **Create superuser**
```bash
python manage.py createsuperuser
```

6. **Start development server**
```bash
python manage.py runserver 8000
```

7. **Start Celery worker (in new terminal)**
```bash
celery -A dms worker -l info
```

8. **Start Celery beat (in new terminal)**
```bash
celery -A dms beat -l info
```

#### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with API URL
```

3. **Run development server**
```bash
npm run dev
```

4. **Access application**
- Frontend: http://localhost:3001

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Django
DJANGO_ENV=local
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=dms_db
DB_USER=dmsadmin
DB_PASSWORD=dmsadmin
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Celery
CELERY_BROKER_URL=redis://127.0.0.1:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3001

# Storage (Optional - S3/MinIO)
USE_S3=False
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=dms-documents
AWS_S3_ENDPOINT_URL=http://localhost:9000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
PORT=3001
```

## 📚 API Documentation

- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

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
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

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







