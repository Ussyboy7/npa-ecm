"""Audit and optionally replace legacy fallback correspondence references.

Only references matching the old fallback shapes are considered:

* ``NPA/<office>/<year>/<six-digit sequence>``
* ``NPA/CORR/<year>/<sequence or sequence label>``

Explicit/custom references such as ``NPA/CUSTOM/...`` are left alone. Run
without ``--apply`` to audit; rerun with ``--apply`` to allocate canonical
office-scheme references and record them in the reference ledger.
"""

from __future__ import annotations

import re

from django.core.management.base import BaseCommand
from django.db import transaction

from correspondence.models import Correspondence
from organization.reference_services import (
    allocate_reference,
    build_reference_number,
    default_classification,
    preview_next_reference,
    resolve_reference_scheme,
)

LEGACY_FALLBACK_RE = re.compile(
    r"^NPA/(?:[A-Z0-9&]+/\d{4}/\d{6}|CORR/\d{4}/[A-Z0-9]+(?:-[A-Z0-9]+)*)$"
)


class Command(BaseCommand):
    help = "Audit and backfill legacy NPA fallback references."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Allocate and save canonical references. Without this flag only audits.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        candidates = [
            correspondence
            for correspondence in (
                Correspondence.objects.filter(
                    reference_classification__isnull=True,
                    reference_allocations__isnull=True,
                )
                .select_related("owning_office", "division", "department")
                .order_by("created_at", "id")
            )
            if LEGACY_FALLBACK_RE.match(correspondence.reference_number or "")
        ]

        self.stdout.write(
            f"Legacy fallback references found: {len(candidates)} "
            f"({'apply' if apply_changes else 'dry run'})"
        )
        changed = 0
        skipped = 0
        preview_serials: dict[tuple, int] = {}
        for correspondence in candidates:
            scheme = resolve_reference_scheme(
                office=correspondence.owning_office,
                division=correspondence.division,
                department=correspondence.department,
            )
            classification = default_classification(scheme) if scheme else None
            if scheme is None or classification is None:
                skipped += 1
                self.stderr.write(
                    f"SKIP {correspondence.reference_number}: no active reference "
                    f"scheme/classification for office {correspondence.owning_office_id}"
                )
                continue

            if not apply_changes:
                preview_key = (scheme.pk, classification.pk)
                if preview_key in preview_serials:
                    preview = build_reference_number(
                        scheme, classification.code, preview_serials[preview_key]
                    )
                    preview_serials[preview_key] += 1
                else:
                    preview = preview_next_reference(scheme, classification)
                    preview_serials[preview_key] = (
                        int(preview.rsplit("/", 1)[-1]) + 1
                    )
                self.stdout.write(
                    f"WOULD {correspondence.reference_number} -> "
                    f"{preview} for {correspondence.subject[:60]}"
                )
                continue

            try:
                with transaction.atomic():
                    reference, allocation = allocate_reference(
                        scheme,
                        classification,
                        user=correspondence.created_by,
                    )
                    old_reference = correspondence.reference_number
                    correspondence.reference_number = reference
                    correspondence.reference_classification = classification
                    correspondence.save(
                        update_fields=[
                            "reference_number",
                            "reference_classification",
                            "updated_at",
                        ]
                    )
                    allocation.correspondence = correspondence
                    allocation.save(update_fields=["correspondence", "updated_at"])
                changed += 1
                self.stdout.write(f"{old_reference} -> {reference}")
            except Exception as exc:
                skipped += 1
                self.stderr.write(
                    f"SKIP {correspondence.reference_number}: {exc}"
                )

        self.stdout.write(
            f"Backfill complete: changed={changed} skipped={skipped} "
            f"candidates={len(candidates)}"
        )
