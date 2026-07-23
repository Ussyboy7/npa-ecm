# NPA-ECM Procurement Comparison Matrix

**Document version:** 1.1  
**Date:** June 2026  
**Purpose:** Feature-level comparison for procurement, vendor evaluation, and stakeholder proposals  
**Scope:** NPA-ECM (current codebase) vs. ten leading enterprise content management (ECM) platforms

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **✅ Supported** | Production-ready in NPA-ECM; implemented and usable today |
| **🟡 Partial** | Implemented with limitations, optional config, or incomplete UI |
| **🔵 Planned** | Documented on roadmap or in migration plans; not production-ready |
| **❌ N/A** | Not offered / not applicable to product positioning |

### Competitor key

| Code | Product |
|------|---------|
| **SP** | Microsoft SharePoint (+ Microsoft 365 / Purview) |
| **OT** | OpenText Content Suite |
| **IBM** | IBM FileNet / Cloud Pak for Business Automation |
| **ON** | Hyland OnBase |
| **LF** | Laserfiche |
| **MF** | M-Files |
| **BX** | Box (Enterprise) |
| **AEM** | Adobe Experience Manager |
| **DW** | DocuWare |
| **AF** | Alfresco (Hyland) |

### Competitor rating (for vendor columns)

| Symbol | Meaning |
|--------|---------|
| **✅** | Mature, market-standard capability |
| **🟡** | Available with add-ons, configuration, or tier limits |
| **❌** | Weak or not a core strength |

---

## Executive Summary

| Dimension | NPA-ECM | Typical top-10 ECM |
|-----------|---------|-------------------|
| **Best fit** | Office-based correspondence, executive approvals, institutional memory | General content collaboration, records archives at scale, broad integrations |
| **Deployment** | Self-hosted / on-prem / private cloud (Docker) | Cloud SaaS, hybrid, or heavy on-prem suites |
| **Customization** | High — full source control, fast process tailoring | Medium — configuration + professional services |
| **Ecosystem** | Limited — webhooks, API-first | Extensive — M365, SAP, hundreds of connectors |
| **Governance depth** | Audit + sensitivity; retention/legal hold MVP; eDiscovery export partial | Mature records management, legal hold, disposition |
| **Identity** | JWT login, TOTP for seals; no enterprise SSO yet | SAML/OIDC/LDAP standard |

**Procurement recommendation:** Position NPA-ECM as a **correspondence and decision operations platform**, not a drop-in SharePoint replacement. It wins on **NPA org fit, executive workflow, and TCO**; it does not yet match **SSO, records governance, and integration marketplace** depth.

---

## 1. Core Content Management

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Document upload & storage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Version control | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Folder / workspace organization | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ |
| Metadata & tagging | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ |
| Document preview | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bulk upload / download | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Soft delete & recovery | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ |
| Document version diff | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Co-authoring (live multi-user edit) | ❌ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 |
| Office Online / WOPI integration | ❌ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ❌ | 🟡 | 🟡 |
| Digital asset management (DAM) | ❌ | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | 🟡 | ✅ | ❌ | 🟡 |

**NPA-ECM notes:** DMS includes collections, versions, version diff UI, permissions, DRM policies, comments, discussion threads, form documents, and access logs (`backend/dms/`). Compose uses hardened custom `RichTextEditor` (not Quill.js). Real-time collaboration is limited to comments/WebSocket presence/session lock — **not** live co-editing (TipTap + Yjs deferred; backlog P2).

---

## 2. Correspondence & Workflow (NPA-ECM differentiator)

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Letter/memo registration | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | 🟡 |
| Office-based routing (not person-based) | ✅ | ❌ | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | 🟡 | 🟡 |
| Minute / approval threads | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | 🟡 |
| Parallel & sequential routing | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | 🟡 |
| Delegation & acting officer | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | 🟡 | 🟡 |
| Executive digital seal | ✅ | ❌ | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Seal verification (public) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dispatch / Sent tracking | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | ✅ | 🟡 |
| Case management linked to correspondence | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | ✅ | 🟡 |
| Workflow templates & designer | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ |
| Visual BPM designer | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🟡 | 🟡 | 🟡 |
| SLA tracking & escalation | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | ✅ | 🟡 |
| Physical records / checkout tracking | ✅ | ❌ | 🟡 | 🟡 | ✅ | ✅ | ❌ | ❌ | ❌ | 🟡 | ❌ |
| FOIA / public records requests | ✅ | ❌ | 🟡 | 🟡 | 🟡 | ✅ | ❌ | ❌ | ❌ | 🟡 | ❌ |

