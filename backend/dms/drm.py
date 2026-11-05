"""DRM enforcement helpers."""

from __future__ import annotations

from functools import lru_cache

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

# When document.drm_policy is null ("Inherit from classification"), use these
# seeded DocumentRightsPolicy names. Keep in sync with seed_demo_data.
SENSITIVITY_DEFAULT_POLICY_NAMES: dict[str, str] = {
    "public": "Public Record",
    "internal": "Internal — Download Allowed",
    "confidential": "Confidential — View Only",
    # Stricter than Confidential: view-only + watermark + 30-day expiry
    "restricted": "Strictly Confidential — Time-Limited",
}


@lru_cache(maxsize=16)
def _policy_id_by_name(name: str) -> str | None:
    from .models import DocumentRightsPolicy

    policy = (
        DocumentRightsPolicy.objects.filter(name=name, is_active=True)
        .only("id")
        .first()
    )
    return str(policy.id) if policy else None


def clear_policy_name_cache() -> None:
    """Test helper — call after creating/renaming seeded policies."""
    _policy_id_by_name.cache_clear()


def get_default_policy_for_sensitivity(sensitivity: str | None):
    """Return the active DocumentRightsPolicy for a sensitivity, or None."""
    from .models import DocumentRightsPolicy

    name = SENSITIVITY_DEFAULT_POLICY_NAMES.get((sensitivity or "").strip().lower())
    if not name:
        return None
    policy_id = _policy_id_by_name(name)
    if not policy_id:
        return None
    return DocumentRightsPolicy.objects.filter(id=policy_id, is_active=True).first()


def resolve_document_policy(document) -> tuple[object | None, bool]:
    """
    Return (policy, inherited).

    Explicit document.drm_policy wins. Otherwise inherit from sensitivity.
    """
    attached = getattr(document, "drm_policy", None)
    if attached is not None and getattr(attached, "is_active", True):
        return attached, False
    inherited = get_default_policy_for_sensitivity(getattr(document, "sensitivity", None))
    return inherited, bool(inherited)


def _rights_payload(
    *,
    policy,
    inherited: bool,
    expired: bool,
    view_only: bool,
    allow_download: bool,
    allow_print: bool,
    allow_external_share: bool,
    watermark_text: str,
    message: str,
) -> dict:
    return {
        # policy_id is only the *attached* FK — null means UI "Inherit"
        "policy_id": (
            None
            if inherited
            else (str(policy.id) if policy else None)
        ),
        "effective_policy_id": str(policy.id) if policy else None,
        "policy_name": policy.name if policy else None,
        "inherited": inherited,
        "allow_download": allow_download,
        "allow_print": allow_print,
        "allow_external_share": allow_external_share,
        "view_only": view_only,
        "watermark_text": watermark_text,
        "expired": expired,
        "message": message,
    }


def resolve_document_rights(document, user=None) -> dict:
    """Return effective DRM restrictions for a document (including sensitivity inherit)."""
    policy, inherited = resolve_document_policy(document)
    if not policy:
        return _rights_payload(
            policy=None,
            inherited=False,
            expired=False,
            view_only=False,
            allow_download=True,
            allow_print=True,
            allow_external_share=True,
            watermark_text="",
            message="",
        )

    expired = False
    if policy.expires_after_days and document.created_at:
        expiry = document.created_at + timezone.timedelta(days=policy.expires_after_days)
        expired = timezone.now() > expiry

    author_id = getattr(document, "author_id", None)
    user_id = getattr(user, "id", None) if user else None
    is_author = bool(user_id and author_id and str(user_id) == str(author_id))
    is_superuser = bool(getattr(user, "is_superuser", False))

    if expired and not is_author and not is_superuser:
        return _rights_payload(
            policy=policy,
            inherited=inherited,
            expired=True,
            view_only=True,
            allow_download=False,
            allow_print=False,
            allow_external_share=False,
            watermark_text=policy.watermark_text or "",
            message="Document access has expired under DRM policy.",
        )

    view_only = bool(policy.view_only)
    return _rights_payload(
        policy=policy,
        inherited=inherited,
        expired=False,
        view_only=view_only,
        allow_download=bool(policy.allow_download) and not view_only,
        allow_print=bool(policy.allow_print) and not view_only,
        allow_external_share=bool(policy.allow_external_share),
        watermark_text=policy.watermark_text or "",
        message=policy.description or "",
    )


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
    # Active (attached or inherited) policy → gate through /content/ and /download/
    return bool(rights.get("effective_policy_id") or rights.get("policy_id"))


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
    """
    Gate *internal* ACL share (grant access to NPA users/offices).

    allow_external_share is a separate control for off-platform / public release
    and must not block in-app permission grants. View-only DRM still applies to
    recipients (no download/print). Time-limited policies cannot be shared after expiry
    (even by author/superuser — they may still view).
    """
    del user  # reserved for future caller-scoped share rules
    policy, _inherited = resolve_document_policy(document)
    if not policy or not policy.expires_after_days or not getattr(document, "created_at", None):
        return
    expiry = document.created_at + timezone.timedelta(days=policy.expires_after_days)
    if timezone.now() > expiry:
        raise PermissionDenied("Document access has expired under DRM policy.")


def blocks_plaintext_extraction(document, user=None) -> bool:
    """
    True when OCR / extracted plain text must not be exposed or regenerated.

    Applies to Confidential/Restricted classification and view-only / expired DRM.
    HTML preview may still render; selectable plain OCR text must not.
    """
    rights = resolve_document_rights(document, user)
    if rights.get("expired") or rights.get("view_only"):
        return True
    sensitivity = (getattr(document, "sensitivity", "") or "").strip().lower()
    return sensitivity in {"confidential", "restricted"}


def assert_plaintext_extraction_allowed(document, user=None) -> None:
    if blocks_plaintext_extraction(document, user):
        raise PermissionDenied(
            "Text extraction and OCR are disabled for this document under DRM / classification policy."
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
    elif blocks_plaintext_extraction(document, user):
        # Keep HTML for in-app preview; strip copyable plain extracts.
        data["ocr_text"] = ""
        data["content_text"] = ""

    data["drm_delivery"] = "api" if withhold else "media"
    data["plaintext_extraction_blocked"] = blocks_plaintext_extraction(document, user)
    return data
