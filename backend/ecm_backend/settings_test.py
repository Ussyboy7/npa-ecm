"""Test settings — Postgres test DB, in-memory cache/Channels/Celery."""

from .settings import *  # noqa: F403
import os

DATABASES["default"]["TEST"] = {  # noqa: F405
    "NAME": os.getenv("TEST_DB_NAME", "test_npa_ecm_db"),
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-cache",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "django-cache"
CELERY_TASK_ALWAYS_EAGER = True
