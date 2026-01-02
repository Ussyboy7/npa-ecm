# Sidebar Restructure: Page Mapping & Migration Plan

## Overview

This document maps all existing pages to the new sidebar structure and identifies what needs to be merged, moved, or removed.

**Status:** ✅ **FINAL DECISIONS MADE** - Ready for implementation

---

## 🎯 Final Decisions Summary

### ✅ All Decisions Confirmed:

1. **`/admin/assistants`** → **Merge into Users & Roles**
   - Add as tab/section in `/admin/users-roles`
   - Assistants are users with special permissions

2. **`/capture` (Content Capture)** → **Add to Documents & Records**
   - Add "Content Capture" to sidebar under "Documents & Records"
   - Users may want to scan documents directly
   - Also keep accessible via other pages for convenience

3. **`/notifications`** → **Keep as utility only**
   - No sidebar link
   - Accessible via bell icon in header (standard UX pattern)

4. **`/correspondence/department-files`** → **Merge into Records & Archives**
   - Add scope filter/tabs to `/correspondence/records`
   - "All Records" (directorate scope) and "Department Files" (office scope)
   - Redirect old URL to new page with scope parameter

### 📋 Proposed Sidebar Structure (Final):

```
My Workspace
  Dashboard
  My Inbox
  My Outbox
  Executive Approvals
  My Tasks & Alerts (NEW)

Offices & Registry
  Office Inbox
  Register Correspondence
  Office Outbox (NEW)

Case Management
  My Cases
  Office Cases
  All Cases

Documents & Records
  Search Documents
  Content Capture (MOVED FROM UTILITY)
  Forms Library
  Verify Seal
  Records & Archives

Analytics & Reports
  Executive Dashboard
  Performance Analytics
  Reports & Intelligence

Administration
  Organization & Offices
  Users & Roles (MERGED: users + roles + assistants)
  Workflow & SLA (MERGED: sla-config + escalation-rules)
  Templates
  Audit & Compliance

Integration
  Integration Hub

System
  Settings
  Help & Guides
```

---

---

## 📋 Current vs. Proposed Sidebar Structure

### Current Sidebar (from codebase analysis):
```
My Workspace
  Dashboard
  Office Inbox
  My Inbox
  Register Correspondence
  Records & Archive
  Outbox
  Executive Approvals
  Case Management

Documents & Records
  My Documents
  Document Management
  Forms
  Advanced Search
  Verify Seal
  Records Management

Analytics & Reports
  Performance Analytics
  Executive Dashboard
  Reports & Intelligence

Administration
  Organization Structure
  User Management
  System Roles
  Templates Hub
  Assistants
  SLA Configuration
  Escalation Rules
  Audit Trail

Integration
  Integration Hub

System
  Settings
  Help & Guides
```

### Proposed Sidebar:
```
My Workspace
  Dashboard
  My Inbox
  My Outbox
  Executive Approvals
  My Tasks & Alerts

Offices & Registry
  Office Inbox
  Register Correspondence
  Office Outbox

Case Management
  My Cases
  Office Cases
  All Cases

Documents & Records
  Search Documents
  Content Capture
  Forms Library
  Verify Seal
  Records & Archives

Analytics & Reports
  Executive Dashboard
  Performance Analytics
  Reports & Intelligence

Administration
  Organization & Offices
  Users & Roles
  Workflow & SLA
  Templates
  Audit & Compliance

Integration
  Integration Hub

System
  Settings
  Help & Guides
```

---

## 🗺️ Page Mapping (Existing → New)

### ✅ My Workspace

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/dashboard` | My Workspace > Dashboard | ✅ Keep | Already correct |
| `/inbox` | My Workspace > My Inbox | ✅ Keep | Already correct |
| `/correspondence/outbox` | My Workspace > My Outbox | ✅ Keep | Already correct |
| `/approvals` | My Workspace > Executive Approvals | ✅ Keep | Already correct |
| ❌ **NEW** | My Workspace > My Tasks & Alerts | 🆕 **CREATE** | SLA alerts, overdue tasks, pending actions |

**Action Required:**
- Create `/tasks` or `/alerts` page for "My Tasks & Alerts"
- This should show:
  - SLA countdown timers
  - Overdue items
  - Pending approvals
  - Action items assigned to user

---

### ✅ Offices & Registry

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/correspondence/inbox` | Offices & Registry > Office Inbox | ✅ Keep | Already correct |
| `/correspondence/register` | Offices & Registry > Register Correspondence | ✅ Keep | Already correct |
| ❌ **NEW** | Offices & Registry > Office Outbox | 🆕 **CREATE** | Office-level outbox (different from personal outbox) |