**NPA-ECM notes:** Correspondence module is the deepest area — 20+ models including `Minute`, `ParallelRoutingGroup`, `Delegation`, `Case`, `PhysicalDocument`, FOIA (`backend/correspondence/`). Workflow templates exist (`backend/workflow/`) but visual designer maturity is below OnBase/FileNet.

---

## 3. Search & Discovery

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Full-text search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cross-module unified search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ |
| Faceted filters | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ |
| Saved searches | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ |
| Search history | ✅ | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | ❌ | 🟡 | 🟡 | 🟡 |
| Permission-aware results | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Metadata-first / object-based filing | ❌ | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ✅ | ❌ | 🟡 | 🟡 | 🟡 |
| AI / semantic search | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ❌ | 🟡 |
| Duplicate detection | ❌ | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ✅ | ❌ | ❌ | 🟡 | 🟡 |
| Related content suggestions | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ❌ | 🟡 | ❌ | 🟡 |

**NPA-ECM notes:** PostgreSQL `SearchVector` + `SearchRank` with visibility filters (`backend/search/services.py`). Optional `search_mode=semantic` uses hash-based re-rank (`search/semantic_service.py`) — **not** pgvector/Ollama. Saved searches and history implemented (`backend/search/models.py`).

---

## 4. Capture & OCR

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Scan / capture jobs | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | 🟡 |
| OCR (searchable PDF) | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | 🟡 |
| Batch capture | 🟡 | ❌ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | ✅ | 🟡 |
| Barcode / separator sheets | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🟡 | ❌ |
| AI document classification | ❌ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 |

**NPA-ECM notes:** `CaptureJob` model with OCR pipeline (`backend/capture/`). OCR is async via Celery; quality and classification are below enterprise capture suites.

---

## 5. Security & Access Control

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Role-based access control (RBAC) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Office / org-hierarchy permissions | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ❌ | ❌ | 🟡 | 🟡 |
| Document-level sharing & ACLs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sensitivity classification | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| JWT / API authentication | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSO (SAML / OIDC / LDAP) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-factor authentication (MFA) | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User impersonation (admin support) | ✅ | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Rate limiting | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Virus / malware scanning | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 |
| DRM / IRM document protection | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 |
| Encryption at rest (storage) | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Encryption in transit (TLS) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**NPA-ECM notes:**
- Permissions mix backend role JSON (`can_register_correspondence`) with frontend grade rules (`frontend/lib/permissions.ts`) — **partial consistency risk**.
- TOTP + email OTP for executive seal application (`SealOTP`, `SetupTOTPView`).
- ClamAV scanning is **optional** (`CLAMAV_SCAN_ENABLED`, `backend/common/upload_validators.py`) — off by default.
- DRM **policy layer** enforces download rights (`dms/drm.py`, `/admin/drm-policies`) — no PDF byte-level watermark yet.
- No SAML/OIDC/LDAP in settings today.

---

## 6. Governance, Compliance & Records

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Activity audit trail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tamper-evident audit export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ |
| Records classification | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ |
| Retention schedules | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ |
| Legal hold | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ |
| Disposition / destruction workflow | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ✅ | ✅ |
| eDiscovery / litigation support | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ❌ | 🟡 | 🟡 |
| Compliance reporting dashboards | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 |

**NPA-ECM notes:** `ActivityLog` with compliance export (`backend/audit/`). `RetentionSchedule`, `LegalHold`, eDiscovery ZIP export (`backend/records/`, `/admin/records-governance`). Enforcement and disposition workflows still hardening.

---

## 7. Analytics & Reporting

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Operational dashboards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 |
| Executive / leadership KPIs | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🟡 | 🟡 | ❌ |
| SLA / turnaround reporting | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Division / unit performance | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🟡 | ❌ |
| Custom report builder | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 |
| Scheduled report generation | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 |
| Export (CSV / PDF) | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**NPA-ECM notes:** Analytics app with SLA models, escalation rules, executive portfolio, report snapshots (`backend/analytics/`). Frontend routes: `/analytics/executive`, `/performance`, `/reports`, `/cases`.

---

## 8. Integrations & Interoperability

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| REST API | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OpenAPI / Swagger docs | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ |
| Outbound webhooks | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ✅ |
| Email ingestion (IMAP) | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ❌ | ✅ | 🟡 |
| Email outbound (SMTP) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ERP connectors (Oracle, SAP) | 🔵 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ |
| Microsoft 365 / Teams | ❌ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | ❌ | 🟡 | 🟡 |
| Integration marketplace | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 |

