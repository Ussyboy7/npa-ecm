"""Office queue access helpers (Office Inbox / Office Sent).

One definition of "the office holder": a seat in :data:`OFFICE_QUEUE_ROLES`.
Office Inbox, document visibility and document share notifications all use it,
so an office addressed by a record has exactly one audience.
"""

from __future__ import annotations

from django.db.models import Q

from organization.models import OfficeMembership

# Seat holders who may see Office Inbox / Office Sent for an office.
OFFICE_QUEUE_ROLES: frozenset[str] = frozenset(
    {
        OfficeMembership.AssignmentRole.PRINCIPAL,
        OfficeMembership.AssignmentRole.ACTING,
        OfficeMembership.AssignmentRole.SECRETARIAT,
    }
)


def holds_office_seat_q(user, office_path: str) -> Q:
    """Q for '*user holds a queue seat in the office reached by `office_path`*'.

    `office_path` is the ORM path to an office in the queryset being filtered,
    e.g. ``"permissions__offices"`` or ``"office"``.
    """
    return Q(
        **{
            f"{office_path}__memberships__user": user,
            f"{office_path}__memberships__is_active": True,
            f"{office_path}__memberships__assignment_role__in": OFFICE_QUEUE_ROLES,
        }
    )


def seat_holder_users(office_ids):
    """Active users who may act for any of `office_ids`.

    Staff, registry and support memberships do not qualify: a record addressed
    to an office is the office's, not every member's.
    """
    from django.contrib.auth import get_user_model

    return get_user_model().objects.filter(
        office_memberships__office__in=list(office_ids),
        office_memberships__is_active=True,
        office_memberships__assignment_role__in=OFFICE_QUEUE_ROLES,
        is_active=True,
    )


def get_office_queue_office_ids(user) -> list:
    """Return office IDs where the user holds a queue-visible seat.

    Queue roles: principal, acting, secretariat.
    Staff/registry/support memberships alone do not grant Office Inbox/Sent.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return []
    return list(
        OfficeMembership.objects.filter(
            user=user,
            is_active=True,
            assignment_role__in=OFFICE_QUEUE_ROLES,
        ).values_list("office_id", flat=True)
    )
