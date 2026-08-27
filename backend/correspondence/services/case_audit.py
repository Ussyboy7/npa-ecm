"""Audit work-item aggregate helpers.

Promotes Case(case_type=AUDIT) as the work-item aggregate for audit forms.
Uses CaseFormLink / CaseDocumentLink for evidence and CaseWorkflowRule for
state/action governance rather than a fixed person chain.

Audit states: DRAFT -> SUBMITTED -> AWAITING_CERTIFICATION -> CERTIFIED
              -> REFERRED -> AWAITING_RESPONSE -> RESPONSE_RECEIVED
              -> AUDIT_REVIEW -> CLOSED
"""

from __future__ import annotations

import logging
from typing import Optional

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

AUDIT_TEMPLATE_SLUG = "audit-query-bills-certification"

AUDIT_STATES = [
    "DRAFT",
    "SUBMITTED",
    "AWAITING_CERTIFICATION",
    "CERTIFIED",
    "REFERRED",
    "AWAITING_RESPONSE",
    "RESPONSE_RECEIVED",
    "AUDIT_REVIEW",
    "CLOSED",
]

AUDIT_STATE_ACTIONS: dict[str, list[str]] = {
    "DRAFT": ["submit", "edit", "withdraw"],
    "SUBMITTED": ["request_certification", "refer", "return_to_draft"],
    "AWAITING_CERTIFICATION": ["certify", "query", "refer"],
    "CERTIFIED": ["close", "refer", "reopen_review"],
    "REFERRED": ["respond", "escalate", "close"],
    "AWAITING_RESPONSE": ["receive_response", "follow_up", "escalate"],
    "RESPONSE_RECEIVED": ["review", "certify", "refer", "close"],
    "AUDIT_REVIEW": ["certify", "refer", "request_response", "close"],
    "CLOSED": [],
}

# Allowed next-state transitions (edges). Permissive but prevents unnatural jumps.
AUDIT_TRANSITIONS: dict[str, list[str]] = {
    "DRAFT": ["SUBMITTED"],
    "SUBMITTED": ["AWAITING_CERTIFICATION", "REFERRED", "DRAFT"],
    "AWAITING_CERTIFICATION": ["CERTIFIED", "REFERRED", "SUBMITTED"],
    "CERTIFIED": ["CLOSED", "REFERRED", "AUDIT_REVIEW"],
    "REFERRED": ["AWAITING_RESPONSE", "CLOSED"],
    "AWAITING_RESPONSE": ["RESPONSE_RECEIVED", "REFERRED"],
    "RESPONSE_RECEIVED": ["AUDIT_REVIEW", "AWAITING_CERTIFICATION", "CLOSED"],
    "AUDIT_REVIEW": ["CERTIFIED", "REFERRED", "AWAITING_RESPONSE", "CLOSED"],
    "CLOSED": [],
}


def get_allowed_actions(state: str) -> list[str]:
    return AUDIT_STATE_ACTIONS.get(state.upper(), [])


def is_valid_audit_transition(from_state: str, to_state: str) -> bool:
    return to_state.upper() in AUDIT_TRANSITIONS.get(from_state.upper(), [])


def get_allowed_next_states(state: str) -> list[str]:
    return AUDIT_TRANSITIONS.get(state.upper(), [])


