# Inbox & Tasks Review

## Overview
This document reviews three related components:
1. **My Tasks & Alerts** (`/tasks`) - Task-focused view with SLA deadlines
2. **My Inbox** (`/inbox`) - Personal inbox for assigned correspondence
3. **Office Inbox** (`/correspondence/inbox` or `/inbox` office tab) - Office-level queue

---

## My Tasks & Alerts (`/tasks`)

### Current Functionality
- ✅ Fetches pending correspondence from `/correspondence/items/my-inbox/` (same endpoint as My Inbox)
- ✅ Fetches pending approvals from `/correspondence/minutes/pending-approvals/`
- ✅ Categorizes tasks by SLA status: `overdue`, `due-soon`, `pending`
- ✅ Shows days overdue/days until due
- ✅ Filters by status tab (All, Overdue, Due Soon, Pending)
- ✅ Filters by priority (urgent, high, medium, low)
- ✅ Filters by category (correspondence, approval, minute)
- ✅ Statistics cards (Total, Overdue, Due Soon, Pending)
- ✅ Task detail modal with actions (complete, snooze, delegate)

### Data Sources
1. **Correspondence**: Same API endpoint as My Inbox (`/correspondence/items/my-inbox/`)
2. **Approvals**: Separate endpoint (`/correspondence/minutes/pending-approvals/`)

### Strengths
1. **SLA Focus**: Clearly highlights overdue and due-soon items
2. **Unified View**: Combines correspondence and approvals in one place
3. **Clear Categorization**: Overdue/due soon/pending status is very clear
4. **Action-Oriented**: Designed for task management

### Issues
1. **Redundant Data**: Pulls same correspondence data as My Inbox
2. **Limited Functionality**: Task actions (complete, snooze, delegate) are not implemented
3. **No Pagination**: Loads all items at once (up to 100)
4. **No Search**: Can't search within tasks
5. **No Office Context**: Doesn't show which office items are from

---

## My Inbox (`/inbox`)

### Current Functionality
- ✅ Fetches correspondence from `/correspondence/items/my-inbox/`
- ✅ Fetches shared documents
- ✅ Status filtering (pending, in-progress, completed)
- ✅ Priority filtering
- ✅ Search by subject, reference, sender, office
- ✅ Sorting (priority, days pending, updated, reference)
- ✅ Pagination (25 items per page)
- ✅ Statistics cards (Total, Shared Documents, Pending, In Progress, Urgent)
- ✅ Days pending calculation and display
- ✅ SLA targets integration

### Strengths
1. **Comprehensive**: Full-featured inbox with search, filter, sort, pagination
2. **API Integration**: Fresh data from backend
3. **Document Integration**: Shows shared documents alongside correspondence
4. **Better UX**: More mature interface with proper pagination

### Issues
1. **No SLA Focus**: Doesn't highlight overdue/due soon items prominently
2. **No Approvals**: Doesn't show pending approvals
3. **No Task Actions**: Can't mark complete, snooze, or delegate from list

---

## Office Inbox (`/correspondence/inbox` or `/inbox` office tab)

### Current Functionality
- ✅ Fetches from `/correspondence/items/office-inbox/`
- ✅ Office filtering (select specific office or "All")
- ✅ Status filtering
- ✅ "Assigned to me" toggle
- ✅ Search
- ✅ Pagination
- ✅ Summary metrics (Total, Urgent, SLA Breaches, Assigned to you)
- ✅ SLA breach detection

### Strengths
1. **Office-Level View**: Manages office queue, not just personal items
2. **SLA Tracking**: Highlights SLA breaches
3. **Comprehensive Filtering**: Office, status, assigned to me

### Issues
1. **No Sorting**: Items displayed in API order
2. **No Priority Filtering**: Can't filter by priority level
3. **No Date Filtering**: Can't filter by date range

---

## Comparison Matrix

| Feature | My Tasks & Alerts | My Inbox | Office Inbox | Recommendation |
|---------|------------------|----------|--------------|----------------|
| **Data Source** | Same as My Inbox + Approvals | `/correspondence/items/my-inbox/` | `/correspondence/items/office-inbox/` | Keep separate endpoints |
| **SLA Focus** | ✅ Strong (overdue/due soon) | ⚠️ Weak (days pending only) | ⚠️ Weak (SLA breach badge) | Add to My Inbox |
| **Approvals** | ✅ Shows pending approvals | ❌ No | ❌ No | Add to My Inbox |
| **Search** | ❌ No | ✅ Yes | ✅ Yes | Keep in My Inbox |
| **Pagination** | ❌ No (loads 100) | ✅ Yes | ✅ Yes | Keep in My Inbox |
| **Sorting** | ⚠️ Auto-sorted by SLA | ✅ Yes | ❌ No | Keep in My Inbox |
| **Filtering** | ✅ Status, Priority, Category | ✅ Status, Priority | ✅ Status, Office, Assigned | Keep in My Inbox |
| **Documents** | ❌ No | ✅ Yes | ❌ No | Keep in My Inbox |
| **Task Actions** | ⚠️ UI only (not implemented) | ❌ No | ❌ No | Add to My Inbox if needed |

