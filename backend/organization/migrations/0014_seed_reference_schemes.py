"""Seed reference schemes for existing directorates, divisions and departments.

Authority tiers follow the unit level: directorates use ED (MD for the MD
directorate), divisions GM, departments AGM. Admins can edit every segment and
the per-classification counters from Template Hub → Reference.
"""

import re

from django.db import migrations


def _segment(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9&]+", "", str(value or "")).upper()
    return cleaned[:32]


def seed_reference_schemes(apps, schema_editor):
    Directorate = apps.get_model("organization", "Directorate")
    Division = apps.get_model("organization", "Division")
    Department = apps.get_model("organization", "Department")
    ReferenceScheme = apps.get_model("organization", "ReferenceScheme")
    ReferenceClassification = apps.get_model("organization", "ReferenceClassification")

    def ensure_scheme(scope_type, unit, authority):
        unit_code = _segment(getattr(unit, "code", ""))
        if not unit_code:
            return
        if ReferenceScheme.objects.filter(
            scope_type=scope_type, **{scope_type: unit}
        ).exists():
            return
        scheme = ReferenceScheme.objects.create(
            scope_type=scope_type,
            **{scope_type: unit},
            location_code="HQ",
            authority_code=authority,
            unit_code=unit_code,
            serial_length=3,
            description="",
            is_active=True,
        )
        ReferenceClassification.objects.bulk_create(
            [
                ReferenceClassification(
                    scheme=scheme, code="AD", label="Administrative", next_serial=1
                ),
                ReferenceClassification(
                    scheme=scheme, code="OP", label="Operations", next_serial=1
                ),
                ReferenceClassification(
                    scheme=scheme, code="CON", label="Confidential", next_serial=1
                ),
            ]
        )

    for directorate in Directorate.objects.all():
        authority = "MD" if (directorate.code or "").upper() == "MD" else "ED"
        ensure_scheme("directorate", directorate, authority)

    for division in Division.objects.select_related("directorate").all():
        ensure_scheme("division", division, "GM")

    for department in Department.objects.all():
        ensure_scheme("department", department, "AGM")


class Migration(migrations.Migration):
    dependencies = [
        ("organization", "0013_referencescheme_referenceclassification_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_reference_schemes, migrations.RunPython.noop),
    ]