**NPA-ECM notes:**
- Webhooks with HMAC signatures and delivery tracking (`backend/integrations/`).
- `EmailConnector` and `ERPConnector` models exist; admin UI at `/integrations` (connectors + logs); **production ingestion/sync still partial**.
- Oracle ERP integration guide is planning documentation only (`docs/guides/ORACLE_ERP_INTEGRATION_GUIDE.md`).

---

## 9. Notifications & Collaboration

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| In-app notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 |
| Real-time push (WebSocket) | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 | 🟡 |
| Email notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notification preferences | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 |
| Document comments | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ✅ |
| Team chat / social feed | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ |

**NPA-ECM notes:** Full notifications stack with Channels WebSocket (`backend/notifications/`). Document collaboration via comments and discussion messages.

---

## 10. Administration & Configuration

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Org hierarchy management | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | 🟡 | 🟡 |
| User & role management UI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Office membership & permissions | ✅ | ❌ | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Workflow / SLA admin UI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | 🟡 |
| Template management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 |
| Permission debugger (“why blocked?”) | ❌ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 | ❌ |
| Environment config tooling | ✅ | N/A | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | N/A | 🟡 | 🟡 | 🟡 |
| Multi-tenant SaaS admin | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**NPA-ECM notes:** Admin modules at `/admin/organization`, `/admin/users-roles`, `/admin/workflow-sla`, `/admin/templates-hub`. Unified ops CLI via `scripts/*/env-manager.sh`.

---

## 11. Deployment & Operations

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| On-premises deployment | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟡 | ✅ | ✅ |
| Private cloud / Docker | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Air-gapped / sovereign deploy | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟡 | ✅ | ✅ |
| Automated DB migrations on deploy | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | ✅ |
| Health checks (liveness/readiness) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Backup & restore scripts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CI/CD pipeline | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | ✅ |
| Horizontal scaling guidance | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**NPA-ECM notes:** Docker Compose for local/stag/prod, GitHub Actions CI, nginx reverse proxy, Celery workers, Postgres + Redis required.

---

## 12. User Experience & Adoption

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Task-first home (“My Work”) | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 🟡 |
| Role-based navigation | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ❌ | ✅ | 🟡 |
| Mobile-responsive web UI | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 |
| Native mobile apps | ❌ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| In-app help & guides | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 |
| Helpdesk / support tickets | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 | ❌ | 🟡 | ❌ |
| Low training time for casual users | 🟡 | ✅ | ❌ | ❌ | 🟡 | ✅ | 🟡 | ✅ | ❌ | ✅ | ❌ |

**NPA-ECM notes:** Dashboard with executive/secretary variants; sidebar IA updated (My Work, Cases, admin sub-groups). Help at `/help`; helpdesk at `/helpdesk` and `/admin/helpdesk`.

---

## 13. Forms & Templates

| Feature | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|---------|---------|----|----|-----|----|----|----|----|-----|----|-----|
| Form builder | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 |
| Correspondence templates | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | 🟡 |
| Document templates | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ |
| Digital signatures on forms | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |

**NPA-ECM notes:** `forms/` app, form documents in DMS, correspondence templates and drafts, signature templates for executives.

---

## Score Summary (Category Averages, 0–5)

Approximate weighted scores for procurement discussions. Higher = stronger.

| Category | NPA-ECM | SP | OT | IBM | ON | LF | MF | BX | AEM | DW | AF |
|----------|--------:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Core content | 3.2 | 4.5 | 4.5 | 4.5 | 4.3 | 4.2 | 4.3 | 4.5 | 4.8 | 4.0 | 4.2 |
| Correspondence & workflow | **4.5** | 3.0 | 4.5 | 4.8 | 4.7 | 4.3 | 3.0 | 1.5 | 2.5 | 4.0 | 3.2 |
| Search | 3.2 | 4.5 | 4.5 | 4.2 | 4.0 | 4.0 | **4.8** | 3.5 | 4.5 | 3.5 | 4.0 |
| Security & access | 3.2 | 4.8 | 4.8 | 4.8 | 4.5 | 4.5 | 4.5 | 4.8 | 4.5 | 4.5 | 4.3 |
| Governance | 3.2 | 4.5 | **5.0** | 4.8 | 4.5 | 4.5 | 4.5 | 4.0 | 3.5 | 4.2 | 4.2 |
| Integrations | 2.5 | **5.0** | 4.5 | 4.5 | 4.3 | 3.8 | 4.3 | 4.5 | 4.0 | 3.8 | 4.2 |
| Deployment / ops | 4.0 | 4.0 | 4.5 | 4.5 | 4.3 | 4.2 | 4.2 | 4.5 | 4.3 | 4.2 | 4.2 |
| UX & adoption | 3.0 | 4.5 | 3.0 | 2.8 | 4.0 | 4.3 | 4.0 | **4.8** | 3.0 | 4.5 | 3.0 |
| **Overall (general ECM)** | **3.2** | 4.4 | 4.4 | 4.4 | 4.3 | 4.2 | 4.1 | 4.1 | 4.0 | 4.0 | 4.0 |
| **NPA correspondence fit** | **4.5** | 3.0 | 4.2 | 4.5 | 4.5 | 4.2 | 3.2 | 2.5 | 2.5 | 4.0 | 3.5 |

