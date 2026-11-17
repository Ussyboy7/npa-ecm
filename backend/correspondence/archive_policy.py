"""Archive filing policy shared by archive endpoints and package sharing."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from organization.org_scope import apply_correspondence_org_scope, resolve_user_org_scope

from .models import Correspondence

# Filing a record at a level needs both the general archive action and that
# level's authority; org scope decides *where* it may be filed.
ARCHIVE_LEVEL_PERMISSION_BY_LEVEL = {
    Correspondence.ArchiveLevel.DEPARTMENT: "can_archive_department",
    Correspondence.ArchiveLevel.DIVISION: "can_archive_division",
    Correspondence.ArchiveLevel.DIRECTORATE: "can_archive_directorate",
}

# Completed and archived records are records, not live work items. Generic
# mutations must not be able to reopen, edit, or add files to them.
READ_ONLY_CORRESPONDENCE_STATUSES = (
    Correspondence.Status.COMPLETED,
    Correspondence.Status.ARCHIVED,
)


def assert_correspondence_writable(correspondence: Correspondence) -> None:
    if correspondence.status in READ_ONLY_CORRESPONDENCE_STATUSES:
        raise ValidationError({"detail": "Completed or archived correspondence is read-only."})


# Most specific first: an unfiled memo defaults to its own deepest org unit.
ARCHIVE_LEVEL_ORDER = (
    Correspondence.ArchiveLevel.DEPARTMENT,
    Correspondence.ArchiveLevel.DIVISION,
    Correspondence.ArchiveLevel.DIRECTORATE,
)


def archive_org_units(correspondence: Correspondence) -> dict[str, object | None]:
    """Resolve the department/division/directorate a memo can be filed under.

    Falls back from the memo's own org fields to its owning office, so an
    office-only record still resolves the units it belongs to.
    """
    department = correspondence.department
    division = correspondence.division
    directorate = division.directorate if division is not None else None
    owning_office = correspondence.owning_office if correspondence.owning_office_id else None

    if department is None and owning_office is not None:
        department = owning_office.department

    if department is not None:
        department_division = department.division
        if division is None:
            division = department_division
        if directorate is None and department_division is not None:
            directorate = department_division.directorate

    if division is not None and directorate is None:
        directorate = division.directorate

    if division is None and owning_office is not None:
        division = owning_office.division
        if directorate is None:
            directorate = owning_office.directorate

    return {
        Correspondence.ArchiveLevel.DEPARTMENT: department,
        Correspondence.ArchiveLevel.DIVISION: division,
        Correspondence.ArchiveLevel.DIRECTORATE: directorate,
    }


def readable_archive_levels(user) -> list[str]:
    """Levels visible within the user's org boundary (read inheritance flows up)."""
    scope = resolve_user_org_scope(user)
    if scope.level == "all":
        return list(ARCHIVE_LEVEL_ORDER)
    if scope.level == "directorate" and scope.directorate_id:
        return list(ARCHIVE_LEVEL_ORDER)
    if scope.level == "division" and scope.division_id:
        return [Correspondence.ArchiveLevel.DEPARTMENT, Correspondence.ArchiveLevel.DIVISION]
    if scope.level == "department" and scope.department_id:
        return [Correspondence.ArchiveLevel.DEPARTMENT]
    return []


