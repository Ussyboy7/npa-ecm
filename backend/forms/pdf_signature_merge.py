"""Merge FormSignature rows into PDF field dictionaries."""

from __future__ import annotations

from typing import Any, Iterable

# Fixed signature slots used across audit PDF facsimiles.
MONITORING_SIGNATURE_ROLES = ("pm", "procurement", "audit")
WITNESSING_SIGNATURE_ROLES = ("user_dept", "procurement", "audit")
ALL_SIGNATURE_ROLES = (
    "pm",
    "user_dept",
    "procurement",
    "audit",
    "supplier",
    "gm_audit",
)

MONITORING_DEFAULT_FIELDS = [
    {"name": "pm_signature", "label": "Project Manager/Engineer"},
    {"name": "procurement_signature", "label": "Procurement"},
    {"name": "audit_signature", "label": "Audit"},
]


def _user_haystack(user) -> str:
    if user is None:
        return ""
    parts = [
        getattr(user, "username", "") or "",
        getattr(user, "email", "") or "",
        user.get_full_name() if hasattr(user, "get_full_name") else "",
    ]
    division = getattr(user, "division", None)
    if division is not None:
        parts.append(getattr(division, "name", "") or "")
        parts.append(getattr(division, "code", "") or "")
    department = getattr(user, "department", None)
    if department is not None:
        parts.append(getattr(department, "name", "") or "")
    return " ".join(parts).lower()


def infer_signature_role(signature) -> str | None:
    """Map a FormSignature to pm / procurement / audit when possible."""
    field_name = (getattr(signature, "field_name", None) or "").strip().lower()
    if field_name.endswith("_signature"):
        prefix = field_name[: -len("_signature")]
        if prefix in ALL_SIGNATURE_ROLES:
            return prefix
        if prefix in {"project_manager", "project-manager", "engineer"}:
            return "pm"
        if prefix in {"user", "user_department", "user-dept"}:
            return "user_dept"

    hay = _user_haystack(getattr(signature, "assigned_to_user", None))
    if any(token in hay for token in ("audit", "gmaudit", "gm.audit")):
        return "audit"
    if any(token in hay for token in ("procurement", "gmprocurement", "gm.procurement")):
        return "procurement"
    if any(
        token in hay
        for token in ("ict", "gmict", "engineering", "project manager", "engineer")
    ):
        return "pm"
    return None


def resolve_signature_roles(
    signatures: Iterable[Any],
    role_order: tuple[str, ...] = MONITORING_SIGNATURE_ROLES,
) -> list[tuple[Any, str]]:
    """Assign each signature a unique role from role_order."""
    signed = list(signatures)
    assigned: dict[int, str] = {}
    used: set[str] = set()

    # Pass 1: explicit / inferred roles
    for idx, signature in enumerate(signed):
        role = infer_signature_role(signature)
        if role and role in role_order and role not in used:
            assigned[idx] = role
            used.add(role)

    # Pass 2: fill remaining in canonical order
    for idx, signature in enumerate(signed):
        if idx in assigned:
            continue
        for role in role_order:
            if role not in used:
                assigned[idx] = role
                used.add(role)
                break

    return [(signature, assigned[idx]) for idx, signature in enumerate(signed) if idx in assigned]


def _signature_image_payload(signature) -> bytes | None:
    file_field = getattr(signature, "signature_file", None)
    if not file_field:
        return None
    try:
        with file_field.open("rb") as handle:
            data = handle.read()
        return data or None
    except Exception:
        return None


def merge_signatures_into_pdf_data(
    pdf_data: dict[str, Any],
    signatures: Iterable[Any],
    role_order: tuple[str, ...] = MONITORING_SIGNATURE_ROLES,
) -> dict[str, Any]:
    """Write signer metadata + image bytes into pdf_data under role prefixes."""
    data = dict(pdf_data or {})
    for signature, role in resolve_signature_roles(signatures, role_order=role_order):
        user = getattr(signature, "assigned_to_user", None) or getattr(signature, "signed_by", None)
        pn = (getattr(signature, "signer_pn", "") or "").strip()
        if not pn and user is not None:
            pn = (getattr(user, "employee_id", "") or "").strip()

        data[f"{role}_name"] = getattr(signature, "signer_name", "") or ""
        data[f"{role}_pn"] = pn
        data[f"{role}_designation"] = getattr(signature, "signer_designation", "") or ""
        signed_date = getattr(signature, "signed_date", None)
        data[f"{role}_date"] = signed_date.isoformat() if signed_date else ""
        data[f"{role}_signature"] = True
        image_bytes = _signature_image_payload(signature)
        if image_bytes:
            data[f"{role}_signature_image"] = image_bytes

    return data


def signature_fields_for_template(template, fallback_fields: list[dict] | None = None) -> list[dict]:
    """Default signature slots when the template has none marked."""
    if fallback_fields:
        return fallback_fields
    slug = getattr(template, "slug", "") or ""
    if slug == "project-monitoring-report-audit":
        return list(MONITORING_DEFAULT_FIELDS)
    if slug == "witnessing-of-deliveries":
        return [
            {"name": "user_dept_signature", "label": "User Department"},
            {"name": "procurement_signature", "label": "Procurement"},
            {"name": "audit_signature", "label": "Audit"},
        ]
    return [{"name": "approval_signature", "label": "Approval Signature"}]


def pick_signature_field_for_recipient(
    recipient,
    fields: list[dict],
    used_names: set[str],
) -> dict:
    """Choose the best unused signature field for a recipient."""
    hay = _user_haystack(recipient)
    preferred = None
    if any(token in hay for token in ("audit", "gmaudit", "gm.audit")):
        preferred = "audit_signature"
    elif any(token in hay for token in ("procurement", "gmprocurement", "gm.procurement")):
        preferred = "procurement_signature"
    elif any(token in hay for token in ("ict", "gmict", "engineering", "engineer")):
        preferred = "pm_signature"

    if preferred:
        for field in fields:
            name = str(field.get("name") or "")
            if name == preferred and name not in used_names:
                return field

    # Prefer user_dept for remaining ICT/ops-like recipients on witnessing forms
    for field in fields:
        name = str(field.get("name") or "approval_signature")
        if name == "user_dept_signature" and name not in used_names:
            if any(token in hay for token in ("user", "department", "ops", "officer")):
                return field

    for field in fields:
        name = str(field.get("name") or "approval_signature")
        if name not in used_names:
            return field

    # All fields used — reuse first (last resort)
    return fields[0] if fields else {"name": "approval_signature", "label": "Approval Signature"}
