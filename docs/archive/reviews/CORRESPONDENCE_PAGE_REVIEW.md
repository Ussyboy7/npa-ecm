# Correspondence Detail Page - Comprehensive Review

## Current Page Structure

### Layout Overview
The correspondence detail page has three main sections arranged horizontally:
1. **Original Document** (Left) - Shows document preview, attachments, linked documents
2. **Minute Thread (360° View)** (Center) - Shows all minutes, parallel routing status
3. **Actions** (Right) - Action buttons, routing chain, correspondence metadata

### Section 1: Original Document
**Current Implementation:**
- Shows first attachment preview (PDF, images, etc.)
- Lists all attachments with search/filter
- Shows linked DMS documents
- Upload/link buttons for adding documents

**Issues:**
- ✅ Good: Document preview works
- ✅ Good: Search/filter for attachments
- ⚠️ **Issue**: No clear indication of which document is the "original" vs "attachments"
- ⚠️ **Issue**: Linked documents section could be more prominent

### Section 2: Minute Thread (360° View)
**Current Implementation:**
- Shows parallel routing status cards at top
- Lists all minutes chronologically
- Shows sender, action type, direction, purpose
- Visual indicators for recalled minutes
- Edit/Recall/Add Instruction buttons

**Issues:**
- ✅ Good: Visual timeline with connectors
- ✅ Good: Parallel routing status display
- ⚠️ **Issue**: Parallel branch completion status is hardcoded to `false` (line 97 in ParallelBranchStatus.tsx)
- ⚠️ **Issue**: No clear grouping of parallel branches vs sequential minutes
- ⚠️ **Issue**: Can't easily see which minutes are part of the same parallel group

### Section 3: Actions
**Current Implementation:**
- Action buttons (Minute & Forward, Review & Approve, Treat & Respond, etc.)
- Routing Chain visualization
- Correspondence metadata (status, priority, dates)
- Distribution (CC) list

**Issues:**
- ✅ Good: Clear action buttons
- ✅ Good: Routing chain shows current state
- ⚠️ **Issue**: Routing chain doesn't clearly show parallel branches
- ⚠️ **Issue**: Actions disabled logic might be too restrictive

---

## Routing Logic Analysis

### Current Routing Flow

#### 1. **Single Office Routing (Sequential)**
**How it works:**
- User selects a recipient (by user or office)
- System determines recipient's office:
  - If office specified → use that office
  - If user specified → find user's primary office
- Minute created with:
  - `user` = sender
  - `to_office` = recipient's office
  - `to_user` = recipient user (if specified, for parallel routing)
- Correspondence updated:
  - `current_office` = `to_office`
  - `current_approver` = office head/principal (if found)

**Backend Logic (views.py:817-853):**
```python
# If forwarding/minuting, try to determine recipient from to_office
if minute.action_type in (Minute.ActionType.FORWARD, Minute.ActionType.MINUTE) and minute.to_office:
    # Try to find the principal/head of the to_office
    office_head = OfficeMembership.objects.filter(
        office=minute.to_office,
        is_active=True,
        assignment_role__in=['principal', 'acting']
    ).select_related('user').first()
    
    if office_head:
        correspondence.current_approver = office_head.user
```

**Problem Identified:**
- ⚠️ **CRITICAL**: If user is not in the office, system still routes to office head
- ⚠️ **ISSUE**: If office has no head/principal, `current_approver` might not be set
- ⚠️ **ISSUE**: If user specified but not in that office, routing goes to wrong person

#### 2. **Multiple Office Routing (Parallel)**
**How it works:**
- Executive (MD/ED/GM/AGM) selects multiple recipients
- System creates multiple minutes, one per recipient
- Each minute has:
  - `user` = sender (executive)
  - `to_office` = recipient's primary office
  - `to_user` = specific recipient user
  - `routing_type` = "parallel"
  - `is_parallel_branch` = True
  - `parallel_group_id` = same for all branches

**Backend Logic (views.py:1140-1182):**
```python
# Determine office
office = None
if office_id:
    office = Office.objects.get(id=office_id)
    
# If no office specified, try to get recipient's primary office
if not office:
    office_membership = OfficeMembership.objects.filter(
        user=recipient_user,
        is_active=True,
        is_primary=True
    ).select_related('office').first()
    if office_membership:
        office = office_membership.office
```

