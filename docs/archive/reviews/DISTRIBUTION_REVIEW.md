# Distribution (CC) Feature Review

## Current Implementation

### What Works
1. **UI Component**: `DistributionSelector` allows selecting directorates, divisions, or departments
2. **Purpose Selection**: Can set purpose as "For Information", "For Action", or "For Comment"
3. **Data Storage**: Distribution entries are saved to `CorrespondenceDistribution` model
4. **Display**: Distribution list is shown in correspondence detail view

### What's Missing

#### 1. **No Notifications Sent**
- When distribution is created, no notifications are sent to users in the distributed divisions/departments
- Users don't know they've been CC'd on correspondence
- **Location**: `CorrespondenceDistributionViewSet.perform_create()` only saves the entry

#### 2. **No Visibility in Inbox**
- The `office_inbox` endpoint filters by `current_office_id` or `owning_office_id`
- It does NOT filter by distribution entries
- Users in distributed divisions/departments won't see the correspondence in their inbox
- **Location**: `CorrespondenceViewSet.office_inbox()` method

#### 3. **No Purpose Enforcement**
- "For Information" recipients can still act on correspondence
- "For Action" recipients should be required to act
- "For Comment" recipients should be able to comment
- **Current**: Purpose is stored but not enforced

#### 4. **No Distribution View/Filter**
- No dedicated view to see "Correspondence distributed to me/my division"
- No filter in inbox to show only distributed correspondence
- Users can't easily find correspondence they've been CC'd on

## Recommendations

### Critical (Must Fix)
1. **Send Notifications**: When distribution is created, notify all users in the distributed division/department
2. **Update Inbox Filter**: Include distribution entries in `office_inbox` queryset
3. **Add Distribution View**: Create a new endpoint/view for "My Distributed Correspondence"

### Medium Priority
4. **Purpose Enforcement**: Block actions for "For Information" recipients
5. **Distribution Badge**: Show distribution status in correspondence list
6. **Distribution History**: Show who distributed and when

### Low Priority
7. **Bulk Distribution**: Allow distributing to multiple divisions at once
8. **Distribution Templates**: Save common distribution lists

## Implementation Plan

### Step 1: Add Notifications
- Override `CorrespondenceDistributionViewSet.perform_create()` to send notifications
- Notify all active users in the distributed division/department/directorate
- Include purpose in notification message

### Step 2: Update Inbox Query
- Modify `office_inbox` to include correspondence where user's division/department is in distribution
- Add filter parameter `include_distributed=true` to show distributed items

### Step 3: Add Distribution Endpoint
- Create `@action(detail=False, methods=["get"], url_path="distributed")` endpoint
- Filter correspondence where user's division/department is in distribution list

### Step 4: Enforce Purpose
- In action modals (Minute, Treat, etc.), check if user is in distribution with purpose="information"
- Block actions for "For Information" recipients
- Allow comments for "For Comment" recipients

