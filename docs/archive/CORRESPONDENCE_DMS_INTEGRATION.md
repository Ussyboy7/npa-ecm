# Correspondence-DMS Integration - Phase 1 Implementation

## Overview
This document describes the implementation of automatic DMS document creation from correspondence registration.

## Implementation Date
January 2025

## Architecture Decision
**All correspondence are documents** - Every correspondence item automatically creates a DMS Document when registered, ensuring:
- Single source of truth for all documents
- Unified search across all content
- Complete audit trail
- Proper version control

## Implementation Details

### 1. Service Layer
**File**: `backend/correspondence/services.py`

**New Service**: `CorrespondenceDocumentService`
- `create_document_from_correspondence()`: Auto-creates DMS Document from Correspondence
- `_create_document_version_from_attachment()`: Creates DocumentVersion from attachment
- `_create_document_version_from_body()`: Creates DocumentVersion from body_html if no attachments
- `get_workflow_history_for_document()`: Retrieves minutes/workflow history for a document

### 2. Document Type Mapping
Correspondence document types are mapped to DMS document types:
- `LETTER`, `REQUEST`, `COMPLAINT`, `INQUIRY` → `LETTER`
- `REPORT` → `REPORT`
- `DIRECTIVE` → `POLICY`
- `OTHER` → `OTHER`

### 3. Sensitivity Mapping
Document sensitivity is determined by correspondence priority:
- `URGENT` → `CONFIDENTIAL`
- `HIGH` → `INTERNAL`
- `MEDIUM`, `LOW` → `INTERNAL`

### 4. Integration Point
**File**: `backend/correspondence/views.py`

The `CorrespondenceViewSet.create()` method now:
1. Creates correspondence (existing)
2. Creates attachments (existing)
3. **NEW**: Auto-creates DMS Document via `CorrespondenceDocumentService`
4. **NEW**: Creates DocumentVersions from attachments
5. **NEW**: Links via `CorrespondenceDocumentLink`

### 5. Document Creation Flow

```
Correspondence Registration
    ↓
1. Create Correspondence record
    ↓
2. Create CorrespondenceAttachments (if any)
    ↓
3. Auto-create DMS Document
    - Title = correspondence.subject
    - Document Type = mapped from correspondence.document_type
    - Reference Number = correspondence.reference_number
    - Author = correspondence.created_by
    - Status = DRAFT
    - Sensitivity = based on priority
    ↓
4. Create DocumentVersions
    - From attachments (if any)
    - OR from body_html (if no attachments)
    ↓
5. Link via CorrespondenceDocumentLink
    - One-to-one relationship
    - Notes: "Auto-created from correspondence registration"
```

### 6. Workflow History Access
Minutes/workflow actions are accessible via:
```
Document → CorrespondenceDocumentLink → Correspondence → Minutes
```

Use `CorrespondenceDocumentService.get_workflow_history_for_document()` to retrieve all minutes for a document.

## Benefits

1. **Unified Document Management**: All documents in DMS, searchable and versioned
2. **Complete Audit Trail**: Full lifecycle tracking for all documents
3. **Workflow History**: All minutes/approvals accessible from document view
4. **Automatic**: No manual steps required - happens automatically on registration
5. **Error Handling**: DMS creation failures don't break correspondence registration

## Error Handling

- DMS document creation errors are logged but don't fail correspondence registration
- If document already exists (via link), returns existing document
- Graceful handling of missing attachments or body_html

## Phase 2 Implementation (Completed)

### 1. Document Status Updates
**File**: `backend/correspondence/services.py`

Added `update_document_status_on_completion()` method:
- When correspondence status changes to `COMPLETED`, linked DMS document status is updated to `PUBLISHED`
- Integrated into `CorrespondenceViewSet.perform_update()` method
- Includes audit logging for status change

### 2. Response Documents & Document Threading
**Files**: 
- `backend/correspondence/models.py`: Added `parent_correspondence` field
- `backend/dms/models.py`: Added `parent_document` field
- `backend/correspondence/serializers.py`: Added `parent_correspondence` and `parent_correspondence_id` fields

**Implementation**:
- When a response correspondence is created (via TreatmentModal), it includes `parent_correspondence_id`
- `CorrespondenceDocumentService.create_document_from_correspondence()` now:
  - Checks for `parent_correspondence` on the correspondence
  - Retrieves the parent correspondence's linked DMS document
  - Sets `parent_document` on the new DMS document, creating a document thread/chain
- Response documents are automatically linked to their parent documents

### 3. Database Migrations
- `0017_add_parent_correspondence.py`: Adds `parent_correspondence` field to `Correspondence` model
- `0011_add_parent_document.py`: Adds `parent_document` field to `Document` model

## Future Enhancements (Phase 3+)

1. **Async Processing**: Move DMS creation to Celery task for better performance
2. **OCR Integration**: Extract text from attachments for better searchability
3. **Version Updates**: Update DocumentVersions when correspondence attachments change
4. **Document Thread Visualization**: UI to display document threads/chains
5. **Bulk Operations**: Support for bulk document operations

## Testing

To test the implementation:
1. Register a new correspondence with attachments
2. Check that a DMS Document was created
3. Verify DocumentVersions were created from attachments
4. Verify CorrespondenceDocumentLink exists
5. Access workflow history via document

## Files Modified

- `backend/correspondence/services.py`: Added `CorrespondenceDocumentService`
- `backend/correspondence/views.py`: Integrated DMS creation into `create()` method

## Notes

- Documents are created with `DRAFT` status initially
- **Status is automatically updated to `PUBLISHED` when correspondence is completed** (Phase 2)
- All attachments become DocumentVersions
- If no attachments, body_html becomes a DocumentVersion
- **Response correspondence automatically creates threaded DMS documents** (Phase 2)
- **Document threads are maintained via `parent_document` field** (Phase 2)

## Files Modified (Phase 2)

- `backend/correspondence/models.py`: Added `parent_correspondence` field
- `backend/dms/models.py`: Added `parent_document` field
- `backend/correspondence/serializers.py`: Added `parent_correspondence` and `parent_correspondence_id` fields
- `backend/correspondence/services.py`: 
  - Added `update_document_status_on_completion()` method
  - Updated `create_document_from_correspondence()` to handle parent document linking
  - Added `AuditService` import
- `backend/correspondence/views.py`: Integrated status update on completion
- `backend/correspondence/migrations/0017_add_parent_correspondence.py`: Migration for parent correspondence
- `backend/dms/migrations/0011_add_parent_document.py`: Migration for parent document
- `frontend/components/correspondence/TreatmentModal.tsx`: 
  - Fixed to include `body_html` and `summary` in response correspondence
  - Fixed to include attachments in response correspondence (via FormData)
  - Removed duplicate attachment upload to original correspondence

