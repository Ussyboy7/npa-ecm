# NPA Enterprise Content Management System
## Comprehensive Project Proposal & Cost Breakdown

**Document version:** 1.0  
**Date:** June 2026  
**Classification:** Internal — Confidential  
**Related:** [ECM Comparison Matrix](./ECM_COMPARISON_MATRIX.md)

---

# EXECUTIVE SUMMARY

| Item | Detail |
|------|--------|
| **Project Title** | NPA Enterprise Content Management (ECM) System |
| **Sponsoring Authority** | Nigerian Ports Authority (NPA) |
| **Project Budget** | ₦350,000,000 (Three Hundred and Fifty Million Naira) — **fixed cap for full NPA headcount** |
| **Hosting Model** | On-Premise (NPA Data Centers) |
| **Implementation Timeline** | 18 Months |
| **Coverage** | NPA Headquarters + All Port Locations — **all ~3,000 NPA employees** (no per-seat license) |
| **Primary Technology Stack** | Django 4.2 · Next.js 16 · PostgreSQL 16 · Redis · MinIO · Docker |

---

> **Strategic Objective:** To design, develop, harden, and deploy a unified enterprise content management and correspondence system across NPA Headquarters and all Port locations — automating internal workflows, approvals, executive digital seals, and document management — hosted entirely on NPA's existing data center infrastructure, eliminating paper-based processes and improving governance efficiency.

---

## Platform Readiness Assessment (June 2026)

A significant core platform has already been engineered and is available for pilot/UAT. This proposal covers **completion, enterprise hardening, national rollout, and 12-month support** — not greenfield development from zero.

| Area | Current Status | This Contract Delivers |
|------|----------------|------------------------|
| Correspondence & routing | ✅ Substantially built | Production hardening, templates, port rollout |
| Document management | ✅ Substantially built | OCR tuning, batch ops, performance |
| Workflow & SLA | ✅ Built | Visual designer polish, 20+ NPA templates |
| Digital seals & signatures | ✅ Built | Hardware pads, PKI-ready architecture |
| Analytics & dashboards | 🟡 Partial | Scheduled reports, port-level views |
| Notifications | ✅ Built | NPA SMTP production integration |
| Records retention & legal hold | 🟡 Partial | Models + admin UI + eDiscovery export; enforcement hardening |
| Audit compliance export | ✅ Built | Tamper-evident bundle API + audit UI |
| Document version diff | ✅ Built | API + DMS UI |
| DRM policies | 🟡 Partial | Policy layer + download enforcement; no byte watermark |
| Semantic / AI search | 🟡 Partial | FTS + MVP re-rank; pgvector/Ollama deferred |
| Helpdesk | ✅ Built | User tickets + admin queue + rollout runbooks |
| SSO / Active Directory | ❌ Not yet | Full AD integration |
| HRMS / ERP / email connectors | 🟡 Partial (API/models) | Production connectors + admin UI |
| National port deployment | ❌ Not yet | Phased rollout per Section 3 |

**Estimated platform completion at contract start:** ~65–70% of functional scope. Remaining budget focuses on **governance, identity, integrations, infrastructure, rollout, QA, and adoption**.

> **Detailed backlog:** See [REMAINING_WORK_BACKLOG.md](./REMAINING_WORK_BACKLOG.md) for the full itemized list (P0/P1/P2), BOQ line mapping, Phase 9–11 **engineering** MVP status (June 2026), and AI deferral. *Note: Section 7 rollout “Phase 9” (national ports) is a programme milestone — distinct from engineering Phases 9–11 in the backlog.*

---

# SECTION 1 — CORE SOFTWARE DEVELOPMENT
## Budget Allocation: ₦180,000,000

---

### 1.1 Budget Summary Table

| # | Submodule | Core Function | Build Status | Est. Cost (₦M) |
|---|-----------|---------------|--------------|----------------|
| 01 | Authentication & Access Control | RBAC, office mapping, JWT, SSO/AD, MFA | 🟡 Partial | ₦15M |
| 02 | Dashboard & UI System | Next.js frontend, role dashboards, NPA branding | 🟡 Partial | ₦20M |
| 03 | Document Management Engine | Upload, versions, workspaces, OCR, search | ✅ Mostly built | ₦25M |
| 04 | Workflow & Approval Automation | Routing, SLA, escalation, audit trails | ✅ Mostly built | ₦30M |
| 05 | Correspondence & Memo Module | Office routing, minutes, delegation, registers | ✅ Mostly built | ₦25M |
| 06 | Digital Signature & Seal Module | Executive seals, OTP/TOTP, verification | ✅ Mostly built | ₦15M |
| 07 | Analytics & Reports | Executive KPIs, SLA, division/port reports | 🟡 Partial | ₦15M |
| 08 | Notifications & Alerts | Email + in-app + WebSocket real-time | ✅ Mostly built | ₦10M |
| 09 | Records Archival & Retention | Auto-archiving, retention, legal hold | 🟡 Partial | ₦10M |
| 10 | System Integrations | HRMS, AD, email capture, webhooks, ERP | 🟡 Partial | ₦15M |
| | **SUBTOTAL** | | | **₦180M** |

---

### 1.2 Detailed Submodule Specifications

---

#### 📌 Module 01 — Authentication & Access Control | ₦15,000,000

**Current platform:** JWT authentication, role-based permissions, office memberships, grade-level access, TOTP/email OTP for executive seal application, admin impersonation with audit logging, rate limiting on login/OTP endpoints.

```
Scope of Delivery (This Contract):
├── Role-Based Access Control (RBAC) — production configuration
│   ├── MD / Executive Director Level
│   ├── Directorate / Divisional Head Level
│   ├── Departmental Officer Level
│   └── Registry / Secretariat Level
├── Division & Department Organizational Mapping (NPA organogram)
├── JWT Token Authentication (secure session management)
├── Multi-Factor Authentication (MFA) for Senior Officers
│   ├── TOTP (authenticator app) — extend to login MFA
│   └── Email OTP for seal application (existing)
├── Single Sign-On (SSO) Integration with NPA Active Directory
│   ├── SAML 2.0 / OIDC bridge
│   └── AD group → ECM role mapping
├── Backend-driven permission matrix (eliminate config drift)
├── Permission explainability UI ("why is this action blocked?")
├── Session timeout & audit logging
└── User provisioning & deprovisioning workflows
```

