# Comprehensive Folder, Hooks & Lib Review

## Summary
Complete review of all folders in `app/`, hooks in `hooks/`, and utilities in `lib/` to identify unused files and folders that should be removed.

---

## 📁 App Folders Analysis

### ✅ **Active Folders (Keep)**
1. **`app/(auth)/`** - Authentication pages
2. **`app/admin/`** - Admin pages (most subfolders active)
3. **`app/analytics/`** - Analytics pages (performance, executive, reports, cases)
4. **`app/approvals/`** - Executive approvals page
5. **`app/audit/`** - Audit trail page
6. **`app/cases/`** - Case management pages
7. **`app/correspondence/`** - Correspondence pages
8. **`app/dashboard/`** - Dashboard page
9. **`app/dms/[id]/`** - Document detail pages
10. **`app/documents/`** - My Documents page
11. **`app/forms/`** - Forms Library page
12. **`app/help/`** - Help pages
13. **`app/inbox/`** - Inbox pages
14. **`app/integrations/`** - Integration Hub page
15. **`app/notifications/`** - Notifications page
16. **`app/records/`** - Records & Archives page
17. **`app/search/`** - Search page
18. **`app/settings/`** - Settings page
19. **`app/verify/`** - Seal verification pages

### 🔄 **Redirect Folders (Keep for Backward Compatibility)**
1. **`app/dms/`** - Redirects to `/documents`
   - **Reason**: Legacy route support
   - **Action**: ✅ Keep

2. **`app/tasks/`** - Redirects to `/inbox`
   - **Reason**: Legacy route support
   - **Action**: ✅ Keep

3. **`app/correspondence/department-files/`** - Redirects to `/correspondence/records`
   - **Reason**: Legacy route support
   - **Action**: ✅ Keep

4. **`app/admin/users/`** - Redirects to `/admin/users-roles?tab=users`
   - **Reason**: Legacy route support, sidebar recognizes it
   - **Action**: ✅ Keep

### ❌ **Empty Folders (Should Remove)**
1. **`app/capture/`** - Empty folder
   - **Reason**: Functionality moved to `/documents` page
   - **Action**: ❌ **DELETE**

2. **`app/reports/`** - Empty folder
   - **Reason**: Reports moved to `/analytics/reports`
   - **Action**: ❌ **DELETE**

3. **`app/admin/roles/`** - Empty folder
   - **Reason**: Redirects handled by `/admin/users-roles`
   - **Action**: ❌ **DELETE**

4. **`app/admin/assistants/`** - Empty folder
   - **Reason**: Redirects handled by `/admin/users-roles`
   - **Action**: ❌ **DELETE**

5. **`app/analytics/components/`** - Empty folder
   - **Reason**: Components moved to separate page files
   - **Action**: ❌ **DELETE**

6. **`app/analytics/records-intelligence/`** - Empty folder
   - **Reason**: Not implemented, empty directory
   - **Action**: ❌ **DELETE**

---

## 🪝 Hooks Analysis

### ✅ **Used Hooks (Keep)**
1. **`use-current-user.ts`** - Used extensively (30+ files)
2. **`use-user-permissions.ts`** - Used in 15+ files
3. **`use-pagination.ts`** - Used in 10+ files
4. **`use-sidebar-counts.ts`** - Used in AppSidebar
5. **`use-sidebar-visibility.ts`** - Used in AppSidebar
6. **`use-signature.ts`** - Used in modals
7. **`use-file-upload.ts`** - Used in TreatmentModal
8. **`use-keyboard-shortcuts.ts`** - Used in modals
9. **`use-modal-state.ts`** - Used in correspondence detail
10. **`use-api-retry.ts`** - Used in correspondence detail
11. **`use-document-preview.ts`** - Used in document previews
12. **`use-notification-websocket.ts`** - Used in NotificationBell
13. **`use-polling.ts`** - Used in NotificationBell
14. **`use-role-checks.ts`** - Used in dashboard and cases
15. **`use-scope-checks.ts`** - Used in cases
16. **`use-seal-verification.ts`** - Used in verify pages
17. **`use-table-sort.ts`** - Used in SortableTableHeader
18. **`use-mobile.ts`** - Used in sidebar.tsx
19. **`use-debounce.ts`** - Used in AdvancedSearch and BulkLinkToCaseDialog
20. **`use-toast.ts`** - Used in 18+ files

### ❌ **Unused Hooks (Should Remove)**
1. **`use-filters.ts`** - Only referenced in README, never imported
   - **Action**: ❌ **DELETE**

---

## 📚 Lib Files Analysis