**Problem Identified:**
- ✅ **FIXED**: Now uses `to_user` to track specific recipient
- ⚠️ **ISSUE**: If recipient has no primary office, `to_office` is None
- ⚠️ **ISSUE**: Parallel branch completion check doesn't use `to_user` (uses office head lookup)

---

## Critical Issues

### Issue 1: User Not in Office
**Scenario:** User sends minute to Office A, but the intended recipient is not a member of Office A.

**Current Behavior:**
1. Minute created with `to_office` = Office A
2. System finds Office A's head/principal
3. Correspondence routed to Office A's head (WRONG PERSON!)
4. Intended recipient never receives it

**Expected Behavior:**
- If `to_user` is specified, route directly to that user
- If user is not in the specified office, show warning or error
- If user has no office, allow routing but show warning

**Recommendation:**
```python
# In perform_create:
if minute.to_user:
    # Direct user routing - use to_user, not office head
    correspondence.current_approver = minute.to_user
    if minute.to_office:
        correspondence.current_office = minute.to_office
    else:
        # Get user's primary office
        user_office = get_user_primary_office(minute.to_user)
        correspondence.current_office = user_office
elif minute.to_office:
    # Office routing - find office head
    office_head = find_office_head(minute.to_office)
    if office_head:
        correspondence.current_approver = office_head
    else:
        # No office head - set to None or show error
        raise ValidationError("Office has no active head/principal")
```

### Issue 2: User vs Office Routing Confusion
**Current State:**
- Frontend allows selecting by user OR office
- Backend always routes to office (finds office head)
- `to_user` field exists but not always used

**User's Requirement:**
> "when sending we should be sending either by user or by office but whichever way it reflects as the office the user is in"

**Interpretation:**
- If sending **by user**: Route to that specific user, but display their office
- If sending **by office**: Route to office head, display the office
- In both cases, the office should be reflected/displayed

**Recommendation:**
1. **Always set `to_user`** when user is specified
2. **Always set `to_office`** to user's primary office (if sending by user) or selected office (if sending by office)
3. **Display logic**: Show user name + their office name
4. **Routing logic**: Use `to_user` if set, otherwise use office head

### Issue 3: Parallel Branch Completion
**Current Implementation (ParallelBranchStatus.tsx:97):**
```typescript
const isCompleted = false; // TODO: Implement proper branch completion check
```

**Backend Logic (models.py:406-451):**
- Uses `to_office` to find office head
- Checks if office head created subsequent minute
- **Doesn't use `to_user` field!**

**Problem:**
- If parallel route has `to_user` set, completion check looks for office head's minutes, not the specific user's minutes
- This causes incorrect completion status

**Recommendation:**
```python
# In ParallelRoutingGroup.check_and_update_completion():
for minute in parallel_minutes:
    # Use to_user if set, otherwise find office head
    recipient_user_id = None
    if minute.to_user_id:
        recipient_user_id = minute.to_user_id
    elif minute.to_office:
        office_head = find_office_head(minute.to_office)
        recipient_user_id = office_head.user_id if office_head else None
    
    if recipient_user_id:
        recipient_acted = Minute.objects.filter(
            correspondence=self.correspondence,
            user_id=recipient_user_id,
            timestamp__gt=minute.timestamp
        ).exists()
        if recipient_acted:
            completed_branch_ids.add(minute.id)
```

---

## Recommendations

### 1. **Clarify Routing Model**
**Proposed Logic:**
```
IF to_user is set:
    - Route to that specific user
    - Set to_office to user's primary office (for display/context)
    - Set current_approver = to_user
ELSE IF to_office is set:
    - Find office head/principal
    - Route to office head
    - Set current_approver = office head
ELSE:
    - Error: Must specify either user or office
```

### 2. **Update Frontend Display**
- Show recipient as: "User Name (Office Name)"
- For parallel branches: Show "User Name" with office badge
- For sequential routing: Show office name with user badge if to_user is set