**Key Deliverables:**
- Fully configured RBAC matrix aligned to NPA organogram
- SSO bridge connecting ECM to NPA Active Directory
- User onboarding portal for ICT administrators
- Access audit log (exportable, tamper-evident)
- Permission debugger for support and audit

---

#### 📌 Module 02 — Dashboard & UI System | ₦20,000,000

**Current platform:** Next.js 16 App Router, shadcn/ui, role-aware sidebar (30+ visibility rules), executive workspace, secretary dashboard, workspace counts panel, NPA branding, responsive layout.

```
Scope of Delivery (This Contract):
├── Next.js Responsive Frontend (production hardening)
│   ├── Desktop (primary) + Tablet (secondary)
│   └── WCAG 2.1 AA accessibility compliance pass
├── Role-Specific Personalized Dashboards
│   ├── Executive Dashboard (approvals pending, KPI cards) — existing, enhance
│   ├── Officer Dashboard ("My Work" — tasks, correspondence queue)
│   ├── Registry Dashboard (document intake, filing status)
│   └── ICT Admin Dashboard (system health, user activity)
├── Simplified navigation for non-admin users (5 primary buckets)
├── Port-Specific Dashboard Views
├── Production stability fixes (detail pages, SSR/runtime errors)
└── NPA Brand Identity Integration (design system documentation)
```

**Key Deliverables:**
- Stable responsive UI across HQ and port access patterns
- "My Work" default home for operational users
- Configurable dashboard per user role/division/port
- NPA-branded design system (colors, fonts, logos)
- UI/UX documentation and accessibility audit report

---

#### 📌 Module 03 — Document Management Engine | ₦25,000,000

**Current platform:** Document workspaces, collections, version control, metadata/sensitivity levels, sharing ACLs, comments/discussion, form documents, access logs, PostgreSQL full-text search, capture/OCR jobs (Celery), optional ClamAV scanning, MinIO/S3 storage.

```
Scope of Delivery (This Contract):
├── Document Upload & Ingestion
│   ├── Multi-format support (PDF, DOCX, XLSX, JPEG, TIFF)
│   ├── Drag-and-drop upload interface
│   └── Batch upload capability (enhance)
├── Version Control System
│   ├── Automatic version tracking
│   ├── Version comparison (diff viewer polish)
│   └── Rollback to previous version
├── Metadata & Tagging Engine
│   ├── Custom metadata fields per document category
│   └── OCR-powered text extraction (production tuning)
├── Advanced Search & Retrieval
│   ├── Full-text search across document body
│   ├── Filter by date, author, division, status, sensitivity
│   ├── Saved search profiles & search history
│   └── Cross-module search (documents, correspondence, cases)
├── Document Classification Schema
│   ├── Confidential / Internal / Public / Restricted
│   └── Classification-based access restrictions
└── Document Lifecycle Management
    ├── Draft → Review → Approved → Archived states
    └── Integration with retention module (Module 09)
```

**Key Deliverables:**
- Production-grade document repository with performance benchmarks
- OCR pipeline tuned for registry scanning workflows
- Classification and metadata taxonomy document
- Search performance benchmarks (sub-3-second retrieval at HQ load)

---

#### 📌 Module 04 — Workflow & Approval Automation | ₦30,000,000

**Current platform:** Workflow templates/steps/tasks, parallel and sequential correspondence routing, parallel routing groups, SLA configuration, escalation rules, delegation and acting authority, comprehensive activity audit trail, case workflow rules.

```
Scope of Delivery (This Contract):
├── Hierarchy-Based Document Routing
│   ├── Configurable approval chains per document/correspondence type
│   ├── Sequential and parallel approval modes
│   └── Conditional routing based on document value/type
├── Escalation Engine
│   ├── Auto-escalate after defined SLA breach
│   ├── Escalation to supervisor with notification
│   └── Configurable escalation timelines per division
├── Delegation & Acting Authority
│   ├── Temporary delegation during officer absence
│   ├── Acting assignment with time-bound authority
│   └── Full audit trail of delegated actions
├── Audit Trail & Compliance Log
│   ├── Timestamped action log (who did what, when)
│   ├── Append-only activity log architecture
│   └── Exportable for audit purposes
├── Workflow Template Library
│   ├── Minimum 20 pre-configured NPA workflow templates
│   └── Workflow template admin UI (enhance visual designer)
└── SLA Monitoring Dashboard
    ├── Approval turnaround time tracking
    └── Division-level SLA compliance reports
```

**Key Deliverables:**
- 20+ pre-configured NPA workflow templates
- Workflow configuration manual for ICT administrators
- SLA monitoring dashboard accessible to division heads
- Escalation policy documentation

---

#### 📌 Module 05 — Correspondence & Memo Module | ₦25,000,000

**Current platform:** Registration wizard, office inboxes/outbox, minute threads, CC/distribution, correspondence register, templates and drafts, dispatch records, case linkage, FOIA request management, physical document checkout, department files, completion summaries.

```
Scope of Delivery (This Contract):
├── Internal Correspondence
│   ├── Memo composition with NPA letterhead templates
│   ├── Office-based routing (MD/ED/GM/AGM — not person-based)
│   └── Memo threading and response tracking
├── External Correspondence
│   ├── Incoming mail digitization and registration
│   ├── Outgoing letter preparation and dispatch log
│   └── External entity directory (ministries, agencies)
├── Secretary/Registry Delegation
│   ├── Secretary drafts on behalf of director (with controls)
│   ├── Approval required before dispatch
│   └── Full delegation audit trail
├── CC & Distribution
│   ├── Multi-recipient correspondence
│   └── Distribution confirmation tracking
├── Correspondence Register
│   ├── Auto-numbered reference codes
│   ├── Incoming/Outgoing digital registers
│   └── Status tracking (Pending / Replied / Closed)
└── Letter Template Library
    ├── Minimum 15 NPA-standard letter/memo templates
    └── Editable with version control
```

