"""Org-boundary visibility for search and archives."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from django.db.models import Q

from common.grade_utils import DEPARTMENT_GRADES, DIRECTORATE_GRADES, DIVISION_GRADES
from organization.models import OfficeMembership
from organization.permission_utils import user_has_permission

OrgScopeLevel = Literal["all", "directorate", "division", "department", "participation"]


@dataclass(frozen=True)
class UserOrgScope:
    """Resolved organisational search/archive boundary for a user."""

    level: OrgScopeLevel
    directorate_id: Any = None
    division_id: Any = None
    department_id: Any = None
    office_ids: tuple = ()


def user_can_view_all_correspondence(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    role_name = getattr(getattr(user, "system_role", None), "name", "") or ""
    if role_name.lower() == "super admin":
        return True
    return user_has_permission(user, "can_view_all_correspondence")


def resolve_user_org_scope(user) -> UserOrgScope:
    """Resolve org boundary from grade / permissions for search and archives.

    - Superuser / can_view_all_correspondence / MDCS → all
    - ED (directorate grades) → directorate
    - GM (division grades) → division
    - AGM (department grades) → department
    - Others → participation-only (caller applies touched/assigned/CC filters)
    """
    if not user or not getattr(user, "is_authenticated", False):
        return UserOrgScope(level="participation")

    if user_can_view_all_correspondence(user):
        return UserOrgScope(level="all")

    grade = (getattr(user, "grade_level", None) or "").upper()
    # Managing Director sees org-wide archives/search (same as can_view_all)
    if grade in {"MDCS", "MD"}:
        return UserOrgScope(level="all")

    directorate_id = getattr(user, "directorate_id", None)
    division_id = getattr(user, "division_id", None)
    department_id = getattr(user, "department_id", None)
    office_ids = tuple(
        OfficeMembership.objects.filter(user=user, is_active=True).values_list(
            "office_id", flat=True
        )
    )

    if grade in DIRECTORATE_GRADES and directorate_id:
        return UserOrgScope(
            level="directorate",
            directorate_id=directorate_id,
            division_id=division_id,
            department_id=department_id,
            office_ids=office_ids,
        )
    if grade in DIVISION_GRADES and division_id:
        return UserOrgScope(
            level="division",
            directorate_id=directorate_id,
            division_id=division_id,
            department_id=department_id,
            office_ids=office_ids,
        )
    if grade in DEPARTMENT_GRADES and department_id:
        return UserOrgScope(
            level="department",
            directorate_id=directorate_id,
            division_id=division_id,
            department_id=department_id,
            office_ids=office_ids,
        )

    return UserOrgScope(
        level="participation",
        directorate_id=directorate_id,
        division_id=division_id,
        department_id=department_id,
        office_ids=office_ids,
    )


def correspondence_org_boundary_q(scope: UserOrgScope) -> Q | None:
    """Return a Q for correspondence org boundary, or None for unrestricted (all).

    For participation level, returns empty Q() — caller must AND participation filters.
    """
    if scope.level == "all":
        return None
    if scope.level == "directorate" and scope.directorate_id:
        return Q(division__directorate_id=scope.directorate_id) | Q(
            department__division__directorate_id=scope.directorate_id
        )
    if scope.level == "division" and scope.division_id:
        return Q(division_id=scope.division_id) | Q(department__division_id=scope.division_id)
    if scope.level == "department" and scope.department_id:
        return Q(department_id=scope.department_id)
    return Q()


def correspondence_participation_q(user, office_ids: tuple = ()) -> Q:
    """Touched / assigned / CC participation filter for correspondence."""
    from correspondence.models import CorrespondenceDistribution, Minute

    participation = Q(created_by=user) | Q(current_approver=user)
    if office_ids:
        participation |= Q(owning_office_id__in=office_ids) | Q(current_office_id__in=office_ids)
    minute_ids = Minute.objects.filter(to_user=user).values_list("correspondence_id", flat=True)
    distribution_ids = CorrespondenceDistribution.objects.filter(
        user=user, is_active=True
    ).values_list("correspondence_id", flat=True)
    participation |= Q(id__in=minute_ids) | Q(id__in=distribution_ids)
    return participation


def apply_correspondence_org_scope(queryset, user):
    """Filter correspondence queryset to the user's search/archive org boundary."""
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()

    scope = resolve_user_org_scope(user)
    boundary_q = correspondence_org_boundary_q(scope)
    if boundary_q is None:
        return queryset.filter(is_deleted=False).distinct()
    if scope.level == "participation":
        return queryset.filter(
            correspondence_participation_q(user, scope.office_ids),
            is_deleted=False,
        ).distinct()
    return queryset.filter(boundary_q, is_deleted=False).distinct()


def case_org_boundary_q(scope: UserOrgScope) -> Q | None:
    """Org boundary for cases, or None for unrestricted."""
    if scope.level == "all":
        return None
    if scope.level == "directorate" and scope.directorate_id:
        from organization.models import Division

        division_ids = Division.objects.filter(directorate_id=scope.directorate_id).values_list(
            "id", flat=True
        )
        return Q(division_id__in=division_ids)
    if scope.level == "division" and scope.division_id:
        return Q(division_id=scope.division_id)
    if scope.level == "department" and scope.department_id:
        return Q(department_id=scope.department_id)
    return Q()


def apply_case_org_scope(queryset, user):
    """Filter cases queryset to org boundary / participation."""
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()

    scope = resolve_user_org_scope(user)
    boundary_q = case_org_boundary_q(scope)
    if boundary_q is None:
        return queryset.distinct()
    if scope.level == "participation":
        participation = Q(created_by=user) | Q(assigned_to=user)
        if scope.office_ids:
            participation |= Q(owning_office_id__in=scope.office_ids) | Q(
                current_office_id__in=scope.office_ids
            )
        return queryset.filter(participation).distinct()
    return queryset.filter(boundary_q).distinct()
