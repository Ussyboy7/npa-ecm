# Share Modal Tabs Analysis

## Current Tabs (7 total - TOO MANY!)

1. **"All"** - Share to all users (quick action)
2. **"Users"** - Select individual users
3. **"Org" (Directorate)** - Select by organization (directorates, divisions, departments)
4. **"WS" (Workspaces)** - Select workspaces
5. **"Permissions"** - View/manage existing permissions
6. **"History"** - View share history
7. **"Send via Correspondence"** - Different workflow (correspondence routing)

## Problems

- **Too many tabs** - 7 tabs is overwhelming
- **Unclear hierarchy** - All tabs appear equal in importance
- **"All" as a tab** - It's just a checkbox/button action, not a full tab
- **"Permissions" and "History"** - These are secondary actions, not primary sharing methods
- **Tab overflow** - On smaller screens, tabs will wrap or scroll

## Recommended Consolidation

### Option 1: Two Main Tabs + Secondary Actions (RECOMMENDED)

**Main Tabs:**
1. **"Share"** - Main sharing tab
   - Sub-sections: Users, Organization, Workspaces
   - "Share to All" as a prominent button/checkbox at top
2. **"Send via Correspondence"** - Different workflow

**Secondary Actions (Buttons or Collapsible Section):**
- "View Permissions" button → Opens permissions view
- "View History" button → Opens history view

**Benefits:**
- Reduces from 7 tabs to 2 main tabs
- Clear primary vs secondary actions
- Better mobile experience
- "Share to All" is more prominent as a button

### Option 2: Three Tabs

1. **"Share"** - Users, Org, Workspaces (with "Share to All" at top)
2. **"Manage"** - Permissions + History combined
3. **"Send via Correspondence"** - Different workflow

**Benefits:**
- Still reduces tabs significantly (7 → 3)
- Groups related actions

### Option 3: Single Tab with Sections

1. **"Share"** - Single tab with:
   - "Share to All" checkbox at top
   - Accordion/Collapsible sections: Users, Organization, Workspaces
   - "Send via Correspondence" as a button/link
   - "View Permissions" and "View History" as buttons

**Benefits:**
- Simplest - just 1 tab
- Everything visible at once
- But might be too much in one view

## Recommendation: Option 1

**Implementation:**
- Keep 2 main tabs: "Share" and "Send via Correspondence"
- Move "Share to All" to a prominent checkbox/button at top of Share tab
- Combine Users, Org, Workspaces into one tab with sub-sections or accordion
- Move Permissions and History to buttons in the header or footer
- Or make them collapsible sections within the Share tab

**Tab Structure:**
```
[Share] [Send via Correspondence]
  ↓
Share Tab:
  - [✓] Share to All Users (prominent checkbox)
  - Users Section
  - Organization Section  
  - Workspaces Section
  - [View Permissions] [View History] (buttons)
```


