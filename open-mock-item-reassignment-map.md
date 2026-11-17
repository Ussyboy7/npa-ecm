# Open mock-owned items — proposed real owners and exact reassignment actions

Prepared 2026-11-13 against the live database as a read-only mapping, then
**applied** the same day at the owner's request:

- `HQ/AGM/SA&DM/AD/002` → `v.redet` (correspondence approver + the pending minute)
- `AQ-2026-001` → `v.gofwan`
- `NPA/PROC/2025/0089` → `gmengineering`
- `NPA/PROC/2025/0147` → `gmengineering`, current office corrected to `OFF_DEPT_CIVIL`

Each change was audited (`correspondence_updated` / `case_updated`). `created_by`
attribution was left untouched. The assignment actions below are kept as the
record of what was moved.

Scope: the four open items reported by `deactivate_mock_accounts` as mock-owned
actionable work. All four are the only mock-owned open work in the system; once
they are reassigned, no mock account holds an actionable item.

| # | Item | Type | Current owner | Proposed real owner |
|---|------|------|---------------|---------------------|
| 1 | `HQ/AGM/SA&DM/AD/002` | Correspondence (`in-progress`) | `edfa` (mock) | `v.redet` |
| 2 | `AQ-2026-001` | Case, `audit` (`open`) | `superadmin` (hold) | `v.gofwan` |
| 3 | `NPA/PROC/2025/0089` | Case (`in_progress`) | `gmict` (hold) | `gmengineering` |
| 4 | `NPA/PROC/2025/0147` | Case (`in_progress`, high) | `agmabuja` (mock) | `gmengineering` |

Proposed owners, all active real staff (non-blank employee number, not in the
seed `MOCK_USERS` set):

| Username | Name | Employee | Grade | Designation | Office |
|----------|------|----------|-------|-------------|--------|
| `v.redet` | Vivian Richard-Edet | 6346 | EDCS | Executive Director Finance and Administration | `OFF_DIR_EDFA` (principal) |
| `v.gofwan` | Victor Gofwan | 2190 | MSS1 | General Manager Audit (HOD) | `OFF_DIV_AUDIT` (principal) |
| `gmengineering` | Umar Isa | 354 | MSS1 | General Manager Engineering (HOD) | `OFF_DIV_ENGINEERING` (principal) |

---

## 1. `HQ/AGM/SA&DM/AD/002` — FY2025 Capital Expenditure Review

- Correspondence `ddbbda00-93d9-41ba-aea4-666ed0ed9afb`, `in-progress`, priority unchanged.
- Subject: *FY2025 Capital Expenditure Review — Finance & Administration*.
- Created by `gmict` (hold) on 2026-10-01; routed once, for approval, to `edfa`.
- Only routing artefact is the open approval minute (no `ApprovalTask`, no
  `CorrespondenceDistribution` rows).

**Why `v.redet`:** `edfa` is the mock record of Mrs. Richard-Edet, Executive
Director Finance & Administration. `v.redet` is the real, active ED F&A with the
same grade (EDCS) and a principal membership of the same office
(`OFF_DIR_EDFA`), so the approval authority is unchanged.

**Exact actions**

```text
Correspondence ddbbda00-93d9-41ba-aea4-666ed0ed9afb
  current_approver: edfa → v.redet

Minute 7b78c24f-a172-443f-9dbb-2e968451bacd  (to_user=edfa, requires_response=True, acknowledged_at=NULL)
  to_user: edfa → v.redet
  no other field changes (purpose=approval, requires_response, action_type=forward preserved)
```

Do not change: `created_by = gmict` (historical attribution), minute text, timestamps.

---

## 2. `AQ-2026-001` — Audit Query, Bills for Certification (PV)

- Case `426f0bbe-df21-48ee-bf2b-0bad10a3ae83`, `case_type=audit`, `open`,
  priority medium, tags `audit` / `audit-query` / `bills-certification`.
- Created and currently owned by `superadmin` (explicit hold, user pk 124).
- `metadata.audit_trail` already records the submit → awaiting-certification →
  **CERTIFIED** transitions performed by `superadmin`; `audit_state=CERTIFIED`.
- No minutes or approval tasks reference this case.

**Why `v.gofwan`:** the case is an audit query and the Audit Division is the
function that owns audit-query resolution. `v.gofwan` is the real GM Audit (HOD)
and principal of `OFF_DIV_AUDIT`; the mock `gmaudit` record ("Gofwan Paul") is
the same seat. The case contract has no other user reference.

**Exact actions**

```text
Case 426f0bbe-df21-48ee-bf2b-0bad10a3ae83
  assigned_to: superadmin → v.gofwan
```

Recommended housekeeping on the same record (organisational fields only, no owner
change): `owning_office` is `NULL` and `division` is `EDFA_DIRECT`, which is
where `superadmin` created it. If Audit owns the query, set
`owning_office = OFF_DIV_AUDIT` and `division = AUDIT` (division id
`9b39d779-2140-4a5d-8134-0536ba652353`). Treat this as a separate decision from
assignment — it does not affect `deactivate_mock_accounts`.

