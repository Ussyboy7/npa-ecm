"""Hierarchy-aware routing suggestions for minute and treatment modals."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q

from common.grade_utils import DIRECTORATE_GRADES, GRADE_ORDER, GRADE_RANK
from organization.models import OfficeMembership

from .models import Correspondence, Minute

User = get_user_model()

# The MD sits above everyone, so their suggestions are not limited by division
# or directorate. Derived from the served order instead of naming the code.
TOP_GRADE_INDEX = 0

# Directorate-level leadership sees an upward request regardless of where the
# sender sits. DIRECTORATE_GRADES also carries the MD/ED aliases, which are not
# in the catalogue's order, so only catalogue codes are kept.
DIRECTORATE_GRADE_CODES = frozenset(
    grade for grade in GRADE_ORDER if grade in DIRECTORATE_GRADES
)

VALID_DIRECTIONS = {
    Correspondence.Direction.UPWARD,
    Correspondence.Direction.DOWNWARD,
    Correspondence.Direction.LATERAL,
}


def _grade(user: User) -> str:
    return (user.grade_level or "").upper()


def _display_name(user: User) -> str:
    name = " ".join(
        part.strip()
        for part in (user.first_name, user.middle_name, user.last_name)
        if part and part.strip()
    )
    return name or user.username


def _user_directorate_id(user: User) -> str | None:
    if user.division_id and user.division and user.division.directorate_id:
        return str(user.division.directorate_id)
    return str(user.directorate_id) if user.directorate_id else None


def _same_directorate_q(directorate_id: str) -> Q:
    """Match the client's division-first directorate fallback."""
    return Q(division__directorate_id=directorate_id) | (
        Q(directorate_id=directorate_id)
        & (Q(division__isnull=True) | Q(division__directorate_id__isnull=True))
    )


def get_routing_suggestions(
    user: User,
    correspondence: Correspondence,
    direction: str | None = None,
) -> list[User]:
    """Return the same hierarchy-based candidates the modals used client-side."""
    resolved_direction = direction if direction in VALID_DIRECTIONS else correspondence.direction

    already_acted = set(
        Minute.objects.filter(correspondence=correspondence, is_recalled=False)
        .exclude(user_id=None)
        .values_list("user_id", flat=True)
    )
    if correspondence.current_approver_id and Minute.objects.filter(
        correspondence=correspondence,
        user_id=correspondence.current_approver_id,
        is_recalled=False,
    ).exists():
        already_acted.add(correspondence.current_approver_id)

    primary_membership = (
        OfficeMembership.objects.select_related("office")
        .filter(user=user, is_primary=True, is_active=True)
        .first()
    )
    can_route_laterally = (
        primary_membership.office.allow_lateral_routing
        if primary_membership and primary_membership.office
        else True
    )

    current_grade = _grade(user)
    current_grade_index = GRADE_RANK.get(current_grade, -1)
    current_division_id = user.division_id
    current_directorate_id = _user_directorate_id(user)

    active_users = (
        User.objects.filter(is_active=True)
        .exclude(id=user.id)
        .exclude(id__in=already_acted)
        .select_related("division", "directorate", "system_role")
        .order_by("username")
    )

    if resolved_direction == Correspondence.Direction.LATERAL:
        if not can_route_laterally:
            return []
        return list(active_users.filter(grade_level=current_grade))

    if resolved_direction == Correspondence.Direction.DOWNWARD:
        lower_grades = set(GRADE_ORDER[current_grade_index + 1 :])

        if current_grade_index == TOP_GRADE_INDEX:
            md_candidates = list(active_users.filter(grade_level__in=lower_grades))
            return sorted(
                md_candidates,
                key=lambda candidate: (
                    GRADE_RANK.get(_grade(candidate), -1),
                    _display_name(candidate).casefold(),
                ),
            )

        scope = Q(division_id=current_division_id)
        if current_directorate_id:
            scope |= _same_directorate_q(current_directorate_id)
        return list(
            active_users.filter(grade_level__in=lower_grades).filter(scope)
        )

    higher_grades = set(GRADE_ORDER[:current_grade_index])
    higher_scope = Q(grade_level__in=DIRECTORATE_GRADE_CODES)
    if current_division_id:
        higher_scope |= Q(division_id=current_division_id)
    if current_directorate_id:
        higher_scope |= _same_directorate_q(current_directorate_id)

    filters = Q(grade_level__in=higher_grades) & higher_scope
    if can_route_laterally:
        filters |= Q(grade_level=current_grade)

    return list(active_users.filter(filters))