**Key Deliverables:**
- Digital correspondence register (replacing physical register)
- 15+ NPA-standard letter/memo templates
- Secretary delegation workflow with production permission controls
- Incoming mail digitization SOP

---

#### 📌 Module 06 — Digital Signature & Seal Module | ₦15,000,000

**Current platform:** Executive signature profiles, seal generation service, document seals linked to minutes, public seal verification (`/verify`), email OTP and TOTP for seal application, signature templates, user signature preferences.

```
Scope of Delivery (This Contract):
├── Signature Capture Methods
│   ├── Scanned physical signature upload & embedding
│   ├── Signature pad integration (hardware — see Section 2)
│   └── Typed signature with officer profile binding
├── Signature Templates per Officer
│   ├── Individual signature profiles
│   └── Position-title signature blocks
├── Executive Seal & Approval Stamping
│   ├── MD/ED/GM seal generation on approval
│   ├── Date and time stamping
│   └── Public verification portal
├── Signature Verification
│   ├── Visual validation on signed documents
│   └── Signature audit log per document
├── Signed Document Lock
│   ├── Document read-only after final seal
│   └── Hash integrity check
└── PKI Integration (Phase 2 Ready)
    └── Architecture prepared for NPA certificate authority
```

**Key Deliverables:**
- Digital signature/seal profiles for all senior officers
- Public seal verification mechanism (production URL)
- Document integrity (hash) verification system
- Hardware signature pad driver integration

---

#### 📌 Module 07 — Analytics & Reports | ₦15,000,000

**Current platform:** Executive portfolio dashboard, case analytics, performance/SLA views, report snapshots, division performance metrics, Celery scheduled report tasks.

```
Scope of Delivery (This Contract):
├── Executive Analytics Dashboard
│   ├── Document/correspondence volumes by division
│   ├── Approval turnaround times
│   └── Overdue/pending items summary
├── Port Performance Reports
│   ├── Activity per port location
│   └── Cross-port comparison charts
├── Division-Level Reports
│   ├── Correspondence sent/received volumes
│   └── Workflow completion rates
├── Custom Report Builder (enhance)
│   ├── Date range, division, document type filters
│   └── Export to PDF, Excel, CSV
├── Scheduled Report Delivery
│   ├── Weekly/Monthly auto-generated reports
│   └── Email delivery to designated officers
└── Audit & Compliance Reports
    ├── User activity logs
    └── Access and permission change history
```

**Key Deliverables:**
- Real-time analytics dashboard (HQ + port views)
- 12+ pre-built standard report templates
- Scheduled report automation engine
- Monthly executive summary pack (automated)

---

#### 📌 Module 08 — Notifications & Alerts | ₦10,000,000

**Current platform:** In-app notification center, WebSocket real-time delivery (Django Channels), email HTML templates, notification preferences, quiet hours, module/priority filters.

```
Scope of Delivery (This Contract):
├── In-App Notification Center (production tuning)
│   ├── Real-time bell notifications
│   └── Notification history log
├── Email Notifications
│   ├── SMTP integration with NPA mail server
│   └── HTML-formatted notification templates
├── Alert Categories
│   ├── New document/correspondence assigned
│   ├── Approval received / rejected
│   ├── Overdue reminders
│   ├── Escalation alerts
│   └── System maintenance notices
├── Notification Preferences
│   ├── User-configurable settings
│   └── Frequency controls (immediate / daily digest)
└── SMS Gateway (Optional — API-ready)
    └── Webhook/SMS provider integration documentation
```

**Key Deliverables:**
- Notification engine connected to NPA production mail server
- In-app notification center (UAT-validated)
- Configurable alert preferences per user
- SMS gateway API documentation (for future activation)

---

#### 📌 Module 09 — Records Archival & Retention | ₦10,000,000

**Current platform:** Correspondence records/archives UI, soft-delete, archive levels by grade, audit logging. **Retention schedules and legal hold are not yet implemented** (documented on roadmap).

```
Scope of Delivery (This Contract):
├── Automated Archiving Rules
│   ├── Policy-based auto-archiving (by age, status, type)
│   └── Division-configurable retention periods
├── Retention Policy Framework
│   ├── Aligned to NPA records management policy
│   └── National Archives Act compliance alignment
├── Archive Retrieval System
│   ├── Full-text search of archived documents
│   └── Restore from archive to active state
├── Legal Hold Management
│   ├── Freeze documents under litigation/audit hold
│   └── Hold notification to custodian officers
├── Disposition Workflow
│   ├── Scheduled disposition review
│   └── Approval required before permanent deletion
└── Archive Storage Partitioning
    └── Separate MinIO bucket/tier for archived content
```

**Key Deliverables:**
- Retention policy configuration matrix (per document category)
- Auto-archiving engine with scheduling
- Legal hold capability
- Annual archival compliance report template

---

#### 📌 Module 10 — System Integrations | ₦15,000,000

**Current platform:** REST API (`/api/v1/`), OpenAPI/Swagger docs, outbound webhooks with HMAC signatures and delivery tracking, `EmailConnector` and `ERPConnector` backend models, Oracle ERP integration guide (planning doc).

```
Scope of Delivery (This Contract):
├── HRMS Integration
│   ├── Auto-populate staff profiles from NPA HRMS
│   ├── Organizational structure sync
│   └── Staff transfer/exit triggers access updates
├── Active Directory Integration
│   ├── AD-based authentication (with Module 01 SSO)
│   └── AD group → ECM role mapping
├── NPA Email System Integration
│   ├── Correspondence notifications via NPA SMTP
│   └── Email-to-ECM capture (IMAP incoming mail)
├── ERP Connector (Oracle — Phase 1)
│   ├── REST API bridge (1–2 object types)
│   └── Integration admin UI (connector CRUD + logs; complete ingestion/sync)
├── Legacy System Connectors
│   ├── API bridge for existing NPA applications
│   └── Data migration utilities
└── API Gateway & Webhooks
    ├── RESTful API documentation (Swagger — existing, publish)
    └── Webhook event catalog for external systems
```