---

## Recommendation: **MERGE My Tasks & Alerts into My Inbox**

### Rationale

1. **Data Redundancy**: My Tasks & Alerts pulls the same correspondence data as My Inbox
2. **Better Foundation**: My Inbox has more mature features (search, pagination, sorting)
3. **User Confusion**: Having two pages showing similar data is confusing
4. **Maintenance**: Maintaining two similar pages increases maintenance burden

### Implementation Plan

#### Option 1: Add "Tasks" Tab to My Inbox (Recommended)
- Add a new tab in My Inbox: "All", "Tasks", "Documents"
- "Tasks" tab shows:
  - Correspondence with SLA focus (overdue/due soon highlighted)
  - Pending approvals
  - Sorted by SLA status (overdue first, then due soon, then pending)
- Keep existing "All" tab for comprehensive view
- Add SLA indicators to all tabs (overdue badge, days until due)

#### Option 2: Add SLA View Toggle
- Add a toggle/button: "SLA View" or "Task View"
- When enabled:
  - Highlights overdue items in red
  - Shows "Due in X days" badges
  - Includes pending approvals
  - Sorts by SLA status
- When disabled: Normal inbox view

#### Option 3: Enhanced My Inbox with SLA Section
- Keep single view but add:
  - "Overdue" section at top (if any)
  - "Due Soon" section (items due in 2 days)
  - "Pending Approvals" section
  - Regular inbox items below

### Features to Add to My Inbox

1. **Pending Approvals**
   - Fetch from `/correspondence/minutes/pending-approvals/`
   - Show in separate section or mixed with correspondence
   - Badge: "Pending Approval"

2. **SLA Indicators**
   - Overdue badge (red) for items past due date
   - "Due in X days" badge (orange) for items due soon
   - Days pending calculation (already exists, enhance display)

3. **SLA-Based Sorting**
   - Add sort option: "SLA Status" (overdue first, then due soon, then pending)
   - Default sort could be SLA-based for task-focused users

4. **Quick Actions** (Optional)
   - If task actions are needed, add hover menu:
     - Mark Complete
     - Snooze (remind me later)
     - Delegate

### Migration Steps

1. **Enhance My Inbox** with SLA features and approvals
2. **Test** that all Tasks & Alerts functionality is covered
3. **Update Sidebar** to remove "My Tasks & Alerts" link
4. **Redirect** `/tasks` to `/inbox?view=tasks` (if using tab approach)
5. **Remove** `/tasks` page after migration period
6. **Update** any documentation or help guides

---

## Office Inbox - Keep Separate

**Recommendation**: Keep Office Inbox as a separate page/tab because:
- Different data source (office-level vs personal)
- Different use case (queue management vs personal tasks)
- Different permissions (office access required)
- Already well-integrated in unified inbox tabs

---

## Summary

### My Tasks & Alerts
- **Status**: Redundant with My Inbox
- **Action**: **MERGE into My Inbox**
- **Timeline**: Can be done in 1-2 days

### My Inbox
- **Status**: Good foundation, needs SLA enhancements
- **Action**: **ENHANCE** with SLA focus and approvals
- **Timeline**: 2-3 days to add features

### Office Inbox
- **Status**: Keep separate, but could add sorting
- **Action**: **KEEP SEPARATE**, optionally add sorting
- **Timeline**: 1 day to add sorting (optional)

---

## Final Recommendation

✅ **Merge My Tasks & Alerts into My Inbox** by:
1. Adding SLA-focused view/tab to My Inbox
2. Including pending approvals in My Inbox
3. Adding SLA indicators (overdue, due soon) to all items
4. Removing separate Tasks & Alerts page
5. Redirecting `/tasks` to `/inbox?view=tasks`

This will:
- Reduce redundancy
- Simplify navigation
- Provide better UX (one place for all personal items)
- Reduce maintenance burden
- Keep all features users need

