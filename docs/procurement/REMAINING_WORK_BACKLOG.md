# NPA-ECM — Remaining Work Backlog

**Document type:** Implementation addendum to the project proposal  
**Date:** June 2026  
**Related:** [Project Proposal](./PROJECT_PROPOSAL_AND_COST_BREAKDOWN.md) · [BOQ](./BOQ_NPA_ECM_PROJECT.csv) · [Comparison Matrix](./ECM_COMPARISON_MATRIX.md)

This document lists work **not yet complete** at contract start (~65–70% platform readiness). All items are **funded within the fixed ₦350M project cap** unless marked *optional / contingency*.

---

## How to read this document

| Column | Meaning |
|--------|---------|
| **Status** | ✅ Built · 🟡 Partial · 🔵 Planned · ❌ Not started |
| **BOQ line** | Where the work is budgeted in `BOQ_NPA_ECM_PROJECT.csv` |
| **Priority** | P0 = go-live blocker · P1 = enterprise requirement · P2 = polish / parity |

---

## Phase 9–11 delivery status (June 2026)

**AI deferral:** Inference (Ollama, pgvector, LLM summarization) is **not in scope** until ICT provisions dedicated staging and production AI hosts. The application ships with FTS + lightweight in-process semantic re-rank (`search_mode=semantic`) and extractive summaries only. Enable remote Ollama via env when infrastructure is ready.

| Phase | Theme | Status | Delivered (high level) | Still open |
|-------|--------|--------|------------------------|------------|
| **9** | Compliance & diff | 🟡 Partial | Tamper-evident audit compliance export; document version diff API + UI | Legal sign-off on bundle format; diff for non-text/binary formats |
| **10** | Records & calendar | 🟡 Partial | eDiscovery export (legal hold ZIP); executive/PA calendar API + UI; `/dms` canonical route | Calendar rollout per PA assignment; eDiscovery legal workflow |
| **11** | Quality & ops | 🟡 Partial | WCAG prep (skip link, focus styles, checklist); DRM **policy** layer; legacy import command + admin; helpdesk UI + national rollout runbooks; semantic search **MVP** (no vectors); landing page copy aligned | Full WCAG 2.1 AA remediation; DRM byte-level watermark; pgvector + Ollama |

### Infrastructure notes (June 2026 audit)

| Host | RAM | Suitability |
|------|-----|-------------|
| **`devsecops`** (ECM staging today) | ~8 GB, shared with EMR + npa-emr + monitoring | **ECM staging only** after workload separation — **not** suitable for Ollama or pgvector at scale |
| **`emr`** (EMR prod) | ~62 GB, low utilization | **Candidate shared AI inference host** (Ollama) pending ICT approval — not ECM app server |