**Key Deliverables:**
- HRMS synchronization pipeline (scheduled or real-time)
- Active Directory / SSO connector (production)
- Email integration gateway (inbound + outbound admin UI)
- Oracle ERP connector (pilot use case)
- Published API and webhook integration guide

---

# SECTION 2 — INFRASTRUCTURE & DEPLOYMENT (ON-PREMISE)
## Budget Allocation: ₦65,000,000

---

### 2.1 Budget Summary Table

| # | Component | Description | Est. Cost (₦M) |
|---|-----------|-------------|----------------|
| 01 | Data Center Deployment Setup | Docker, PostgreSQL, Django/Daphne, Next.js, Nginx | ₦10M |
| 02 | Storage Configuration | MinIO / NPA SAN setup, archive tiers | ₦10M |
| 03 | Network & Security Hardening | Firewalls, HTTPS, VPN, SSL, ClamAV | ₦15M |
| 04 | Backup & Disaster Recovery | Daily backups, snapshots, DR sync | ₦10M |
| 05 | User Devices & Scanners | High-speed scanners, signature pads (2/dept) | ₦20M |
| | **SUBTOTAL** | | **₦65M** |

---

### 2.2 Detailed Infrastructure Specifications

---

#### 🖥️ Component 01 — Data Center Deployment Setup | ₦10,000,000

**Current platform:** Docker Compose (local/stag/prod), Nginx reverse proxy, backend entrypoint (migrate + collectstatic), Next.js standalone builds, health endpoints (liveness/readiness), Celery worker + beat, Redis, Daphne for WebSockets.

```
Deployment Architecture:
├── Application Server Configuration
│   ├── Django REST Framework backend
│   ├── Daphne ASGI (WebSockets + HTTP)
│   ├── Next.js standalone frontend build
│   └── Nginx reverse proxy (prod.conf / stag.conf)
├── Database Server
│   ├── PostgreSQL 16 installation, hardening, tuning
│   ├── Schema deployment & migration automation
│   └── Connection pooling (PgBouncer)
├── Containerization
│   ├── Docker images for all services
│   └── Compose orchestration (UAT / Staging / Production)
├── Environment Configuration
│   ├── Production, Staging, and UAT environments
│   └── env-manager.sh operational CLI
└── NPA Data Center Integration
    ├── Compliance with NPA ICT infrastructure standards
    └── Coordination with NPA ICT for server allocation
```

---

#### 💾 Component 02 — Storage Configuration | ₦10,000,000

```
Storage Architecture:
├── MinIO Object Storage
│   ├── Cluster configuration (active, archive, temp buckets)
│   └── Access key management & rotation policy
├── NPA SAN Integration
│   ├── Mount SAN volumes for database and object storage
│   └── Storage quota management per division
├── Storage Tiering
│   ├── Hot — Active documents (SSD)
│   ├── Warm — Recent archives (HDD)
│   └── Cold — Long-term retention
├── Retention Partition Setup
│   ├── Automated migration between tiers
│   └── Storage usage monitoring & alerting
└── Capacity Planning
    └── 5-year growth projection and scaling roadmap
```

---

#### 🔐 Component 03 — Network & Security Hardening | ₦15,000,000

```
Security Implementation:
├── Firewall Configuration
│   ├── Application-layer rules
│   ├── Port restriction and whitelisting
│   └── DDoS basic protection
├── SSL/TLS Certificates
│   ├── Wildcard certificate for NPA ECM domain
│   ├── Certificate lifecycle management
│   └── HTTPS enforcement (HSTS)
├── VPN Tunnels for Port Locations
│   ├── Site-to-site VPN (HQ ↔ each port)
│   ├── Encrypted communication channels
│   └── VPN failover configuration
├── Network Segmentation
│   ├── ECM dedicated VLAN
│   └── DMZ for external verification portal (seal verify)
├── Application Security
│   ├── ClamAV malware scanning (production enablement)
│   ├── Rate limiting (API + login)
│   ├── Security headers middleware
│   └── CORS hardening for production
├── Intrusion Detection
│   ├── IDS/IPS basic configuration
│   └── Log monitoring and alerting
└── Security Baseline Documentation
    └── CIS benchmark compliance checklist
```

---

#### 🔄 Component 04 — Backup & Disaster Recovery | ₦10,000,000

**Current platform:** `scripts/backup/backup-db.sh`, `verify_backup.sh`, `restore_backup.sh`; pre-deploy DB snapshots on staging/production deploy.

```
Backup Strategy:
├── Daily Incremental Backups
│   ├── Automated nightly backup (documents + database + MinIO)
│   ├── Retention: 30 days rolling
│   └── Backup success notification to ICT team
├── Weekly Full Snapshots
│   ├── Complete system snapshot
│   ├── Retention: 3 months
│   └── Dedicated backup storage
├── Disaster Recovery Sync
│   ├── DR site synchronization (NPA secondary DC)
│   ├── RPO: 24 hours | RTO: 4 hours
│   └── Quarterly DR drills and validation
├── Database Point-in-Time Recovery
│   ├── PostgreSQL WAL archiving
│   └── Granular restoration capability
└── Backup Monitoring Dashboard
    └── Real-time backup status for ICT admins
```

---

#### 🖨️ Component 05 — User Devices & Scanners | ₦20,000,000

```
Hardware Procurement & Deployment:
├── High-Speed Document Scanners
│   ├── Quantity: 2 units per department (HQ + Ports)
│   ├── Specification: ADF, duplex, min 50 ppm, 600 DPI
│   └── Brand: Canon imageFORMULA / Fujitsu fi-Series (or NPA-approved equivalent)
├── Signature Pads
│   ├── Quantity: 2 units per department
│   ├── Specification: LCD, pressure-sensitive, USB
│   └── Brand: Wacom STU / Topaz (or NPA-approved equivalent)
├── Scanner Software
│   ├── TWAIN-compliant drivers
│   └── ECM capture module integration
├── Deployment & Configuration
│   ├── Installation at each location
│   ├── Integration testing with upload/OCR pipeline
│   └── User training on device operation
└── Warranty & Maintenance
    └── Minimum 2-year manufacturer warranty
```