def archived_correspondence_visibility_q(user) -> Q:
    """Archived-record scope: exact filing unit plus upward-only read inheritance."""
    scope = resolve_user_org_scope(user)
    if scope.level == "all":
        return Q()
    if scope.level == "participation":
        return Q(pk__in=[])

    # Prefer the correspondence's explicit org placement. Use owning-office
    # hierarchy only when the corresponding record fields are missing.
    department_in_division = (
        Q(department__division_id=scope.division_id)
        | Q(department__isnull=True, owning_office__department__division_id=scope.division_id)
    )
    division_in_directorate = (
        Q(division__directorate_id=scope.directorate_id)
        | Q(division__isnull=True, department__division__directorate_id=scope.directorate_id)
        | Q(
            division__isnull=True,
            department__isnull=True,
            owning_office__division__directorate_id=scope.directorate_id,
        )
        | Q(
            division__isnull=True,
            department__isnull=True,
            owning_office__division__isnull=True,
            owning_office__department__division__directorate_id=scope.directorate_id,
        )
    )
    department_in_directorate = (
        Q(department__division__directorate_id=scope.directorate_id)
        | Q(
            department__isnull=True,
            owning_office__department__division__directorate_id=scope.directorate_id,
        )
    )

    visible = Q()
    if scope.level == "department" and scope.department_id:
        in_department = (
            Q(department_id=scope.department_id)
            | Q(department__isnull=True, owning_office__department_id=scope.department_id)
        )
        visible |= Q(archive_level=Correspondence.ArchiveLevel.DEPARTMENT) & in_department
        visible |= Q(archive_level="") & in_department
    elif scope.level == "division" and scope.division_id:
        visible |= (
            Q(archive_level=Correspondence.ArchiveLevel.DEPARTMENT)
            & department_in_division
        )
        division_record_in_scope = (
            Q(division_id=scope.division_id)
            | Q(division__isnull=True, department__division_id=scope.division_id)
            | Q(
                division__isnull=True,
                department__isnull=True,
                owning_office__division_id=scope.division_id,
            )
            | Q(
                division__isnull=True,
                department__isnull=True,
                owning_office__division__isnull=True,
                owning_office__department__division_id=scope.division_id,
            )
        )
        visible |= Q(archive_level=Correspondence.ArchiveLevel.DIVISION) & division_record_in_scope
        visible |= Q(archive_level="") & division_record_in_scope
    elif scope.level == "directorate" and scope.directorate_id:
        visible |= (
            Q(archive_level=Correspondence.ArchiveLevel.DEPARTMENT)
            & department_in_directorate
        )
        visible |= (
            Q(archive_level=Correspondence.ArchiveLevel.DIVISION)
            & division_in_directorate
        )
        directorate_record_in_scope = (
            Q(division__directorate_id=scope.directorate_id)
            | Q(division__isnull=True, department__division__directorate_id=scope.directorate_id)
            | Q(
                division__isnull=True,
                department__isnull=True,
                owning_office__directorate_id=scope.directorate_id,
            )
            | Q(
                division__isnull=True,
                department__isnull=True,
                owning_office__directorate__isnull=True,
                owning_office__division__directorate_id=scope.directorate_id,
            )
            | Q(
                division__isnull=True,
                department__isnull=True,
                owning_office__directorate__isnull=True,
                owning_office__division__isnull=True,
                owning_office__department__division__directorate_id=scope.directorate_id,
            )
        )
        visible |= Q(archive_level=Correspondence.ArchiveLevel.DIRECTORATE) & directorate_record_in_scope
        visible |= Q(archive_level="") & directorate_record_in_scope

    return visible


def filter_archived_records(queryset, user):
    """Limit a correspondence queryset to records the user can read in archives.

    Completed records retain the normal organisational boundary. Once a record
    is filed, its archive level and filing unit decide who may read it.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()

    queryset = queryset.filter(is_deleted=False)
    completed = apply_correspondence_org_scope(
        queryset.filter(status=Correspondence.Status.COMPLETED), user
    )
    archived = queryset.filter(status=Correspondence.Status.ARCHIVED).filter(
        archived_correspondence_visibility_q(user)
    ).distinct()
    return (completed | archived).distinct()


def archive_record_visible_to(user, correspondence_id) -> bool:
    """Whether a user may read this record through archive visibility."""
    if not correspondence_id or not user or not getattr(user, "is_authenticated", False):
        return False
    try:
        return filter_archived_records(
            Correspondence.all_objects.filter(pk=correspondence_id), user
        ).exists()
    except (DjangoValidationError, TypeError, ValueError):
        return False
