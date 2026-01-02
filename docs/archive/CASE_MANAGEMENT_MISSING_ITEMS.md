# Case/File Management - Missing Items Checklist

## ✅ Completed

1. ✅ Backend models (Case, CaseCorrespondenceLink, CaseDocumentLink, CaseFormLink)
2. ✅ Backend services (CaseService with auto-creation)
3. ✅ Backend API endpoints (CaseViewSet)
4. ✅ Backend serializers
5. ✅ Database migration file
6. ✅ Frontend types
7. ✅ Frontend API client
8. ✅ Case list page (`/cases`)
9. ✅ Case detail page (`/cases/[id]`)
10. ✅ Sidebar navigation

## ❌ Missing Items

### 1. Case Creation Form (High Priority)
**Status:** ❌ Missing  
**File:** `frontend/app/cases/new/page.tsx`  
**Description:** The "New Case" button exists but clicking it will 404. Need a form to manually create cases.

**Required:**
- Form fields: title, description, case type, priority, division, department, office, assigned to
- Validation
- Submit to create case
- Redirect to case detail page after creation

### 2. Case Display in Correspondence Detail (High Priority)
**Status:** ❌ Missing  
**File:** `frontend/app/correspondence/[id]/components/CorrespondenceHeader.tsx` or `DocumentPreviewPanel.tsx`  
**Description:** If correspondence is linked to a case, show the case link prominently.

**Required:**
- Display case number and link if `correspondence.case` exists
- Badge or card showing case status
- Click to navigate to case detail page

### 3. Case Linking UI (Medium Priority)
**Status:** ❌ Missing  
**Files:** 
- `frontend/app/correspondence/[id]/page.tsx`
- `frontend/app/dms/[id]/page.tsx`
- `frontend/app/cases/[id]/page.tsx`

**Description:** Users need a way to link correspondence/documents/forms to cases.

**Required:**
- "Link to Case" button/menu item in correspondence detail page
- "Link to Case" button/menu item in document detail page
- Modal/dialog to search and select case
- Option to create new case from the linking dialog
- Display existing links and allow unlinking

### 4. Django Admin Registration (Low Priority)
**Status:** ❌ Missing  
**File:** `backend/correspondence/admin.py`  
**Description:** Register Case models in Django admin for administrative access.

**Required:**
- `CaseAdmin` with list display, filters, search
- `CaseCorrespondenceLinkAdmin`
- `CaseDocumentLinkAdmin`
- `CaseFormLinkAdmin`
- Inline admin for links in Case admin

### 5. Migration Execution (Required)
**Status:** ⚠️ Not Run  
**File:** `backend/correspondence/migrations/0018_add_case_management.py`  
**Description:** Migration file exists but needs to be applied to database.

**Required:**
- Run `python manage.py migrate correspondence`
- Verify tables created correctly
- Test with sample data

### 6. Case Display in Document Detail (Medium Priority)
**Status:** ❌ Missing  
**File:** `frontend/app/dms/[id]/page.tsx`  
**Description:** If document is linked to a case, show the case link.

**Required:**
- Display case number and link if document is linked to case
- Show in document metadata section

### 7. Case Display in Form Detail (Low Priority)
**Status:** ❌ Missing  
**File:** Form detail pages  
**Description:** If form is linked to a case, show the case link.

**Required:**
- Display case number and link if form is linked to case

---

## Priority Summary

### Must Have (Before Production)
1. ✅ Migration execution
2. ❌ Case creation form
3. ❌ Case display in correspondence detail

### Should Have (For Good UX)
4. ❌ Case linking UI from correspondence/document pages
5. ❌ Case display in document detail

### Nice to Have (For Admin/Support)
6. ❌ Django admin registration
7. ❌ Case display in form detail

---

## Quick Wins

1. **Add case link to correspondence header** - 15 minutes
2. **Register Case in Django admin** - 10 minutes
3. **Add case link to document detail** - 15 minutes

---

## Estimated Time to Complete Missing Items

- Case Creation Form: 2-3 hours
- Case Display in Correspondence: 30 minutes
- Case Linking UI: 2-3 hours
- Django Admin: 30 minutes
- Case Display in Document: 30 minutes
- **Total: ~6-7 hours**

---

**Last Updated:** January 2025

