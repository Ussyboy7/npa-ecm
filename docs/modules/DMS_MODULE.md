# Document Management System (DMS) - Plan & Requirements

## Goals
Build a DMS for managing official documents (letters, memos, circulars) with upload, versioning, metadata tagging, search, preview, and access control.

## Core Modules

### 1. Document Repository
- Document entity with metadata (title, description, type, division, department, reference number, author, dates).
- Versioning: each upload creates a new version (file path, notes, uploader, timestamp).
- Document status: draft, published, archived.
- Tags / categories for flexible filtering.

### 2. Storage Layer
- Phase 1: local mock storage using `localStorage`/JSON files.
- Phase 2: backend API integration with file storage (e.g., S3) and DB metadata.
- Support for both document files and generated outputs (e.g., signed PDFs).

### 3. Metadata & Search
- Metadata forms with validation (required fields per document type).
- Search by title, reference number, division, department, date range, tags.
- Full-text search placeholder (to be implemented once backend search index is available).

### 4. UI Components
- Document dashboard/list with filters, search, sorting.
- Upload modal / drawer for creating new documents or versions.
- Document detail page with metadata, history, preview, actions.
- Version history view with download links, version notes, comparisons (basic in phase 1).
- Preview component (PDF, Word inline preview placeholder).

### 5. Access Control
- Role-based permissions (MD, ED, GM, AGM, officers, registry).
- Division/department scoping: documents visible to relevant org units.
- Special roles: registry/secretary (upload, tag, route), MD/ED (publish/archive), general staff (read-only).
- Audit trail for uploads, updates, access.

## Data Model (Phase 1 Mock)
```typescript
type Document = {
  id: string;
  title: string;
  description?: string;
  documentType: 'letter' | 'memo' | 'circular' | 'policy' | 'other';
  divisionId?: string;
  departmentId?: string;
  referenceNumber?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
  tags?: string[];
  versions: DocumentVersion[];
  permissions?: DocumentPermission[];
};

type DocumentVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string; // For Phase 1, data URL / local path
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
};

type DocumentPermission = {
  role: 'MD' | 'ED' | 'GM' | 'AGM' | 'Officer' | 'Registry' | 'All';
  divisionId?: string;
  departmentId?: string;
  access: 'read' | 'write' | 'publish' | 'archive';
};
```

## Phase Breakdown

### Phase 1: Mock Implementation
- Local mock storage service for documents and versions.
- Document dashboard UI (list, filters, view details).
- Upload & version management (front-end only; files stored as base64 or placeholders).
- Metadata tagging forms.
- Basic preview placeholder (download link or inline rendered PDF via data URL).
- Role-based visibility (based on mock users & org structure).

### Phase 2: Backend Integration
- Connect to API endpoints for document CRUD, version uploads, metadata updates.
- Integrate file storage (S3/Cloud/local server).
- Implement real full-text search via backend.
- Expanded audit logs & workflow integration.

### Phase 3: Advanced Features
- Document lifecycle workflows (draft → review → publish → archive).
- Bulk uploads, batch tagging.
- Advanced access control (per-document roles, sharing).
- Deep integration with signature module (auto-attach stamped outputs).
- Inline viewers for more file types (docx, xlsx, etc.).

## Immediate Next Steps
- [x] Implement Phase 1 mock storage utilities and seed sample documents.
- [x] Build document dashboard with filters/search.
- [x] Add upload/version modal and metadata forms.
- [x] Wire access control checks based on existing user roles.
- [x] Document the API contract for future backend integration (outlined in data model).