def ensure_audit_workflow_rules() -> int:
    """Seed CaseWorkflowRule entries for each audit state.

    One rule per state encoding allowed actions/next states.
    Idempotent via update_or_create on (name, case_type).
    """
    from correspondence.models import Case, CaseWorkflowRule

    created = 0
    for state in AUDIT_STATES:
        actions = AUDIT_STATE_ACTIONS.get(state, [])
        next_states = AUDIT_TRANSITIONS.get(state, [])
        name = f"AUDIT_STATE_{state}"
        defaults = {
            "description": f"Allowed actions for audit state {state}: {', '.join(actions) or 'none'}; next: {', '.join(next_states) or 'terminal'}",
            "priority": None,
            "trigger_type": CaseWorkflowRule.TriggerType.STATUS_CHANGE,
            "trigger_conditions": {
                "audit_state": state,
                "allowed_actions": actions,
                "allowed_next_states": next_states,
                "all_states": AUDIT_STATES,
            },
            "action_type": CaseWorkflowRule.ActionType.CHANGE_STATUS,
            "action_config": {
                "audit_state": state,
                "allowed_actions": actions,
                "allowed_next_states": next_states,
            },
            "is_active": True,
            "priority_order": AUDIT_STATES.index(state),
        }
        obj, was_created = CaseWorkflowRule.objects.update_or_create(
            name=name,
            case_type=Case.CaseType.AUDIT,
            defaults=defaults,
        )
        if was_created:
            created += 1
        else:
            # Ensure conditions stay in sync
            needs_update = (
                obj.trigger_conditions != defaults["trigger_conditions"]
                or obj.action_config != defaults["action_config"]
            )
            if needs_update:
                obj.trigger_conditions = defaults["trigger_conditions"]
                obj.action_config = defaults["action_config"]
                obj.description = defaults["description"]
                obj.save(update_fields=["trigger_conditions", "action_config", "description", "updated_at"])
    logger.info("Ensured audit workflow rules: %s states, %s newly created", len(AUDIT_STATES), created)
    return len(AUDIT_STATES)


def _audit_case_title(submission) -> str:
    data = getattr(submission, "data", {}) or {}
    pv_no = data.get("pv_no") or data.get("pvNo") or data.get("pv_number") or ""
    pv_no = str(pv_no).strip()
    if pv_no:
        # Use PV number for human title
        return f"AQ-{pv_no}"
    # Fallback to short id
    sid = str(getattr(submission, "id", ""))[:8].upper()
    return f"AQ-{sid}"


def _generate_audit_case_number(submission) -> str:
    from correspondence.models import Case
    # Prefer deterministic AQ- based on submission id.
    sid = str(submission.id).replace("-", "")[:8].upper()
    base = f"AQ-{sid}"
    if not Case.objects.filter(case_number=base).exists():
        return base
    # Collision -> add date suffix
    date_part = timezone.now().strftime("%Y%m%d")
    cand = f"AQ-{date_part}-{sid[:6]}"
    if not Case.objects.filter(case_number=cand).exists():
        return cand
    # Brute force suffix
    for i in range(1, 100):
        cand2 = f"{cand}-{i:02d}"
        if not Case.objects.filter(case_number=cand2).exists():
            return cand2
    import uuid
    return f"AQ-{uuid.uuid4().hex[:8].upper()}"


def _find_form_document_for_submission(submission):
    """Best-effort locate FormDocument linked to a FormSubmission."""
    from dms.models import FormDocument
    from forms.signature_models import FormSignatureWorkflow

    # 1) Via signature workflow: FormDocument -> signature_workflow -> submission
    try:
        wf = FormSignatureWorkflow.objects.filter(submission=submission).first()
        if wf:
            fd = FormDocument.objects.filter(signature_workflow=wf).select_related("document", "template").first()
            if fd:
                return fd
    except Exception:
        pass

    # 2) Via template + correspondence exact match
    try:
        qs = FormDocument.objects.filter(template=submission.template)
        if getattr(submission, "correspondence_id", None):
            fd = qs.filter(correspondence_id=submission.correspondence_id).select_related("document", "template").first()
            if fd:
                return fd
        # 3) Via form_data equality (for docs that were cloned from submission)
        # Do a python-level comparison to avoid JSON query fragility
        for fd in qs.select_related("document", "template")[:20]:
            if fd.form_data == submission.data:
                return fd
        # 4) Fallback: first FormDocument with same template
        fd = qs.select_related("document", "template").first()
        if fd:
            return fd
    except Exception:
        pass
    return None