---

# SECTION 3 — PORT & LOCATION IMPLEMENTATION
## Budget Allocation: ₦35,000,000

---

### 3.1 Budget Summary Table

| # | Activity | Description | Est. Cost (₦M) |
|---|----------|-------------|----------------|
| 01 | HQ Implementation | Full deployment, all divisions, primary rollout | ₦10M |
| 02 | Pilot Ports | Apapa, Rivers, Tin Can Island — live testing | ₦10M |
| 03 | Remaining Ports | Full national deployment post-pilot validation | ₦15M |
| | **SUBTOTAL** | | **₦35M** |

---

### 3.2 Implementation Phasing Strategy

```
Phase 1 — HQ Deployment (Month 1–8)
├── Production ECM deployment at NPA Headquarters
├── All HQ divisions onboarded
├── Parallel running with manual processes (4 weeks)
├── UAT sign-off and security clearance
└── HQ Go-Live declared

Phase 2 — Pilot Port Deployment (Month 9–12)
├── Apapa Port Complex
├── Rivers Port (Port Harcourt)
├── Tin Can Island Port
│   ├── Network connectivity verification
│   ├── Scanner and device installation
│   ├── Staff training and onboarding
│   └── Live operation monitoring
└── Pilot Review & Lessons Learned Report

Phase 3 — National Port Rollout (Month 13–18)
├── Onne Port
├── Delta Port (Warri)
├── Calabar Port
├── Kano Inland Container Depot
├── Lagos Port Complex (additional offices)
└── All remaining NPA locations
```

---

### 3.3 Port Connectivity Requirements

| Port Location | Connection Type | Bandwidth Requirement | VPN Requirement |
|---------------|----------------|----------------------|-----------------|
| Apapa Port | Fiber / MPLS | Minimum 10 Mbps | ✅ Required |
| Rivers Port (PHC) | Fiber / MPLS | Minimum 10 Mbps | ✅ Required |
| Tin Can Island | Fiber / MPLS | Minimum 10 Mbps | ✅ Required |
| Onne Port | Fiber / 4G Backup | Minimum 5 Mbps | ✅ Required |
| Delta Port (Warri) | Fiber / 4G Backup | Minimum 5 Mbps | ✅ Required |
| Calabar Port | Fiber / 4G Backup | Minimum 5 Mbps | ✅ Required |
| Inland Depots | 4G / VSAT Backup | Minimum 4 Mbps | ✅ Required |

---

# SECTION 4 — TRAINING, CHANGE MANAGEMENT & DOCUMENTATION
## Budget Allocation: ₦25,000,000

---

### 4.1 Budget Summary Table

| # | Activity | Description | Est. Cost (₦M) |
|---|----------|-------------|----------------|
| 01 | Division & Departmental Trainings | Hands-on workshops, all divisions & ports | ₦10M |
| 02 | User Manuals & SOPs | Full documentation (digital + print) | ₦5M |
| 03 | Awareness & Launch Campaign | Internal launch, sensitization, communications | ₦3M |
| 04 | Helpdesk Setup (3 Staff) | Tier 1 support for all ECM users | ₦7M |
| | **SUBTOTAL** | | **₦25M** |

---

### 4.2 Training Programme Design

#### 🎓 Activity 01 — Division & Departmental Trainings | ₦10,000,000

```
Training Architecture:
├── Track A — Executive Officers (MD, EDs, Directors)
│   ├── Duration: 4 hours
│   ├── Focus: Dashboard, approvals, digital seal
│   └── Format: Small group / one-on-one
├── Track B — Divisional/Departmental Officers
│   ├── Duration: 1.5 days
│   ├── Focus: Correspondence, workflow, documents
│   └── Format: Classroom + PC lab
├── Track C — Registry & Secretariat Staff
│   ├── Duration: 2 days
│   ├── Focus: Scanning, intake, filing, archiving
│   └── Format: Hands-on practical
└── Track D — ICT Administrators
    ├── Duration: 3 days
    ├── Focus: env-manager, user management, backup, integrations
    └── Format: Technical workshop
```

**Training Coverage Estimate:**

| Group | Approx. Staff Count | Sessions Required |
|-------|---------------------|-------------------|
| Executive Officers | ~20 | 3 |
| Divisional Officers (HQ) | ~300 | 15 |
| Port Officers (all ports) | ~400 | 20 |
| Registry/Secretariat | ~100 | 8 |
| ICT Administrators | ~20 | 2 |
| **Total** | **~840** | **~48 sessions** |

---

#### 📚 Activity 02 — User Manuals & SOPs | ₦5,000,000

```
Documentation Deliverables:
├── End-User Manual (per module — aligns with docs/user-guides/)
├── Administrator Manual (ICT) — deployment, env-manager, troubleshooting
├── Standard Operating Procedures (SOPs)
│   ├── SOP-001: Document Submission & Routing
│   ├── SOP-002: Correspondence Registration
│   ├── SOP-003: Digital Seal Application
│   ├── SOP-004: Records Archiving Procedure
│   ├── SOP-005: Delegation of Authority in ECM
│   └── SOP-006: Port Location Access & VPN
├── Quick Reference Cards (laminated, per role)
└── Online Help System (in-app tooltips + FAQ knowledge base)
```

---

#### 📣 Activity 03 — Awareness & Launch Campaign | ₦3,000,000

```
Campaign Components:
├── Executive Launch Event (MD endorsement)
├── Internal communications (intranet, email, circular)
├── Sensitization materials (posters, flyers, screensavers)
└── Monthly deployment progress newsletter
```

---

#### 🎧 Activity 04 — Helpdesk Setup | ₦7,000,000

