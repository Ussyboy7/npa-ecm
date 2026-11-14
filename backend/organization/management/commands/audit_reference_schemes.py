"""Audit reference-scheme coverage against the active office hierarchy."""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from organization.models import Office
from organization.reference_services import (
    default_classification,
    preview_next_reference,
    resolve_reference_scheme,
    sanitize_segment,
)

EXPECTED_SCOPE = {
    "department": "department_id",
    "division": "division_id",
    "directorate": "directorate_id",
}


def _exact_scope(office, scheme) -> bool:
    field = EXPECTED_SCOPE.get(scheme.scope_type)
    if not field:
        return False
    office_value = getattr(office, field, None)
    return bool(office_value and getattr(scheme, field, None) == office_value)


class Command(BaseCommand):
    help = "Audit reference schemes for active offices and flag manual review items."

    def add_arguments(self, parser):
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit non-zero when a blocking scheme issue is found.",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="List every resolved scheme, not only issues.",
        )

    def handle(self, *args, **options):
        missing = []
        inherited = []
        no_classification = []
        blank_unit = []
        custom_unit = []
        checked = 0

        offices = (
            Office.objects.filter(is_active=True)
            .select_related("department__division__directorate", "division", "directorate")
            .order_by("name")
        )
        for office in offices:
            checked += 1
            scheme = resolve_reference_scheme(
                office=office,
                division=office.division,
                department=office.department,
            )
            if scheme is None:
                missing.append(office)
                continue

            classification = default_classification(scheme)
            if classification is None:
                no_classification.append((office, scheme))
                continue

            preview = preview_next_reference(scheme, classification)
            exact = _exact_scope(office, scheme)
            if not exact:
                inherited.append((office, scheme, preview))

            unit = scheme.unit
            raw_code = sanitize_segment(
                getattr(unit, "code", None) or getattr(unit, "name", None)
            )
            # MD schemes intentionally omit the unit segment: HQ/MD/AD/001.
            if not sanitize_segment(scheme.unit_code) and raw_code != "MD":
                blank_unit.append((office, scheme, preview))

            if scheme.unit_code != raw_code and not (
                not scheme.unit_code and raw_code == "MD"
            ):
                custom_unit.append((office, scheme, preview, raw_code))

            if options["verbose"]:
                scope = "exact" if exact else "inherited"
                self.stdout.write(
                    f"OK   {office.name}: {preview} ({scope}, {scheme.unit_code or 'blank'})"
                )

        self.stdout.write(
            f"Checked {checked} active offices; schemes are resolved per office."
        )
        if missing:
            self.stdout.write(self.style.ERROR(f"Missing scheme: {len(missing)}"))
            for office in missing:
                self.stdout.write(f"  - {office.name} ({office.code})")
        if no_classification:
            self.stdout.write(
                self.style.ERROR(f"No active classification: {len(no_classification)}")
            )
            for office, scheme in no_classification:
                self.stdout.write(f"  - {office.name}: {scheme}")
        if inherited:
            self.stdout.write(
                self.style.WARNING(f"Inherited scheme (not exact unit): {len(inherited)}")
            )
            for office, scheme, preview in inherited:
                self.stdout.write(
                    f"  - {office.name}: {preview} from {scheme.get_scope_type_display()} "
                    f"{scheme.unit_name or scheme.unit_code}"
                )
        if blank_unit:
            self.stdout.write(
                self.style.WARNING(f"Blank unit segment: {len(blank_unit)}")
            )
            for office, scheme, preview in blank_unit:
                self.stdout.write(f"  - {office.name}: {preview}")
        if custom_unit:
            self.stdout.write(
                self.style.WARNING(
                    f"Custom unit segment (confirm against letterhead): {len(custom_unit)}"
                )
            )
            for office, scheme, preview, raw_code in custom_unit:
                self.stdout.write(
                    f"  - {office.name}: {scheme.unit_code} "
                    f"(unit code is {raw_code or 'blank'})"
                )

        if options["strict"] and (missing or no_classification):
            raise CommandError("Blocking reference-scheme issues found.")
