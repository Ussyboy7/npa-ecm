# Document Management System (DMS)

## Overview
The DMS module handles document upload, version control, metadata management, access control, and sharing.

## Key Features
- Document upload with drag-and-drop and validation
- Version control and metadata management
- Full-text search and filtering
- Access control and sharing
- Document preview and version comparison

## Architecture
- **Backend**: `dms/` app with models `Document`, `DocumentVersion`, `DocumentPermission`, `DocumentCollection`, `DocumentWorkspace`
- **Frontend**: `app/dms/`, `components/dms/`, `lib/dms-*.ts`
- **Storage**: S3/MinIO compatible via `django-storages`

## Key Components
- `DocumentUploadDialog` - Multi-format upload with validation
- `DocumentMetadataEditDialog` - Metadata editing with sensitivity levels
- `DocumentPreviewModal` / `DocumentVersionPreviewModal` - Preview with OCR text
- `ShareDocumentDialog` - Sharing with permissions
- `DocumentUploadZone` / `FileUploadZone` - Drag-and-drop zones

## Key Services
- `dms/services.py` - `OCRService`, `DocumentService`, `DocumentPermissionService`
- `lib/dms-storage.ts` - Frontend API client (split into `dms-documents.ts`, `dms-collections.ts`, etc.)
- `lib/dms-operations.ts` - Extended operations

## Search Integration
- PostgreSQL full-text search via `SearchVector`
- `SearchService` in `search/services.py`
- Frontend `AdvancedSearch` component with filters

## Recent Changes
- Split `lib/dms-storage.ts` into domain modules (`dms-types.ts`, `dms-documents.ts`, etc.)
- Consolidated MIME type constants in `lib/file-types.ts`
- Added sensitivity level constants in `lib/constants.ts`

## Related Docs
- `architecture/sidebar-restructure.md` - DMS navigation changes
- `guides/migration-guide.md` - Migration from old storage
