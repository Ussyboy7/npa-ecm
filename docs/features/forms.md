# Forms Module

## Overview
The Forms module provides structured data collection through form templates, submissions with signature workflows, and PDF generation. Forms are stored as `Document` records with `document_type: "form"` and managed alongside regular documents in the DMS.

## Architecture

### Backend
- **`forms/` app** — `FormTemplate`, `FormSubmission`, `FormSignatureWorkflow`, `FormSignature`
- **`dms/` app** — `FormDocument` (OneToOne → `Document`), `Document.document_type: "form"`
- **PDF generation**: `forms/pdf_generator.py`

### Frontend
- **Form editor**: `app/forms/[id]/page.tsx` → `components/dms/FormDocumentEditor.tsx` → `components/forms/DynamicFormRenderer.tsx`
- **Form list**: Accessible via DMS tabs (`app/dms/`) — "My Documents" (filterable by type=Form) and "Pending Signatures"
- **Create entry**: "Create > Form" dropdown in DMS header → `CreateFormDocumentDialog`

### API
- `GET/POST /api/v1/forms/templates/` — Form template CRUD
- `GET/POST /api/v1/forms/submissions/` — Form submission CRUD
- `PATCH /api/v1/forms/submissions/{id}/` — Save draft / update
- `POST /api/v1/forms/submissions/{id}/submit/` — Submit form
- `GET /api/v1/forms/submissions/{id}/generate_pdf/` — Generate PDF
- `GET /api/v1/forms/submissions/{id}/signature_workflow/` — Get signature workflow
- `GET/POST /api/v1/forms/signatures/` — Form signatures
- `GET/POST /api/v1/forms/signature-workflows/` — Signature workflow management

## Data Model

### FormTemplate
- `name`, `slug`, `description`, `category` (general, hr, finance, procurement, operations, compliance, audit)
- `structure` (JSON): `{ fields[], sections[], signatures{} }`
- `is_active` (boolean)

### FormDocument (in `dms/`)
- Links a `Document` (base record) to a `FormTemplate`
- `status`: `draft → in_progress → awaiting_signatures → completed`
- `form_data` (JSON): stored field values
- Has optional `correspondence` FK for attaching to correspondence

### FormSignatureWorkflow
- Sequential or parallel routing
- Steps defined in template's `signatures.roles` config

### FormSignature
- One per role step per submission
- Stores `signer_name`, `signer_pn`, `signer_designation`, `signature_file`
- Status: `pending → signed | rejected | skipped`

## Form Templates

### Seeded Templates (`seed_audit_forms`)
| Template | Slug | Fields | Signatures |
|----------|------|--------|------------|
| Project Monitoring Report | `project-monitoring-report-audit` | 22 fields, 5 sections | PM/Engineer → Procurement → Audit |
| Witnessing of Deliveries | `witnessing-of-deliveries` | 13 fields, 4 sections (incl. 10-row table) | Supplier → User Dept → Procurement → Audit |
| Audit Query - Bills for Certification | `audit-query-bills-certification` | 12 fields, 3 sections | GM Audit (single) |

### Table Fields
Witnessing of Deliveries uses `type: "table"` with columns supporting `number`, `text`, `currency`, and `calculated` (formula-based) types. Default 10 rows with auto-calculated subtotal/VAT/grand total.

## PDF Generation
- `forms/pdf_generator.py` — uses ReportLab
- Three generators:
  - `generate_project_monitoring_report_pdf()` — letter-style with checklist
  - `generate_witnessing_deliveries_pdf()` — line-item table + 3-dept signoff
  - `generate_audit_query_pdf()` — memo-style query letter
- Triggered via `GET /forms/submissions/{id}/generate_pdf/`

## Dynamic Form Renderer
`components/forms/DynamicFormRenderer.tsx` renders form fields from `template.structure.fields`:
- Supported types: text, email, url, textarea, number, currency, date, datetime, select, multiselect, checkbox, radio, file
- Supports `sections` for field grouping with section key = `section.id`
- Layout modes: `single-column` (default) or `multi-column` (2-col grid)
- Validation, error display, signature field placeholders

## Key Flows

### Creating a Form
1. User clicks "Create > Form" in DMS header
2. `CreateFormDocumentDialog` opens — select template, set title/description
3. Creates a `Document` + `FormDocument` pair
4. Navigates to `/forms/{documentId}` for editing

### Submitting & Signing
1. User fills form fields → saves draft (auto or manual)
2. Submits → status changes to `in_progress`
3. Triggers signature workflow creation → status → `awaiting_signatures`
4. Each signer in sequence signs via the form editor
5. After last signature → status → `completed`

### PDF Generation
- Available after submission
- Endpoint routes by template slug to the correct PDF generator
- PDF can be attached to correspondence

## Recent Changes
- Forms merged into DMS (separate `/forms` page → redirects to `/dms`)
- DMS tabs: My Documents | Shared with Me | Pending Signatures
- "Form" type filter added to My Documents type dropdown
- 3 audit form templates with full field schemas seeded
- Audit form PDF generators for all 3 templates

## Related Docs
- `docs/features/dms.md` — DMS (forms live here as form documents)
- `docs/procurement/REMAINING_WORK_BACKLOG.md` — Forms backlog items