```
Helpdesk Structure:
├── Staffing: 3 dedicated support officers (12 months)
├── Channels: phone extension, in-app tickets, ecm-support@npa.gov.ng
├── Hours: Mon–Fri 8AM–5PM; on-call for critical incidents
├── Ticketing: SLA 4h critical / 24h normal
└── Cost Breakdown
    ├── Staff salaries (12 months): ₦4.5M
    ├── Helpdesk tooling: ₦1.5M
    └── Staff training & certification: ₦1.0M
```

---

# SECTION 5 — QUALITY ASSURANCE, SECURITY AUDIT & SUPPORT
## Budget Allocation: ₦25,000,000

---

### 5.1 Budget Summary Table

| # | Activity | Description | Est. Cost (₦M) |
|---|----------|-------------|----------------|
| 01 | Functional & UAT Testing | Full workflow and correspondence testing | ₦10M |
| 02 | Security & Penetration Testing | External cybersecurity audit | ₦7M |
| 03 | Post-Go-Live Support (12 Months) | Maintenance, bug fixes, optimization | ₦8M |
| | **SUBTOTAL** | | **₦25M** |

---

### 5.2 QA & Testing Framework

#### ✅ Activity 01 — Functional & UAT Testing | ₦10,000,000

**Current platform:** Backend test suite (21 test modules), GitHub Actions CI (Postgres, lint, type-check, build, security scan), `make ci` local mirror.

```
Testing Methodology:
├── Automated Testing (expand)
│   ├── Backend: pytest/Django (existing — extend coverage)
│   ├── Frontend: Vitest (existing) + Playwright E2E (new — top 15 journeys)
│   └── API contract tests for integrations
├── Integration Testing
│   ├── Cross-module workflow validation
│   └── HRMS/AD/Email integration validation
├── System & Load Testing
│   ├── HQ concurrent user load test
│   └── Port VPN latency acceptance tests
├── User Acceptance Testing (UAT)
│   ├── Duration: 4 weeks
│   ├── UAT team: officers per division
│   └── Formal sign-off certificate per module
└── Defect Management
    ├── Priority classification (Critical/High/Medium/Low)
    └── Regression testing before each release
```

**Minimum 150 documented test scenarios**, including:

| ID | Scenario |
|----|----------|
| TS-01 | Officer submits memo → Director approves → Archived |
| TS-02 | SLA breach → Auto-escalation triggered |
| TS-03 | Registry scans letter → Routes to division |
| TS-04 | ED approves minute → Seal applied → Verify portal |
| TS-05 | Port officer accesses HQ correspondence via VPN |
| TS-06 | Secretary registers on behalf of office (permission-controlled) |
| TS-07 | AD SSO login → Role mapped correctly |
| TS-08 | Legal hold prevents disposition |
| TS-09 | FOIA request lifecycle |
| TS-10 | Webhook fires on correspondence completion |

---

#### 🔐 Activity 02 — Security & Penetration Testing | ₦7,000,000

```
Security Audit Scope:
├── Independent certified security firm (CREST/OSCP)
├── Web application penetration test (OWASP Top 10)
├── Network penetration test
├── Authentication & privilege escalation testing
├── File upload & API endpoint security review
├── Dependency vulnerability assessment
└── Deliverables
    ├── Vulnerability assessment report
    ├── Penetration test report
    ├── Remediation plan (funded from contingency if needed)
    └── Post-remediation retest confirmation
```

---

#### 🛠️ Activity 03 — Post-Go-Live Support (12 Months) | ₦8,000,000

```
Support Structure:
├── Bug Fixes: Critical 24h / High 72h SLA
├── Monthly maintenance releases (zero-downtime deploy procedure)
├── Quarterly performance review & DB optimization
├── Minor enhancements: up to 50 hours/month
├── 24/7 uptime monitoring with ICT alert escalation
└── Monthly support reports (uptime, incidents, recommendations)
```

---

# SECTION 6 — PROJECT MANAGEMENT & CONTINGENCY
## Budget Allocation: ₦20,000,000

---

### 6.1 Budget Summary Table

| # | Component | Description | Est. Cost (₦M) |
|---|-----------|-------------|----------------|
| 01 | Project Coordination | ICT + implementation team | ₦10M |
| 02 | Contingency & Miscellaneous | Migration, data cleansing, unforeseen costs | ₦10M |
| | **SUBTOTAL** | | **₦20M** |

---

### 6.2 Project Management Structure

```
Project Team Structure:
├── Project Steering Committee (NPA Executive)
│   ├── ED (ICT) — Project Sponsor
│   ├── Representative from MD's Office
│   └── Directors of key divisions
├── Implementation Team
│   ├── Project Manager
│   ├── Business Analyst / Change Manager
│   └── Technical Lead
├── NPA Internal Team
│   ├── ICT Project Coordinator
│   ├── Division Champions (1 per division)
│   └── Change Management Officer
└── Governance
    ├── Weekly progress meetings
    ├── Monthly steering committee reviews
    └── Quarterly milestone sign-offs
```

---

### 6.3 Contingency Allocation | ₦10,000,000

```
├── Legacy document scanning & digitization (priority batches)
├── HRMS data cleansing before bulk import
├── Approved scope change requests
├── Additional network/server capacity if audit requires
├── Extended UAT or security remediation cycles
└── Port deployment travel and ad hoc procurement
```

---

# SECTION 7 — PROJECT TIMELINE

---

### 7.1 Master Implementation Schedule

| Phase | Activity | Duration | Months |
|-------|----------|----------|--------|
| **Phase 0** | Project initiation, team setup, capacity audit | 4 weeks | M1 |
| **Phase 1** | Enterprise hardening (SSO, retention, integrations, stability) | 5 months | M2–M6 |
| **Phase 2** | Infrastructure setup, security hardening (parallel) | 2 months | M5–M6 |
| **Phase 3** | System integration & internal testing | 1 month | M7 |
| **Phase 4** | User Acceptance Testing (UAT) | 1 month | M8 |
| **Phase 5** | Security audit & penetration testing | 3 weeks | M8–M9 |
| **Phase 6** | HQ Go-Live & stabilization | 6 weeks | M9–M10 |
| **Phase 7** | Pilot port deployment (Apapa, Rivers, Tin Can) | 2 months | M10–M12 |
| **Phase 8** | Training (all locations) | Ongoing | M8–M14 |
| **Phase 9** | Remaining ports national rollout | 4 months | M12–M15 |
| **Phase 10** | Project closure, handover; 12-month support begins | — | M16–M18 |

