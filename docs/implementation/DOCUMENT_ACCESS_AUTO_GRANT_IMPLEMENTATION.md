# Document Access Auto-Grant Implementation

## Overview
This document describes the implementation of automatic document access granting when minutes are created, and document thread visualization.

## Implementation Date
January 2025

## Features Implemented

### 1. Auto-Grant Document Access on Minute Creation ✅

**Problem**: When a minute is created routing to a user/office, recipients could see the minute in the history but didn't automatically get access to view/download the linked document.

**Solution**: Automatically grant READ access to the linked document when a minute is created.

**Implementation**:
- **File**: `backend/correspondence/services.py`
- **Method**: `CorrespondenceDocumentService.grant_document_access_for_minute()`
- **Location**: Called from `MinuteViewSet.perform_create()` in `backend/correspondence/views.py`

**How it works**:
1. When a minute is created, the system:
   - Finds the document linked to the correspondence via `CorrespondenceDocumentLink`
   - Identifies recipients:
     - If `minute.to_user` is set, grants access to that user
     - If `minute.to_office` is set, grants access to all active office members
   - Creates or updates a `DocumentPermission` with READ access
   - Adds recipients to the permission's users list

**Example Flow**:
```
MD minutes to ED F&A
  → System finds linked document
  → Grants READ access to ED F&A user
  → ED F&A can now view/download the document

ED F&A minutes to GM
  → System finds linked document
  → Grants READ access to GM user
  → GM can now view/download the document

GM minutes to Officer
  → System finds linked document
  → Grants READ access to Officer user
  → Officer can now view/download the document
```

### 2. Document Thread Visualization ✅

**Problem**: When a response correspondence is created (e.g., officer replies), it creates a new document linked to the parent document, but there was no UI to visualize this thread.

**Solution**: Added a `DocumentThreadCard` component that shows:
- Parent document (if current document is a response)
- Current document indicator
- Child documents (response documents)

**Implementation**:
- **File**: `frontend/components/dms/DocumentThreadCard.tsx`
- **Integration**: Added to `frontend/app/dms/[id]/page.tsx`
- **Backend**: Added `parent_document` field to `DocumentSerializer` and `filterset_fields`

**Features**:
- Shows parent document with link to navigate
- Shows current document indicator
- Lists all response documents (children) with links
- Refresh button to reload thread
- Responsive design with scrolling for long lists

### 3. Backend API Enhancements ✅

**Document Serializer**:
- Added `parent_document` field (read-only, SerializerMethodField)
- Added `parent_document_id` field (write-only, for creating response documents)
- Returns parent document info: `{ id, title, reference_number }`

**Document ViewSet**:
- Added `parent_document` to `filterset_fields` to support filtering by parent
- Enables query: `/dms/documents/?parent_document={id}`

## Files Modified

### Backend
1. `backend/correspondence/services.py`
   - Added `grant_document_access_for_minute()` method

2. `backend/correspondence/views.py`
   - Integrated auto-grant logic into `MinuteViewSet.perform_create()`

3. `backend/dms/serializers.py`
   - Added `parent_document` and `parent_document_id` fields to `DocumentSerializer`
   - Added `get_parent_document()` method

4. `backend/dms/views.py`
   - Added `parent_document` to `filterset_fields` in `DocumentViewSet`

### Frontend
1. `frontend/components/dms/DocumentThreadCard.tsx` (NEW)
   - Component for displaying document thread (parent/children)

2. `frontend/app/dms/[id]/page.tsx`
   - Imported and integrated `DocumentThreadCard`
   - Passes `parent_document_id` from document data

## How It Works - Complete Flow

### Scenario: MD → ED F&A → GM → Officer → Reply

1. **MD registers correspondence** (physical document scanned)
   - Correspondence created
   - Document automatically created and linked
   - Document status: DRAFT

2. **MD minutes to ED F&A**
   - Minute created (Step 1)
   - **NEW**: System automatically grants READ access to ED F&A
   - ED F&A can now view/download the document
   - Minute appears in document's "Related Correspondence" section

3. **ED F&A minutes to GM**
   - Minute created (Step 2)
   - **NEW**: System automatically grants READ access to GM
   - GM can now view/download the document
   - Full minute chain visible: MD → ED F&A → GM

4. **GM minutes to Officer**
   - Minute created (Step 3)
   - **NEW**: System automatically grants READ access to Officer
   - Officer can now view/download the document
   - Full minute chain visible: MD → ED F&A → GM → Officer

5. **Officer replies** (via TreatmentModal)
   - New correspondence created with `parent_correspondence_id`
   - New document created with `parent_document_id`
   - Minute created on original correspondence (Step 4)
   - **NEW**: Document thread visualization shows:
     - Original document (parent)
     - Response document (child)
   - Both documents linked in thread

## Access Control

### Automatic Access Granting
- **When**: Every time a minute is created
- **Who Gets Access**:
  - Specific user if `minute.to_user` is set
  - All active office members if `minute.to_office` is set
- **Access Level**: READ (can view and download, cannot edit)
- **Note**: Permission includes note: "Auto-granted access via minute routing (Step X)"

### Access Propagation
- Access is granted independently for each minute
- If MD minutes to ED F&A, ED F&A gets access
- If ED F&A minutes to GM, GM gets access (ED F&A retains access)
- Each recipient in the chain has access to the document

## Error Handling

- If document creation fails, minute creation still succeeds (logged but doesn't fail)
- If permission creation fails, minute creation still succeeds (logged but doesn't fail)
- Errors are logged for debugging but don't break the workflow

## Testing

To test the implementation:

1. **Test Auto-Grant Access**:
   - Register a correspondence (creates document)
   - Create a minute routing to a user
   - Verify user can access the document
   - Check `DocumentPermission` table for new permission

2. **Test Document Thread**:
   - Register a correspondence (creates document A)
   - Reply to correspondence (creates document B with parent_document = A)
   - View document A - should show document B in thread
   - View document B - should show document A as parent

3. **Test Minute Chain**:
   - Create multiple minutes in sequence
   - Verify each recipient gets document access
   - Verify all minutes appear in document's "Related Correspondence" section

## Future Enhancements

1. **Access Propagation Options**:
   - Configurable: Should upstream/downstream participants also get access?
   - Configurable: Should access be revoked when minute is recalled?

2. **Thread Visualization**:
   - Visual timeline/graph of document thread
   - Show all documents in thread on one page
   - Thread navigation breadcrumbs

3. **Access Audit**:
   - Track when access was auto-granted
   - Show access source (minute, manual share, etc.)
   - Access history timeline

## Notes

- Auto-grant logic runs synchronously during minute creation
- Permission creation is idempotent (won't create duplicates)
- Document thread is loaded on-demand when viewing document
- Thread visualization only shows if parent or children exist

