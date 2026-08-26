# NPA Enterprise Content Management System
## Requirements Gathering, Business Process Documentation & System Evaluation Framework

**Version:** 1.0  
**Date:** 26 August 2026  
**Classification:** Internal — Confidential  
**Coverage:** NPA HQ + All Port Locations (~3,000 users) | Fixed Cap ₦350M | 18 Months  
**Platform Readiness at Baseline:** ~65–70% (June 2026 audit)  
**Related:** `PROJECT_PROPOSAL_AND_COST_BREAKDOWN.md` · `REMAINING_WORK_BACKLOG.md` · `ECM_COMPARISON_MATRIX.md` · `docs/features/*` · `docs/guides/WCAG_AUDIT_CHECKLIST.md`

> **Note on attachment:** The image attached to the request rendered as blank (black frame, no diagram/text). This framework is therefore built from the codebase (`backend/` 14 apps, 44 domain models, `frontend/` Next.js 16 App Router), procurement docs, and feature guides. If you intended a specific process map, re-attach and it will be folded into §2 as an annotated overlay.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Requirements Gathering Framework](#2-requirements-gathering-framework)
3. [Business Process Documentation (AS-IS → TO-BE)](#3-business-process-documentation)
4. [System Evaluation Framework](#4-system-evaluation-framework)
5. [Traceability & BOQ Funding Map](#5-traceability--boq-funding-map)
6. [Risks, Assumptions & Decisions Register](#6-risks-assumptions--decisions)
7. [Implementation & Evaluation Roadmap](#7-implementation--evaluation-roadmap)
8. [Appendices](#8-appendices)

---

## 1. Executive Summary

**Strategic objective:** Replace paper-based correspondence, document management, and approval processes with a unified, on-premise ECM hosted in NPA data centres — automating routing, executive seals, retention, and audit while eliminating per-seat licensing.

**What is already substantially built (pilot/UAT-ready):**
- Correspondence & routing (inbox, my-sent, office-sent, register, records, parallel branches, delegation/acting, physical copy tracking, seal flow)
- DMS (upload/versions/diff, preview/OCR, collections, sharing, form documents, DRM policy + byte-level PDF watermark)
- Workflow & SLA (templates, steps, tasks, parallel/sequential routing)
- Digital seals & signatures (profile, OTP/TOTP, `SealGenerationService`, public `/verify`)
- Notifications (in-app + Channels WebSocket + email templates + quiet hours)
- Audit compliance export (tamper-evident bundle), version diff, eDiscovery legal-hold ZIP, helpdesk (user + admin)
- Next.js 16 frontend (shadcn/ui, role-aware sidebar 30+ rules), Django 4.2 + DRF + Channels + Celery, Postgres 16 + Redis, MinIO/S3, Docker/Compose + `env-manager.sh`

**What this contract completes (funded within ₦350M):** Identity (SSO/MFA), backend-driven RBAC + explainability, capture hub & scanner integration, HRMS/AD/IMAP/ERP connectors, retention/legal-hold enforcement, observability in prod, E2E + load testing at 3,000 users, full WCAG 2.1 AA, rollout to HQ → Apapa/Rivers/Tin Can → national ports, 12-month Tier-1 helpdesk.

**Evaluation stance:** The engineering backlog (Phases 9–11) is **MVP-delivered** for compliance/diff/records/calendar domains; remaining gaps are *integration, hardening, and scale* — not greenfield features. AI (Ollama/pgvector/LLM summarization/classification) is **explicitly deferred** until ICT provisions a dedicated AI host (16–64 GB) — current search is FTS + hash re-rank + extractive summaries, which is contract-compliant interim.

---

## 2. Requirements Gathering Framework

### 2.1 Stakeholder Map

| Tier | Stakeholder | System Role(s) | Gathering Focus |
|------|-------------|----------------|-----------------|
| **Sponsor** | MD, Executive Directors, GM | Executive seal approver | Seal profile, delegation, SLA visibility, executive dashboard |
| **Governance** | ICT, Audit, Legal, Records | Admin, compliance, retention | RBAC matrix, tamper-evident export, retention schedule, eDiscovery, disposal reports |
| **Operations** | Registry, Secretariat, Department officers | Creator, router, reviewer, registrar | Capture/OCR, registration wizard, routing, minute threading, dispatch |
| **Port** | Apapa, Rivers, Tin Can, + national ports | Port-scoped users | Port dashboard, VPN/site prep, offline registry SOP |
| **Support** | Helpdesk Tier-1, Trainers | Support agent | Ticket queue, training curriculum, SOPs |
| **Technical** | ICT Infra, Data Centre Ops | Deployer | Compose envs, parity checks, DR, monitoring, secrets |

### 2.2 Elicitation Methods (contract-mandated)

| Method | Artifact | Owner | Cadence |
|--------|----------|-------|---------|
| **Document analysis** | NPA registry SOPs, organogram, retention policy, National Archives Act | Records + Legal | Once, then delta |
| **Contextual inquiry** | Registry desk shadowing (HQ + 1 pilot port) | BA + Registry lead | 2–3 days per site |
| **Workshops** | Workflow rules per correspondence type; seal ceremony walkthrough | Workflow admin + Exec PAs | 4 workshops |
| **Interviews** | ICT on AD/HRMS/ERP/email infra; Audit on compliance bundle sign-off | Tech lead | 1:1 |
| **Prototyping** | DMS detail workspace, correspondence `[id]` rail, `RichTextEditor` paste/print | Frontend lead | Iteratively |
| **Questionnaire** | Port readiness checklist (VPN, scanners, SAN) | Rollout PM | Per port |

### 2.3 Functional Requirements by Module (with source & status)

> `Status:` ✅ Built · 🟡 Partial · 🔵 Planned · ❌ Not started · *BOQ line in brackets*

#### M01 — Authentication & Access Control (₦15M) `[1.01]`

| ID | Requirement | Must/Should | Status | Verification |
|----|-------------|-------------|--------|--------------|
| FR-A01 | RBAC aligned to NPA organogram (MD→ED→GM→AGM→Registry) + office scoping | Must | 🟡 Core + matrix built; audit scoping grade-based | `accounts`, `organization` + `setup_role_permissions --force` in CI/deploy |
| FR-A02 | JWT session, rate-limited login/OTP, session timeout | Must | ✅ | Security tests (`test_security.py`) |
| FR-A03 | SSO bridge to NPA AD (SAML 2.0 / OIDC) + AD group → ECM role mapping | Must | 🟡 OIDC backend + conditional login UI; IdP cutover pending | Staging IdP UAT |
| FR-A04 | Login MFA (TOTP + Email OTP for seal) with `LOGIN_MFA_REQUIRED` global rollout | Must | 🟡 Flow + UI shipped; global rollout pending | MFA E2E |
| FR-A05 | Permission explainability ("why was I blocked?") + PermissionGate on register/detail/analytics/integrations | Must | 🟡 | UX review |
| FR-A06 | Admin onboarding wizard + provisioning/deprovisioning | Should | 🔵 | Admin UAT |
| FR-A07 | Impersonation with audit logging | Must | ✅ | Audit log query |

#### M02 — Dashboard & UI System (₦20M) `[1.02]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-D01 | Role-personalized dashboards (Executive, Officer "My Work", Registry, ICT Admin) | 🟡 Executive/officer/registry exist; ICT health shipped; polish pending |
| FR-D02 | Port-specific views | 🟡 Executive exists; port views missing |
| FR-D03 | WCAG 2.1 AA compliance pass | 🟡 7 high-severity fixes July 2026 (MinuteModal, DelegateModal, etc.); mediums open |
| FR-D04 | Production stability (detail routes `force-dynamic`, no SSR 500) | 🟡 Build passes locally; monitor staging |
| FR-D05 | 5-bucket simplified IA for non-admin users | 🟡 Sidebar grouping shipped |

#### M03 — DMS Engine (₦25M) `[1.03]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-DM01 | Upload (PDF/DOCX/XLSX/JPEG/TIFF), drag-drop, batch, validation, MinIO/S3 | ✅ |
| FR-DM02 | Version control + diff (`GET /versions/{id}/diff/`) + rollback | ✅ |
| FR-DM03 | OCR (Celery job) + metadata/sensitivity taxonomy | ✅ (tuning pending) |
| FR-DM04 | FTS + filters (date/author/division/status/sensitivity) + cross-module search | ✅ FTS; semantic is MVP hash re-rank, pgvector deferred |
| FR-DM05 | Classification (Confidential/Internal/Public/Restricted) + ACL sharing | ✅ DRM policy + banner + **byte watermark on serve** |
| FR-DM06 | Form documents + Pending Signatures tab | ✅ |
| FR-DM07 | Compose via `RichTextEditor` (paste sanitize, Office cleanup, print) | ✅ Hardened Phase 1; TipTap+Yjs deferred to P2 |

#### M04 — Workflow & Approvals (₦30M) `[1.04]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-W01 | Sequential + parallel routing, parallel groups, branch deadlines, force-complete | ✅ `ParallelBranch` model + tree UI |
| FR-W02 | SLA config + dashboard + escalation to supervisor | 🟡 Config exists; auto-escalate 🔵 (marked future in `analytics/tasks.py`) |
| FR-W03 | Delegation & acting authority (time-bound) with audit | ✅ |
| FR-W04 | Workflow template library (20+ NPA templates) + visual designer | 🟡 Templates hub only; no drag-drop BPM |
| FR-W05 | 15+ letter/memo templates with version control | 🟡 In scope |

#### M05 — Correspondence & Memos (₦25M) `[1.05]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-C01 | Internal (office-routed, memo threading) + External (inward digitization, outward dispatch log) | ✅ |
| FR-C02 | Registry wizard (register-state-reducer, `has_physical_copy`, auto-numbered refs) | ✅ |
| FR-C03 | CC/Distribution with `read_at/read_by` + dispatch `acknowledged` | ✅ |
| FR-C04 | Secretary drafts on behalf with approval gate | ✅ |
| FR-C05 | External entity directory (ministries/agencies) | 🟡 UI at `/admin/external-entities`; data population TBD |
| FR-C06 | Completion summary export/share | 🟡 Modal exists; hardening pending |

#### M06 — Digital Signature & Seal (₦15M) `[1.06]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-S01 | Signature profiles (scanned upload, typed block) + pad hardware (2/dept) | ✅ profiles; hardware integration ❌ |
| FR-S02 | MD/ED/GM seal on minute approval (`DocumentSeal` + `Minute.seal_applied`) | ✅ |
| FR-S03 | Public `/verify` + signed-doc lock + hash integrity | ✅ |
| FR-S04 | PKI-ready architecture | ✅ scaffold |

#### M07 — Analytics & Reports (₦15M) `[1.07–1.08]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-AN01 | Executive / performance / division dashboards | ✅ API + UI |
| FR-AN02 | Port performance + cross-port comparison | 🟡 Missing |
| FR-AN03 | Scheduled (weekly/monthly) + email delivery | 🟡 `celery-beat` in prod; `setup_celery_beat` exists; `send_daily_digest` is placeholder |
| FR-AN04 | 12+ pre-built report templates (PDF/Excel/CSV) | 🟡 |

#### M08 — Notifications (₦10M) `[1.08]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-N01 | In-app bell + history + priority/module filters + quiet hours | ✅ |
| FR-N02 | Real-time via Channels+Daphne+Redis | ✅ (requires Redis; `socket_timeout: None` in prod) |
| FR-N03 | Email via NPA SMTP (HTML templates) | ✅ (prod mail server cutover pending) |
| FR-N04 | SMS gateway (optional) | ❌ API-ready docs only |

#### M09 — Records, Retention & Legal Hold (₦10M) `[1.09]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-R01 | Auto-archiving + retention schedules + archive retrieval + restore | 🟡 Models + admin UI; enforcement hardening ongoing |
| FR-R02 | Legal hold + hold notification + disposition workflow (approval before deletion) | 🟡 Legal-hold ZIP + manifest shipped; workflow TBD |
| FR-R03 | National Archives / disposal reports + FOIA linkage | 🔵 `foia` module exists; reports not built |
| FR-R04 | Partitioned MinIO archive tier | 🟡 Planned |

#### M10 — Integrations (₦15M) `[1.10]`

| ID | Requirement | Status |
|----|-------------|--------|
| FR-I01 | HRMS sync (profile/org sync, transfer/exit triggers) | ❌ |
| FR-I02 | AD integration (see M01) | 🟡 |
| FR-I03 | Email capture — outbound SMTP + inbound IMAP → correspondence | 🟡 SMTP yes; IMAP `EmailConnector` is model-only, no ingestion worker |
| FR-I04 | Oracle ERP connector (1–2 object types, admin CRUD + logs) | 🟡 Guide exists; stub fetches `/documents` but doesn't create ECM records |
| FR-I05 | Webhooks (HMAC + delivery tracking + catalog UI) | ✅ |

### 2.4 Non-Functional Requirements (with evaluation probes)

| ID | NFR | Target | Evaluation Probe |
|----|-----|--------|------------------|
| NFR-P01 | Performance — retrieval | Sub-3s at HQ load | FTS query `EXPLAIN ANALYZE`, search benchmark script |
| NFR-P02 | Scale | 3,000 concurrent users | k6/Locust load test — ❌ not yet (P0 blocker) |
| NFR-S01 | Security hardening | Headers, CORS, rate limits, sanitization, secrets | `security-check` (bandit + pip-audit + npm audit critical), `TODO.md` review |
| NFR-S02 | Encryption | Celery/RDS at rest; connector creds encrypted | `EmailConnector.password` is **plain** — flagged P1 |
| NFR-S03 | Scanning | ClamAV prod scanning | `CLAMAV_SCAN_ENABLED=false` default — enable per BOQ |
| NFR-O01 | Availability | Prod hardening + DR snapshots | `env-manager deploy` auto-snapshots ✅; DR drill manual 🔵 |
| NFR-O02 | Observability | Prometheus/Grafana + Sentry/APM in prod | Staging only ❌ |
| NFR-O03 | Portability | Docker/Compose parity across envs | `check_environment_parity`, `validate-compose.sh`, `ci.yml` (fail-closed — no `|| continue`) |
| NFR-C01 | Accessibility | WCAG 2.1 AA | `WCAG_AUDIT_CHECKLIST.md` — 7 highs fixed July 2026; mediums open |
| NFR-D01 | Data | Legacy import + OCR + archive tiers | `import_legacy_records` + admin UI 🟡; TWAIN/pad drivers ❌ |

### 2.5 Acceptance Criteria Template (for every FR)

```
Given <precondition>,
When <action>,
Then <observable outcome> AND <audit/compliance side-effect>
Evidence: API contract / UI screenshot / Playwright spec / audit log export
```

---

## 3. Business Process Documentation

### 3.1 AS-IS (Paper-Based) — Current State

```
Requester (Officer) → Handwrites memo → Registry log (physical register)
  → Dispatch rider / inter-office envelope → Recipient inbox (physical tray)
  → Minute on file (handwritten) → Secretary types response → Executive signs in ink
  → Registry files copy → Archive room (shelves, manual indexing)
Pain points: Lost files, no audit trail, SLA invisible, no delegation trace,
duplicate registers per office, retrieval = hours/days, no retention enforcement.
```

### 3.2 TO-BE (ECM Digital) — Target Operating Model

```
Capture: Upload / Scan → OCR → Metadata + Classification → Register (auto-numbered ref)
  ↓
Route: DistributionSelector → ParallelBranch (branches with deadlines) + sequential fallback
  ↓
Act: Minute thread (approve/reject/seal) → Delegation/Acting if absent → Force-complete by originator
  ↓
Produce: MemoCompositionSection (RichTextEditor) / FormDocument → Template library (15+ / 20+ workflows)
  ↓
Seal: Signature/seal via SealGenerationService → DocumentSeal linked to Minute → Hash lock
  ↓
Dispatch: Outward `completed → dispatched → acknowledged → archived`
          Inward  `completed → archived` (replies = new outward record)
  ↓
Retain: Records governance (retention schedule → legal hold → disposition approval) → Archive tier → eDiscovery export
  ↓
Assure: Notifications (in-app/WS/email) + Analytics (SLA/executive/port) + Audit (tamper-evident export + access logs)
  ↓
Support: Helpdesk queue + Training curriculum + Rollout runbooks
```

### 3.3 Swimlane — Correspondence Lifecycle (TO-BE)

| Lane | Steps | System Objects |
|------|-------|----------------|
| **Initiator / Registry** | Register (BasicInfo → Parties → Documents → Routing) → flag `has_physical_copy` | `Correspondence`, `Distribution`, `CorrespondenceNumberCounter` |
| **Router** | Select offices/branches → set deadlines → group parallelism | `ParallelBranch`, `WorkflowTemplate`, `ParallelRoutingStatusPanel` |
| **Reviewers** | Minute (approve/reject) per branch → seal if executive | `Minute` (`signature_payload` / `seal_applied`), `DocumentSeal` |
| **Delegate / Acting** | Assume authority (time-bound) → act → revert | `Delegation`, `ActingAssignment` |
| **Dispatcher** | Dispatch outward via `POST …/dispatch/` (inward rejected) → `DispatchRecord` | `DispatchRecord.acknowledged`, `Correspondence.status` |
| **Archivist** | Retention schedule → legal hold → archive / restore | `records` models + `records-governance` UI |
| **System** | Notifications, SLA clocks, audit trail, search index | `notifications`, `audit`, `search` (FTS), Celery beat |

**Status state machine (implemented):**
```
pending → in-progress → completed
  → inward  → archived
  → outward → dispatched → (acknowledged) → archived
Side exit: pending/in-progress → withdrawn
Closed-state UI = completed/dispatched/acknowledged/archived/withdrawn
```

### 3.4 Swimlane — DMS Lifecycle (TO-BE)

| Lane | Steps |
|------|-------|
| **Author** | `DocumentUploadDialog` (or `RichTextEditor` compose for versions) → classify → tag |
| **Collaborator** | Comment thread → share (`ShareDocumentDialog`) → form signatures (`FormSignature`) |
| **Reviewer** | Version diff (`DocumentVersionDiffDialog`) → OCR text → preview (`SecurePdfCanvasPreview`) |
| **Approver** | Seal → lock (hash) |
| **Consumer** | Search (FTS + semantic MVP toggle) → filter → download (DRM `resolve_document_rights` + watermark on `/versions/{id}/download/`) |
| **Governance** | Retention → compliance export (tamper-evident) → eDiscovery ZIP |

### 3.5 Key Process Variants Documented

- **Parallel consultation** (e.g., legal + finance in parallel sub-branches; originator force-completes when quorum met)
- **Physical + digital duality** (register flags `has_physical_copy`; physical checkout tracked while digital route proceeds)
- **External correspondence** (inbound: IMAP stub → future `EmailIngestionWorker`; outbound: external entity directory + dispatch log)
- **Form documents** (`CreateFormDocumentDialog` → `FormDocument` → signature collection → `Pending Signatures` queue)
- **Capture** (`/capture` route — scan/batch dialogs ready; TWAIN/production scanner integration is P1 gap)

### 3.6 RACI (condensed)

| Process | Responsible | Accountable | Consulted | Informed |
|---------|-------------|-------------|-----------|----------|
| Registry & routing | Registry officer | Dept Head / GM | ICT (RBAC) | Initiator |
| Seal approval | Executive (MD/ED/GM) | MD | Audit | Registry |
| Retention/disposition | Records manager | Legal | National Archives liaison | ICT |
| Deployment & DR | ICT Infra | ICT Director | Finance/Procurement | All users via notices |
| Legacy migration | Records + ICT | Project sponsor | Port registries | Executive |

---

## 4. System Evaluation Framework

### 4.1 Evaluation Dimensions & Weights (for go/no-go scoring)

| # | Dimension | Weight | Primary Evidence | Current Score* |
|---|-----------|--------|------------------|----------------|
| 1 | **Functional Completeness** | 20% | FR trace (§2.3) + `REMAINING_WORK_BACKLOG.md` | 3.2 / 5 |
| 2 | **Process Fit** (AS-IS → TO-BE coverage) | 15% | Swimlanes §3.3–3.5 + UAT scripts | 3.5 / 5 |
| 3 | **Security & Compliance** | 20% | Pen test, `security-check`, audit export, retention/DRM | 2.8 / 5 |
| 4 | **Integration Readiness** | 10% | AD/HRMS/IMAP/ERP connector tests | 2.0 / 5 |
| 5 | **Operability & Infra** | 15% | `scripts/stack/*`, `env-manager.sh`, monitoring, DR drill, `check_environment_parity` | 2.9 / 5 |
| 6 | **Quality & Assurance** | 10% | Playwright E2E, k6 load, frontend unit, CI `ci-cd.yml` gates | 2.2 / 5 |
| 7 | **Accessibility (WCAG 2.1 AA)** | 5% | `WCAG_AUDIT_CHECKLIST.md` + axe scans | 3.0 / 5 |
| 8 | **Adoption & Rollout** | 5% | `NATIONAL_ROLLOUT_RUNBOOK.md`, training, helpdesk | 3.4 / 5 |

*5-point maturity: 1=Ad-hoc · 2=Repeatable · 3=Defined · 4=Managed · 5=Optimized. Baseline June 2026.*

**Interpretation:** ≥4.0 every dimension = production go-live ready. **Current gating dimensions are 3, 4, 6** — aligns with P0 blockers (§5).

### 4.2 Scoring Rubric (per dimension)

| Score | Meaning | Gate |
|-------|---------|------|
| 5 Optimized | Metrics-driven, automated, continuously improved | ✅ |
| 4 Managed | Measured, controlled, documented runbooks | ✅ |
| 3 Defined | Process defined and followed, some gaps | ⚠️ Conditional go (with mitigation) |
| 2 Repeatable | Works locally/ad-hoc, not hardened | 🔴 Hold |
| 1 Ad-hoc | Missing or incidental | 🔴 Hold |

### 4.3 Maturity Matrix (where NPA ECM sits today)

| Capability | L1 | L2 | L3 (today) | L4 Target | L5 Stretch |
|------------|----|----|------------|-----------|------------|
| **Correspondence** | — | — | **L4** Parallel branches + seals | Port rollout hardened | ML routing suggestions |
| **DMS** | — | — | **L3** DRM watermark + diff | Capture→ERP closed loop | AI classification (deferred) |
| **Search** | — | — | **L3** FTS + MVP re-rank | pgvector + Ollama on AI host | Hybrid semantic + personalization |
| **Editor** | — | — | **L3** Hardened custom (`execCommand`) | TipTap + Yjs co-author | CRDT perf at 3k users |
| **Identity** | — | **L2** | — | **L4** SSO + MFA + RBAC explainability | Adaptive MFA |
| **Records** | — | **L2** | **L3** models + legal-hold ZIP | Enforcement + reports (1.09) | Automated disposition |
| **Integrations** | **L1** | — | — | **L4** HRMS/IMAP/ERP prod | Event-driven mesh |
| **Infra** | — | — | **L3** Compose + healthchecks | **L4** Prod observability + DR automation | Chaos-tested |
| **QA** | **L1** | — | — | **L4** E2E + load green | Mutation-tested |

### 4.4 System Evaluation Checklist (go-live gate — copy into UAT sign-off)

#### P0 — Must be ✅ before HQ go-live

- [ ] **SSR stability:** `/correspondence/[id]`, `/dms/[id]` force-dynamic; no staging 500s under load
- [ ] **SSO/MFA:** OIDC to NPA AD in staging; `LOGIN_MFA_REQUIRED` policy signed off
- [ ] **RBAC:** `setup_role_permissions` runs on every promotion (CI + deploy); sidebar + APIs permission-driven; "why blocked?" UX
- [ ] **Integrations admin:** `/integrations` logs + connector CRUD cover email + ERP; IMAP ingestion worker OR documented manual capture SOP as interim
- [ ] **Sent drafts:** `cancel-draft` + `resend-draft` E2E green
- [ ] **Retention/legal hold:** Enforcement MVP + compliance bundle sign-off by Legal
- [ ] **E2E + load:** Playwright journeys green + k6 @ agreed concurrency (proposal: 3,000)
- [ ] **Copy alignment:** PDFs/slides outside landing page verified against actuals
- [ ] **Staging VM:** ECM-only host 16–32 GB (or `devsecops` workload separation documented)
- [ ] **DR snapshot:** `env-manager deploy` pre-deploy snapshot verified via `verify_backup.sh` + restore drill

#### P1 — Enterprise hardening (measure within 60 days of go-live)

- [ ] HRMS sync live
- [ ] Real ERP connector creates ECM records (not stub fetch)
- [ ] Email inbound worker (IMAP) OR registry capture SOP + backlog metric
- [ ] Celery beat schedules + daily digest (replace placeholder)
- [ ] Connector credential encryption (`EmailConnector.password` migrated)
- [ ] Prometheus/Grafana + Sentry in prod
- [ ] Port analytics dashboards
- [ ] WCAG mediums remediated + full AA audit report
- [ ] External entity directory populated

#### P2 — Polish / parity (roadmapped, not go-live gating)

- [ ] TipTap + Yjs migrate (replaces `execCommand`; `RichTextEditor` domain features become extensions)
- [ ] pgvector + Ollama on AI host (disable hash fallback in prod)
- [ ] AI summarization/classification via LLM
- [ ] Visual BPM designer

### 4.5 Functional Compliance Matrix (proposal vs. actual)

| Proposal Promise | Actual (June 2026) | Disposition |
|-----------------|-------------------|-------------|
| "My Work" officer home | `/tasks` queue exists; badge polish pending | P1 — polish within §1.02 budget |
| ICT Admin dashboard | `/admin/platform/health` shipped; full onboarding portal not built | P1 — build wizard (1.02) |
| DRM policies | Policy model + admin + banner + **byte watermark** ✅ | Close — policy only was P2, now shipped |
| Live co-authoring | Presence scaffolding only; needs TipTap+Yjs | P2 — keep as backlog, not go-live blocker; state honestly in rollout comms |
| Semantic/AI search | FTS + synonym + hash re-rank (no vectors) | Contract-compliant interim; enable Ollama when AI host ready |
| SMS gateway | API-ready docs | P2 — document as optional; not gating |
| SSO/AD | OIDC + conditional login; IdP cutover pending | P0 — staging cutover before HQ go-live |

### 4.6 Technical Debt & Risk-Adjusted Notes

| Debt | Impact | Mitigation |
|------|--------|------------|
| `RichTextEditor` on `execCommand` + `innerHTML` truth (2,247 LOC) | Fragile undo/IME/list; hard to test | Roadmapped TipTap migration *is* the payoff — preserve Page Setup/print as extension |
| `EmailConnector.password` plain | Credential exposure | Encrypt via `django-fernet` / vault before prod (P1) |
| `CLAMAV_SCAN_ENABLED=false` | Unscanned uploads | Enable with ClamAV sidecar + SOP before HQ go-live |
| No prod observability | Blind ops | Add Prometheus/Grafana + Sentry before scaling to ports |
| No E2E/load | Unknown scale | Block go-live until k6 + Playwright green (P0) |

---

## 5. Traceability & BOQ Funding Map

Every evaluation item is **funded; no cap increase**.

| BOQ Section | Evaluation Themes | Key P0/P1 Items |
|-------------|-------------------|------------------|
| **1.01** | Identity, RBAC, audit | SSO, MFA, permission matrix, explainability |
| **1.02** | Dashboards, UI, WCAG | My Work, ICT dashboard, port views, AA |
| **1.03** | DMS, capture, OCR, search | TWAIN, OCR tuning, pgvector deferred |
| **1.04** | Workflow, SLA, templates | Escalation, 20 templates, BPM polish |
| **1.05** | Correspondence, dispatch | External directory, physical copy, dispatch hardening |
| **1.07–1.08** | Analytics, notifications | Port analytics, scheduled digests |
| **1.09** | Records, retention, eDiscovery | Schedules, legal hold, disposal reports |
| **1.10** | Integrations | HRMS, IMAP, ERP, webhooks |
| **2.01–2.04** | Infra, DR, parity | Env parity, AI host, DR drill |
| **2.05** | Devices | Scanners + pad driver integration |
| **3.x / 4.x** | Rollout, training, helpdesk | HQ → pilot ports → national + 12-mo Tier-1 |
| **5.x** | QA, WCAG, pen test | E2E, load, accessibility audit |
| **6.02** | Legacy, AI optional | `import_legacy_records`, Ollama, eDiscovery |

---

## 6. Risks, Assumptions & Decisions

### Risks (top 5)

| # | Risk | Likelihood | Impact | Owner | Mitigation |
|---|------|------------|--------|-------|------------|
| R1 | `devsecops` (8 GB, shared with EMR/npa-emr) under-sized for AI or for production scale | High | High | ICT | **Do not run Ollama on staging**; split workloads or provision 16–32 GB ECM-only VM per §5 server spec; hash search + extractive summaries in interim |
| R2 | IdP/AD cutover delayed → SSO not live for HQ go-live | Medium | High | ICT | Conditional login + JWT works; but gate HQ go-live on staging IdP UAT |
| R3 | Sponsorship/scope creep ("MDX parity" etc.) | Medium | Medium | Programme | Enforce `REMAINING_WORK_BACKLOG.md` P0/P1/P2 and fixed-cap BOQ as steering gate; any new parity = defer to P2 or BOQ re-allocation |
| R4 | Legibility of branded PDFs/landing pages vs actuals | Medium | High | Comms | Completed landing alignment June 2026; audit remaining PDFs per backlog P0 |
| R5 | Sanitized HTML storage (`innerHTML`) → XSS if purify bypassed | Low | High | Engineering | Purify on emit *and* insert; `sanitize-html.test.ts` + CSP headers; TipTap schema will tighten this |

### Assumptions

- Hosting remains **on-premise** (NPA data centres); cloud is not in scope.
- Postgres is required (`DB_ENGINE=sqlite` rejected in settings) — evaluation assumes PG 16.
- WebSockets require Redis + Daphne (`CHANNEL_LAYERS socket_timeout: None` in prod).
- AI infrastructure (Ollama + pgvector) is **provisioned separately**; app is AI-ready via env flag.

### Decisions Needed (for steering)

- [ ] Confirm staging VM spec and workload separation plan (ICT → infra memo).
- [ ] Approve AI host location: new VM vs. shared `emr` (62 GB) as inference-only.
- [ ] Sign retention schedule (Legal/Records) → enables enforcement coding.
- [ ] Approve P2 deferral list for HQ go-live comms (co-authoring, pgvector, BPM designer).

---

## 7. Implementation & Evaluation Roadmap

| Sprint | Focus | Exit Criteria (maps to Gate §4.4) | Evaluation Lift |
|--------|-------|-----------------------------------|-----------------|
| **S1** | Stability + permissions | SSR 500s resolved; `setup_role_permissions` in CI/deploy; explainability UX | D2, D5 → 3.5+ |
| **S2** | Identity & RBAC | Permission matrix; backend enforcement; sidebar permission-driven | D1, D3 → 3.5+ |
| **S3** | Sent drafts + SSO staging | cancel/resend E2E; OIDC in staging; audit RBAC | D1, D4 → 3.2+ |
| **S4** | Integrations + records | IMAP ingestion or interim SOP; retention hardening | D4, D3 → 3.0+ |
| **S5** | Capture + Celery ops | `/capture` TWAIN consult; beat schedules; digest | D5 → 3.5+ |
| **S6** | QA gate | Playwright green; k6 @ 3k; pen test prep | D6 → 4.0 |
| **Rollout** | HQ → Apapa/Rivers/Tin Can → national; `NATIONAL_ROLLOUT_RUNBOOK.md` | Per-port readiness + training sign-off | D8 → 4.0 |
| **Post-11** | AI host ready → pgvector → Ollama (`nomic-embed-text` + `qwen2.5:7b`) → embed-on-ingest | Disable hash fallback in prod; LLM summaries | Bonus capability |

**Operational commands (already in repo):**
```bash
scripts/local/env-manager.sh start | status | health | seed | backup
scripts/local/env-manager.sh verify-backup   # + verify_backup.sh / restore_backup.sh
make ci / make ci-quick                        # mirror CI locally
python manage.py setup_role_permissions --force # deploy gate
python manage.py ensure_dev_login_users        # local seed
cd backend && python manage.py makemigrations --check --dry-run
```

---

## 8. Appendices

### A. Document Map (read first)

| Topic | Path |
|-------|------|
| Correspondence routing | `docs/architecture/correspondence-routing.md` |
| Signature/seal flow | `docs/architecture/signature-seal-flow.md` |
| Org hierarchy | `docs/architecture/org-hierarchy.md` |
| Feature: DMS / Forms / Search / Rich text | `docs/features/dms.md`, `forms.md`, `search.md`, `rich-text-editor.md` |
| WCAG checklist | `docs/guides/WCAG_AUDIT_CHECKLIST.md` |
| Quick start / routes | `docs/guides/QUICK_START.md` |
| Rollout & helpdesk | `docs/rollout/*` |
| CI/CD (fail-closed gates) | `.github/workflows/ci-cd.yml` |

### B. Evaluation Workshop Agenda (2 days)

**Day 1 — Business process:** Registry shadowing → correspondence swimlane validation → seal ceremony → exception paths (recall, delegation, force-complete, physical copy, withdrawn).
**Day 2 — System:** RBAC matrix review → integration infra (AD/HRMS/ERP/email) → retention/legal hold → search/capture PoC → QA/observability → scoring (§4.1) → P0 gate decision.

### C. Glossary

- **DMS** — Document Management System (`dms` app)
- **DRM** — Document Rights Management (policy + watermark)
- **FTS** — Postgres full-text search (`SearchVector`)
- **P0/P1/P2** — Go-live blocker / enterprise requirement / polish (per backlog)
- **ParallelBranch** — Parallel routing branch with deadline/status (`correspondence` model)
- **Seal** — Executive stamp on approval (MD/ED/GM) via `SealGenerationService`

---

**Next step:** Tell me which port or stakeholder workshop you want to run first, and I'll spin this into a **sign-off-ready PDF** (with NPA branding + signature block) or a **Jira/Linear epic map** per BOQ line — or re-attach that diagram and I'll overlay the TO-BE lane on it directly ♪