---

## NPA-ECM Feature Status Roll-up

| Status | Count (approx.) | Examples |
|--------|-----------------|----------|
| ✅ Supported | ~60 | Office routing, minutes, seals, cases, SLA, audit export, helpdesk, version diff |
| 🟡 Partial | ~25 | OCR, ClamAV, DRM policy, retention/hold, semantic MVP, permissions consistency |
| 🔵 Planned | ~6 | SSO, pgvector/Ollama, ERP UI completion, email connector UI |
| ❌ N/A / Not offered | ~12 | M365 native, DAM, byte-level DRM watermark, native mobile |

---

## Procurement Decision Guide

### Choose NPA-ECM when…
- Primary need is **correspondence lifecycle** (register → route → approve → seal → archive)
- Organization structure is **office-based** (MD/ED/GM/AGM) with succession continuity
- **Self-hosted / sovereign** deployment is required
- **Customization speed** matters more than connector marketplace breadth
- **TCO** must be controlled (no per-seat enterprise license)

### Choose a top-10 ECM when…
- Primary need is **general collaboration** and M365 integration → **SharePoint**
- Primary need is **records compliance at national scale** → **OpenText / IBM**
- Primary need is **metadata-driven findability** → **M-Files**
- Primary need is **fast cloud sharing** with minimal workflow → **Box**
- Primary need is **marketing / digital experience content** → **AEM**
- Primary need is **mid-market workflow with low training** → **DocuWare / Laserfiche**

### Hybrid strategy (common in public sector)
- **NPA-ECM** for correspondence, approvals, executive accountability
- **SharePoint / Box** for general team collaboration and external sharing
- **OpenText / Laserfiche** for long-term records archive (if retention/legal hold required before NPA-ECM ships it)

---

## Roadmap Items to Close Procurement Gaps

Priority order to strengthen evaluation scores:

| Priority | Feature | Target status | Procurement impact |
|----------|---------|---------------|-------------------|
| P0 | SSO (SAML/OIDC) | 🔵 → ✅ | Unblocks IT security review |
| P0 | Permission explainability UI | ❌ → ✅ | Reduces support burden; improves admin score |
| P0 | Core journey stability (detail pages) | 🟡 → ✅ | Passes UAT / pilot |
| P1 | Retention + legal hold enforcement hardening | 🟡 → ✅ | Closes governance gap vs Laserfiche/OpenText |
| P1 | Email connector admin UI | 🟡 → ✅ | Completes integration story |
| P1 | Oracle ERP connector (1 flow) | 🔵 → ✅ | Proves ERP interoperability |
| P2 | Semantic / AI-assisted search (pgvector + Ollama) | 🟡 → ✅ | Deferred until AI host; MVP re-rank shipped |
| P2 | E2E test suite (Playwright) | ❌ → ✅ | De-risks ongoing procurement confidence |

---

## Document Control

| Field | Value |
|-------|-------|
| Author | NPA ECM Product / Engineering |
| Classification | Internal — Procurement |
| Next review | After SSO MVP + retention enforcement hardening |
| Related docs | `docs/procurement/REMAINING_WORK_BACKLOG.md`, `docs/features/`, `docs/guides/ORACLE_ERP_INTEGRATION_GUIDE.md` |

---

*This matrix reflects the NPA-ECM codebase and documentation as of June 2026. Competitor ratings are based on publicly documented product capabilities and typical enterprise deployments; verify against vendor RFP responses and current release notes before final procurement decisions.*
