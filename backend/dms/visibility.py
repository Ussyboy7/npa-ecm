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
- A document carried by correspondence is openable by the seat of every office
  the record was addressed to or passed through, and by a person a minute named
  directly. Nothing is written per user: the office's copy follows the seat, so
  delivering a document to an office is custody, not a share.
- Public documents are visible to every authenticated user once published.

The classification gate is one rule for both channels. A grant or a delivery
decides *which* documents a user may reach; the document's sensitivity decides
whether that user may reach that grade at all:
- Internal: through a grant or a delivery.
- Confidential: through a grant or a delivery, *and* a management grade.
- Restricted: through a grant or a delivery, *and* a top grade.
So sharing a RESTRICTED document with someone below the grade fails exactly the
way routing it to their office does — neither channel lifts the classification.
"""

from __future__ import annotations

from django.db.models import Q, Subquery
from rest_framework.exceptions import PermissionDenied

from common.grade_utils import (
    GRADE_ORDER,
    SENSITIVITY_HIGH_CONFIDENTIAL_GRADES,
    SENSITIVITY_HIGH_RESTRICTED_GRADES,
)
from organization.office_access import get_office_queue_office_ids, holds_office_seat_q

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


def visible_sensitivities(user) -> set[str]:
    """Sensitivity grades this user's classification level allows at all.

    The single definition of the classification gate: a grant or a delivery
    never lifts it, it only decides which of the allowed grades a user reaches.
    """
    allowed = {Document.Sensitivity.PUBLIC, Document.Sensitivity.INTERNAL}
    grade = _user_grade(user)
    if grade in SENSITIVITY_HIGH_CONFIDENTIAL_GRADES:
        allowed.add(Document.Sensitivity.CONFIDENTIAL)
    if grade in SENSITIVITY_HIGH_RESTRICTED_GRADES:
        allowed.add(Document.Sensitivity.RESTRICTED)
    return allowed


def sensitivity_grade_requirements() -> dict[str, tuple[str, ...]]:
    """Grades that may reach each classification, highest grade first.

    Derived from the same constants :func:`visible_sensitivities` gates on, so
    the policy served to the client and the enforcement here cannot disagree.
    An empty tuple means every authenticated user may reach that sensitivity —
    the client reads that as `unrestricted` rather than as "no one".
    """
    def by_rank(grades: frozenset[str]) -> tuple[str, ...]:
        return tuple(grade for grade in GRADE_ORDER if grade in grades)

    return {
        Document.Sensitivity.PUBLIC: (),
        Document.Sensitivity.INTERNAL: (),
        Document.Sensitivity.CONFIDENTIAL: by_rank(
            SENSITIVITY_HIGH_CONFIDENTIAL_GRADES
        ),
        Document.Sensitivity.RESTRICTED: by_rank(SENSITIVITY_HIGH_RESTRICTED_GRADES),
    }


def correspondence_custody_q(user) -> Q:
    """Q matching documents this user may review through a correspondence.

    The minute trail is the chain: a record is addressed to its owning office,
    held by its current office and forwarded to each minute's `to_office`. A
    seat holder of any of those offices may open the carried document, and a
    minute that names a person directly gives that person the same review right.

    This is deliberately derived, never stored: the office's copy belongs to the
    seat, so a handover moves access with the seat instead of leaving a
    permission row behind for the person who used to hold it.

    Shape matters: expressed as reverse-FK Q objects, Django emits LEFT JOINs
    that multiply one document by every link and every minute on the record, so
    a list page has to materialise and de-duplicate the whole cross product
    before it can sort and slice. As a semi-join subquery the outer query keeps
    one row per document, and the plan scales with the record trail instead.
    """
    from correspondence.models import CorrespondenceDocumentLink

    trail = Q(correspondence__minutes__to_user=user)
    # The seat ids are resolved once and compared with `__in`; joining the
    # membership table three times inside the subquery measured slower than the
    # one indexed lookup this list costs.
    office_ids = get_office_queue_office_ids(user)
    if office_ids:
        trail |= Q(correspondence__owning_office_id__in=office_ids)
        trail |= Q(correspondence__current_office_id__in=office_ids)
        trail |= Q(correspondence__minutes__to_office_id__in=office_ids)

    carried_documents = (
        CorrespondenceDocumentLink.objects.filter(trail)
        .values("document_id")
        .distinct()
    )
    return Q(pk__in=Subquery(carried_documents))


def classification_q(user) -> Q:
    """Q matching the sensitivity grades this user may reach at all."""
    return Q(sensitivity__in=list(visible_sensitivities(user)))


def classification_allows(document, user) -> bool:
    """True when this user's grade may reach the document's classification."""
    return (getattr(document, "sensitivity", "") or "") in visible_sensitivities(user)


def has_correspondence_custody(document, user) -> bool:
    """True when `user` may review `document` through a correspondence trail.

    Same rule as :func:`correspondence_custody_q`, including the classification
    gate, so the object-level check and the queryset can never disagree.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if not classification_allows(document, user):
        return False
    return Document.objects.filter(pk=document.pk).filter(correspondence_custody_q(user)).exists()


def document_visibility_q(user) -> Q:
    """Q matching every document the user is allowed to open."""
    # A grant and a delivery are the two ways in; both are gated by the same
    # classification rule, so a share cannot reach a grade the reader may not.
    reach = document_acl_q(user) | correspondence_custody_q(user)
    visible = Q(author=user) | (reach & classification_q(user))

    # Public records are only public once published; a public draft stays with
    # its author and whoever it was explicitly shared with.
    visible |= Q(
        status=Document.DocumentStatus.PUBLISHED,
        sensitivity=Document.Sensitivity.PUBLIC,
    )

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
