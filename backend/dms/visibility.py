"""Who may see, edit and manage a document — one implementation.

Both the documents API (`DocumentViewSet.get_queryset`) and search
(`SearchService.full_text_search_documents`) filter with
:func:`document_visibility_q`, so a document can never be listed in search
while the documents list hides it.

Rules:
- Author and superuser always see their own/any document.
- An explicit `DocumentPermission` grants access to its users, offices,
  divisions, departments, directorates and grade levels.
- An office grant reaches the office's seat holders only (principal, acting,
  secretariat) — a record addressed to an office is the office's, not every
  member's. See `organization.office_access`.
- Public documents are visible to every authenticated user once published.
- Internal: only through an explicit permission above.
- Confidential: an explicit permission *and* a management grade.
- Restricted: an explicit permission *and* a top grade.
"""

from __future__ import annotations

from django.db.models import Q
from rest_framework.exceptions import PermissionDenied

from common.grade_utils import (
    SENSITIVITY_HIGH_CONFIDENTIAL_GRADES,
    SENSITIVITY_HIGH_RESTRICTED_GRADES,
)
from organization.office_access import holds_office_seat_q

from .models import Document, DocumentPermission

WRITE_ACCESS_LEVELS = frozenset({DocumentPermission.AccessLevel.WRITE, DocumentPermission.AccessLevel.ADMIN})
ADMIN_ACCESS_LEVELS = frozenset({DocumentPermission.AccessLevel.ADMIN})


def _user_grade(user) -> str:
    return (getattr(user, "grade_level", None) or "").upper()


def document_acl_q(user) -> Q:
    """Q matching the user against any explicit permission row for a document."""
    acl = Q(permissions__users=user) | holds_office_seat_q(user, "permissions__offices")
    if getattr(user, "division_id", None):
        acl |= Q(permissions__divisions=user.division_id)
    if getattr(user, "department_id", None):
        acl |= Q(permissions__divisions__departments=user.department_id)
    if getattr(user, "department_id", None):
        acl |= Q(permissions__departments=user.department_id)
    if getattr(user, "directorate_id", None):
        acl |= Q(permissions__directorates=user.directorate_id)
    # A directorate grant covers everyone beneath it, even when the account
    # carries no directorate_id of its own but sits in one of its units.
    if getattr(user, "division_id", None):
        acl |= Q(permissions__directorates__divisions=user.division_id)
    if getattr(user, "department_id", None):
        acl |= Q(permissions__directorates__divisions__departments=user.department_id)
    if getattr(user, "grade_level", None):
        acl |= Q(permissions__grade_levels__contains=[user.grade_level])
    return acl


def document_visibility_q(user) -> Q:
    """Q matching every document the user is allowed to open."""
    acl = document_acl_q(user)
    visible = Q(author=user) | acl

    # Public records are only public once published; a public draft stays with
    # its author and whoever it was explicitly shared with.
    visible |= Q(
        status=Document.DocumentStatus.PUBLISHED,
        sensitivity=Document.Sensitivity.PUBLIC,
    )

    visible |= Q(sensitivity=Document.Sensitivity.INTERNAL) & acl

    grade = _user_grade(user)
    if grade in SENSITIVITY_HIGH_CONFIDENTIAL_GRADES:
        visible |= Q(sensitivity=Document.Sensitivity.CONFIDENTIAL) & acl
    if grade in SENSITIVITY_HIGH_RESTRICTED_GRADES:
        visible |= Q(sensitivity=Document.Sensitivity.RESTRICTED) & acl

    return visible


def documents_visible_to(queryset, user):
    """Filter a Document queryset to what `user` may open (superuser = all)."""
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    if getattr(user, "is_superuser", False):
        return queryset
    return queryset.filter(document_visibility_q(user)).distinct()


def document_access_level(document, user) -> str | None:
    """Effective ACL level for this user: 'admin', 'write', 'read' or None."""
    from .drm import resolve_effective_document_rights

    return resolve_effective_document_rights(document, user).get("access_level")


def _deny(document, user, *, required: str) -> None:
    level = document_access_level(document, user)
    raise PermissionDenied(
        {
            "detail": (
                "You can view this document but not change it. Ask the owner "
                f"for {required} access."
            ),
            "code": f"document_{required}_required",
            "access_level": level,
            "document": str(getattr(document, "id", "")),
        }
    )


def require_document_write(document, user) -> None:
    """Writes (edit metadata, content, versions) need write or admin access."""
    if document_access_level(document, user) in WRITE_ACCESS_LEVELS:
        return
    _deny(document, user, required="write")


def require_document_admin(document, user) -> None:
    """Archiving, deleting and sharing need admin access (owner or ACL admin)."""
    if document_access_level(document, user) in ADMIN_ACCESS_LEVELS:
        return
    _deny(document, user, required="admin")
