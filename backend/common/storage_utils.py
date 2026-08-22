"""Storage/path helpers shared across apps."""

from __future__ import annotations

import mimetypes
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


def get_content_type(file_name: str, fallback: str = "application/octet-stream") -> str:
    ctype, _ = mimetypes.guess_type(file_name)
    return ctype or fallback


def load_file_bytes(file_url: str) -> bytes | None:
    """Load file bytes from local path or return None if missing/remote."""
    path = resolve_media_path(file_url)
    if not path or path.startswith(("http://", "https://")):
        return None
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as f:
        return f.read()