### ✅ **Used Lib Files (Keep)**
Most lib files are used. Key ones:
- `api-client.ts` - Core API client (used everywhere)
- `npa-structure.ts` - Type definitions (used everywhere)
- `dms-storage.ts` - Document operations (used extensively)
- `correspondence-helpers.ts` - Utility functions (used extensively)
- `template-storage.ts` - Template management (used in modals)
- `signature-storage.ts` - Signature management (used in modals)
- `storage.ts` - Local storage (used in contexts)
- All files in `lib/api/` - API clients (all used)
- All files in `lib/types/` - Type definitions (all used)
- `routing-utils.ts` - Used in 6+ components
- `diff-utils.ts` - Used in VersionCompareDialog
- `integrations-storage.ts` - Used in WebhookManager
- `records-storage.ts` - Used in records page
- `role-switcher-storage.ts` - Used in SimplifiedRoleSwitcher
- `admin-api.ts` - Used in admin components
- `admin-search-autocomplete.ts` - Used in UsersManagementTab
- `admin-search.ts` - Used internally by admin-search-autocomplete
- `admin-export.ts` - Used in approvals page
- `admin-error-handler.ts` - Used in admin components
- `audit-storage.ts` - Used in audit page
- `date-formatters.ts` - Used in SealVerificationResult
- `sanitize-html.ts` - Used in 4+ components
- `search-highlight.tsx` - Used in 2 components
- `correspondence-constants.ts` - Used in multiple files
- `constants.ts` - Used in notifications
- `branding.ts` - Used in 7+ files
- `correspondence-url-utils.ts` - Used in 3 files
- `modal-constants.ts` - Used in 11+ components
- `modal-errors.ts` - Used in 8+ components
- `permissions.ts` - Used in use-user-permissions
- `role-permissions.ts` - Used in 2 files
- `sla-client.ts` - Used in inbox and registration
- `notifications-storage.ts` - Used in notifications
- `capture-storage.ts` - Used in DMS detail page
- `delegation-storage.ts` - Used in contexts
- `document-generator.ts` - Used in correspondence detail
- `file-utils.ts` - Used in DMS detail
- `search-storage.ts` - Used in AdvancedSearch
- `tiptap/character-count.ts` - Used in RichTextEditor

### ⚠️ **Potentially Unused Lib Files (Need Verification)**
1. **`lib/use-debounce.ts`** - Duplicate of `hooks/use-debounce.ts`
   - **Issue**: `SimplifiedRoleSwitcher` uses `lib/use-debounce.ts` instead of `hooks/use-debounce.ts`
   - **Action**: ⚠️ **CONSOLIDATE** - Update SimplifiedRoleSwitcher to use hooks version, then delete lib version

2. **`lib/organization-cache.ts`** - Not directly imported
   - **Status**: Used internally via `npa-structure.ts` re-exports
   - **Action**: ✅ **KEEP** - It's used via re-exports

3. **`lib/admin-validation.ts`** - Not directly imported
   - **Status**: Contains Zod schemas but not used
   - **Action**: ❌ **DELETE** - Unused validation schemas

4. **`lib/correspondence-storage.ts`** - Not directly imported
   - **Status**: Contains `queryCorrespondence` and bulk operations but not used
   - **Action**: ❌ **DELETE** - Unused API wrapper

5. **`lib/dms-error-handler.ts`** - Not directly imported
   - **Status**: Contains DMS error handling but not used
   - **Action**: ❌ **DELETE** - Unused error handler

6. **`lib/error-handling.ts`** - Not directly imported
   - **Status**: Contains generic error handling but not used
   - **Action**: ❌ **DELETE** - Unused error handler

7. **`lib/crypto-polyfill.ts`** - Not directly imported
   - **Status**: Code is inline in `app/layout.tsx` instead
   - **Action**: ❌ **DELETE** - Duplicate, code is in layout

---

## 🗑️ Files to Delete

### Empty Folders
1. `app/capture/` (empty)
2. `app/reports/` (empty)
3. `app/admin/roles/` (empty)
4. `app/admin/assistants/` (empty)
5. `app/analytics/components/` (empty)
6. `app/analytics/records-intelligence/` (empty)

### Unused Hooks
1. `hooks/use-filters.ts`

### Unused Lib Files
1. `lib/use-debounce.ts` (after consolidating)
2. `lib/admin-validation.ts`
3. `lib/correspondence-storage.ts`
4. `lib/dms-error-handler.ts`
5. `lib/error-handling.ts`
6. `lib/crypto-polyfill.ts`

---

## 🔧 Fixes Needed

### 1. **Consolidate use-debounce**
- Update `SimplifiedRoleSwitcher.tsx` to use `@/hooks/use-debounce` instead of `@/lib/use-debounce`
- Delete `lib/use-debounce.ts`

---

## 📊 Statistics

- **Total App Folders**: 23
- **Empty Folders to Remove**: 6
- **Redirect Folders (Keep)**: 4
- **Active Folders**: 13

- **Total Hooks**: 23
- **Unused Hooks**: 1
- **Used Hooks**: 22

- **Total Lib Files**: 60+
- **Unused Lib Files**: 6
- **Used Lib Files**: 54+

---

## ✅ Recommendations

1. **Remove empty folders** - Clean up unused directories
2. **Remove unused hooks** - Delete `use-filters.ts`
3. **Remove unused lib files** - Delete 6 unused utility files
4. **Consolidate duplicates** - Fix `use-debounce` duplication
5. **Keep redirect folders** - Maintain backward compatibility

---

## Next Steps

1. Delete empty folders
2. Delete unused hooks
3. Delete unused lib files
4. Fix use-debounce consolidation
5. Verify no broken imports