Do not change: `created_by = superadmin`, `metadata.audit_trail`,
`metadata.audit_submission_id`, `opened_at`.

Alternate owner: `e.odewale` (AGM Accounts HOD, emp 1944) if the query is judged
to be an Accounts action item (certification of bills) rather than an Audit-owned
query. `v.redet` would then be the escalation point, not the owner.

---

## 3. `NPA/PROC/2025/0089` — Port Access Road Upgrade (Calabar Port)

- Case `2855a4d3-7f76-431e-8349-948526ab78df`, `in_progress`, medium.
- `owning_office = current_office = OFF_DEPT_CIVIL` (Civil Engineering Dept),
  `division = ENGINEERING`, department `PORTS_ENG`.
- Created by `gmict`; assigned to `gmict` — the GM ICT division owns no part of
  this engineering case. No minutes or approval tasks.

**Why `gmengineering`:** the case sits in the Engineering & Technical Services
division and its owning office is Civil Engineering. `gmengineering` (Umar Isa,
MSS1, GM Engineering HOD) is the real division head covering both, so ownership
stays at the level the reference implies while leaving the mock ICT seat.

**Exact actions**

```text
Case 2855a4d3-7f76-431e-8349-948526ab78df
  assigned_to: gmict → gmengineering
```

No office/division change: `owning_office` and `current_office` are already
`OFF_DEPT_CIVIL`, which matches the work.

Do not change: `created_by = gmict`, tags, timestamps.

Alternate owner: `es.itodo` (Principal Manager Civil (HOD), emp 3028, principal
of `OFF_DEPT_CIVIL`) if the case should sit with the department rather than the
division. `gmprocurement` is not recommended: Procurement is not the owning
office or division for this case.

---

## 4. `NPA/PROC/2025/0147` — Contract, Wharf Rehabilitation (Lagos Port)

- Case `0e6895b6-b74c-4034-9f56-c94fe0f97736`, `in_progress`, high.
- `owning_office = OFF_DEPT_CIVIL`, `division = ENGINEERING`, but
  `current_office = OFF_DIV_AUDIT` — the case is parked in Audit while assigned
  to the Abuja Liaison AGM. Both routing fields are inherited from seeding and
  do not match the engineering contract.
- Description: wharf rehabilitation at Lagos Port, contract awarded to ABC
  Marine Ltd. No minutes or approval tasks.

**Why `gmengineering`:** same owning office and division as #3, and the same real
division head. This also removes the only open item held by `agmabuja`, whose
Abuja Liaison seat has no engineering-contract responsibility.

**Exact actions**

```text
Case 0e6895b6-b74c-4034-9f56-c94fe0f97736
  assigned_to: agmabuja → gmengineering
  current_office: OFF_DIV_AUDIT → OFF_DEPT_CIVIL   (align with owning_office)
```

The `current_office` correction is recommended but independent: without it the
case is owned by an Engineering officer while still displayed in the Audit
office queue. If only assignment is applied, the case is no longer mock-owned,
but the Audit queue still shows it.

Do not change: `created_by = gmict`, priority `high`, tags, timestamps.

Alternate owners:
- `es.itodo` (Principal Manager Civil (HOD)) — department-level owner, as in #3.
- `gmprocurement` (Adedapo Adekunle, emp 3643, GM Procurement HOD) — if the
  contract-award aspect should sit with Procurement rather than Engineering.
- `mu.suleiman` (Omar Suleiman, emp 2338, real AGM Abuja L/O) — only if the Abuja
  Liaison seat really was the intended handler; `i.muhammed` (Ibrahim Mohammed,
  emp 3937) is the second real AGM in that office and would then need to be
  disambiguated by HR.

> Note: `mu.suleiman` is emp 2338 and `i.muhammed` is emp 3937 — both MSS2,
> Asst. General Manager Abuja L/O, both active principals of `OFF_DEPT_ABUJA`.
> There is no HR seat marker distinguishing them from the mock "Mr. Musa", so
> either choice needs an HR confirmation.

---

## Ordering and effect on the deactivation gate

1. Apply items 1–4 (owner/office fields only). Do not touch `created_by` or audit
   metadata.
2. Re-run the dry run:
   `manage.py deactivate_mock_accounts --out ../mock-account-deactivation.csv`
   The "actionable open work" blockers should drop from 4 accounts to 0, and the
   blocked count from 29 to 27 (the 27 offices that would lose their only real
   principal remain blocked).
3. `gmict` and `superadmin` remain explicit holds regardless of these
   reassignments; reassigning their items does not authorize deactivating them.
4. `edfa` and `agmabuja` become free of open work after items 1 and 4, but
   deactivation still waits for the 27-office principal coverage gap.

## Verification of this document

Every value above was read from the live database on 2026-11-13 by read-only ORM
queries; no `save()`, `update()`, bulk write, or management command with
`--apply` was executed. The four items still point at `edfa`, `superadmin`,
`gmict`, and `agmabuja` respectively.
