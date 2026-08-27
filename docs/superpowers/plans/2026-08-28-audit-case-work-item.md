# Audit Case Work-Item Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote existing `Case(case_type=AUDIT)` to the authoritative Audit Case aggregate, separating initiation (any Audit officer) from certification (GM Audit principal) and human-selected routing via Correspondence, with tiered approval hygiene already live.

**Architecture:** `Case(AUDIT)` owns `FormSubmission/FormDocument` via `CaseFormLink`, evidence via `CaseDocumentLink`, lifecycle via `CaseWorkflowRule` (allowed states/actions, not fixed chain), `FormSignatureWorkflow` only for `CERTIFY`, `Correspondence` as a `REFER` edge with `target/attention/cc/action/due_date`, `FormSubmission.data` editable until `CERTIFIED` snapshot to `FormDocument` + `DocumentVersion`.

**Tech Stack:** Django 4.2 + DRF, PostgreSQL 16, Next.js 16, `Case`/`CaseFormLink`/`CaseDocumentLink`/`CaseWorkflowRule` (`correspondence/models.py:1119`), `FormDocument` (`dms/models.py:380`), `FormSubmission` (`forms/models.py:81`), `FormSignatureWorkflow` (`forms/signature_models.py:14`), `Correspondence`/`Minute` (`correspondence/models.py:16/574`), `approval-pdf` (`minutes_views.py:389`, `services.py:1326` tier-aware).

## Global Constraints

- No parallel `AuditCase` model — promote existing `Case`.
- `FormDocument.form_data` immutability only at `CERTIFY` transaction boundary; inspect sync before making immutable to avoid breaking non-audit forms.
- `OFF_DIV_AUDIT` membership ≠ GM Audit authority; `CERTIFY` requires `assigned_to_user=gmaudit` or GM Audit role or explicit `Delegation`.
- `REFER` is a Case action (validate → create Correspondence → link → state `AWAITING_RESPONSE` → history) atomically, not a frontend shortcut.
- Every state transition logs `actor + timestamp + action + references`; every `Correspondence` linked to its `Case`.

---

## 1. Current Architecture Trace

- **Case** `correspondence/models.py:1119` `CaseType AUDIT`, `CaseFormLink:1268`/`CaseDocumentLink:1283`, `CaseWorkflowRule:1446` exists but underused; seeded `audit-query-bills-certification` `FormTemplate` + `FormDocument(AWAITING_SIGNATURES)`.
- **FormDocument** `dms/models.py:380` vs **FormSubmission** `forms/models.py:81` duplication: both hold `form_data`/`data`; PDF via `dms/form_views.py:144`.
- **Signatures** `forms/signature_models.py:14` → `forms/signature_views.py:23` `create_workflow`, `425 _can_user_sign()` (OfficeMembership), `174 sign()` → `FormDocument.COMPLETED`.
- **Correspondence** `correspondence/models.py:16` + `services.py:1326 generate_approval_pdf` tier-aware, `minutes_views.py:389 approval-pdf`.
- **Frontend** `app/audit/forms/page.tsx` list, `app/audit/forms/[submissionId]/page.tsx` editor with `Forward via Correspondence` dialog using `submission?.id` bug.

## 2. Target Audit Case Aggregate

- **Authoritative:** `Case(case_type=AUDIT, reference AQ-YYYY-XXX)` owns the work; `CaseFormLink` → primary audit form, `CaseDocumentLink` → evidence, `Correspondence` via `CaseCorrespondenceLink`.
- **Why:** Gives `AWAITING_CERTIFICATION` queue, single `AQ-…` identity, unified history.

## 3. State Machine

```
DRAFT → SUBMITTED → AWAITING_CERTIFICATION → CERTIFIED —REFER→ AWAITING_RESPONSE → RESPONSE_RECEIVED → AUDIT_REVIEW → CLOSED
                              ↓ RETURNED/REQUEST_INFO → (officer rework) → RESUBMIT
```

