"""DRM enforcement helpers."""

from __future__ import annotations

from django.utils import timezone
from rest_framework.exceptions import PermissionDenied


def resolve_document_rights(document, user=None) -> dict:
    """Return effective DRM restrictions for a document."""
    policy = getattr(document, "drm_policy", None)
    if not policy or not policy.is_active:
        return {
            "policy_id": None,
            "policy_name": None,
            "allow_download": True,
            "allow_print": True,
            "allow_external_share": True,
            "view_only": False,
            "watermark_text": "",
            "expired": False,
            "message": "",
        }

    expired = False
    if policy.expires_after_days and document.created_at:
        expiry = document.created_at + timezone.timedelta(days=policy.expires_after_days)
        expired = timezone.now() > expiry

    author_id = getattr(document, "author_id", None)
    user_id = getattr(user, "id", None) if user else None
    is_author = bool(user_id and author_id and str(user_id) == str(author_id))
    is_superuser = bool(getattr(user, "is_superuser", False))

    if expired and not is_author and not is_superuser:
        return {
            "policy_id": str(policy.id),
            "policy_name": policy.name,
            "allow_download": False,
            "allow_print": False,
            "allow_external_share": False,
            "view_only": True,
            "watermark_text": policy.watermark_text,
            "expired": True,
            "message": "Document access has expired under DRM policy.",
        }

    view_only = policy.view_only
    return {
        "policy_id": str(policy.id),
        "policy_name": policy.name,
        "allow_download": policy.allow_download and not view_only,
        "allow_print": policy.allow_print and not view_only,
        "allow_external_share": policy.allow_external_share,
        "view_only": view_only,
        "watermark_text": policy.watermark_text or "",
        "expired": False,
        "message": policy.description or "",
    }


def assert_download_allowed(document, user=None) -> None:
    rights = resolve_document_rights(document, user)
    if rights["expired"]:
        raise PermissionDenied(rights["message"] or "Document access expired.")
    if not rights["allow_download"]:
        raise PermissionDenied(
            f"Download blocked by DRM policy: {rights['policy_name'] or 'restricted'}"
        )
