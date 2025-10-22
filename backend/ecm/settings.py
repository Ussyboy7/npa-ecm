"""
Django settings for ECM (Electronic Content Management) project.

Enhanced with:
- Environment-based configuration
- PostgreSQL database with full-text search
- Redis for caching and Channels
- Celery for async tasks (OCR, email, retention)
- Local file storage with OCR processing
- JWT authentication with role-based access
- API documentation with drf-spectacular
- Workflow engine for document approval
- Email-to-ECM integration
- Tesseract OCR support
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
DJANGO_ENV = os.environ.get('DJANGO_ENV', 'local')
env_file = f'.env.{DJANGO_ENV}'
env_path = BASE_DIR / env_file

if not env_path.exists():
    env_path = BASE_DIR / '.env'

load_dotenv(env_path)

# Security
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "ecm-dev-secret-key-change-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third party apps
    "rest_framework",
    "corsheaders",
    "django_filters",
    # "drf_spectacular",  # Temporarily commented out
    # "django_celery_beat",  # Temporarily commented out
    # "django_celery_results",  # Temporarily commented out
    
    # Local apps
    "ecm_core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# CORS Settings
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", 
    "http://localhost:3001,http://127.0.0.1:3001"
).split(",")
CORS_ALLOW_ALL_ORIGINS = os.environ.get("CORS_ALLOW_ALL_ORIGINS", "False").lower() == "true"
CORS_ALLOW_CREDENTIALS = True

# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Spectacular Settings (API Documentation)
SPECTACULAR_SETTINGS = {
    "TITLE": "NPA Electronic Content Management API",
    "DESCRIPTION": "API documentation for ECM",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

ROOT_URLCONF = "ecm.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "ecm.wsgi.application"
ASGI_APPLICATION = "ecm.asgi.application"

# Database - Temporarily using SQLite for quick testing
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
# TODO: Switch back to PostgreSQL when ready
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.environ.get("DB_NAME", "ecm_db"),
#         "USER": os.environ.get("DB_USER", "ecmadmin"),
#         "PASSWORD": os.environ.get("DB_PASSWORD", "ecmadmin"),
#         "HOST": os.environ.get("DB_HOST", "localhost"),
#         "PORT": os.environ.get("DB_PORT", "5432"),
#         "OPTIONS": {
#             "options": "-c default_text_search_config=english"
#         }
#     }
# }

# Redis & Channels Configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(
                os.environ.get("REDIS_HOST", "127.0.0.1"), 
                int(os.environ.get("REDIS_PORT", 6379))
            )],
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Africa/Lagos"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files (User uploads)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB for larger documents
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB

# Storage Configuration (Local File Storage)
# Using local file storage on physical server
# All files stored in MEDIA_ROOT directory

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User Model
AUTH_USER_MODEL = "ecm_core.User"

# JWT Configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# Security settings for production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "class": "logging.FileHandler",
            "filename": BASE_DIR / "logs" / "ecm.log",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.environ.get("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "ecm_core": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# Create logs directory
(BASE_DIR / "logs").mkdir(exist_ok=True)

# OCR Configuration
TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "/usr/bin/tesseract")
OCR_LANGUAGES = os.environ.get("OCR_LANGUAGES", "eng").split(",")

# Email-to-ECM Configuration
EMAIL_ECM_ENABLED = os.environ.get("EMAIL_ECM_ENABLED", "True").lower() == "true"
EMAIL_MONITOR_INTERVAL = int(os.environ.get("EMAIL_MONITOR_INTERVAL", "300"))  # 5 minutes

# Document Processing
SUPPORTED_DOCUMENT_FORMATS = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
    'jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp'
]

# Workflow Settings
WORKFLOW_TIMEOUT_DAYS = int(os.environ.get("WORKFLOW_TIMEOUT_DAYS", "7"))
WORKFLOW_ESCALATION_DAYS = int(os.environ.get("WORKFLOW_ESCALATION_DAYS", "3"))

# Retention Policy Settings
RETENTION_CHECK_INTERVAL = int(os.environ.get("RETENTION_CHECK_INTERVAL", "86400"))  # 24 hours
DEFAULT_RETENTION_YEARS = int(os.environ.get("DEFAULT_RETENTION_YEARS", "7"))

# Full-text Search Configuration
USE_FULLTEXT_SEARCH = os.environ.get("USE_FULLTEXT_SEARCH", "True").lower() == "true"


