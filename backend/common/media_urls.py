"""Canonical builder for stored and served media URLs."""

from django.conf import settings


def build_media_url(path: str) -> str:
    """Return a browser-relative media URL for a storage-relative path."""
    base = (settings.MEDIA_URL or "/media/").strip().rstrip("/")
    if not base.startswith("/"):
        base = f"/{base}"
    return f"{base}/{str(path).lstrip('/')}"
