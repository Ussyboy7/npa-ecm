"""eDiscovery export bundle for legal holds."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import zipfile
from typing import Any, Iterable

from django.utils import timezone


def _correspondence_row(item) -> list[str]:
    return [
        str(item.id),
        item.reference_number or "",
        item.subject or "",
        item.status or "",
        item.source or "",
        item.direction or "",
        item.priority or "",
        item.archive_level or "",
        item.created_at.isoformat() if item.created_at else "",
        item.updated_at.isoformat() if item.updated_at else "",
        item.archived_at.isoformat() if getattr(item, "archived_at", None) else "",
        "yes" if getattr(item, "is_on_legal_hold", False) else "no",
        str(getattr(item, "owning_office_id", "") or ""),
        str(getattr(item, "division_id", "") or ""),
        str(getattr(item, "department_id", "") or ""),
    ]


CORRESPONDENCE_HEADERS = [
    "id",
    "reference_number",
    "subject",
    "status",
    "source",
    "direction",
    "priority",
    "archive_level",
    "created_at",
    "updated_at",
    "archived_at",
    "is_on_legal_hold",
    "owning_office_id",
    "division_id",
    "department_id",
]


def _document_row(doc) -> list[str]:
    author = getattr(doc, "author", None)
    return [
        str(doc.id),
        doc.title or "",
        doc.reference_number or "",
        doc.document_type or "",
        doc.status or "",
        doc.sensitivity or "",
        author.get_full_name() if author and hasattr(author, "get_full_name") else "",
        getattr(author, "email", "") if author else "",
        doc.created_at.isoformat() if doc.created_at else "",
        doc.updated_at.isoformat() if doc.updated_at else "",
    ]


DOCUMENT_HEADERS = [
    "id",
    "title",
    "reference_number",
    "document_type",
    "status",
    "sensitivity",
    "author_name",
    "author_email",
    "created_at",
    "updated_at",
]


def _write_csv(headers: list[str], rows: Iterable[list[str]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    count = 0
    for row in rows:
        writer.writerow(row)
        count += 1
    return buffer.getvalue().encode("utf-8"), count


def build_ediscovery_bundle(legal_hold, *, exported_by) -> tuple[bytes, dict[str, Any]]:
    """Build tamper-evident eDiscovery ZIP for a legal hold."""
    correspondence_items = list(
        legal_hold.correspondence_items.select_related(
            "owning_office", "division", "department"
        ).order_by("reference_number")
    )
    documents = list(legal_hold.documents.select_related("author").order_by("title"))

    corr_bytes, corr_count = _write_csv(
        CORRESPONDENCE_HEADERS,
        (_correspondence_row(item) for item in correspondence_items),
    )
    doc_bytes, doc_count = _write_csv(
        DOCUMENT_HEADERS,
        (_document_row(doc) for doc in documents),
    )

    file_hashes = {
        "correspondence-export.csv": hashlib.sha256(corr_bytes).hexdigest(),
        "documents-export.csv": hashlib.sha256(doc_bytes).hexdigest(),
    }
    combined_digest = hashlib.sha256(corr_bytes + doc_bytes).hexdigest()

    exported_at = timezone.now().isoformat()
    manifest = {
        "format": "npa-ecm-ediscovery-v1",
        "exported_at": exported_at,
        "exported_by": {
            "id": str(getattr(exported_by, "id", "")),
            "username": getattr(exported_by, "username", ""),
            "email": getattr(exported_by, "email", ""),
        },
        "legal_hold": {
            "id": str(legal_hold.id),
            "name": legal_hold.name,
            "matter_reference": legal_hold.matter_reference,
            "is_active": legal_hold.is_active,
        },
        "correspondence_count": corr_count,
        "document_count": doc_count,
        "file_hashes": file_hashes,
        "bundle_sha256": combined_digest,
        "verification": (
            "Verify each CSV SHA-256 against file_hashes, then bundle_sha256 over "
            "concatenated correspondence-export.csv + documents-export.csv bytes."
        ),
    }
    manifest_bytes = json.dumps(manifest, indent=2, sort_keys=True).encode("utf-8")
    checksum_lines = "\n".join(f"{digest}  {name}" for name, digest in file_hashes.items())
    checksum_bytes = f"{checksum_lines}\n".encode("utf-8")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("correspondence-export.csv", corr_bytes)
        archive.writestr("documents-export.csv", doc_bytes)
        archive.writestr("manifest.json", manifest_bytes)
        archive.writestr("checksum.sha256", checksum_bytes)

    return zip_buffer.getvalue(), manifest
