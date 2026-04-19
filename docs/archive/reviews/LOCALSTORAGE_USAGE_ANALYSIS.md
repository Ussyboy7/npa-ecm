# localStorage Usage Analysis

## Summary

This document analyzes all localStorage usage in the frontend to identify what should be migrated to backend vs what's appropriate to keep in localStorage.

---

## ✅ Already Migrated to Backend

1. **Templates** (`lib/template-storage.ts`)
   - ✅ **Status**: Fully migrated to backend
   - ✅ **No localStorage fallback**: Removed completely
   - ✅ **API**: `/api/v1/correspondence/templates/`

---

## 🔴 Should Be Migrated to Backend

### 1. **Drafts** (`lib/storage.ts`)
**Current**: Stored in localStorage
- `saveDraft()` - Save minute/treatment drafts
- `loadDrafts()` - Load all drafts
- `getDraftByCorrespondence()` - Get draft for correspondence
- `deleteDraft()` - Delete draft

**Why migrate**: 
- Drafts are user-specific data that should persist across devices
- Important for user experience - losing drafts is frustrating
- Should be backed up and recoverable

**Recommendation**: Create backend API for drafts
- Endpoint: `/api/v1/correspondence/drafts/`
- Model: `CorrespondenceDraft` with fields: correspondence_id, type, content, metadata, user, etc.

**Files using it**:
- `components/correspondence/MinuteModal.tsx`
- `components/correspondence/TreatmentModal.tsx`
- `components/dms/DocumentUploadDialog.tsx`

---

### 2. **Delegations** (`lib/delegation-storage.ts`)
**Current**: Stored in localStorage
- `loadDelegations()` - Load all delegations
- `saveDelegations()` - Save delegations
- `addDelegation()` - Add new delegation
- `updateDelegation()` - Update delegation
- `getDelegationByCorrespondence()` - Get delegation for correspondence
- `completeDelegation()` - Mark delegation as completed
- `revokeDelegation()` - Revoke delegation

**Why migrate**:
- Delegations are critical business data
- Need to be tracked and audited
- Should be accessible across devices
- Need proper permissions and validation

**Backend Status**: ✅ **Backend already exists!**
- Models: `Delegation` and `CorrespondenceDelegation` exist in `backend/correspondence/models.py`
- ViewSets: `DelegationViewSet` and `CorrespondenceDelegationViewSet` exist in `backend/correspondence/views.py`
- **Action Required**: Update frontend to use backend API instead of localStorage

**Files using it**:
- Various correspondence components

---

### 3. **Signature Templates** (`lib/signature-storage.ts`)
**Current**: Signature images are in backend, but templates and preferences are in localStorage
- `loadSignatureTemplates()` - Load signature templates
- `saveSignatureTemplates()` - Save templates
- `loadUserSignaturePreferences()` - Load user preferences
- `saveUserSignaturePreferences()` - Save preferences

**Why migrate**:
- Templates should be shareable across organization
- Preferences should sync across devices
- Better for collaboration

**Recommendation**: Migrate templates and preferences to backend
- Create `SignatureTemplate` model
- Create `UserSignaturePreferences` model
- Keep signature images in backend (already done)

**Files using it**:
- `components/settings/SignatureSettingsCard.tsx`
- `hooks/use-signature.ts`
- Various signature-related components

---

## 🟡 Appropriate for localStorage (UI Preferences)

### 1. **Authentication Tokens** (`lib/api-client.ts`)
**Status**: ✅ Keep in localStorage
- Access tokens, refresh tokens
- **Reason**: Standard practice, browser-only security

---

### 2. **Role Switcher** (`lib/role-switcher-storage.ts`)
**Status**: ✅ Keep in localStorage (UI preference)
- Recent users
- Favorite users
- Collapsed groups
- Search history
- Group order
- **Reason**: User interface preferences, not critical data

---

### 3. **Admin Search** (`lib/admin-search.ts`)
**Status**: ✅ Keep in localStorage (UI preference)
- Saved search queries
- Search history
- **Reason**: User interface preferences, convenience feature

---

### 4. **Filters** (`hooks/use-filters.ts`)
**Status**: ✅ Keep in localStorage (UI preference)
- Filter preferences
- **Reason**: User interface state, convenience

---

### 5. **Minute Templates (Legacy)** (`lib/storage.ts`)
**Current**: `loadMinuteTemplates()`, `addMinuteTemplateToStorage()`, etc.
**Status**: ⚠️ **Should be removed** - These are legacy and should use the new template system
- These are different from the main template system
- Should be consolidated with CorrespondenceTemplate

---

## 📋 Migration Priority

### High Priority (Critical Data)
1. **Drafts** - User data that should persist
2. **Delegations** - Business-critical data
3. **Signature Templates** - Should be shareable

### Medium Priority (Enhancement)
4. **Legacy Minute Templates** - Consolidate with main template system

### Low Priority (Keep as-is)
- Authentication tokens
- Role switcher preferences
- Admin search preferences
- Filter preferences

---

## 🔍 Files to Review

### Drafts Usage
- `components/correspondence/MinuteModal.tsx` - Uses `saveDraft`, `getDraftByCorrespondence`, `deleteDraft`
- `components/correspondence/TreatmentModal.tsx` - Uses drafts
- `components/dms/DocumentUploadDialog.tsx` - Uses drafts
- `app/correspondence/register/use-draft-auto-save.ts` - Auto-save functionality

### Delegation Usage
- Various correspondence components
- Check if backend API already exists

### Signature Template Usage
- `components/settings/SignatureSettingsCard.tsx`
- `hooks/use-signature.ts`
- Signature-related components

---

## 📝 Recommendations

1. **Immediate**: Migrate Drafts to backend (high user impact)
2. **Short-term**: Migrate Delegations (if not already in backend)
3. **Short-term**: Migrate Signature Templates and Preferences
4. **Cleanup**: Remove legacy minute template functions from `storage.ts`

---

## 🎯 Next Steps

1. ✅ **Delegations**: Backend API exists - Update frontend to use it
2. **Drafts**: Create backend API (model + viewset + serializer)
3. **Signature Templates**: Create backend API for templates and preferences
4. Update all components to use backend APIs
5. Remove localStorage fallbacks

---

## 📊 Summary

### ✅ Backend Ready (Just need frontend update)
- **Delegations** - Backend API exists, frontend needs update

### ❌ Needs Backend Implementation
- **Drafts** - No backend model/API exists
- **Signature Templates** - No backend model/API exists

### ✅ Keep in localStorage
- Authentication tokens
- Role switcher preferences
- Admin search preferences
- Filter preferences

