# Document Access Architecture Decision

## Question
**Should documents be accessed from correspondence pages or DMS pages?**

## Current Architecture
- **Principle**: "All correspondence are documents" - Every correspondence automatically creates a DMS Document
- **Correspondence Pages**: Quick preview of attachments (DocumentPreviewPanel)
- **DMS Pages**: Full document management (versions, comments, workspaces, access control, thread visualization)

## Decision: Hybrid Approach ✅

### **Correspondence Pages = Quick Preview for Workflow**
- **Purpose**: Workflow context (routing, minutes, responses)
- **Features**: 
  - Quick preview of attachments
  - View document in context of correspondence
  - Download attachments
  - **NEW**: "View Full Document in DMS" button

### **DMS Pages = Full Document Management**
- **Purpose**: Complete document lifecycle management
- **Features**:
  - Version management (upload, create, replace)
  - Comments and collaboration
  - Workspaces and collections
  - Access control and permissions
  - Document thread visualization
  - OCR text editing
  - Access activity logs
  - Related correspondence history

## Implementation

### 1. Backend: Auto-Created Document ID
- **File**: `backend/correspondence/serializers.py`
- **Added**: `auto_created_document_id` field to `CorrespondenceSerializer`
- **Method**: `get_auto_created_document_id()` - Finds document linked with "Auto-created from correspondence registration" note

### 2. Frontend: "View Full Document in DMS" Button
- **File**: `frontend/app/correspondence/[id]/components/DocumentPreviewPanel.tsx`
- **Location**: Header bar (next to Download and Fullscreen buttons)
- **Behavior**: Navigates to `/dms/{documentId}` for full document management
- **Visibility**: Only shows if auto-created document exists

## User Experience Flow

### Scenario: MD registers correspondence → Minutes to ED F&A

1. **Correspondence Page** (`/correspondence/{id}`):
   - User sees quick preview of document
   - Can view attachment inline
   - Can download attachment
   - **NEW**: "View Full Document in DMS" button visible
   - Can minute, route, respond (workflow actions)

2. **User clicks "View Full Document in DMS"**:
   - Navigates to `/dms/{documentId}`
   - Full document detail page opens
   - All document management features available:
     - Versions management
     - Comments
     - Workspaces
     - Access control
     - Document thread
     - Access activity

3. **User can navigate back to correspondence**:
   - Breadcrumbs or back button
   - Document detail page shows related correspondence
   - Full workflow context maintained

## Benefits

1. **Clear Separation of Concerns**:
   - Correspondence = Workflow management
   - DMS = Document management

2. **Single Source of Truth**:
   - All document features in one place (DMS)
   - No duplicate functionality

3. **Better User Experience**:
   - Quick preview for workflow context
   - Easy navigation to full document management
   - Clear when to use which

4. **Maintainability**:
   - Document features centralized in DMS
   - Correspondence pages focus on workflow
   - Easier to maintain and extend

## When to Use Which

### Use **Correspondence Page** for:
- ✅ Quick document preview while routing
- ✅ Viewing document in workflow context
- ✅ Routing, minuting, responding
- ✅ Downloading attachments

### Use **DMS Page** for:
- ✅ Managing document versions
- ✅ Adding comments and collaboration
- ✅ Managing workspaces and collections
- ✅ Controlling access and permissions
- ✅ Viewing document thread
- ✅ Editing OCR text
- ✅ Viewing access activity logs

## Files Modified

### Backend
- `backend/correspondence/serializers.py`
  - Added `auto_created_document_id` field
  - Added `get_auto_created_document_id()` method

### Frontend
- `frontend/app/correspondence/[id]/components/DocumentPreviewPanel.tsx`
  - Added "View Full Document in DMS" button
  - Added router navigation
  - Button appears in header and empty state

## Future Enhancements

1. **Breadcrumbs**: Add breadcrumbs in DMS page showing correspondence context
2. **Quick Actions**: Add "Back to Correspondence" button in DMS page
3. **Context Preservation**: Maintain correspondence context when navigating between pages
4. **Smart Navigation**: Remember user's last view (correspondence vs DMS)

## Conclusion

**Documents should be accessed in DMS for full management, but correspondence pages provide quick preview with easy navigation to DMS.**

This hybrid approach:
- ✅ Maintains workflow context in correspondence pages
- ✅ Centralizes document management in DMS
- ✅ Provides clear navigation between contexts
- ✅ Avoids duplicate functionality
- ✅ Follows single source of truth principle

