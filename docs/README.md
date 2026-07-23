# NPA ECM Documentation

Welcome to the NPA Electronic Content Management System documentation.

## Documentation Structure

```
docs/
├── adr/                  # Architecture Decision Records
│   └── 0001-document-access-architecture.md
├── architecture/         # Architecture documentation
│   ├── correspondence-routing.md
│   ├── org-hierarchy.md
│   └── signature-seal-flow.md
├── features/             # Feature documentation (living docs)
│   ├── admin.md
│   ├── analytics.md
│   ├── auth-seal.md
│   ├── cases.md
│   ├── correspondence.md
│   ├── dms.md
│   ├── forms.md
│   ├── inbox.md
│   ├── rich-text-editor.md
│   ├── search.md
│   └── workflow.md
├── guides/               # Development & operations guides
│   ├── CI-CD-README.md
│   ├── DATABASE_PERSISTENCE_GUIDE.md
│   ├── DEPENDENCY_INSTALLATION_GUIDE.md
│   ├── DESIGN.md
│   ├── MANUAL_DEPLOYMENT.md
│   ├── NPA_ECM_SETUP_GUIDE.md
│   ├── ORACLE_ERP_INTEGRATION_GUIDE.md
│   ├── QUICK_INSTALL_GUIDE.md
│   ├── QUICK_START.md
│   ├── SYSTEM_DEPENDENCIES_INSTALLATION.md
│   ├── code-quality.md
│   ├── database-optimizations.md
│   ├── migration-guide.md
│   └── WCAG_AUDIT_CHECKLIST.md
├── components/           # Component API/props reference
│   └── COMPONENTS_REFERENCE.md
├── api/                  # API documentation
│   └── API_REFERENCE.md
├── user-guides/          # User-facing guides
│   └── USER_GUIDES.md
├── rollout/              # National rollout & helpdesk ops
│   ├── NATIONAL_ROLLOUT_RUNBOOK.md
│   ├── TRAINING_CURRICULUM.md
│   └── HELPDESK_OPERATIONS.md
├── modules/              # Module implementation docs
│   └── NOTIFICATIONS_AND_AUDIT_IMPLEMENTATION.md
├── procurement/          # Procurement & proposal documents
│   ├── BOQ_README.md
│   ├── BOQ_NPA_ECM_PROJECT.csv
│   ├── CFO_SUMMARY_ONE_PAGE.md
│   ├── ECM_COMPARISON_MATRIX.md
│   ├── PROJECT_PROPOSAL_AND_COST_BREAKDOWN.md
│   └── REMAINING_WORK_BACKLOG.md
├── sprints/              # Implementation sprint plans
│   └── S1_STABILITY_AND_PERMISSIONS.md
└── README.md             # This file
```

## Key Documents

### For Developers
- **[Feature Docs](./features/)**: Living documentation per feature area (DMS, cases, correspondence, forms, rich text, inbox, search, etc.)
- **[UI design language](./guides/DESIGN.md)**: Detail shells, modal tokens, density rules
- **[Architecture Docs](./architecture/)**: System architecture and design documentation
- **[ADR](./adr/)**: Architecture Decision Records
- **[🧩 Component Reference](./components/COMPONENTS_REFERENCE.md)**: Component index and props (updated July 2026)
- **[API Reference](./api/API_REFERENCE.md)**: Complete API documentation
- **[Guides](./guides/)**: Development, deployment, and operations guides

### For End Users
- **[User Guides](./user-guides/USER_GUIDES.md)**: Step-by-step instructions
- **[Helpdesk Operations](./rollout/HELPDESK_OPERATIONS.md)**: Ticket workflow and SLAs
- **[WCAG Audit Checklist](./guides/WCAG_AUDIT_CHECKLIST.md)**: Accessibility checklist (highs remediated July 2026; mediums open)

### For Operations & Rollout
- **[National Rollout Runbook](./rollout/NATIONAL_ROLLOUT_RUNBOOK.md)**: Port cutover and hypercare
- **[Training Curriculum](./rollout/TRAINING_CURRICULUM.md)**: Role-based training modules

### For Procurement & Stakeholders
- **[CFO Summary (One Page)](./procurement/CFO_SUMMARY_ONE_PAGE.md)**: Board-ready financial summary (840 & 3,000 users)
- **[Excel BOQ](./procurement/BOQ_README.md)**: CSV line items, vendor TCO, payment milestones
- **[Project Proposal & Cost Breakdown](./procurement/PROJECT_PROPOSAL_AND_COST_BREAKDOWN.md)**: Full ₦350M proposal, timeline, and deliverables
- **[Remaining Work Backlog](./procurement/REMAINING_WORK_BACKLOG.md)**: Itemized P0/P1/P2 backlog with BOQ mapping; Phase 9–11 MVP status + July 2026 a11y/editor notes
- **[ECM Price Comparison](./procurement/ECM_PRICE_COMPARISON.md)**: 5-year TCO vs top-10 vendors (840 & 3,000 users)
- **[ECM Comparison Matrix](./procurement/ECM_COMPARISON_MATRIX.md)**: Feature comparison vs. top-10 ECM vendors

## Removed Pages
The following standalone pages were removed or replaced in recent refactoring:

| Old Page | Status | Replacement |
|----------|--------|-------------|
| `/forms` (Forms Library) | Redirects to `/dms` | Access forms via DMS "My Documents" (filter type=Form) or "Pending Signatures" tab |
| `/workspaces` | Redirects to `/dashboard` | Dashboard replaces workspace concept |
| `/workspaces/[id]` | Redirects to `/dashboard` | Dashboard replaces workspace concept |
| `/correspondence/archived` | Redirects → `/correspondence/records` | Folded into records |
| `/analytics/reports` | Deleted | Replaced by `/analytics/cases` |
| `/tasks` | Deleted | Folded into inbox/notifications |
| `/help` | Deleted | Help content migrated to ContextualHelp components |

## Recent Architecture Changes
- **Auth**: Tokens migrated from `localStorage` to HTTP-only secure cookies
- **Correspondence**: My Sent / Office Sent queues; parallel routing with branches; physical copy tracking; scope enforcement
- **DMS**: `DocumentWorkspace` model removed; form documents merged into DMS
- **Forms**: Standalone page removed, now accessed via DMS; 3 audit form templates + PDF generators
- **Organization**: Office `location` FK; Locations CRUD; new role presets (AGM, Principal Manager)
- **Sidebar**: Renamed/regrouped sections (My Workspace, Tools); removed Forms Library