def _link_evidence_for_submission(case, submission, form_document):
    """Link evidence Documents to the audit Case."""
    from correspondence.models import CaseDocumentLink, CorrespondenceDocumentLink

    linked = 0
    # Evidence via correspondence's linked documents
    corr = getattr(submission, "correspondence", None)
    if corr:
        links = CorrespondenceDocumentLink.objects.filter(correspondence=corr).select_related("document")
        for cl in links:
            if cl.document_id:
                _, created = CaseDocumentLink.objects.get_or_create(case=case, document=cl.document)
                if created:
                    linked += 1
        # Also link the correspondence itself
        from correspondence.models import CaseCorrespondenceLink
        _, created = CaseCorrespondenceLink.objects.get_or_create(
            case=case, correspondence=corr, defaults={"is_primary": True}
        )
    # Evidence via form_document's document
    if form_document and getattr(form_document, "document", None):
        # Don't double-link the form document itself as evidence; form is linked via CaseFormLink
        pass
    # Evidence via submission.data referencing document ids (if any)
    data = getattr(submission, "data", {}) or {}
    # Check common keys that might hold document references
    for key in ("evidence_documents", "attachments", "supporting_documents", "document_ids"):
        val = data.get(key)
        if isinstance(val, list):
            from dms.models import Document
            for doc_id in val:
                try:
                    doc = Document.objects.filter(id=doc_id).first()
                    if doc:
                        _, created = CaseDocumentLink.objects.get_or_create(case=case, document=doc)
                        if created:
                            linked += 1
                except Exception:
                    continue
    return linked


@transaction.atomic
def create_audit_case_for_submission(submission, form_document=None) -> Optional[object]:
    """Idempotently create Case(AUDIT) for a FormSubmission.

    Returns the Case instance (new or existing). Ensures one primary audit form
    per Case via CaseFormLink uniqueness.
    """
    from correspondence.models import Case, CaseFormLink
    from dms.models import Document, FormDocument

    if form_document is None:
        form_document = _find_form_document_for_submission(submission)

    # Idempotency check 1: existing CaseFormLink with this form_document
    if form_document:
        existing = CaseFormLink.objects.filter(form_document=form_document).select_related("case").first()
        if existing and existing.case.case_type == Case.CaseType.AUDIT:
            # Ensure metadata and evidence are linked
            _link_evidence_for_submission(existing.case, submission, form_document)
            return existing.case

    # Idempotency check 2: metadata lookup by submission id
    try:
        case = Case.objects.filter(metadata__audit_submission_id=str(submission.id)).first()
        if case:
            if form_document:
                CaseFormLink.objects.get_or_create(case=case, form_document=form_document)
            _link_evidence_for_submission(case, submission, form_document)
            return case
    except Exception:
        pass

    # Idempotency check 3: title match
    title = _audit_case_title(submission)
    case = Case.objects.filter(case_type=Case.CaseType.AUDIT, title=title).first()
    if case:
        # Update metadata to capture submission id for future lookups
        try:
            meta = case.metadata or {}
            if "audit_submission_id" not in meta:
                meta["audit_submission_id"] = str(submission.id)
                case.metadata = meta
                case.save(update_fields=["metadata", "updated_at"])
        except Exception:
            pass
        if form_document:
            CaseFormLink.objects.get_or_create(case=case, form_document=form_document)
        _link_evidence_for_submission(case, submission, form_document)
        return case

    # Need to create form_document if still None? Create a minimal one from submission
    if form_document is None:
        # Create a Document + FormDocument to back the submission so CaseFormLink can be created
        # This preserves the invariant of one primary audit form per Case(AUDIT)
        try:
            # Infer division/department from correspondence if available
            division = None
            department = None
            corr = getattr(submission, "correspondence", None)
            if corr:
                division = getattr(corr, "division", None)
                department = getattr(corr, "department", None)
            submitted_by = getattr(submission, "submitted_by", None)
            doc = Document.objects.create(
                title=title,
                description=f"Audit Query - Bills for Certification {title}",
                document_type=Document.DocumentType.FORM,
                status=Document.DocumentStatus.DRAFT,
                sensitivity=Document.Sensitivity.INTERNAL,
                author=submitted_by,
                division=division,
                department=department,
            )
            form_document = FormDocument.objects.create(
                document=doc,
                template=submission.template,
                form_data=getattr(submission, "data", {}) or {},
                status=FormDocument.FormStatus.DRAFT,
                correspondence=corr,
            )
        except Exception as e:
            logger.warning("Failed to auto-create FormDocument for submission %s: %s", submission.id, e)
            form_document = None

    # Determine division/department for the Case from form_document or correspondence
    division = None
    department = None
    if form_document and getattr(form_document, "document", None):
        division = getattr(form_document.document, "division", None)
        department = getattr(form_document.document, "department", None)
    if (division is None or department is None) and getattr(submission, "correspondence", None):
        corr = submission.correspondence
        division = division or getattr(corr, "division", None)
        department = department or getattr(corr, "department", None)

    case_number = _generate_audit_case_number(submission)
    submitted_by = getattr(submission, "submitted_by", None)
    data = getattr(submission, "data", {}) or {}

    case = Case.objects.create(
        case_number=case_number,
        title=title,
        description=f"Audit Query - Bills for Certification for {data.get('payee','')} (PV {data.get('pv_no','')})".strip(),
        case_type=Case.CaseType.AUDIT,
        status=Case.Status.OPEN,
        division=division,
        department=department,
        created_by=submitted_by,
        assigned_to=submitted_by,
        metadata={
            "audit_submission_id": str(submission.id),
            "audit_state": "DRAFT",
            "pv_no": data.get("pv_no", ""),
            "payee": data.get("payee", ""),
            "amount_naira": data.get("amount_naira", ""),
        },
        tags=["audit", "audit-query", "bills-certification"],
    )

    if form_document:
        CaseFormLink.objects.get_or_create(case=case, form_document=form_document)
    _link_evidence_for_submission(case, submission, form_document)

    # Link correspondence if present
    if getattr(submission, "correspondence", None):
        from correspondence.models import CaseCorrespondenceLink
        CaseCorrespondenceLink.objects.get_or_create(
            case=case, correspondence=submission.correspondence, defaults={"is_primary": True}
        )

    logger.info("Created audit Case %s (%s) for submission %s", case.case_number, title, submission.id)
    return case


