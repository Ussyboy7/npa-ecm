"""Test settings — Postgres test DB, in-memory Channels/Celery."""

from .settings import *  # noqa: F403
import os

DATABASES["default"]["TEST"] = {  # noqa: F405
    "NAME": os.getenv("TEST_DB_NAME", "test_npa_ecm_db"),
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