**Action Required:**
- Create `/correspondence/office-outbox` page
- This should show all correspondence sent from user's office(s)
- Filter by office membership

---

### ✅ Case Management

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/cases` | Case Management > My Cases / Office Cases / All Cases | ✅ **ENHANCE** | Add tabs or filters for "My Cases", "Office Cases", "All Cases" |
| `/cases/new` | Case Management > (via "New Case" button) | ✅ Keep | Create case flow |
| `/cases/[id]` | Case Management > (detail page) | ✅ Keep | Case detail page |
| `/cases/templates` | Case Management > (via "Templates" button) | ✅ Keep | Case templates |

**Action Required:**
- Enhance `/cases` page with three views:
  - **My Cases**: Cases where user is assigned/owner
  - **Office Cases**: Cases in user's office(s)
  - **All Cases**: All cases (permission-based)

---

### ✅ Documents & Records

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/search` | Documents & Records > Search Documents | ✅ **RENAME/ENHANCE** | Current "Advanced Search" → "Search Documents" |
| `/capture` | Documents & Records > Content Capture | ✅ **ADD** | OCR, scanning, batch upload |
| `/forms` | Documents & Records > Forms Library | ✅ Keep | Already correct |
| `/verify` | Documents & Records > Verify Seal | ✅ Keep | Already correct |
| `/correspondence/records` | Documents & Records > Records & Archives | ✅ **ENHANCE** | Merge `/correspondence/department-files` into this |
| `/documents` | ❌ **REMOVE** | 🗑️ **REMOVE** | "My Documents" - documents should be accessed via cases/correspondence/search |
| `/dms` | ❌ **REMOVE** | 🗑️ **REMOVE** | "Document Management" - too system-centric, merge into search |
| `/records` | ❌ **MERGE** | 🔀 **MERGE** | Merge into `/correspondence/records` (Records & Archives) |

**Action Required:**
1. **Remove `/documents` page** - Users should access documents via:
   - Cases (case documents)
   - Correspondence (correspondence documents)
   - Search (all documents with context)

2. **Remove `/dms` page** - Same as above, merge functionality into search

3. **Enhance `/search` page**:
   - Rename to "Search Documents"
   - Add context filters: "All", "Cases", "Correspondence", "Standalone"
   - Show document context (which case/correspondence it belongs to)

4. **Merge `/correspondence/department-files` into `/correspondence/records`**:
   - Add scope filter or tabs: "All Records" (directorate scope) and "Department Files" (office scope)
   - Redirect `/correspondence/department-files` to `/correspondence/records?scope=department`
   - Update any links pointing to `/correspondence/department-files`

---

### ✅ Analytics & Reports

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/analytics/executive` | Analytics & Reports > Executive Dashboard | ✅ Keep | Already correct |
| `/analytics` | Analytics & Reports > Performance Analytics | ✅ Keep | Already correct |
| `/reports` | Analytics & Reports > Reports & Intelligence | ✅ Keep | Already correct |

**Action Required:**
- ✅ No changes needed - already aligned

---

### ✅ Administration

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/admin/organization` | Administration > Organization & Offices | ✅ Keep | Already correct |
| `/admin/users` | Administration > Users & Roles | ✅ **MERGE** | Merge with `/admin/roles` and `/admin/assistants` |
| `/admin/roles` | Administration > Users & Roles | ✅ **MERGE** | Merge with `/admin/users` and `/admin/assistants` |
| `/admin/assistants` | Administration > Users & Roles | ✅ **MERGE** | Merge into `/admin/users-roles` as sub-section |
| `/admin/sla-config` | Administration > Workflow & SLA | ✅ **MERGE** | Merge with `/admin/escalation-rules` |
| `/admin/escalation-rules` | Administration > Workflow & SLA | ✅ **MERGE** | Merge with `/admin/sla-config` |
| `/admin/templates-hub` | Administration > Templates | ✅ Keep | Already correct |
| `/admin/workflow-templates/[id]` | Administration > Templates | ✅ Keep | Already correct |
| `/admin/form-templates/[id]` | Administration > Templates | ✅ Keep | Already correct |
| `/audit` | Administration > Audit & Compliance | ✅ Keep | Already correct |
| `/admin/assistants` | ❓ **DECIDE** | ❓ **DECIDE** | Where should "Assistants" go? |

