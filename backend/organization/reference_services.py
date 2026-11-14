"""Reference-number generation for organizational units.

References look like ``HQ/GM/ICT/AD/001``: location, authority tier, unit code,
classification code, then a continuous serial. Each classification owns its
counter, so ICT/AD and ICT/OP both start at 001.
"""

from __future__ import annotations

import re

from django.db import transaction
from django.utils import timezone

from .models import Department, Division, ReferenceAllocation, ReferenceClassification, ReferenceScheme


def sanitize_segment(value: str | None, fallback: str = "") -> str:
    """Keep letters, digits and ampersands so codes like ``SA&DM`` survive."""
    cleaned = re.sub(r"[^A-Za-z0-9&]+", "", str(value or "")).upper()
    return cleaned or fallback


def build_reference_number(
    scheme: ReferenceScheme,
    classification_code: str,
    serial: int,
) -> str:
    serial_length = max(2, min(int(scheme.serial_length or 3), 6))
    segments = [
        sanitize_segment(scheme.location_code, "HQ"),
        sanitize_segment(scheme.authority_code, "GM"),
    ]
    unit = sanitize_segment(scheme.unit_code)
    if unit:
        segments.append(unit)
    segments.extend((sanitize_segment(classification_code), str(int(serial)).zfill(serial_length)))
    return "/".join(segments)


def _active_scheme(scope_type: str, unit_id) -> ReferenceScheme | None:
    if not unit_id:
        return None
    return (
        ReferenceScheme.objects.filter(
            scope_type=scope_type,
            is_active=True,
            **{f"{scope_type}_id": unit_id},
        )
        .prefetch_related("classifications")
        .first()
    )


def resolve_reference_scheme(*, office=None, division=None, department=None) -> ReferenceScheme | None:
    """Pick the most specific active scheme for an office or explicit unit."""
    dept = department or getattr(office, "department", None)
    if dept is None and getattr(office, "department_id", None):
        dept = Department.objects.filter(pk=office.department_id).select_related("division__directorate").first()

    div = division or getattr(office, "division", None) or getattr(dept, "division", None)
    if div is None and getattr(office, "division_id", None):
        div = Division.objects.filter(pk=office.division_id).select_related("directorate").first()

    directorate = getattr(div, "directorate", None) or getattr(office, "directorate", None)
    if directorate is None and getattr(office, "directorate_id", None):
        directorate = office.directorate

    candidates = (
        (ReferenceScheme.ScopeType.DEPARTMENT, getattr(dept, "id", None)),
        (ReferenceScheme.ScopeType.DIVISION, getattr(div, "id", None)),
        (ReferenceScheme.ScopeType.DIRECTORATE, getattr(directorate, "id", None)),
    )
    for scope_type, unit_id in candidates:
        if not unit_id:
            continue
        scheme = _active_scheme(scope_type, unit_id)
        if scheme is not None:
            return scheme
    return None


def get_classification(scheme: ReferenceScheme, code: str | None) -> ReferenceClassification | None:
    cleaned = sanitize_segment(code)
    if not cleaned:
        return None
    return scheme.classifications.filter(code=cleaned, is_active=True).first()


def default_classification(scheme: ReferenceScheme) -> ReferenceClassification | None:
    classifications = list(scheme.classifications.filter(is_active=True))
    if not classifications:
        return None
    for classification in classifications:
        if classification.code == "AD":
            return classification
    return classifications[0]


def _next_free_serial(
    scheme: ReferenceScheme,
    classification: ReferenceClassification,
    *,
    starting_at: int | None = None,
) -> tuple[int, str]:
    from correspondence.models import Correspondence

    serial = max(int(starting_at or classification.next_serial or 1), 1)
    while serial < 10_000_000:
        candidate = build_reference_number(scheme, classification.code, serial)
        allocated = ReferenceAllocation.objects.filter(reference_number=candidate).exists()
        taken = allocated or Correspondence.all_objects.filter(reference_number=candidate).exists()
        if not taken:
            return serial, candidate
        serial += 1
    raise ValueError("Unable to find a free reference serial")


def preview_next_reference(
    scheme: ReferenceScheme,
    classification: ReferenceClassification,
) -> str:
    """Return the number that would be issued next, without consuming it."""
    _, candidate = _next_free_serial(scheme, classification)
    return candidate


@transaction.atomic
def allocate_reference(
    scheme: ReferenceScheme,
    classification: ReferenceClassification,
    *,
    user=None,
) -> tuple[str, ReferenceAllocation]:
    """Atomically consume the next serial for a scheme + classification."""
    locked = (
        ReferenceClassification.objects.select_for_update()
        .select_related("scheme")
        .get(pk=classification.pk)
    )
    scheme = locked.scheme
    serial, reference_number = _next_free_serial(scheme, locked)

    allocation = ReferenceAllocation.objects.create(
        scheme=scheme,
        classification=locked,
        reference_number=reference_number,
        scope_type=scheme.scope_type,
        unit_code=sanitize_segment(scheme.unit_code),
        classification_code=sanitize_segment(locked.code),
        serial=serial,
        segments={
            "location": sanitize_segment(scheme.location_code, "HQ"),
            "authority": sanitize_segment(scheme.authority_code, "GM"),
            "unit": sanitize_segment(scheme.unit_code),
            "classification": sanitize_segment(locked.code),
        },
        created_by=user if getattr(user, "is_authenticated", False) else None,
    )
    locked.next_serial = serial + 1
    locked.save(update_fields=["next_serial", "updated_at"])
    return reference_number, allocation


def serialize_scheme_preview(scheme: ReferenceScheme) -> list[dict]:
    """Compact classification payload used by the registration form."""
    rows = []
    for classification in scheme.classifications.filter(is_active=True):
        rows.append(
            {
                "code": classification.code,
                "label": classification.label,
                "next_serial": classification.next_serial,
                "preview": preview_next_reference(scheme, classification),
            }
        )
    return rows


def scheme_context(scheme: ReferenceScheme) -> dict:
    return {
        "id": str(scheme.id),
        "scope_type": scheme.scope_type,
        "unit_code": sanitize_segment(scheme.unit_code),
        "location_code": sanitize_segment(scheme.location_code, "HQ"),
        "authority_code": sanitize_segment(scheme.authority_code, "GM"),
        "classifications": serialize_scheme_preview(scheme),
    }


def current_year() -> int:
    return timezone.now().year
