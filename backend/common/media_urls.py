"""Canonical builders for stored and served media URLs."""

from django.conf import settings


def build_media_url(path: str) -> str:
    """Return a browser-relative media URL for a storage-relative path."""
    media_url = (settings.MEDIA_URL or "/media/").strip()
    if not media_url.startswith("/"):
        media_url = f"/{media_url}"
    if not media_url.endswith("/"):
        media_url = f"{media_url}/"
    return f"{media_url}{str(path).lstrip('/')}"
