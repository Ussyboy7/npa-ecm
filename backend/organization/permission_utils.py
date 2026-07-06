"""Permission resolution and explainability helpers."""

from __future__ import annotations

from typing import Any

from accounts.models import User

from .permissions_catalog import PERMISSION_LABELS, normalize_permissions, merge_superuser_permissions

ACCESS_CONTEXTS: dict[str, dict[str, str]] = {
    "document_view": {
        "label": "View Document",
        "reason": (
            "You cannot open this document. It may not exist, was removed, or your account "
            "does not meet sensitivity, workspace, or sharing rules for this record."
        ),
        "suggestion": (
            "Ask the document owner or your office administrator to share the document with you, "
            "your division, or your department. If you believe this is an error, contact ICT."
        ),
    },
    "correspondence_view": {
        "label": "View Correspondence",
        "reason": (
            "You cannot open this correspondence item. It may not exist or your office "
            "is not on the routing path, distribution list, or registry access for this record."
        ),
        "suggestion": (
            "Confirm the reference number with the registry desk or ask the owning office "
            "to add your office to the distribution. Contact ICT if your role should include registry access."
        ),
    },
}


def get_role_permissions(user: User) -> dict[str, bool]:
    if getattr(user, "is_superuser", False):
        return merge_superuser_permissions({})

    role = getattr(user, "system_role", None)
    raw = getattr(role, "permissions", None) if role else None
    return normalize_permissions(raw if isinstance(raw, dict) else {})


def user_has_permission(user: User, permission: str) -> bool:
    if getattr(user, "is_superuser", False):
        return True
    return get_role_permissions(user).get(permission, False)


def require_permission(user: User, permission: str) -> None:
    """Raise PermissionDenied with structured explain payload when permission is missing."""
    if user_has_permission(user, permission):
        return
    from rest_framework.exceptions import PermissionDenied

    raise PermissionDenied(explain_permission_denial(user, permission))


def require_any_permission(user: User, *permissions: str) -> None:
    """Pass if the user has any of the listed permissions."""
    for permission in permissions:
        if user_has_permission(user, permission):
            return
    from rest_framework.exceptions import PermissionDenied

    first = permissions[0] if permissions else ""
    raise PermissionDenied(explain_permission_denial(user, first))


def explain_permission_denial(user: User, permission: str) -> dict[str, Any]:
    """Build a structured explanation when a permission check fails."""
    allowed = user_has_permission(user, permission)
    role = getattr(user, "system_role", None)
    role_name = role.name if role else "No role assigned"
    label = PERMISSION_LABELS.get(permission, permission.replace("_", " ").title())

    if allowed:
        return {
            "permission": permission,
            "label": label,
            "allowed": True,
            "role_name": role_name,
            "reason": f"You have the '{label}' permission via your role ({role_name}).",
            "suggestion": None,
        }

    if getattr(user, "is_superuser", False):
        return {
            "permission": permission,
            "label": label,
            "allowed": True,
            "role_name": role_name,
            "reason": "Super administrators have all permissions.",
            "suggestion": None,
        }

    if not role:
        reason = (
            f"You do not have the '{label}' permission because no system role is assigned to your account."
        )
        suggestion = "Contact ICT or your division administrator to assign an appropriate role."
    else:
        reason = (
            f"Your role '{role_name}' does not include '{label}'. "
            "Permissions are managed by administrators in Users & Roles."
        )
        suggestion = (
            "Ask your administrator to enable this permission on your role, "
            "or assign you a role that includes it (e.g. Secretary or Registry Officer for registration)."
        )

    return {
        "permission": permission,
        "label": label,
        "allowed": False,
        "role_name": role_name,
        "reason": reason,
        "suggestion": suggestion,
    }


def explain_access_context(user: User, context: str) -> dict[str, Any]:
    """Explain why a resource detail view may be unavailable (404/403 from API)."""
    meta = ACCESS_CONTEXTS.get(context)
    if not meta:
        raise ValueError(f"Unknown access context: {context}")

    role = getattr(user, "system_role", None)
    role_name = role.name if role else "No role assigned"

    return {
        "permission": context,
        "label": meta["label"],
        "allowed": False,
        "role_name": role_name,
        "reason": meta["reason"],
        "suggestion": meta["suggestion"],
    }
