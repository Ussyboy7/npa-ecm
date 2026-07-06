"""Tamper-evident audit export bundle generation."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import zipfile
from typing import Any, Iterable

from django.utils import timezone


def _row_for_log(log) -> list[str]:
    return [
        log.timestamp.isoformat() if log.timestamp else "",
        str(log.id),
        log.action or "",
        log.get_action_display() if hasattr(log, "get_action_display") else "",
        log.module or "",
        log.severity or "",
        str(log.user_id or ""),
        log.user.get_full_name() if log.user else "",
        log.user.email if log.user else "",
        log.description or "",
        log.object_type or "",
        str(log.object_id or ""),
        log.object_repr or "",
        "yes" if log.success else "no",
        log.error_message or "",
        log.ip_address or "",
        log.user_agent or "",
        json.dumps(log.metadata or {}, sort_keys=True, default=str),
    ]


CSV_HEADERS = [
    "timestamp",
    "id",
    "action",
    "action_display",
    "module",
    "severity",
    "user_id",
    "user_name",
    "user_email",
    "description",
    "object_type",
    "object_id",
    "object_repr",
    "success",
    "error_message",
    "ip_address",
    "user_agent",
    "metadata_json",
]


def build_compliance_bundle(
    logs: Iterable,
    *,
    exported_by,
    filters: dict[str, Any] | None = None,
) -> tuple[bytes, dict[str, Any]]:
    """
    Build a ZIP compliance bundle: audit-export.csv + manifest.json + checksum.sha256.
    Returns (zip_bytes, manifest_dict).
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_HEADERS)

    count = 0
    for log in logs:
        writer.writerow(_row_for_log(log))
        count += 1

    csv_content = buffer.getvalue()
    csv_bytes = csv_content.encode("utf-8")
    digest = hashlib.sha256(csv_bytes).hexdigest()

    exported_at = timezone.now().isoformat()
    manifest = {
        "format": "npa-ecm-audit-compliance-v1",
        "exported_at": exported_at,
        "exported_by": {
            "id": str(getattr(exported_by, "id", "")),
            "username": getattr(exported_by, "username", ""),
            "email": getattr(exported_by, "email", ""),
        },
        "record_count": count,
        "csv_filename": "audit-export.csv",
        "sha256": digest,
        "filters": filters or {},
        "verification": (
            "Recompute SHA-256 of audit-export.csv and compare to sha256 in this manifest."
        ),
    }
    manifest_bytes = json.dumps(manifest, indent=2, sort_keys=True).encode("utf-8")
    checksum_bytes = f"{digest}  audit-export.csv\n".encode("utf-8")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("audit-export.csv", csv_bytes)
        archive.writestr("manifest.json", manifest_bytes)
        archive.writestr("checksum.sha256", checksum_bytes)

    return zip_buffer.getvalue(), manifest