def backfill_audit_cases() -> int:
    """For each FormSubmission with audit-query-bills-certification, ensure a Case(AUDIT)."""
    from forms.models import FormSubmission, FormTemplate

    try:
        template = FormTemplate.objects.get(slug=AUDIT_TEMPLATE_SLUG)
    except FormTemplate.DoesNotExist:
        logger.warning("Audit template %s not found; skipping backfill", AUDIT_TEMPLATE_SLUG)
        return 0

    submissions = FormSubmission.objects.filter(template=template).select_related("submitted_by", "template", "correspondence", "correspondence__division", "correspondence__department")
    count = 0
    for sub in submissions:
        try:
            create_audit_case_for_submission(sub)
            count += 1
        except Exception as e:
            logger.exception("Failed to backfill audit case for submission %s: %s", sub.id, e)
    logger.info("Backfilled %s audit submissions into Cases(AUDIT)", count)
    return count


def get_case_history(case) -> dict:
    """Build unified history for a Case(AUDIT): case + forms + correspondence + minutes.

    Returns dict with keys: case, forms, documents, correspondence, timeline
    """
    from correspondence.models import CaseCorrespondenceLink, CaseDocumentLink, CaseFormLink
    from forms.models import FormSubmission
    from dms.models import FormDocument

    # Forms
    form_links = CaseFormLink.objects.filter(case=case).select_related("form_document__document", "form_document__template", "form_document__correspondence")
    forms = []
    timeline = []
    for link in form_links:
        fd = link.form_document
        doc = getattr(fd, "document", None)
        tpl = getattr(fd, "template", None)
        # Try to find sibling FormSubmission(s) for this form_document via signature workflow or data match
        submissions = []
        try:
            from forms.signature_models import FormSignatureWorkflow
            if getattr(fd, "signature_workflow_id", None):
                wf = FormSignatureWorkflow.objects.filter(id=fd.signature_workflow_id).select_related("submission").first()
                if wf and wf.submission_id:
                    submissions.append(wf.submission)
            # Fallback: search submissions with same template and overlapping data/corr
            if not submissions and tpl:
                qs = FormSubmission.objects.filter(template=tpl)
                if getattr(fd, "correspondence_id", None):
                    qs2 = qs.filter(correspondence_id=fd.correspondence_id)
                    submissions.extend(list(qs2[:3]))
                if not submissions:
                    # Match by form_data equality
                    for s in qs[:20]:
                        if s.data == fd.form_data:
                            submissions.append(s)
                            break
        except Exception:
            pass

        forms.append({
            "case_form_link_id": str(link.id),
            "form_document_id": str(fd.id) if fd else None,
            "document_id": str(doc.id) if doc else None,
            "title": doc.title if doc else None,
            "template_slug": tpl.slug if tpl else None,
            "template_name": tpl.name if tpl else None,
            "status": getattr(fd, "status", None),
            "form_data": getattr(fd, "form_data", None),
            "submissions": [
                {"id": str(s.id), "template_slug": s.template.slug if s.template else None, "data": s.data, "submitted_by": str(s.submitted_by_id) if s.submitted_by_id else None, "created_at": s.created_at.isoformat() if s.created_at else None}
                for s in submissions
            ],
            "created_at": fd.created_at.isoformat() if getattr(fd, "created_at", None) else None,
        })
        # Timeline entry for form
        if fd and getattr(fd, "created_at", None):
            timeline.append({"type": "form", "id": str(fd.id), "title": doc.title if doc else "Form", "timestamp": fd.created_at, "detail": f"Form {doc.title if doc else ''}"})

    # Documents
    doc_links = CaseDocumentLink.objects.filter(case=case).select_related("document")
    documents = []
    for link in doc_links:
        doc = link.document
        documents.append({
            "case_document_link_id": str(link.id),
            "document_id": str(doc.id) if doc else None,
            "title": doc.title if doc else None,
            "reference_number": doc.reference_number if doc else None,
            "created_at": link.created_at.isoformat() if link.created_at else None,
        })
        if link.created_at:
            timeline.append({"type": "document", "id": str(link.id), "title": doc.title if doc else "Document", "timestamp": link.created_at, "detail": f"Evidence {doc.title if doc else ''}"})

    # Correspondence
    corr_links = CaseCorrespondenceLink.objects.filter(case=case).select_related("correspondence")
    correspondence = []
    for link in corr_links:
        corr = link.correspondence
        mins = []
        try:
            from correspondence.models import Minute
            mins_qs = Minute.objects.filter(correspondence=corr).select_related("user").order_by("timestamp") if corr else []
            for m in mins_qs:
                mins.append({"id": str(m.id), "user": str(m.user_id), "text": m.minute_text[:200] if m.minute_text else "", "timestamp": m.timestamp.isoformat() if m.timestamp else None})
                timeline.append({"type": "minute", "id": str(m.id), "title": f"Minute by {m.user_id}", "timestamp": m.timestamp, "detail": m.minute_text[:200] if m.minute_text else ""})
        except Exception:
            pass
        correspondence.append({
            "case_correspondence_link_id": str(link.id),
            "correspondence_id": str(corr.id) if corr else None,
            "reference_number": corr.reference_number if corr else None,
            "subject": corr.subject if corr else None,
            "status": corr.status if corr else None,
            "is_primary": link.is_primary,
            "created_at": link.created_at.isoformat() if link.created_at else None,
            "minutes": mins,
            "minutes_count": len(mins),
        })
        if corr and getattr(corr, "created_at", None):
            timeline.append({"type": "correspondence", "id": str(corr.id), "title": corr.subject if corr else "Correspondence", "timestamp": corr.created_at, "detail": corr.subject if corr else ""})

    # Case itself
    case_entry = {
        "id": str(case.id),
        "case_number": case.case_number,
        "title": case.title,
        "case_type": case.case_type,
        "status": case.status,
        "audit_state": (case.metadata or {}).get("audit_state"),
        "created_by": str(case.created_by_id) if case.created_by_id else None,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "opened_at": case.opened_at.isoformat() if case.opened_at else None,
    }
    timeline.append({"type": "case", "id": str(case.id), "title": case.title, "timestamp": case.created_at or case.opened_at, "detail": f"Case {case.case_number} opened"})

    # Sort timeline by timestamp
    def _ts(e):
        ts = e.get("timestamp")
        if ts is None:
            return timezone.now()
        return ts
    timeline_sorted = sorted(timeline, key=_ts)
    # Serialize timestamps
    for e in timeline_sorted:
        if hasattr(e["timestamp"], "isoformat"):
            e["timestamp"] = e["timestamp"].isoformat()

    return {
        "case": case_entry,
        "forms": forms,
        "documents": documents,
        "correspondence": correspondence,
        "timeline": timeline_sorted,
        "counts": {"forms": len(forms), "documents": len(documents), "correspondence": len(correspondence), "timeline": len(timeline_sorted)},
    }