> **Note:** Because core software exists, Phase 1 emphasizes **production readiness** (SSO, records governance, integration UI, E2E tests, performance) rather than greenfield module coding.

---

### 7.2 Key Milestones

| # | Milestone | Target Month |
|---|-----------|-------------|
| M1 | Project charter signed, team mobilized, capacity audit complete | Month 1 |
| M2 | SSO/AD design approved; retention policy signed off | Month 2 |
| M3 | Staging environment mirrors production; E2E test suite live | Month 4 |
| M4 | SSO, retention MVP, integration admin UI complete | Month 6 |
| M5 | Infrastructure fully configured (prod + DR) | Month 7 |
| M6 | UAT complete, formal sign-off | Month 8 |
| M7 | Security audit complete, clearance obtained | Month 9 |
| M8 | **HQ GO-LIVE** | Month 10 |
| M9 | Pilot ports go-live (Apapa, Rivers, Tin Can) | Month 12 |
| M10 | All ports national go-live | Month 15 |
| M11 | Project closure & formal handover | Month 16 |
| M12 | 12-month post-go-live support period ends | Month 28 |

---

# SECTION 8 — RISK REGISTER

| # | Risk | Probability | Impact | Mitigation Strategy |
|---|------|------------|--------|---------------------|
| R1 | NPA server capacity insufficient | Medium | High | Capacity audit Month 1; contingency for additional hardware |
| R2 | Port bandwidth inadequate | High | High | Pre-deployment connectivity survey; 4G backup at remote ports |
| R3 | Staff resistance / low adoption | Medium | High | Executive mandate, division champions, role-based training |
| R4 | HRMS / AD data quality issues | High | Medium | Data cleansing sprint M1–M2 before integration |
| R5 | Scope creep | Medium | Medium | Change control board; fixed ₦350M cap |
| R6 | Security vulnerabilities in audit | Medium | High | Security-first development; remediation from contingency |
| R7 | Permission/config drift across environments | Medium | High | Backend-only permissions; env parity checks in CI |
| R8 | Production runtime errors on key pages | Medium | High | E2E tests; staging = prod parity; fix-before-go-live gate |
| R9 | Regulatory records requirement changes | Low | Medium | Configurable retention module (Module 09) |
| R10 | Hardware procurement delays | Medium | Low | Early procurement M1; approved local suppliers |

---

# SECTION 9 — FINANCIAL SUMMARY

---

### 9.1 Grand Total Cost Summary

| # | Category | Budget (₦ Million) | % of Total |
|---|----------|--------------------|-----------|
| 1 | Core Software Development | ₦180,000,000 | 51.4% |
| 2 | Infrastructure & On-Premise Deployment | ₦65,000,000 | 18.6% |
| 3 | Port & Location Implementation | ₦35,000,000 | 10.0% |
| 4 | Training, Change Management & Documentation | ₦25,000,000 | 7.1% |
| 5 | Quality Assurance, Security Audit & Support | ₦25,000,000 | 7.1% |
| 6 | Project Management & Contingency | ₦20,000,000 | 5.7% |
| | **GRAND TOTAL** | **₦350,000,000** | **100%** |

---

### 9.2 Budget Distribution

```
SOFTWARE DEV     ████████████████████████████████████████████████████  51.4%  ₦180M
INFRASTRUCTURE   ███████████████████                                    18.6%  ₦65M
PORTS ROLLOUT    █████████████                                          10.0%  ₦35M
TRAINING         ███████                                                 7.1%  ₦25M
QA & SECURITY    ███████                                                 7.1%  ₦25M
PROJECT MGMT     █████                                                   5.7%  ₦20M
                 ─────────────────────────────────────────────────────────────────
TOTAL            ₦350,000,000 (Fixed Cap)
```

---

### 9.3 Payment Milestone Schedule (Suggested)

| Milestone | Payment % | Amount (₦M) | Trigger |
|-----------|-----------|-------------|---------|
| Contract award & mobilization | 15% | ₦52.5M | Contract signature |
| Infrastructure setup complete | 10% | ₦35.0M | Server/network acceptance |
| Enterprise hardening phase complete (SSO, retention, integrations) | 20% | ₦70.0M | Demo & technical sign-off |
| UAT sign-off & security clearance | 20% | ₦70.0M | UAT certificate + security report |
| HQ go-live | 15% | ₦52.5M | Live system confirmed (30 days stable) |
| Pilot ports go-live | 10% | ₦35.0M | Apapa, Rivers, Tin Can accepted |
| All ports go-live | 7% | ₦24.5M | National rollout complete |
| Project closure & handover | 3% | ₦10.5M | Final acceptance certificate |
| **TOTAL** | **100%** | **₦350M** | |

---

# SECTION 10 — TECHNICAL ARCHITECTURE OVERVIEW

---

### 10.1 Technology Stack (As Implemented)

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│         Next.js 16 (App Router) — Responsive Web UI          │
│              Nginx reverse proxy (on-premise)                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│     Django 4.2 + Django REST Framework (Python 3.11)       │
│   Daphne ASGI (HTTP + WebSockets) · Celery (async tasks)    │
└─────────────────────────────────────────────────────────────┘
                              │
┌────────────────────┬────────────────────┬───────────────────┐
│   DATABASE LAYER   │   STORAGE LAYER     │  CACHE / QUEUE    │
│   PostgreSQL 16    │  MinIO (S3-compat)  │  Redis 7          │
│   (NPA Data Center)│  / NPA SAN          │  Channels + Celery│
└────────────────────┴────────────────────┴───────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                          │
│    HRMS API · Active Directory (SSO) · NPA SMTP/IMAP         │
│    Oracle ERP REST · Outbound Webhooks · OpenAPI /api/v1/    │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Application Modules (Backend)

