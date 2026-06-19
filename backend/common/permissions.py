"""Shared DRF permission classes."""

from rest_framework import permissions

from common.grade_utils import EXECUTIVE_GRADES


class IsSystemAdminRole(permissions.BasePermission):
    """Allow read access to all authenticated users, but write access only to
    users whose ``system_role`` is MD, ED, or GM.
    """

    ADMIN_ROLES = {"MD", "ED", "GM"}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        user_role = getattr(request.user, "system_role", None)
        return user_role in self.ADMIN_ROLES


class IsExecutiveGrade(permissions.BasePermission):
    """Allow read access to all authenticated users, but write access only to
    users whose ``grade_level`` is MDCS, EDCS, or MSS1.
    """

    ADMIN_GRADES = EXECUTIVE_GRADES

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        grade = (request.user.grade_level or "").upper()
        return grade in self.ADMIN_GRADES
