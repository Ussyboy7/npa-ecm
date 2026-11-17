"""Cache helpers for the sidebar count endpoint."""

from __future__ import annotations

import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

_SIDEBAR_COUNTS_VERSION_KEY = "sidebar_counts_cache_version"


def _cache_version() -> int:
    try:
        version = cache.get(_SIDEBAR_COUNTS_VERSION_KEY)
        if version is None:
            cache.add(_SIDEBAR_COUNTS_VERSION_KEY, 1, timeout=None)
            version = cache.get(_SIDEBAR_COUNTS_VERSION_KEY) or 1
        return int(version)
    except Exception as exc:  # Cache outages must not break the counts request.
        logger.warning("Cache unavailable for sidebar_counts version: %s", exc)
        return 0


def get_sidebar_counts_cache_key(user_id) -> str:
    """Return the current cache key for one user's sidebar counts."""
    return f"sidebar_counts_v{_cache_version()}_{user_id}"


def invalidate_sidebar_counts_cache() -> None:
    """Invalidate every cached sidebar count by advancing its shared version."""
    try:
        try:
            cache.incr(_SIDEBAR_COUNTS_VERSION_KEY)
        except ValueError:
            cache.set(_SIDEBAR_COUNTS_VERSION_KEY, 1, timeout=None)
    except Exception as exc:
        logger.warning("Cache unavailable for sidebar_counts invalidation: %s", exc)
