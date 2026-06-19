"""Storage/path helpers shared across apps."""

from __future__ import annotations

import os
from urllib.parse import urlparse

from django.conf import settings


def resolve_media_path(file_url: str) -> str:
    """Convert a stored file_url into an absolute filesystem path.

    Handles:
    - URLs starting with /media/
    - Absolute local paths (returned as-is)
    - Remote http(s) URLs (returned as-is; caller should reject if needed)
    """
    if not file_url:
        return ""

    if file_url.startswith("/media/"):
        return os.path.join(str(settings.MEDIA_ROOT), file_url.replace("/media/", ""))

    parsed = urlparse(file_url)
    if parsed.scheme in ("http", "https"):
        return file_url

    # Assume already a local path relative to MEDIA_ROOT
    return os.path.join(str(settings.MEDIA_ROOT), file_url.lstrip("/"))
