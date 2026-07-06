"""Lightweight Prometheus metrics endpoint (no django-prometheus dependency)."""

from __future__ import annotations

import time

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import HttpResponse

_START_TIME = time.time()


def _line(name: str, value: float | int, labels: str = "") -> str:
    suffix = f"{{{labels}}}" if labels else ""
    return f"{name}{suffix} {value}"


def prometheus_metrics(request) -> HttpResponse:
    """Expose basic service health gauges for Prometheus scraping."""
    lines: list[str] = []

    db_up = 0
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        db_up = 1
    except Exception:
        pass
    lines.append(_line("ecm_database_up", db_up))

    cache_up = 0
    try:
        cache.set("metrics_probe", "1", 5)
        if cache.get("metrics_probe") == "1":
            cache_up = 1
    except Exception:
        pass
    lines.append(_line("ecm_cache_up", cache_up))

    broker_up = 0
    try:
        import redis

        broker_url = getattr(settings, "CELERY_BROKER_URL", "")
        if broker_url.startswith("redis://"):
            client = redis.from_url(broker_url, socket_connect_timeout=2, socket_timeout=2)
            if client.ping():
                broker_up = 1
    except Exception:
        pass
    lines.append(_line("ecm_celery_broker_up", broker_up))

    lines.append(_line("ecm_uptime_seconds", int(time.time() - _START_TIME)))

    body = "\n".join(lines) + "\n"
    return HttpResponse(body, content_type="text/plain; version=0.0.4; charset=utf-8")