**Action Required:**

1. **Merge Users & Roles & Assistants**:
   - Combine `/admin/users`, `/admin/roles`, and `/admin/assistants` into single page
   - Use tabs: "Users", "Roles", and "Assistants"
   - Or create `/admin/users-roles` with all three sections

2. **Merge Workflow & SLA**:
   - Combine `/admin/sla-config` and `/admin/escalation-rules` into single page
   - Use tabs: "SLA Configuration" and "Escalation Rules"
   - Or create `/admin/workflow-sla` with both sections

3. **Merge Assistants into Users & Roles**:
   - ✅ **DECIDED:** Move to "Users & Roles" (assistants are users with special permissions)
   - Merge `/admin/assistants` into `/admin/users-roles` as a tab or section

---

### ✅ Integration

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/integrations` | Integration > Integration Hub | ✅ Keep | Already correct |

**Action Required:**
- ✅ No changes needed

---

### ✅ System

| Current Page | New Location | Action | Notes |
|-------------|--------------|--------|-------|
| `/settings` | System > Settings | ✅ Keep | Already correct |
| `/help` | System > Help & Guides | ✅ Keep | Already correct |

**Action Required:**
- ✅ No changes needed

---

## 🆕 New Pages to Create

### 1. My Tasks & Alerts (`/tasks` or `/alerts`)
**Purpose:** Show user's pending tasks, SLA alerts, overdue items

**Features:**
- SLA countdown timers
- Overdue items (red)
- Pending approvals
- Action items assigned to user
- Filter by: All, Overdue, Pending, Today, This Week

**Implementation:**
- Create `/tasks/page.tsx`
- Fetch user's pending tasks from API
- Display with priority/urgency indicators
- Link to relevant correspondence/cases

---

### 2. Office Outbox (`/correspondence/office-outbox`)
**Purpose:** Show all correspondence sent from user's office(s)

**Features:**
- Filter by office
- Show office-level outbox items
- Different from personal outbox (My Outbox)

**Implementation:**
- Create `/correspondence/office-outbox/page.tsx`
- Filter by user's office memberships
- Similar to personal outbox but office-scoped

---

## 🗑️ Pages to Remove

### 1. `/documents` (My Documents)
**Reason:** Documents should be accessed via context (cases, correspondence, search), not as standalone "My Documents"

**Migration:**
- Redirect to `/search` with filter "My Documents"
- Or redirect to `/cases` (most documents are case-linked)

---

### 2. `/dms` (Document Management)
**Reason:** Too system-centric. Documents should be accessed via context, not as a file cabinet.

**Migration:**
- Redirect to `/search` (enhanced search with context)
- Or merge functionality into search page

---

## 🔀 Pages to Merge

### 1. `/records` → `/correspondence/records`
**Action:** Merge or redirect

**Check:** Does `/records` have unique functionality?
- If yes: Merge into `/correspondence/records` with tabs
- If no: Redirect to `/correspondence/records`

---

### 2. `/admin/users` + `/admin/roles` → `/admin/users-roles`
**Action:** Create unified page with tabs

**Implementation:**
- Create `/admin/users-roles/page.tsx`
- Tabs: "Users" and "Roles"
- Or side-by-side layout

---

### 3. `/admin/sla-config` + `/admin/escalation-rules` → `/admin/workflow-sla`
**Action:** Create unified page with tabs

**Implementation:**
- Create `/admin/workflow-sla/page.tsx`
- Tabs: "SLA Configuration" and "Escalation Rules"
- Or side-by-side layout

---

## 📝 Pages to Enhance

### 1. `/cases` → Add "My Cases", "Office Cases", "All Cases" views
**Action:** Add tabs or filters

**Implementation:**
- Add tabs: "My Cases", "Office Cases", "All Cases"
- Or use filter dropdown
- Default to "My Cases"

---

### 2. `/search` → Enhance with context filters
**Action:** Rename to "Search Documents" and add context filters

**Implementation:**
- Rename page title to "Search Documents"
- Add filters: "All", "Cases", "Correspondence", "Standalone"
- Show document context in results

---

## ❓ Pages Needing Decision

### 1. `/admin/assistants`
**Question:** Where should this go?

**Options:**
- **Option A:** Move to "Users & Roles" (assistants are users)
- **Option B:** Keep separate under Administration
- **Option C:** Move to "Workflow & SLA" (assistants handle delegations)

**✅ DECISION:** **Option A - Move to "Users & Roles"**

**Rationale:**
- Assistants are users with special permissions (can act on behalf of executives)
- Fits naturally with user management
- Keeps Administration section cleaner
- Can be a sub-section or tab within "Users & Roles" page

**Implementation:**
- Merge `/admin/assistants` into `/admin/users-roles` as a tab or section
- Or keep as separate page but move link to "Users & Roles" section

---

### 2. `/capture` (Content Capture)
**Question:** Where should this go?

**Current:** Standalone page for OCR, scanning, batch upload

**Options:**
- **Option A:** Move to "Documents & Records" > "Content Capture"
- **Option B:** Keep as utility (not in main sidebar, accessible via other pages)
- **Option C:** Move to "Offices & Registry" (registry officers use it)

**✅ DECISION:** **Option A - Move to "Documents & Records" > "Content Capture"**

**Rationale:**
- Users may want to scan documents directly (not just via other pages)
- OCR and scanning are document-related functions
- Makes sense to have it in "Documents & Records" section
- Registry officers and other users who need bulk scanning will find it easily

**Implementation:**
- Add "Content Capture" to "Documents & Records" section in sidebar
- Keep `/capture` page as is
- Update sidebar link to point to `/capture`
- Also keep accessible via other pages (Register Correspondence, Case Management) for convenience

---

### 3. `/notifications`
**Question:** Where should this go?

**Current:** Standalone notifications page

**Options:**
- **Option A:** Move to "My Workspace" > "Notifications"
- **Option B:** Keep as utility (accessible via bell icon)
- **Option C:** Merge into "My Tasks & Alerts"

**✅ DECISION:** **Option B - Keep as utility, accessible via bell icon**

**Rationale:**
- Notifications are already accessible via bell icon in header
- Adding to sidebar would be redundant
- Keeps sidebar cleaner
- Users expect notifications via bell icon (standard UX pattern)

**Implementation:**
- Keep `/notifications` page as is
- Keep accessible via bell icon in header
- Do NOT add to sidebar

---

### 4. `/correspondence/department-files`
**Question:** What is this? Should it be merged?

**Current:** Shows "department-records" filtered by user's offices (similar to Records & Archive)

**✅ DECISION:** **MERGE into `/correspondence/records` (Records & Archives)**

**Rationale:**
- Both pages show completed/archived correspondence
- `/correspondence/records` uses `/correspondence/items/archive-records/` (directorate scope)
- `/correspondence/department-files` uses `/correspondence/items/department-records/` (office scope)
- They're functionally very similar, just different scopes
- Merging reduces duplication and confusion

**Implementation:**
- Enhance `/correspondence/records` page with scope filter:
  - "All Records" (current behavior - directorate scope)
  - "Department Files" (office scope - from department-files)
- Or add tabs: "All Records" and "Department Files"
- Redirect `/correspondence/department-files` to `/correspondence/records?scope=department`
- Update any links pointing to `/correspondence/department-files`

---

## 📊 Summary

### Pages to Keep (No Changes):
- ✅ `/dashboard`
- ✅ `/inbox`
- ✅ `/correspondence/inbox`
- ✅ `/correspondence/register`
- ✅ `/correspondence/outbox`
- ✅ `/approvals`
- ✅ `/cases` (enhance with tabs)
- ✅ `/forms`
- ✅ `/verify`
- ✅ `/correspondence/records`
- ✅ `/analytics/executive`
- ✅ `/analytics`
- ✅ `/reports`
- ✅ `/admin/organization`
- ✅ `/admin/templates-hub`
- ✅ `/audit`
- ✅ `/integrations`
- ✅ `/settings`
- ✅ `/help`

### Pages to Create:
- 🆕 `/tasks` (My Tasks & Alerts)
- 🆕 `/correspondence/office-outbox` (Office Outbox)

### Pages to Remove:
- 🗑️ `/documents` (My Documents)
- 🗑️ `/dms` (Document Management)

### Pages to Merge:
- 🔀 `/correspondence/department-files` → `/correspondence/records` (add scope filter/tabs)
- 🔀 `/admin/users` + `/admin/roles` + `/admin/assistants` → `/admin/users-roles`
- 🔀 `/admin/sla-config` + `/admin/escalation-rules` → `/admin/workflow-sla`

### Pages to Enhance:
- 📝 `/cases` (add "My Cases", "Office Cases", "All Cases" views)
- 📝 `/search` (rename to "Search Documents", add context filters)
- 📝 `/correspondence/records` (merge department-files functionality, add scope filter/tabs)

### Pages Needing Decision:
- ✅ `/admin/assistants` → **Move to Users & Roles** (merge into `/admin/users-roles`)
- ✅ `/capture` → **Move to Documents & Records > Content Capture**
- ✅ `/notifications` → **Keep as utility** (accessible via bell icon, not in sidebar)
- ✅ `/correspondence/department-files` → **MERGE into `/correspondence/records`** (add scope filter/tabs)

---

## 🎯 Implementation Priority

### Phase 1: Critical (Sidebar Structure)
1. ✅ Arrange sidebar structure (no role-based visibility yet)
2. ✅ Remove `/documents` and `/dms` pages
3. ✅ Enhance `/cases` with tabs
4. ✅ Enhance `/search` with context filters
5. ✅ Create `/tasks` page

### Phase 2: Merges & Consolidation
1. ✅ Merge `/admin/users` + `/admin/roles`
2. ✅ Merge `/admin/sla-config` + `/admin/escalation-rules`
3. ✅ Merge or redirect `/records`
4. ✅ Create `/correspondence/office-outbox`

### Phase 3: Decisions & Cleanup ✅ COMPLETED
1. ✅ **COMPLETED:** `/admin/assistants` → Merged into `/admin/users-roles` (tab navigation)
2. ✅ **COMPLETED:** `/capture` → Added to "Documents & Records" > "Content Capture" (sidebar link)
3. ✅ **COMPLETED:** `/notifications` → Kept as utility (bell icon only, no sidebar link)
4. ✅ **COMPLETED:** `/correspondence/department-files` → Redirected to `/correspondence/records`
5. ✅ **COMPLETED:** `/cases` → Added tabs: "My Cases", "Office Cases", "All Cases"
6. ✅ **COMPLETED:** `/search` → Enhanced with context filters: "All", "Documents", "Correspondence", "Cases"
7. ✅ **COMPLETED:** `/admin/users-roles` → Created unified page with tabs for Users, Roles, Assistants
8. ✅ **COMPLETED:** `/admin/workflow-sla` → Created unified page with tabs for SLA Configuration and Escalation Rules

### Phase 4: Role-Based Visibility
1. ✅ Implement role-based sidebar visibility
2. ✅ Show/hide sections based on user role
3. ✅ Test with different user roles

---

## 📌 Notes

- **Routing Rule Update:** Office members should NOT see minutes unless explicitly minuted to them (not just because they're office members)
- **Search Documents:** Should show all documents (case, correspondence, standalone) if user has permission
- **Case Management:** Top-level section with "My Cases", "Office Cases", "All Cases"
- **Routing:** Auto-suggest office hierarchy but allow override for personal routing
- **Leave Requests/Applications:** Stay as correspondence-only (no cases)

---

## ✅ Next Steps

1. ✅ **COMPLETED:** All decisions made and documented
2. ✅ **COMPLETED:** Phase 1: Sidebar structure arranged
3. ✅ **COMPLETED:** Phase 2: Pages merged and consolidated
4. ✅ **COMPLETED:** Phase 3: Cleanup and redirects
5. **Ready for Implementation:**
   - Phase 4: Implement role-based visibility

## 📝 Final Decisions Summary

| Page | Decision | Action |
|------|----------|--------|
| `/admin/assistants` | ✅ Merge into Users & Roles | Add as tab/section in `/admin/users-roles` |
| `/capture` | ✅ Add to Documents & Records | Add "Content Capture" to sidebar, link to `/capture` |
| `/notifications` | ✅ Keep as utility | No sidebar link, accessible via bell icon only |
| `/correspondence/department-files` | ✅ Merge into Records & Archives | Add scope filter/tabs to `/correspondence/records` |
| `/documents` | ✅ Remove | Redirect to `/search` |
| `/dms` | ✅ Remove | Redirect to `/search` |
| `/records` | ✅ Merge/Redirect | Merge into `/correspondence/records` or redirect |

