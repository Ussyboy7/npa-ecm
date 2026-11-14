# Physical Custody Handover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add linked, recipient-confirmed physical document handovers between offices without changing digital correspondence routing.

**Architecture:** Add current custodian office and in-transit state to physical records, with a separate handover model. API endpoints enforce page access and active office membership; the physical register supports initiating and confirming transfers, while registration captures the first custodian/location.

**Tech Stack:** Django/DRF, PostgreSQL migrations, Next.js/React/TypeScript, existing API/UI components.

**Spec:** `docs/superpowers/specs/2026-11-11-physical-custody-handover-design.md`

## Global Constraints

- Preserve existing uncommitted changes.
- Do not deploy, commit, mutate production data, reset/drop a database, or add dependencies.
- Physical movement remains separate from digital minutes.
- Restrict sender/receiver actions by active office membership and physical-record page access.

## Review Focus

- A second pending handover cannot be created for the same copy.
- Only an active destination-office member can confirm receipt.
- Failed/invalid confirmation must leave pending custody unchanged.
- Destination receipt requires a valid active storage location.
- Registration without physical copy must not require physical custody fields.

---

### Task 1: Physical custody data model and API

**Files:**
- Modify `backend/correspondence/models.py`
- Create a correspondence migration
- Modify `backend/correspondence/physical_serializers.py`
- Modify `backend/correspondence/physical_views.py`
- Modify `backend/correspondence/urls.py` only if routes are not router actions
- Test `backend/correspondence/tests/test_physical.py`

**Interfaces:**
- Add `PhysicalDocument.current_office` nullable FK to organization Office and `IN_TRANSIT` status.
- Add `PhysicalHandover` with `physical_document`, `from_office`, `to_office`, `sent_by`, `received_by`, `sent_at`, `received_at`, `notes`; null received fields represent pending.
- Actions: `POST physical-documents/{id}/handover/` accepts `to_office` and optional notes; `POST physical-documents/{id}/confirm-receipt/` accepts required `location` and optional notes; `GET physical-documents/{id}/handover-events/` returns history.

- [ ] Write API tests for initiator membership, pending state, active destination member receipt, updated custodian/location, event history, duplicate pending prevention, and atomic rejection.
- [ ] Run these tests against current code and confirm expected failures.
- [ ] Implement model/migration, serializers, endpoints, membership checks, and audit events.
- [ ] Run focused physical API tests and organization model/system checks.

### Task 2: Register initial physical custody

**Files:**
- Modify `backend/correspondence/correspondence_views.py`
- Modify `backend/correspondence/serializers.py`
- Modify `backend/correspondence/tests/test_physical.py`

**Interfaces:**
- On create with `has_physical_copy=true`, accept `physical_location` and `physical_custodian_office` IDs, validate active location/office and registering-user membership, and populate the auto-created PhysicalDocument.
- Require these inputs only when `has_physical_copy=true`.

- [ ] Add tests for successful linked creation, missing required fields, invalid/inactive location/office, and unauthorized custodian office.
- [ ] Run tests to verify failures.
- [ ] Implement serializer/view validation and initial location/current office population.
- [ ] Run registration and physical API tests.

### Task 3: Registration form and physical register UI

**Files:**
- Modify `frontend/app/correspondence/register/register-utils.ts`
- Modify `frontend/app/correspondence/register/page.tsx`
- Modify `frontend/app/correspondence/register/components/BasicInfoStep.tsx` or add a focused custody form component
- Modify `frontend/app/physical-documents/page.tsx`
- Modify `frontend/lib/api/correspondence.ts` and mapper/types only as needed

**Interfaces:**
- Load active locations/offices from existing APIs; when hasPhysicalCopy is selected, show required initial custodian office and location and submit their IDs.
- Physical rows show current custodian office; filed rows offer **Send to office**, pending rows visible to destination offer **Confirm receipt** with required location; add handover history.
- Initiation/receipt forms call Task 1 endpoints and refresh affected row/history.

- [ ] Add/update focused utility tests for physical custody form submission and conditional validation.
- [ ] Implement registration and physical register controls using existing UI patterns.
- [ ] Run frontend type-check and focused form tests.

### Task 4: Correspondence detail linked physical record

**Files:**
- Modify `backend/correspondence/serializers.py`
- Modify `backend/correspondence/correspondence_views.py` queryset prefetch if needed
- Modify `frontend/lib/api/correspondence-mappers.ts`
- Modify `frontend/app/correspondence/[id]/components/PhysicalCopySection.tsx`
- Test correspondence serializer/API behavior

- [ ] Add a regression test that correspondence detail includes linked physical tracking number, status, current office, and location.
- [ ] Implement serialized physical copy data without widening access beyond correspondence scope.
- [ ] Verify correspondence and DMS-relevant tests, then run required final checks.
