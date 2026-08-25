"""Office queue access helpers (Office Inbox / Office Sent)."""

from __future__ import annotations

from organization.models import OfficeMembership

# Seat holders who may see Office Inbox / Office Sent for an office.
OFFICE_QUEUE_ROLES: frozenset[str] = frozenset(
    {
        OfficeMembership.AssignmentRole.PRINCIPAL,
        OfficeMembership.AssignmentRole.ACTING,
        OfficeMembership.AssignmentRole.SECRETARIAT,
    }
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


def user_has_office_queue_access(user) -> bool:
    """True if the user can see Office Inbox/Sent for at least one office."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return OfficeMembership.objects.filter(
        user=user,
        is_active=True,
        assignment_role__in=OFFICE_QUEUE_ROLES,
    ).exists()
