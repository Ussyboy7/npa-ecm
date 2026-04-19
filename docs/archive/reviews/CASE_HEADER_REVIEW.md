# Case Detail Page Header Review

## Current Structure

### Case Detail Page (`/cases/[id]/page.tsx`)
- **Header Section**: Simple header with back button, title, and action dropdown
- **Case Information Card**: Large card with all case details (Status, Priority, Type, Timeline, Organization, Assignment)
- **Tabs**: Related items (Correspondence, Documents, Forms, Timeline, Comments)

### Issues with Current Structure
1. **Too Much Vertical Space**: Case Information card takes up a lot of space
2. **Redundant Information**: Header shows title, but details are in a separate card
3. **Not Consistent**: Correspondence page has a cleaner header with details inline
4. **Less Scannable**: Information is buried in a card instead of immediately visible

---

## Correspondence Header Structure (Reference)

### What Works Well
1. **Compact Header**: All key info visible at top
2. **Badges in Header**: Priority, status, direction visible immediately
3. **Key Details Inline**: Reference, sender, dates shown in header
4. **Action Buttons**: Dropdown menu for actions
5. **Clean Layout**: Information is scannable and organized

### Header Sections
- **Left Side**: Back button, Reference number, Badges (Priority, Status, Direction)
- **Right Side**: Action buttons (View, Print, Download, More)
- **Below Title**: Key metadata (Sender, Date, Office, etc.)

---

## Proposed Case Header Structure

### Header Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [←] CASE/2025/001  [URGENT] [OPEN] [COMPLAINT]  [Actions ▼]│
│      Case Title Here                                         │
│      Opened: Jan 15, 2025 | Office: Finance | Assigned: John│
└─────────────────────────────────────────────────────────────┘
```

### Key Information to Show in Header
1. **Case Number** (like reference number)
2. **Title** (main heading)
3. **Badges**: Priority, Status, Type
4. **Key Metadata**:
   - Opened date
   - Owning Office
   - Assigned To
   - SLA Status (if applicable)
5. **Action Buttons**: Status update, Link items, Export, More

### Information to Move from Card to Header
- ✅ Status badge
- ✅ Priority badge
- ✅ Case Type badge
- ✅ Opened date
- ✅ Owning Office
- ✅ Assigned To
- ✅ SLA Status

### Information to Keep in Card (or remove)
- ❌ Resolved/Closed dates (can show in timeline)
- ❌ Division/Department (can show if needed, but less prominent)
- ❌ Description (can show in expanded view or below header)

---

## Benefits of Header Approach

1. **Better UX**: Key information visible immediately
2. **Consistent**: Matches correspondence page pattern
3. **Cleaner**: Less vertical scrolling
4. **More Scannable**: Important info at top
5. **Professional**: Looks more polished

---

## Implementation Plan

1. **Create `CaseHeader` component** (similar to `CorrespondenceHeader`)
2. **Move key information to header**:
   - Case number (prominent)
   - Title
   - Badges (Priority, Status, Type)
   - Key metadata row
3. **Simplify Case Information Card**:
   - Keep only detailed/less critical info
   - Or remove entirely if all info is in header
4. **Update case detail page** to use new header

---

## Recommendation

✅ **YES, implement header approach**

This will make the case detail page:
- More consistent with correspondence page
- Cleaner and more professional
- Easier to scan and understand
- Better use of screen space

