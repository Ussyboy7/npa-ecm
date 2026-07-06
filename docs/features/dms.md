# Document Management System (DMS)

## Overview
The DMS module handles document upload, version control, metadata management, access control, DRM policy enforcement, and sharing.

## Key Features
- Document upload with drag-and-drop and validation
- Version control, **version diff** (API + UI), and metadata management
- Full-text search and filtering
- Access control, sharing, and **DRM policy** layer (download rights, banners — not byte-level watermark)
- Document preview and OCR text extraction
- AI summary card (extractive fallback; LLM/Ollama deferred)

## Architecture
- **Backend**: `dms/` app — `Document`, `DocumentVersion`, `DocumentPermission`, `DocumentRightsPolicy`, `DocumentCollection`, `DocumentWorkspace`
- **DRM**: `dms/drm.py` — `resolve_document_rights`, `assert_download_allowed`
- **Version diff**: `dms/version_diff.py` — `GET /api/v1/dms/document-versions/{id}/diff/?compare_with={other_id}`
- **Frontend**: `app/dms/` (canonical; `/documents` redirects), `components/dms/`
- **Storage**: S3/MinIO compatible via `django-storages`

## Key Components
- `DocumentUploadDialog` - Multi-format upload with validation
- `DocumentMetadataEditDialog` - Metadata editing with sensitivity levels
- `DocumentPreviewModal` / `DocumentVersionPreviewModal` - Preview with OCR text
- `DocumentVersionDiffDialog` - Side-by-side version comparison
- `DocumentDrmBanner` - DRM rights notice on document detail
- `ShareDocumentDialog` - Sharing with permissions
- `DocumentUploadZone` / `FileUploadZone` - Drag-and-drop zones

## Key Services
- `dms/services.py` - `OCRService`, `DocumentService`, `DocumentPermissionService`, `DocumentSummaryService`
- `lib/dms-storage.ts` - Frontend API client (split into `dms-documents.ts`, `dms-collections.ts`, etc.)
- `lib/dms-version-diff.ts` - Version diff API client
- `lib/drm-api.ts` - DRM policy and rights

## Search Integration
- PostgreSQL full-text search via `SearchVector`
- `SearchService` in `search/services.py` with optional `search_mode=semantic`
- Frontend `AdvancedSearch` component with filters

## Related Docs
- `docs/guides/migration-guide.md` - Migration from old storage
- `docs/procurement/REMAINING_WORK_BACKLOG.md` - DRM watermark, pgvector backlog
