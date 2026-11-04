"""DRM enforcement helpers."""

from __future__ import annotations

from django.db.models import Q
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


def should_withhold_direct_media(rights: dict) -> bool:
    """
    True when clients must not receive a raw /media file_url.

    Any active policy forces API delivery so watermark, download blocks,
    and access logs cannot be bypassed via public nginx /media/.
    """
    if not rights:
        return False
    if rights.get("expired") or rights.get("view_only"):
        return True
    if not rights.get("allow_download", True):
        return True
    if (rights.get("watermark_text") or "").strip():
        return True
    # Active policy → always gate through /content/ and /download/
    return bool(rights.get("policy_id"))


def resolve_effective_document_rights(document, user=None) -> dict:
    """Combine document ACL access with DRM restrictions for one user."""
    drm = resolve_document_rights(document, user)
    user_id = getattr(user, "id", None) if user else None
    is_owner = bool(user_id and str(user_id) == str(getattr(document, "author_id", "")))
    is_superuser = bool(getattr(user, "is_superuser", False))

    access_levels: set[str] = set()
    if user and getattr(user, "is_authenticated", False):
        from .models import DocumentPermission

        matches = DocumentPermission.objects.filter(document=document).filter(
            Q(users=user)
            | Q(divisions=getattr(user, "division_id", None))
            | Q(departments=getattr(user, "department_id", None))
            | Q(offices__memberships__user=user, offices__memberships__is_active=True)
            | Q(grade_levels__contains=[getattr(user, "grade_level", "")])
        ).values_list("access", flat=True)
        access_levels = set(matches)

    if is_owner or is_superuser:
        access_level = "admin"
    elif "admin" in access_levels:
        access_level = "admin"
    elif "write" in access_levels:
        access_level = "write"
    elif "read" in access_levels:
        access_level = "read"
    else:
        access_level = None

    can_view = bool(
        is_owner
        or is_superuser
        or access_level
        or getattr(document, "sensitivity", "") in {"public", "internal"}
        or (
            getattr(document, "status", "") == "published"
            and getattr(document, "sensitivity", "") == "public"
        )
    )
    can_manage = access_level == "admin"
    return {
        **drm,
        "access_level": access_level,
        "can_view": can_view,
        "can_download": can_view and drm["allow_download"],
        "can_print": can_view and drm["allow_print"],
        "can_replace_version": can_view and access_level in {"write", "admin"},
        "can_manage_sharing": can_manage,
        "can_archive": can_manage,
    }


def assert_view_allowed(document, user=None) -> None:
    rights = resolve_document_rights(document, user)
    if rights["expired"]:
        raise PermissionDenied(rights["message"] or "Document access expired.")


def assert_download_allowed(document, user=None) -> None:
    rights = resolve_document_rights(document, user)
    if rights["expired"]:
        raise PermissionDenied(rights["message"] or "Document access expired.")
    if not rights["allow_download"]:
        raise PermissionDenied(
            f"Download blocked by DRM policy: {rights['policy_name'] or 'restricted'}"
        )


def assert_print_allowed(document, user=None) -> None:
    rights = resolve_document_rights(document, user)
    if rights["expired"]:
        raise PermissionDenied(rights["message"] or "Document access expired.")
    if not rights["allow_print"]:
        raise PermissionDenied(
            f"Print blocked by DRM policy: {rights['policy_name'] or 'restricted'}"
        )


def assert_share_allowed(document, user=None) -> None:
    rights = resolve_document_rights(document, user)
    if rights["expired"]:
        raise PermissionDenied(rights["message"] or "Document access expired.")
    if not rights["allow_external_share"]:
        raise PermissionDenied(
            f"Sharing blocked by DRM policy: {rights['policy_name'] or 'restricted'}"
        )


def apply_version_drm_redaction(data: dict, document, user=None) -> dict:
    """Mutate serialized version payload for DRM-safe API delivery."""
    rights = resolve_document_rights(document, user)
    raw_url = (data.get("file_url") or "").strip()
    has_html = bool((data.get("content_html") or "").strip())
    data["has_file"] = bool(raw_url) or has_html

    withhold = should_withhold_direct_media(rights) or bool(rights.get("expired"))
    if withhold:
        data["file_url"] = ""

    if rights.get("expired"):
        data["content_html"] = ""
        data["content_text"] = ""
        data["content_json"] = None
        data["ocr_text"] = ""

    data["drm_delivery"] = "api" if withhold else "media"
    return data
