"""Freeze the approval record and generated PDF for later verification."""

from __future__ import annotations

import hashlib

from django.core.files.base import ContentFile
from django.utils import timezone

from correspondence.models import ApprovalSnapshot, Minute


def _display_name(user) -> str:
    if not user:
        return ""
    return user.get_full_name() or user.username


def _personnel_number(user) -> str:
    if not user:
        return ""
    return getattr(user, "personnel_number", "") or getattr(user, "employee_id", "")


def _designation(user) -> str:
    if not user:
        return ""
    designation = getattr(user, "designation", "") or ""
    if designation:
        return designation
    role = getattr(user, "system_role", None)
    return getattr(role, "name", "") if role else ""


def _minutes_snapshot(correspondence) -> list[dict[str, str | int]]:
    minutes = (
        Minute.objects.filter(correspondence=correspondence)
        .select_related("user", "from_office", "to_office")
        .order_by("timestamp", "step_number")
    )
    result = []
    for minute in minutes:
        office = (
            minute.from_office.name
            if getattr(minute, "from_office", None)
            else minute.to_office.name
            if getattr(minute, "to_office", None)
            else ""
        )
        result.append(
            {
                "step": minute.step_number,
                "action": minute.get_action_type_display(),
                "by": _display_name(getattr(minute, "user", None)),
                "personnel_number": _personnel_number(getattr(minute, "user", None)),
                "designation": _designation(getattr(minute, "user", None)),
                "office": office,
                "date": minute.timestamp.isoformat() if minute.timestamp else "",
                "note": minute.minute_text or "",
            }
        )
    return result


def _snapshot_defaults(minute, correspondence, seal, approved_document) -> dict:
    from .approval_pdf import _verification_url

    user = getattr(minute, "user", None)
    level = str(getattr(minute, "approval_level", "") or "").lower()
    approval_kind = (
        "EXECUTIVE APPROVAL"
        if level == Minute.ApprovalLevel.EXECUTIVE
        else "DEPARTMENTAL APPROVAL"
    )
    to_office = getattr(minute, "to_office", None)
    current_office = getattr(correspondence, "current_office", None)
    decision_route = (
        getattr(to_office, "name", "")
        or getattr(current_office, "name", "")
        or ""
    )
    return {
        "correspondence": correspondence,
        "seal": seal,
        "approved_document": approved_document,
        "document_reference": correspondence.reference_number or str(correspondence.id),
        "subject": correspondence.subject or "",
        "approval_kind": approval_kind,
        "approval_level": level,
        "decision_route": decision_route,
        "minute_text": minute.minute_text or "",
        "approved_at": minute.timestamp,
        "signer_name": _display_name(user),
        "signer_personnel_number": _personnel_number(user),
        "signer_designation": _designation(user),
        "signer_office": getattr(seal, "office_title", "") if seal else "",
        "seal_serial": getattr(seal, "serial_number", "") if seal else "",
        "seal_verification_url": _verification_url(seal) if seal else "",
        "sealed_at": getattr(seal, "sealed_at", None) if seal else None,
        "minutes": _minutes_snapshot(correspondence),
    }


def capture_approval_snapshot(
    *,
    minute,
    correspondence,
    seal,
    pdf_bytes: bytes,
    approved_document=None,
) -> ApprovalSnapshot:
    """Create the snapshot once; a later metadata change must not rewrite it."""

    snapshot = get_or_create_approval_snapshot(
        minute=minute,
        correspondence=correspondence,
        seal=seal,
        approved_document=approved_document,
    )
    update_fields = []
    if approved_document is not None and snapshot.approved_document_id is None:
        snapshot.approved_document = approved_document
        update_fields.append("approved_document")
    if not snapshot.pdf_file or not snapshot.pdf_sha256:
        snapshot.pdf_file.save(
            f"{minute.id}.pdf",
            ContentFile(pdf_bytes),
            save=False,
        )
        snapshot.pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
        snapshot.pdf_generated_at = snapshot.pdf_generated_at or timezone.now()
        update_fields.extend(["pdf_file", "pdf_sha256", "pdf_generated_at"])
    if update_fields:
        snapshot.save(
            update_fields=[*update_fields, "updated_at"]
        )
    return snapshot


def get_or_create_approval_snapshot(
    *, minute, correspondence, seal, approved_document=None
) -> ApprovalSnapshot:
    """Create the identity snapshot; existing values are never overwritten."""

    snapshot, _ = ApprovalSnapshot.objects.get_or_create(
        minute=minute,
        defaults=_snapshot_defaults(minute, correspondence, seal, approved_document),
    )
    return snapshot


def load_stored_pdf(minute) -> bytes | None:
    """Return the frozen PDF, or None when no intact snapshot exists."""

    snapshot = ApprovalSnapshot.objects.filter(minute=minute).first()
    if not snapshot or not snapshot.pdf_file:
        return None
    try:
        with snapshot.pdf_file.open("rb") as handle:
            pdf_bytes = handle.read()
    except (OSError, ValueError, AttributeError):
        return None
    digest = hashlib.sha256(pdf_bytes).hexdigest()
    if snapshot.pdf_sha256 and digest != snapshot.pdf_sha256:
        return None
    return pdf_bytes


def snapshot_for_seal(seal):
    if not seal:
        return None
    return (
        ApprovalSnapshot.objects.filter(seal=seal)
        .select_related("minute", "correspondence")
        .order_by("-created_at")
        .first()
    )
