"""Celery application definition for the ECM backend."""

import os

from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ecm_backend.settings")

app = Celery("ecm_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


