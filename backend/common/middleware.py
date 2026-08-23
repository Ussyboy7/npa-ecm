"""Custom middleware for the ECM application."""

from __future__ import annotations

import time
from typing import Callable

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse
from django.core.exceptions import DisallowedHost
from django.utils import timezone
from django.db import transaction


class InternalHostMiddleware:
    """
    Middleware to allow internal Docker hostnames with ports for metrics endpoints.
    
    This handles cases where Prometheus or other internal services access the backend
    using Docker service names like 'backend_stag:8000', which Django rejects because
    ALLOWED_HOSTS doesn't allow ports in hostnames.
    
    For internal requests (especially metrics), we extract just the hostname part.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Check if this is an internal metrics request
        if request.path.startswith('/api/metrics/'):
            # Extract hostname without port for internal Docker requests
            host = request.get_host()
            if ':' in host:
                hostname = host.split(':')[0]
                # If it's an internal Docker service name, use just the hostname
                if hostname in ['backend_stag', 'backend', 'localhost', '127.0.0.1']:
                    # Temporarily modify the request's META to use hostname only
                    original_host = request.META.get('HTTP_HOST', '')
                    request.META['HTTP_HOST'] = hostname
                    try:
                        response = self.get_response(request)
                        return response
                    finally:
                        # Restore original host
                        if original_host:
                            request.META['HTTP_HOST'] = original_host

        return self.get_response(request)


class UserActivityMiddleware:
    """
    Middleware to track user activity.
    Updates last_activity timestamp for authenticated users on each request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Only track activity for authenticated users
        if request.user.is_authenticated:
            # Update last_activity asynchronously to avoid blocking
            # Use update() to avoid triggering signals and save queries
            try:
                # Only update if more than 1 minute has passed since last update
                # This reduces database writes
                user = request.user
                if not user.last_activity or (timezone.now() - user.last_activity).total_seconds() > 60:
                    # Use update() for efficiency
                    from accounts.models import User
                    User.objects.filter(id=user.id).update(last_activity=timezone.now())
            except (AttributeError, TypeError, ValueError):
                pass

        return self.get_response(request)


class SecurityHeadersMiddleware:
    """Add baseline security headers for API responses."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if not settings.DEBUG:
            response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        return response


API_TIMING_CACHE_PREFIX = "api_timing"
API_TIMING_BUCKET_SECONDS = 60
API_TIMING_WINDOW_BUCKETS = 5
API_TIMING_BUCKET_TTL = (API_TIMING_WINDOW_BUCKETS + 2) * API_TIMING_BUCKET_SECONDS


def _timing_bucket_key(field: str, minute_epoch: int) -> str:
    return f"{API_TIMING_CACHE_PREFIX}:{field}:{minute_epoch}"


class ApiTimingMiddleware:
    """Record per-minute response time and error counters."""

    _SKIP_PREFIXES = (
        "/health",
        "/api/v1/health",
        "/api/v1/platform/admin-dashboard",
        "/static/",
        "/media/",
    )

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def _should_record(self, path: str) -> bool:
        if not path.startswith("/api/"):
            return False
        for prefix in self._SKIP_PREFIXES:
            if path.startswith(prefix):
                return False
        return True

    def __call__(self, request: HttpRequest) -> HttpResponse:
        path = request.path
        track = self._should_record(path)
        start = time.perf_counter() if track else None

        response = self.get_response(request)

        if track and start is not None:
            try:
                elapsed_ms = int((time.perf_counter() - start) * 1000)
                minute_epoch = int(time.time() // API_TIMING_BUCKET_SECONDS)
                self._record(minute_epoch, elapsed_ms, response.status_code)
            except Exception:
                pass

        return response

    @staticmethod
    def _record(minute_epoch: int, elapsed_ms: int, status_code: int) -> None:
        sum_key = _timing_bucket_key("sum_ms", minute_epoch)
        count_key = _timing_bucket_key("count", minute_epoch)

        try:
            if cache.add(count_key, 0, timeout=API_TIMING_BUCKET_TTL):
                pass
            cache.incr(count_key, 1)
        except ValueError:
            cache.add(count_key, 1, timeout=API_TIMING_BUCKET_TTL)

        try:
            if cache.add(sum_key, 0, timeout=API_TIMING_BUCKET_TTL):
                pass
            cache.incr(sum_key, elapsed_ms)
        except ValueError:
            cache.add(sum_key, elapsed_ms, timeout=API_TIMING_BUCKET_TTL)

        if status_code >= 500:
            err_key = _timing_bucket_key("errors", minute_epoch)
            try:
                if cache.add(err_key, 0, timeout=API_TIMING_BUCKET_TTL):
                    pass
                cache.incr(err_key, 1)
            except ValueError:
                cache.add(err_key, 1, timeout=API_TIMING_BUCKET_TTL)


def read_api_timing_window() -> dict:
    """Aggregate the last 5 one-minute buckets."""
    now = int(time.time() // API_TIMING_BUCKET_SECONDS)
    total_count = 0
    total_sum_ms = 0
    total_errors = 0

    for offset in range(API_TIMING_WINDOW_BUCKETS):
        minute = now - offset
        count = cache.get(_timing_bucket_key("count", minute), 0) or 0
        sum_ms = cache.get(_timing_bucket_key("sum_ms", minute), 0) or 0
        errors = cache.get(_timing_bucket_key("errors", minute), 0) or 0
        total_count += int(count)
        total_sum_ms += int(sum_ms)
        total_errors += int(errors)

    if total_count <= 0:
        return {}
    return {
        "avg_ms": round(total_sum_ms / total_count),
        "error_rate_pct": round((total_errors / total_count) * 100, 2),
        "sample": total_count,
    }

