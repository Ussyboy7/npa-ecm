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
- **Version compose mode** — ReplaceVersionDialog supports Quill rich-text editing as alternative to file upload

## Architecture
- **Backend**: `dms/` app — `Document`, `DocumentVersion`, `DocumentPermission`, `DocumentRightsPolicy`, `DocumentCollection`
- **DRM**: `dms/drm.py` + `dms/watermark.py` — `resolve_document_rights`, `assert_download_allowed`, PDF stamp on `/versions/{id}/download/` and `/content/`
- **Version diff**: `dms/version_diff.py` — `GET /api/v1/dms/document-versions/{id}/diff/?compare_with={other_id}`
- **Frontend**: `app/dms/` (canonical; `/documents` and `/forms` redirect here), `components/dms/`
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
- `ReplaceVersionDialog` — Replace version with file upload or Quill compose mode toggle
- `DocumentUploadZone` / `FileUploadZone` — Drag-and-drop zones
- `CreateFormDocumentDialog` — Creates a `Document` + `FormDocument` pair from a form template

## Key Services
- `dms/services.py` — `OCRService`, `DocumentService`, `DocumentPermissionService`, `DocumentSummaryService`
- `lib/dms-storage.ts` — Frontend API client (split into `dms-documents.ts`, `dms-collections.ts`, etc.)
- `lib/dms-version-diff.ts` — Version diff API client
- `lib/drm-api.ts` — DRM policy and rights
- `lib/api/dms-forms.ts` — Form document API client (`listFormDocuments`, `createFormDocument`)

## Removed Features
- **`DocumentWorkspace`**: Model, serializer, viewset, admin, URLs, and all frontend workspace components removed. `/workspaces/*` pages redirect to `/dashboard`.
- **CollaborationPanel**: Simplified from full workspace panel to basic shared-with section.

## Search Integration
- PostgreSQL full-text search via `SearchVector`
- `SearchService` in `search/services.py` with optional `search_mode=semantic`
- Frontend `AdvancedSearch` component with filters

## Related Docs
- `docs/features/forms.md` — Forms module (templates, submissions, signatures, PDF generation)
- `docs/guides/migration-guide.md` — Migration from old storage
- `docs/procurement/REMAINING_WORK_BACKLOG.md` — DRM watermark, pgvector backlog
