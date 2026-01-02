# NPA ECM - TODO List

**Last Updated:** January 2025  
**Status:** Active Tasks

---

## 🎯 Active Tasks

*(No active tasks currently)*

---

## 📋 Future Tasks

### 2. Implement Case/File Management Module

**Priority:** Critical  
**Status:** ⏳ Pending  
**Timeline:** Q1 2025

#### Description
Create a unified "Case" entity to group related correspondence, documents, forms, and actions. This is the foundation of the ECM vision: "correspondence triggers cases, documents are evidence, workflow is control, and the case file is the truth."

#### Implementation Plan
- [ ] Create `Case` model
- [ ] Auto-create cases from correspondence (based on type)
- [ ] Link all documents/forms to cases
- [ ] Implement case lifecycle
- [ ] Verify workflow hierarchy enforcement
- [ ] Auto-generate completion packages for cases

---

## ✅ Completed Tasks

### 1. Differentiate "My Documents" vs "Document Management" Pages ✅

**Completed:** January 2025

**What was implemented:**
- ✅ Tab navigation with 4 tabs (My Documents, Shared with Me, Awaiting Action, Recent)
- ✅ Quick stats card showing counts for each tab
- ✅ Filtering logic based on active tab:
  - **My Documents**: Filters by `authorId = currentUser.id`
  - **Shared with Me**: Filters documents with explicit user permissions (excludes authored documents)
  - **Awaiting Action**: Shows forms needing signatures
  - **Recent**: Shows documents accessed in last 30 days
- ✅ Helper functions in `dms-storage.ts`:
  - `getSharedDocuments()` - Gets documents explicitly shared with user
  - `getRecentDocuments()` - Gets documents from access logs
- ✅ Updated page description and UI to reflect personal workspace
- ✅ "Document Management" page remains unchanged (full organizational view)

**Files Modified:**
- `frontend/app/documents/page.tsx` - Complete rewrite with tabs and filtering
- `frontend/lib/dms-storage.ts` - Added `getSharedDocuments()` and `getRecentDocuments()` helper functions

**Result:**
- "My Documents" now feels like a personal workspace
- "Document Management" remains the organizational repository
- Clear differentiation between the two pages
- Users can still access organization-wide documents via "Shared with Me" tab

---

**Note:** This TODO list is actively maintained. Tasks are moved to "Completed" section when finished.

