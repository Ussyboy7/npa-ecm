# Document Management System (DMS)

## Overview
The DMS module handles document upload, version control, metadata management, access control, DRM policy enforcement, sharing, and form documents.

## Key Features
- Document upload with drag-and-drop and validation
- Version control, **version diff** (API + UI), and metadata management
- Full-text search and filtering
- Access control, sharing, and **DRM policy** layer (download rights, banners, **byte-level PDF watermark** on serve)
- Document preview and OCR text extraction
- AI summary card (extractive fallback; LLM/Ollama deferred)
- **Form documents** (`document_type: "form"`) — structured forms managed alongside regular documents
- **Pending Signatures** tab — documents/forms awaiting the user's signature
- **Version compose mode** — `ReplaceVersionDialog` supports `RichTextEditor` compose as an alternative to file upload
- **Detail workspace** — DMS detail uses header + status strip + preview | rail (Versions / Chat / Links / Info); mobile sticky actions where applicable

## Architecture
- **Backend**: `dms/` app — `Document`, `DocumentVersion`, `DocumentPermission`, `DocumentRightsPolicy`, `DocumentCollection`
- **DRM**: `dms/drm.py` + `dms/watermark.py` — `resolve_document_rights`, `assert_download_allowed`, PDF stamp on `/versions/{id}/download/` and `/content/`
- **Version diff**: `dms/version_diff.py` — `GET /api/v1/dms/versions/{id}/diff/?compare_with={other_id}`
- **Frontend**: `app/dms/` (canonical; `/documents` and `/forms` redirect here), `components/dms/`
- **Rich text**: `RichTextEditor` (custom `contentEditable`; see `docs/features/rich-text-editor.md`) — not Quill.js
- **Detail layout shell**: `app/dms/[id]/components/DocumentWorkspace.tsx` (preview | rail) — not the removed collaboration *model*
- **Storage**: S3/MinIO compatible via `django-storages`

## DMS Tabs (`app/dms/`)
| Tab | Description |
|-----|-------------|
| **My Documents** | All your documents (letter, memo, circular, form, etc.). Filterable by type including "Form". Stats cards show Total/Draft/Published/Archived counts. |
| **Shared with Me** | Documents shared with you by other users. |
| **Pending Signatures** | Form documents awaiting your signature (badge count). Queries pending `FormSignature` records and matches them to `FormDocument`s. |

## Key Components
- `DocumentUploadDialog` — Multi-format upload with validation (removed workspace assignment)
- `DocumentMetadataEditDialog` — Metadata editing with sensitivity levels, DRM policy display
- `DocumentPreviewModal` / `DocumentVersionPreviewModal` — Preview with OCR text
- `DocumentVersionDiffDialog` — Side-by-side version comparison
- `DocumentDrmBanner` — DRM rights notice on document detail
- `ShareDocumentDialog` — Sharing with permissions (simplified: removed workspace sharing)
- `ReplaceVersionDialog` — Replace version with file upload or `RichTextEditor` compose mode toggle
- `RichTextEditor` — Custom rich-text compose (paste sanitize, DOMPurify, a11y toolbar); `QuillEditor` is a deprecated re-export
- `DocumentStatusStrip` / `DocumentHeader` — Detail identity + state strip
- `DocumentUploadZone` / `FileUploadZone` — Drag-and-drop zones (`DocumentUploadZone` re-exports `FileUploadZone`)
- `CreateFormDocumentDialog` — Creates a `Document` + `FormDocument` pair from a form template

## Key Services
- `dms/services.py` — `OCRService`, `DocumentService`, `DocumentPermissionService`, `DocumentSummaryService`
- `lib/dms-storage.ts` — Frontend API client (split into `dms-documents.ts`, `dms-collections.ts`, etc.)
- `lib/dms-version-diff.ts` — Version diff API client (`/dms/versions/{id}/diff/`)
- `lib/drm-api.ts` — DRM policy and rights
- `lib/api/dms-forms.ts` — Form document API client (`listFormDocuments`, `createFormDocument`)

## Removed Features
- **`DocumentWorkspace` model** (collaboration workspaces): Model, serializer, viewset, admin, URLs, and workspace *feature* UI removed. `/workspaces/*` redirects to `/dashboard`.
- The **detail layout component** also named `DocumentWorkspace` (preview | rail) remains and is the DMS detail shell.
- **CollaborationPanel**: Simplified from full workspace panel to basic shared-with section.

## Search Integration
- PostgreSQL full-text search via `SearchVector`
- `SearchService` in `search/services.py` with optional `search_mode=semantic`
- Frontend `AdvancedSearch` component with filters

## Related Docs
- `docs/features/forms.md` — Forms module (templates, submissions, signatures, PDF generation)
- `docs/features/rich-text-editor.md` — Compose editor hardening and TipTap deferral
- `docs/guides/DESIGN.md` — Detail workspace composition (preview | rail)
- `docs/guides/migration-guide.md` — Migration from old storage
- `docs/procurement/REMAINING_WORK_BACKLOG.md` — DRM watermark, pgvector backlog, co-authoring P2
