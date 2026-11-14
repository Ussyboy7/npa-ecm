"""Permission resolution and explainability helpers."""

from __future__ import annotations

from typing import Any

from accounts.models import User

from .permissions_catalog import (
    PAGE_ACCESS_RULES,
    PERMISSION_LABELS,
    merge_superuser_permissions,
    normalize_permissions,
)

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


def _page_scope_context(user) -> tuple[str, bool]:
    from organization.office_access import get_office_queue_office_ids
    from organization.org_scope import resolve_user_org_scope

    scope = resolve_user_org_scope(user)
    has_queue = bool(get_office_queue_office_ids(user))
    if scope.level == "all":
        return "organisation", True
    if scope.level in {"directorate", "division", "department"}:
        return scope.level, True
    if has_queue:
        return "office", True
    return scope.level, False


def resolve_page_access(user) -> dict[str, dict[str, bool | str]]:
    """Resolve page visibility and its scope using the canonical backend map."""
    if not user or not getattr(user, "is_authenticated", False):
        return {
            page_id: {"allowed": False, "scope": "none"}
            for page_id in PAGE_ACCESS_RULES
        }

    permissions = get_role_permissions(user)
    scope_level, has_org_context = _page_scope_context(user)
    result: dict[str, dict[str, bool | str]] = {}
    for page_id, rule in PAGE_ACCESS_RULES.items():
        required_any = tuple(rule.get("required_any", ()))
        has_permission = not required_any or any(permissions.get(key, False) for key in required_any)
        scope_mode = str(rule.get("scope", "role"))
        if scope_mode == "authenticated":
            scope_allowed = True
        elif scope_mode == "personal_or_assignment":
            scope_allowed = has_org_context or permissions.get("can_view_all_correspondence", False)
        elif scope_mode == "role":
            scope_allowed = True
        elif scope_mode == "personal":
            scope_allowed = has_permission
        elif scope_mode == "office_queue":
            from organization.office_access import get_office_queue_office_ids

            scope_allowed = bool(get_office_queue_office_ids(user))
        elif scope_mode == "organisation":
            scope_allowed = (
                scope_level in {"organisation", "directorate", "division", "department"}
                or permissions.get("can_view_all_correspondence", False)
                or (page_id == "cases_all" and permissions.get("can_access_all_cases", False))
            )
        elif scope_mode in {"personal_or_assignment", "organisation_boundary"}:
            scope_allowed = has_org_context or permissions.get("can_view_all_correspondence", False)
        else:
            scope_allowed = False
        result[page_id] = {
            "allowed": bool(has_permission and scope_allowed),
            "scope": scope_level if scope_allowed else "none",
        }
    return result


def require_page_access(user: User, page_id: str, scope: str | None = None) -> None:
    """Enforce a page rule and optionally ensure the requested collection scope is allowed."""
    from rest_framework.exceptions import PermissionDenied

    if page_id not in PAGE_ACCESS_RULES:
        raise PermissionDenied({"detail": "Unknown page access rule.", "page": page_id})
    access = resolve_page_access(user).get(page_id, {})
    if not access.get("allowed", False):
        raise PermissionDenied({"detail": "You do not have access to this page.", "page": page_id})
    if scope:
        requested_scope = scope.lower()
        if page_id == "cases_all" and requested_scope in {"all", "organization"}:
            permissions = get_role_permissions(user)
            if not (
                permissions.get("can_access_all_cases", False)
                or permissions.get("can_view_all_correspondence", False)
                or getattr(user, "is_superuser", False)
            ):
                raise PermissionDenied(
                    {"detail": "You do not have access to all cases across the organisation.", "page": page_id, "scope": scope}
                )
        scope_permission = {
            "my": "cases_my",
            "personal": "cases_my",
            "office": "cases_office",
            "all": "cases_all",
            "organization": "cases_all",
            "directorate": "cases_all",
            "division": "cases_all",
            "department": "cases_all",
        }.get(requested_scope)
        if scope_permission and not resolve_page_access(user).get(scope_permission, {}).get("allowed", False):
            raise PermissionDenied(
                {"detail": "You do not have access to the requested page scope.", "page": page_id, "scope": scope}
            )


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