- `REFERRED` is the **action**, `AWAITING_RESPONSE` is the **resulting state**.

## 4. Capabilities / Actions

| Actor | Capabilities |
|-------|--------------|
| Audit Officer | CREATE_AUDIT_QUERY, EDIT_OWN_DRAFT, SUBMIT, SEND_FOR_CERTIFICATION, REFER (when CERTIFIED), REVIEW |
| GM Audit | VERIFY, CERTIFY (signature), RETURN, REQUEST_INFO, CLOSE, REFER |

Capability-based, not single `can_approve`.

## 5. Certification vs Routing

- **Certification** = `CERTIFY` → requires `FormSignatureWorkflow` + signature, `FormDocument → COMPLETED`, immutable.
- **Routing** = `REFER`/`FORWARD` → human-selected `Correspondence`, no signature.

## 6. Correspondence Integration

- `REFER` → `POST /correspondence/items/ {subject, body_html, required_approval_level, target_office, attention, cc, action_required, due_date}` → `CaseCorrespondenceLink`.
- Fix `owning_office` collapse: separate `origin/target/attention/cc`.

## 7. Invariants (Acceptance Criteria)

1. One primary audit form per `Case(AUDIT)`.
2. Officer creates/submits without GM.
3. Only `gmaudit` principal certifies.
4. `CERTIFY` requires signature.
5. `REFER` does not.
6. Every referred `Correspondence` linked to its `Case`.
7. `target ≠ origin`.
8. `FormSubmission.id` never used as `Document/FormDocument.id`.
9. Certified data immutable.
10. Every transition logged `actor+timestamp+action`.

---

### Task 1: Fix `document_id` + `target/attention` split

**Files:**
- Modify: `frontend/app/audit/forms/[submissionId]/page.tsx:435` `handleForwardViaCorrespondence` — resolve `FormDocument` not `submission`
- Test: `frontend/app/audit/forms/__tests__/forward-via-correspondence.test.tsx`

- [ ] Step 1: Write failing test — `submission.id` used as `document_id` should fail; `FormDocument.id` should be used.
- [ ] Step 2: Implement fix — `const formDoc = await apiFetch(FormDocument) → document_id = formDoc.id`, split `targetOffice/attention/cc`.
- [ ] Step 3: Pass, Commit

### Task 2: Promote `Case(AUDIT)`

**Files:**
- Modify: `backend/correspondence/models.py:1119`, `backend/common/management/commands/seed_demo_data.py`
- Create: `backend/correspondence/services/case_audit.py` helper
- Test: `backend/correspondence/tests/test_audit_case_aggregate.py`

- [ ] Backfill `Case(AUDIT)` per existing `FormSubmission(audit)`, `CaseFormLink`, history endpoint `GET /cases/{id}/history`.

### Task 3: State Machine + `SEND_FOR_CERTIFICATION`/`CERTIFY`

**Files:**
- Modify: `backend/correspondence/models.py:1446` `CaseWorkflowRule`, `backend/forms/signature_views.py:425`
- Test: `backend/forms/tests/test_audit_certification.py`

- [ ] `SEND_FOR_CERTIFICATION` creates task; `CERTIFY` requires `assigned_to_user=gmaudit` + signature.

### Task 4: `REFER`/`RESPOND`/`CLOSE` + Correspondence Edge + UI

**Files:**
- Modify: `frontend/app/audit/forms/[submissionId]/page.tsx` — state banners `Awaiting GM Audit → Certified → Sent to ICT → Awaiting response`
- Backend: `POST /cases/{id}/actions/ {REFER}` atomically creates Correspondence + links + state `AWAITING_RESPONSE`.

### Task 5: Authorization Hardening

**Files:**
- Modify: `backend/forms/signature_views.py:425 _can_user_sign()` — enforce `gmaudit` user/role/delegation, not office membership.

---

**Approval boundary:** Design only — implementation via subagent-driven-development after review.