| App | Function |
|-----|----------|
| `accounts` | Users, JWT, signatures, seals, OTP/TOTP |
| `organization` | Directorate → Division → Department → Office, roles |
| `correspondence` | Memos, minutes, routing, cases, FOIA, physical docs |
| `dms` | Documents, versions, workspaces, permissions |
| `workflow` | Approval templates and tasks |
| `analytics` | SLA, escalation, executive portfolio, reports |
| `search` | Full-text search, saved searches, history |
| `notifications` | In-app, email, WebSocket |
| `audit` | Activity logs |
| `integrations` | Webhooks, email/ERP connectors |
| `capture` | OCR and scan jobs |
| `forms` | Form documents and templates |

---

### 10.3 Security Architecture

```
INTERNET / PORT LOCATIONS
        │
        ▼
┌───────────────────┐
│    VPN Gateway    │  ← Site-to-site VPN (HQ ↔ Ports)
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Firewall / WAF  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Nginx (TLS 1.3)  │  ← Rate limiting, security headers
└───────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  Docker: Frontend + Backend   │
│  Daphne · Celery · Channels   │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  PostgreSQL · Redis · MinIO   │
│  (internal network only)      │
└───────────────────────────────┘
```

---

# SECTION 11 — KEY ASSUMPTIONS & CONDITIONS

| # | Assumption |
|---|-----------|
| A1 | NPA provides sufficient server capacity in existing data centers (capacity audit in Month 1) |
| A2 | Adequate bandwidth or MPLS/VPN connectivity at each port before go-live |
| A3 | NPA ICT assigns dedicated internal resources for infrastructure and integration |
| A4 | NPA HRMS and Active Directory are functional with accessible APIs or LDAP/SAML |
| A5 | Executive mandate and management support for change management |
| A6 | NPA provides branding assets, organogram, and organizational master data |
| A7 | ₦350M is a fixed cap; additional scope requires separate change request |
| A8 | Hardware procurement follows NPA procurement regulations |
| A9 | Training venues at HQ and ports provided by NPA at no extra cost |
| A10 | Compliance with Nigerian digital records and National Archives requirements |
| A11 | Existing NPA-ECM codebase and documentation remain the technical foundation |
| A12 | Staging/UAT environment available for validation before production cutover |

---

# SECTION 12 — EXPECTED OUTCOMES & BENEFITS

---

### 12.1 Quantifiable Benefits

| Benefit | Expected Outcome |
|---------|-----------------|
| Paper reduction | 80–90% reduction in internal paper correspondence within 12 months of HQ go-live |
| Approval turnaround | Average approval time reduced from days to hours |
| Document retrieval | Retrieval from hours to seconds (search + reference number) |
| Compliance | 100% audit trail on correspondence and approval actions |
| Physical storage | Reduction in filing cabinet and off-site storage dependence |
| Staff productivity | Estimated 2–4 hours/week saved per officer in document handling |
| Executive accountability | 100% of MD/ED/GM seals verifiable via public verify portal |

---

### 12.2 Strategic Benefits

```
✅ Unified digital workspace across HQ and all port locations
✅ Office-based queues — seamless handover when officers change roles
✅ Real-time visibility of correspondence and approval status for management
✅ Institutional memory via completion packages and searchable archives
✅ Strengthened corporate governance and accountability
✅ Foundation for AI document classification (Phase 2)
✅ Alignment with Federal Government digital transformation agenda
✅ Enhanced disaster resilience (digital backups vs. physical files only)
✅ Sovereign on-premise deployment — data remains within NPA infrastructure
```

---

### 12.3 Competitive Positioning Summary

| vs. Commercial ECM (SharePoint, OpenText, etc.) | NPA-ECM Advantage |
|------------------------------------------------|-------------------|
| Generic folder collaboration | Purpose-built correspondence & office routing |
| Per-seat licensing at national scale | Fixed project cap; self-hosted TCO |
| 18–36 month vendor customization | Org structure and workflows pre-modeled for NPA |
| Executive seal workflow | Native MD/ED/GM seal + verification |
| Foreign cloud dependency | On-premise, NPA-controlled data centers |

*See [ECM Comparison Matrix](./ECM_COMPARISON_MATRIX.md) for detailed feature-by-feature analysis.*

---

# SECTION 13 — DELIVERABLES CHECKLIST

| # | Deliverable | Section | Acceptance Criteria |
|---|-------------|---------|---------------------|
| D1 | Production ECM application (all 10 modules) | §1 | UAT sign-off all modules |
| D2 | On-premise infrastructure (prod + DR + UAT) | §2 | ICT infrastructure acceptance |
| D3 | HQ + all ports deployed and trained | §3, §4 | Location go-live certificates |
| D4 | User manuals, SOPs, admin guides | §4 | Published digital + print sets |
| D5 | Security audit clearance report | §5 | No unresolved critical findings |
| D6 | 12-month post-go-live support | §5 | Monthly support reports delivered |
| D7 | API & integration documentation | §1.10 | Published Swagger + webhook catalog |
| D8 | Backup & DR runbook | §2.4 | Successful quarterly DR drill |
| D9 | Project closure report & knowledge transfer | §6 | Steering committee sign-off |

---

> **Document Prepared For:** Nigerian Ports Authority (NPA)  
> **Project Classification:** Internal — Confidential  
> **Total Project Value:** ₦350,000,000 (Fixed Cap)  
> **Delivery Model:** On-Premise, NPA-Hosted  
> **Implementation Period:** 18 Months  
> **Post-Go-Live Support:** 12 Months Inclusive  

---

*This proposal represents a comprehensive, fully costed plan for the completion, hardening, deployment, and support of the NPA Enterprise Content Management System within the approved budget ceiling of ₦350,000,000. It reflects the actual NPA-ECM platform state as of June 2026 and prioritizes enterprise readiness, national rollout, and adoption over redundant greenfield development.*
