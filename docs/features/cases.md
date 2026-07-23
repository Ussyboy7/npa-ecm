# Cases

## Overview

Case files group related correspondence, documents, and form links under one record. Detail UX mirrors DMS: identity header, status strip, case file body, and a secondary rail.

## Architecture

- **Backend:** `correspondence` app — `Case` model and case APIs
- **Frontend:** `app/cases/`, `app/cases/[id]/components/`
- **Shared UI language:** `docs/guides/DESIGN.md` (header / strip / body / rail)

## Detail workspace (`/cases/[id]`)

| Piece | Role |
|-------|------|
| `CaseWorkspace` | Layout shell (desktop split + mobile tabs) |
| `CaseOverviewPanel` | Case file / primary content |
| `CaseSidebar` | Rail: Links, Chat, Activity, Info |
| `CaseLinksPanel` | Linked docs / correspondence / forms (preview vs open) |
| `CaseCommentsSummaryCard` + `CaseCommentsDialog` | Rail summary + full thread modal |
| `CaseInfoCard` | Metadata |
| `CaseMobileStickyBar` | Mobile Package / Link / Comments actions |
| `CaseFormPreviewDialog` | In-rail form preview (`DynamicFormRenderer` disabled) |
| `CaseStatusStrip` / `CaseHeader` | State + identity |

**Link rail UX:** Eye = preview (documents → version preview modal; correspondence → document preview; forms → form preview dialog). Row title / open navigates to the full page where applicable. Form open uses the DMS `document.id` (`/forms/{documentId}`), while preview/unlink use `form_document_id` (FormDocument PK).

## Related Docs

- `docs/features/correspondence.md` — cases linked to correspondence
- `docs/features/dms.md` — linked documents
- `docs/guides/DESIGN.md` — detail page composition rules
