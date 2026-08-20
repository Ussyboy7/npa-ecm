"""Allocate and persist form serial numbers (CHQ / HQ / form No.)."""

from __future__ import annotations

import re

from django.db import transaction
from django.utils import timezone

from forms.models import FormSerialCounter

# template slug → (form_data field, counter key prefix, zero-pad width)
SERIAL_FIELD_BY_TEMPLATE: dict[str, tuple[str, str, int]] = {
    "project-monitoring-report-audit": ("chq_no", "chq", 5),
    "witnessing-of-deliveries": ("form_no", "wod", 4),
    "audit-query-bills-certification": ("hq_serial", "hq", 7),
}

_DIGITS = re.compile(r"(\d+)")


def _parse_serial_int(value: str) -> int:
    text = str(value or "").strip()
    if not text:
        return 0
    if text.isdigit():
        return int(text)
    matches = _DIGITS.findall(text)
    return int(matches[-1]) if matches else 0


def _max_existing_serial(template_slug: str, field_name: str) -> int:
    """Highest numeric serial already stored on FormDocuments for this template."""
    from dms.models import FormDocument

    highest = 0
    qs = FormDocument.objects.filter(template__slug=template_slug).values_list("form_data", flat=True)
    for form_data in qs.iterator():
        if not isinstance(form_data, dict):
            continue
        highest = max(highest, _parse_serial_int(form_data.get(field_name)))
        if field_name != "serial_no":
            highest = max(highest, _parse_serial_int(form_data.get("serial_no")))
    return highest


@transaction.atomic
def allocate_serial(series_key: str, *, width: int = 7, bootstrap_min: int = 0) -> str:
    counter, _ = FormSerialCounter.objects.select_for_update().get_or_create(
        key=series_key,
        defaults={"last_value": 0},
    )
    if bootstrap_min > counter.last_value:
        counter.last_value = bootstrap_min
    counter.last_value += 1
    counter.save(update_fields=["last_value", "updated_at"])
    return str(counter.last_value).zfill(width)


def ensure_form_serial(form_doc, pdf_data: dict) -> dict:
    """
    Ensure the PDF payload has a serial for this template.

    If the form already has a value, keep it. Otherwise allocate one and persist
    it onto FormDocument.form_data so regenerations stay stable.
    """
    data = dict(pdf_data or {})
    template = getattr(form_doc, "template", None)
    slug = getattr(template, "slug", "") or ""
    spec = SERIAL_FIELD_BY_TEMPLATE.get(slug)
    if not spec:
        return data

    field_name, prefix, width = spec
    existing = str(data.get(field_name) or "").strip()
    if existing:
        return data

    year = timezone.now().year
    bootstrap = _max_existing_serial(slug, field_name)
    serial = allocate_serial(f"{prefix}-{year}", width=width, bootstrap_min=bootstrap)
    data[field_name] = serial

    if slug == "witnessing-of-deliveries":
        data.setdefault("serial_no", serial)
    if slug == "audit-query-bills-certification":
        data.setdefault("serial_no", serial)

    form_data = dict(form_doc.form_data or {})
    form_data[field_name] = serial
    form_doc.form_data = form_data
    form_doc.save(update_fields=["form_data", "updated_at"])
    return data