**ICT server request (summary):** ECM staging **16–32 GB** (ECM-only); ECM production **32–64 GB**; AI inference **32–64 GB** (or approved use of `emr` for Ollama). See [Section 5](#5-infrastructure--production-readiness).

---

## 1. Proposal & marketing vs. reality

Items promised in the proposal, landing page, or procurement matrix that need explicit delivery or copy alignment.

| Item | Status | Gap | BOQ line | Priority |
|------|--------|-----|----------|----------|
| "My Work" officer home | 🟡 | `/tasks` priority queue exists; polish and badge parity with inbox | 1.02 | P1 |
| ICT Admin dashboard | 🟡 | System Health page shipped; full onboarding portal not built | 1.02 | P1 |
| ICT onboarding portal | 🔵 | No admin wizard for staff onboarding | 4.01, 4.02 | P1 |
| DRM policies | 🟡 | Policy model, admin UI, download enforcement, banner; **no** PDF byte-level watermark | 5.02 | P2 |
| Live co-authoring | 🟡 | `DocumentEditorSession` = lock/session only, not real-time co-edit | 1.03 | P2 |
| Semantic / AI search | 🟡 | MVP: synonym expansion + hash re-rank on FTS; **no** pgvector/Ollama | 1.03 | P2 |
| AI document classification | 🔵 | Deferred with AI infrastructure | 6.02 * | P2 |
| WCAG 2.1 accessibility | 🟡 | Prep done (skip link, checklist, focus CSS); full audit/remediation not done | 5.01 | P1 |
| SMS gateway | ❌ | API-ready in proposal only | 1.10 | P2 |
| Marketing copy alignment | 🟡 | Landing page aligned June 2026; verify other stakeholder PDFs | — | P0 |

\* *Optional / contingency — fund from 6.02 if legal/ICT prioritizes.*

---

## 2. Built in backend but unfinished in UI or ops

| Item | Status | Gap | BOQ line | Priority |
|------|--------|-----|----------|----------|
| Content capture hub | 🟡 | `/capture` route + scan/batch dialogs; TWAIN/production scanner integration pending | 1.03, 2.05 | P1 |
| Integrations admin UI | 🟡 | Webhooks + connector CRUD + logs viewer at `/integrations`; email IMAP ingestion and ERP sync still partial | 1.10 | P0 |
| Outbox resend / cancel draft | ✅ | `cancel-draft` + `resend-draft` APIs; outbox UI wired | 1.05 | P0 |
| AI summarization | 🟡 | DMS summary UI + extractive fallback; optional OpenAI in code; **Ollama/LLM deferred** | 1.03 | P2 |
| Celery beat schedules | 🟡 | `celery-beat` in prod compose; `setup_celery_beat` command exists; verify all envs | 2.01 | P1 |
| Daily digest email | 🟡 | `send_daily_digest` task is a placeholder | 1.07, 1.08 | P1 |
| Auto-escalate to manager | 🔵 | Marked future in `analytics/tasks.py` | 1.04 | P1 |
| Workflow rules engine | 🔵 | TODO in `correspondence/services.py` | 1.04 | P1 |
| Assistant calendar / meetings | ✅ | `/assistant/calendar` + API; PA schedule permissions in assignment modal | 1.02 | P2 |
| Visual BPM designer | 🟡 | Templates hub only; no drag-drop BPM | 1.04 | P2 |

---

## 3. Security, compliance & governance

| Item | Status | Gap | BOQ line | Priority |
|------|--------|-----|----------|----------|
| SSO / Active Directory | 🟡 | OIDC backend + conditional login UI; staging IdP cutover pending ICT | 1.01 | P0 |
| Login MFA | 🟡 | Login MFA flow + settings UI shipped; global `LOGIN_MFA_REQUIRED` rollout pending | 1.01 | P0 |
| Full backend-driven permissions | 🟡 | Core write APIs + matrix shipped (S2); audit log scoping still grade-based | 1.01 | P0 |
| Permission admin matrix | ✅ | Users & Roles → Matrix tab; catalog API sync | 1.01 | P1 |
| "Why was I blocked?" UX | 🟡 | PermissionGate + explain API on register, detail pages, analytics, integrations | 1.01 | P0 |
| Connector credential encryption | 🟡 | `EmailConnector.password` stored plain | 2.03, 5.02 | P1 |
| Tamper-evident audit export | ✅ | Compliance bundle export API + audit UI | 1.09, 5.02 | P1 |
| Production security hardening | 🟡 | Security headers, CORS review, rate limiting, sanitization (see `TODO.md`) | 2.03, 5.02 | P0 |
| ClamAV production enablement | 🟡 | Off by default (`CLAMAV_SCAN_ENABLED=false`) | 2.03 | P1 |
| Records retention & legal hold | 🟡 | Governance models + admin UI; enforcement hardening ongoing | 1.09 | P0 |
| National Archives / disposal reports | 🔵 | FOIA module exists; formal retention/disposal reporting not built | 1.09 | P1 |
| eDiscovery / legal export MVP | 🟡 | Legal-hold ZIP export + manifest; formal legal workflow TBD | 6.02 * | P2 |

---

## 4. Integrations

| Item | Status | Gap | BOQ line | Priority |
|------|--------|-----|----------|----------|
| IMAP inbound email → correspondence | ❌ | `EmailConnector` has IMAP type; no ingestion worker | 1.10 | P1 |
| HRMS sync | ❌ | Not built | 1.10 | P1 |
| Oracle ERP connector | 🟡 | Integration guide exists; code is generic ERP stub | 1.10 | P1 |
| Real ERP document sync | 🟡 | Stub fetches `/documents`; does not create ECM records | 1.10 | P1 |
| Integration logs viewer | 🟡 | `IntegrationLogsViewer` at `/integrations` → Logs tab; filter/export polish optional | 1.10 | P2 |
| Webhook event catalog UI | 🟡 | Webhook CRUD works; event documentation in admin could be expanded | 1.10 | P2 |

---

## 5. Infrastructure & production readiness

| Item | Status | Gap | BOQ line | Priority |
|------|--------|-----|----------|----------|
| Staging/production SSR stability | 🟡 | Build passes locally; broken `dms/new` re-export fixed; detail routes force-dynamic; monitor staging | 5.01 | P0 |
| Prometheus / Grafana in prod | ❌ | Present in staging compose only | 2.01 | P1 |
| Sentry / APM | ❌ | Mentioned in docs; not wired in code | 2.01 | P1 |
| Load testing @ 3,000 users | ❌ | In proposal timeline; no Locust/k6 setup | 5.01 | P0 |
| E2E journey tests (Playwright) | ❌ | Script referenced in README; no test files in repo | 5.01 | P0 |
| Frontend unit / integration tests | 🟡 | ~1 test file (`lib/type-utils.test.ts`) | 5.01 | P1 |
| Environment parity / config drift checker | 🟡 | `check_environment_parity` command exists; enforce in deploy | 2.01, 6.01 | P0 |
| `setup_role_permissions` deploy runbook | 🟡 | Management command exists; must be mandatory on every promotion | 2.01, 4.02 | P0 |
| DR drill automation | 🔵 | Quarterly DR in proposal; operational, not automated | 2.04 | P2 |
| Legacy digitization & migration tooling | 🟡 | `import_legacy_records` command + admin UI; production migration batches TBD | 6.02 | P1 |
| TWAIN / signature pad software integration | ❌ | Hardware in BOQ; driver integration not built | 2.05, 1.06 | P1 |
| Dedicated AI inference VM | 🔵 | Server request in progress; Ollama + pgvector not deployed | 1.03, 6.02 * | P2 |
| Staging server sizing (`devsecops`) | 🟡 | ~8 GB RAM with ECM+EMR+npa-emr — separate workloads or upgrade to 16–32 GB | 2.01 | P1 |
| Local Docker dev bootstrap | ✅ | `ensure_dev_login_users` + compose; seed via `seed_demo_data` | 2.01 | P2 |

### Suggested server specifications (ICT request)

| Role | RAM | CPU | Disk | Notes |
|------|-----|-----|------|-------|
| **ECM staging** (replace/consolidate `devsecops`) | 16–32 GB | 8+ vCPU | 100–200 GB SSD | **NPA-ECM only** — move EMR/npa-emr elsewhere |
| **ECM production** | 32–64 GB | 16+ vCPU | 500 GB–1 TB SSD | Postgres, Redis, Django, Celery, Nginx, frontend |
| **AI inference** (stag/prod or shared) | 32–64 GB | 16 vCPU (modern) | 100–200 GB | Docker + Ollama; models: `nomic-embed-text` + `qwen2.5:7b` when enabled |
| **`emr` host (optional)** | 62 GB (existing) | 16 vCPU Gold | 3.9 TB | Approved candidate for **AI only** — not ECM app + EMR + AI on 8 GB stag |

**`devsecops` utilization until new VM:** keep ECM staging containers only; **do not** run Ollama; move EMR stacks to `emr` or other hosts; use hash semantic search + extractive summaries.

---

## 6. Product polish & ECM parity

| Item | Status | Gap | BOQ line | Priority |
|------|--------|-----|----------|----------|
| Search v2 (relevance, related items, duplicates) | 🟡 | Related-items panel + semantic toggle; no vector index | 1.03 | P2 |
| Document version diff viewer | ✅ | API + `DocumentVersionDiffDialog` in DMS | 1.03 | P2 |
| Port-level / division analytics | 🟡 | Executive dashboards exist; port-specific views missing | 1.07 | P1 |
| External entity directory (ministries/agencies) | 🟡 | Admin UI at `/admin/external-entities`; data population TBD | 1.05 | P1 |
| Parallel / consultation routing hardening | 🟡 | Logic exists; needs UX testing and edge cases | 1.05 | P1 |
| Physical records nav discoverability | 🟡 | Page at `/physical-documents`; role-gated in sidebar | 1.05 | P2 |
| `/documents` vs `/dms` route consolidation | ✅ | `/dms` canonical; `/documents` redirects | 1.03 | P2 |
| Completion summary export / share polish | 🟡 | Modal exists; export workflow needs hardening | 1.05 | P2 |
| Sidebar IA / navigation clarity | 🟡 | Dashboard label, Cases section, admin sub-groups, ICT-only ops links | 1.02 | P2 |
| Helpdesk (user + admin queue) | ✅ | `/helpdesk` + `/admin/helpdesk`; rollout runbooks in `docs/rollout/` | 4.04 | P0 |

---

## 7. National rollout workstream (program, not only code)

These run in parallel with software delivery (Sections 2–4 of the BOQ).

| Workstream | Deliverables | BOQ line | Priority |
|------------|--------------|----------|----------|
| HQ go-live | All divisions, full headcount eligible | 3.01 | P0 |
| Pilot ports | Apapa, Rivers, Tin Can validation | 3.02 | P0 |
| National ports | VPN, site prep, registry desks | 3.03 | P0 |
| Per-port training | Train-the-trainer, registry SOPs | 4.01, 4.02 | P0 |
| Legacy backlog digitization | Priority batches, QA, metadata | 6.02 | P1 |
| Helpdesk (12 months) | Tier 1 for all ECM users | 4.04 | P0 |

Rollout documentation: `docs/rollout/NATIONAL_ROLLOUT_RUNBOOK.md`, `TRAINING_CURRICULUM.md`, `HELPDESK_OPERATIONS.md`.

---

## 8. Priority summary

### P0 — Go-live blockers

1. Production SSR stability (`/correspondence/[id]`, `/dms/[id]`)
2. SSO / Active Directory + login MFA
3. Full backend-driven permissions + "why blocked?" UX
4. Integrations admin UI (email, ERP, logs)
5. Outbox resend / cancel draft APIs
6. Deploy runbook: `setup_role_permissions` + environment parity checks
7. Records retention & legal hold enforcement MVP
8. E2E tests + load test at agreed peak concurrency
9. Marketing / proposal copy alignment with actual capabilities (landing page done; verify PDFs)
10. Staging server consolidation (ECM-only on adequately sized VM)

### P1 — Enterprise requirements

Retention/disposal reports, HRMS sync, IMAP ingestion, real ERP connector, Celery beat + digest, content capture TWAIN, connector encryption, monitoring in prod, port analytics, external entity data, TWAIN/pad software, **full WCAG 2.1 AA remediation**, legacy migration execution, parallel routing hardening, staging VM upgrade or workload separation.

### P2 — Polish & parity

pgvector + Ollama (deferred until AI host), DRM byte-level watermark, AI summarization via LLM, AI document classification, semantic search upgrade from MVP, BPM designer, DR automation.

**Completed in Phase 9–11 (no longer backlog blockers):** tamper-evident audit export, document version diff, eDiscovery export MVP, assistant calendar, `/dms` route consolidation, helpdesk UI, legacy import tooling, WCAG prep, DRM policy layer, semantic search MVP (non-vector).

---

## 9. Suggested sprint mapping (Phase 1, Months 2–6)

| Sprint | Focus | Exit criteria |
|--------|-------|---------------|
| S1 | Stability + permissions | SSR 500s resolved; `setup_role_permissions` in CI/deploy; permission explainability |
| S2 | Identity & RBAC | Permission matrix; backend enforcement; sidebar permission-driven |
| S3 | Outbox + SSO staging | cancel/resend draft APIs; OIDC status; audit log RBAC |
| S4 | Integrations + records | IMAP ingestion; retention hardening |
| S5 | Capture + Celery ops | Content capture route; beat schedules; digest emails |
| S6 | QA gate | Playwright E2E green; load test report; pen test prep |

**Post Phase 11 (when AI hosts ready):** pgvector migration → Ollama sidecar → embed-on-ingest Celery → wire `DocumentSummaryService` to Ollama chat → disable hash fallback in production.

---

## 10. BOQ funding map (no change to ₦350M cap)

All backlog items draw from existing sections:

| BOQ section | Backlog themes funded here |
|-------------|---------------------------|
| **1.01** | SSO, MFA, full RBAC, permission matrix |
| **1.02** | My Work, ICT dashboard, onboarding UX, calendar |
| **1.03** | Capture hub, AI summary (deferred), search polish, OCR tuning, pgvector |
| **1.04** | Workflow rules, BPM polish, escalation |
| **1.05** | Outbox APIs, external directory, routing hardening |
| **1.07–1.08** | Port analytics, scheduled digest |
| **1.09** | Retention, legal hold, compliance export, eDiscovery |
| **1.10** | HRMS, IMAP, ERP, integration UI |
| **2.01–2.04** | Observability, DR, env parity, AI inference host |
| **2.05** | Scanner/pad driver integration |
| **3.x** | National rollout |
| **4.x** | Training, SOPs, helpdesk |
| **5.x** | E2E, load test, pen test, WCAG |
| **6.02** | Legacy migration, eDiscovery/AI optional scope |

---

## 11. Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | ECM Programme | Initial backlog addendum from platform audit |
| 1.1 | June 2026 | ECM Programme | Phase 9–11 MVP status; AI deferred; infra audit (`devsecops` vs `emr`); updated section statuses |

**Next review:** After ICT provisions ECM staging VM and/or AI inference host; before enabling Ollama/pgvector in any environment.