### 3. **Fix Parallel Branch Completion**
- Use `to_user` if set, otherwise fallback to office head
- Update `ParallelBranchStatus` to fetch completion status from backend
- Show real-time completion status

### 4. **Improve Page Organization**
- **Option A**: Keep current 3-column layout but improve grouping
- **Option B**: Make sections collapsible/expandable
- **Option C**: Add tabs for different views (Timeline, Documents, Actions)

### 5. **Routing Chain Enhancement**
- Show parallel branches as separate paths
- Use visual indicators (colors, icons) for parallel vs sequential
- Show merge points when parallel branches complete

### 6. **Minute Thread Improvements**
- Group parallel branches visually (indent, border, background)
- Show parallel group info (merge strategy, completion status)
- Add filter: "Show only parallel branches", "Show only sequential"

### 7. **Validation & Warnings**
- Warn if routing to user not in specified office
- Warn if office has no active head
- Validate that user has primary office before routing

---

## Implementation Priority

### Critical (Must Fix)
1. ✅ Fix parallel routing to use `to_user` (DONE - migration created)
2. ⚠️ Fix routing logic to use `to_user` when set (not just office head)
3. ⚠️ Fix parallel branch completion check to use `to_user`
4. ⚠️ Add validation for user-not-in-office scenario

### High Priority
5. Update frontend to always show user + office
6. Fix ParallelBranchStatus completion status
7. Improve routing chain to show parallel branches

### Medium Priority
8. Add warnings for edge cases (no office head, user not in office)
9. Improve minute thread grouping/visualization
10. Add filters to minute thread

### Low Priority
11. Make sections collapsible
12. Add tabs for different views
13. Enhanced tooltips/explanations

---

## Routing Hierarchy Clarified ✅

### Office-Level Routing
**Downward:**
- **MD → AGM**: MD can send to AGM offices directly
- **MD → GM → AGM**: Through division hierarchy
- **MD → ED → GM → AGM**: Through directorate hierarchy

**Upward:**
- **AGM → GM → ED → MD**: If offices are in different directorates
- **AGM → GM → MD**: If offices are in same directorate (skips ED)
- **Routing path depends on directorate structure**: System determines path based on which directorates the offices belong to

### Lateral/Inter-Department Routing ✅
**Peer-to-Peer (Same Tier):**
- **AGM → AGM**: Different departments, divisions, or directorates
  - Example: AGM SA&DM → AGM HI&S (different departments)
  - Example: AGM SA&DM → AGM Procurement (different departments, divisions, or directorates)
- **GM → GM**: Different divisions or directorates
  - Example: GM ICT → GM Servicom (different divisions)
- Requires `allow_lateral_routing = true` on sender's office
- Works across any organizational boundaries (department, division, directorate)

**Cross-Tier:**
- **AGM → GM**: Different departments, divisions, or directorates
  - Example: AGM SA&DM → GM Procurement (can be different departments, divisions, or directorates)
- Requires `allow_lateral_routing = true` on sender's office

### User-Level Routing
- **AGM → Staff**: AGMs can send directly to staff members (minute down to user)
- **Staff → AGM**: Staff can send upward to their AGM
- This is **user-to-user routing**, not office-to-office
- Used for department-level communication

### Key Implementation Points
1. **Office-level routing**: Always validates user is in that office
2. **Lateral routing**: Supports peer-to-peer and cross-tier routing across departments/divisions
3. **Lateral routing permission**: Controlled by `Office.allow_lateral_routing` (default: `true`)
4. **User-level routing**: Direct routing between users (AGM ↔ Staff)
5. **Hierarchy matters**: Routing path depends on directorate structure
6. **Display**: Always shows "User Name (Office Name)" regardless of routing type

### Key Points
1. **Office-level routing**: Always validates user is in that office
2. **User-level routing**: Direct routing between users (AGM ↔ Staff)
3. **Hierarchy matters**: Routing path depends on directorate structure

---

## Next Steps

1. **Review this document** and confirm understanding
2. **Answer clarification questions** above
3. **Prioritize fixes** based on business needs
4. **Implement fixes** in order of priority
5. **Test scenarios:**
   - Single user routing
   - Single office routing
   - Parallel routing to 2+ users
   - User not in office scenario
   - Office with no head scenario

