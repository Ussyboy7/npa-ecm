# Parallel Routing & Enhanced Minute Management - Feature Discussion

## Overview
This document discusses the possibility of implementing advanced routing and minute management features that would allow:
1. Recalling/editing minutes sent
2. Adding additional minutes or instructions
3. Parallel routing to multiple departments/divisions/directorates
4. Different purposes (for information vs for action)
5. Continuing workflow while parallel branches are active

---

## 1. Recalling/Editing Minutes Sent

### Current State
- Minutes are immutable once created
- No ability to recall or edit after submission
- Once a minute is sent, it's part of the permanent audit trail

### Proposed Feature: Minute Recall/Edit

**Use Cases:**
- Typo correction
- Adding clarification
- Withdrawing a minute if sent in error
- Updating instructions before recipient acts

**Implementation Considerations:**

#### Option A: Soft Edit (Recommended) ✅ APPROVED
- Allow editing within **30 minutes OR if not opened/acted upon** (whichever comes first)
- If minute is opened/acted upon, edit window closes immediately
- After window expires, only "addendum" minutes allowed
- Original minute preserved with edit history
- Recipients notified of changes if not yet acted upon

**Backend Changes:**
```python
class Minute(models.Model):
    # ... existing fields
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    edit_window_expires_at = models.DateTimeField(null=True, blank=True)  # 30 min from creation
    is_opened = models.BooleanField(default=False)  # Track if recipient opened
    opened_at = models.DateTimeField(null=True, blank=True)
    original_minute_text = models.TextField(null=True, blank=True)  # Store original
    edit_history = models.JSONField(default=list)  # Track all edits
    
    def can_be_edited(self):
        """Check if minute can still be edited"""
        if self.is_opened:
            return False  # Once opened, cannot edit
        if self.edit_window_expires_at and timezone.now() > self.edit_window_expires_at:
            return False  # Window expired
        return True
```

**Frontend Changes:**
- Add "Edit" button on recent minutes (if within window)
- Show edit indicator badge
- Display edit history in minute detail modal

#### Option B: Addendum Only
- Never allow editing of original minute
- Always create a new "addendum" or "correction" minute
- Link addendum to original minute
- Clearer audit trail, but more verbose

**Recommendation:** Option A (Soft Edit) with strict time window and audit trail

---

## 2. Adding Additional Minutes/Instructions

### Current State
- Users can create minutes sequentially
- Each minute follows the previous one in the chain

### Proposed Feature: Additional Instructions

**Use Cases:**
- Adding supplementary information
- Providing clarifications
- Updating instructions based on new information
- Adding context without routing

**Implementation:**

**Backend:**
```python
class Minute(models.Model):
    # ... existing fields
    minute_type = models.CharField(
        max_length=20,
        choices=[
            ('routing', 'Routing Minute'),  # Current behavior
            ('instruction', 'Additional Instruction'),
            ('clarification', 'Clarification'),
            ('addendum', 'Addendum'),
        ],
        default='routing'
    )
    is_additional = models.BooleanField(default=False)
    relates_to_minute = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='related_minutes'
    )
```

**Frontend:**
- Add "Add Instruction" button in minute thread
- Modal to add supplementary minute without routing
- Visual distinction (different icon/color) for additional minutes
- Show relationship to original minute

**Recommendation:** Implement with clear visual distinction and optional linking to original minute

---

## 3. Parallel Routing to Multiple Recipients

### Current State
- Routing is sequential (one recipient at a time)
- Distribution (CC) is for information only, not action
- Cannot route to multiple departments simultaneously for action

### Proposed Feature: Parallel Routing

**Use Cases:**
- Route to Finance AND Legal simultaneously for their respective inputs
- Send to multiple divisions for parallel processing
- Different departments work on different aspects simultaneously
- Main workflow continues while parallel branches process

**Implementation Considerations:**

#### Architecture Design

**Backend Model Changes:**
```python
class Minute(models.Model):
    # ... existing fields
    routing_type = models.CharField(
        max_length=20,
        choices=[
            ('sequential', 'Sequential'),  # Current
            ('parallel', 'Parallel'),
            ('broadcast', 'Broadcast'),  # All recipients act independently
        ],
        default='sequential'
    )
    parallel_group_id = models.UUIDField(null=True, blank=True)  # Group parallel minutes
    is_parallel_branch = models.BooleanField(default=False)
    parent_minute = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='parallel_branches'
    )
    merge_strategy = models.CharField(
        max_length=20,
        choices=[
            ('all', 'Wait for all'),  # All must complete (default for critical)
            ('independent', 'Independent'),  # Work independently, don't block each other
            ('any', 'Any one completes'),  # First to complete
            ('majority', 'Majority completes'),  # Majority must complete
        ],
        default='all'
    )

class ParallelRoutingGroup(models.Model):
    """Groups minutes that are part of a parallel routing"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    correspondence = models.ForeignKey(Correspondence, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    merge_strategy = models.CharField(max_length=20, default='all')
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
```

**Workflow Logic:**
1. User selects "Route to Multiple" option
2. Select multiple recipients (users, departments, divisions, directorates)
3. Choose purpose for each:
   - **For Action**: Recipient must act (minute, approve, treat)
   - **For Information**: Recipient is informed but not required to act
   - **For Comment**: Recipient provides input but doesn't block workflow
4. Set merge strategy (when to continue main workflow)
5. Create parallel minute branches
6. Each branch processes independently
7. Main workflow continues based on merge strategy

**Frontend UI:**
- New "Route to Multiple" button in Actions panel
- Modal with:
  - Multi-select for recipients
  - Purpose selector per recipient (Action/Information/Comment)
  - Merge strategy selector
  - Preview of parallel branches
- Visual representation in routing chain:
  - Show parallel branches as split paths
  - Indicate which branches are complete/pending
  - Show merge point

**Visual Design:**
```
Main Workflow
    │
    ├─→ Finance (For Action) ──┐
    │                           │
    ├─→ Legal (For Action) ─────┼─→ Merge Point ─→ Continue
    │                           │
    └─→ HR (For Information) ───┘
```

**Recommendation:** Implement with clear visual indicators and flexible merge strategies

---

## 4. Different Purposes (For Information vs For Action)

### Current State
- Distribution (CC) exists but is separate from routing
- All routing minutes are implicitly "for action"
- No distinction in the minute itself

### Proposed Feature: Purpose-Based Routing

**Implementation:**

**Backend:**
```python
class Minute(models.Model):
    # ... existing fields
    purpose = models.CharField(
        max_length=20,
        choices=[
            ('action', 'For Action'),  # Recipient must act
            ('information', 'For Information'),  # Informational only
            ('comment', 'For Comment'),  # Provide input
            ('approval', 'For Approval'),  # Requires approval
        ],
        default='action'
    )
    requires_response = models.BooleanField(default=True)  # For action/approval
    response_deadline = models.DateTimeField(null=True, blank=True)
```

**Frontend:**
- Purpose selector in minute modal
- Visual badges/icons in minute thread:
  - 🎯 For Action (red/orange)
  - ℹ️ For Information (blue)
  - 💬 For Comment (yellow)
  - ✅ For Approval (green)
- Filter minutes by purpose
- Different notification urgency based on purpose

**Workflow Impact:** ✅ RESOLVED
- **For Action**: Blocks workflow until response, recipient can act
- **For Information**: Doesn't block, just notifies, **recipient CANNOT act** (view-only)
- **For Comment**: Optional response, doesn't block, recipient can provide input
- **For Approval**: Blocks until approved/rejected, recipient must approve/reject

**Recommendation:** Implement with clear visual distinction and workflow rules

---

## 5. Continuing Workflow While Parallel Branches Are Active

### Current State
- Workflow is linear and sequential
- Must wait for current approver before proceeding

### Proposed Feature: Parallel Workflow Continuation

**Use Cases:**
- Main workflow continues while Finance and Legal work in parallel
- Different departments handle different aspects simultaneously
- Coordinator can take other actions while waiting for parallel responses

**Implementation:**

**Workflow States:**
```python
class Correspondence(models.Model):
    # ... existing fields
    workflow_state = models.CharField(
        max_length=20,
        choices=[
            ('sequential', 'Sequential Processing'),
            ('parallel', 'Parallel Processing'),
            ('merged', 'Branches Merged'),
            ('waiting_merge', 'Waiting for Parallel Branches'),
        ],
        default='sequential'
    )
    active_parallel_branches = models.IntegerField(default=0)
    completed_parallel_branches = models.IntegerField(default=0)
```

**Logic:** ✅ RESOLVED
1. When parallel routing is created:
   - **Merge strategy determines behavior:**
     - **"Wait for All"**: Main workflow pauses until ALL branches complete (default for critical workflows)
     - **"Independent"**: Branches work independently, main workflow can continue, branches can collaborate/get data from others (for cases like payment processing)
     - **"Any One"**: Main workflow continues when first branch completes
     - **"Majority"**: Main workflow continues when majority complete
   - Parallel branches process independently
   - Track completion status of each branch
2. When merge point is reached:
   - Check if merge strategy conditions are met
   - If yes, continue main workflow
   - If no, wait (or proceed based on strategy)
3. Coordinator (executive) can:
   - Take other actions (delegate, reassign, etc.)
   - Add minutes/instructions
   - Monitor parallel branch progress
   - Manually merge if needed
   - Change merge strategy if workflow needs adjustment

**Frontend:**
- Dashboard showing parallel branch status
- Progress indicators for each branch
- Ability to take actions while branches are active
- Visual merge point in routing chain

**Recommendation:** Implement with clear status indicators and flexible merge control

---

## Implementation Priority & Phases

### Phase 1: Foundation (High Priority)
1. ✅ Purpose-based routing (For Action/Information/Comment)
2. ✅ Additional minutes/instructions (addendum support)
3. ✅ Visual distinction in UI

### Phase 2: Parallel Routing (Medium Priority)
1. ⚠️ Parallel routing to multiple recipients
2. ⚠️ Merge strategies
3. ⚠️ Parallel branch tracking

### Phase 3: Advanced Features (Lower Priority)
1. ⚠️ Minute recall/edit (with time window)
2. ⚠️ Workflow continuation during parallel processing
3. ⚠️ Advanced merge controls

---

## Technical Considerations

### Database Impact
- Additional fields on `Minute` model
- New `ParallelRoutingGroup` model
- Indexes on `parallel_group_id`, `parent_minute`
- Migration strategy for existing data

### Performance
- Efficient queries for parallel branch status
- Real-time updates for branch completion
- Notification system for parallel routing

### Security & Permissions ✅ RESOLVED
- **Who can create parallel routes?** → Executives only (MD, ED, GM, AGM)
  - Enforced via grade level check: `gradeLevel in ['MDCS', 'EDCS', 'GMCS', 'AGMCS']`
  - Or system role check: `systemRole in ['Managing Director', 'Executive Director', 'General Manager', 'Assistant General Manager']`
- **Who can recall/edit minutes?** → Original sender (within 30 min window and if not opened/acted upon)
- **Who can merge branches?** → Coordinator or original sender (executive who created parallel route)

### Audit Trail
- Track all parallel routing decisions
- Log minute edits/recalls
- Record merge points and strategies

### User Experience
- Clear visual representation of parallel flows
- Intuitive UI for creating parallel routes
- Easy monitoring of branch status
- Simple merge process

---

## Questions for Discussion - RESOLVED

1. **Recall/Edit Window**: ✅ **30 minutes OR if not opened/acted upon** - whichever condition is met first
   - If minute is opened/acted upon, edit window closes immediately
   - If 30 minutes pass without action, edit window closes
   - Best approach: Check both conditions - allow edit if within 30 min AND not yet opened/acted upon

2. **Parallel Routing Permissions**: ✅ **Executives only** (MD, ED, GM, AGM)
   - These are the roles that typically give directives requiring parallel action
   - Can be enforced via grade level or system role check

3. **Merge Strategy Default**: ✅ **Elaborated below**
   
   **Merge Strategy Options:**
   - **"Wait for All"** (Default for critical workflows):
     - Main workflow pauses until ALL parallel branches complete
     - Use case: All departments must finish before proceeding (e.g., contract approval needs Legal + Finance + Audit)
     - Example: MD routes to Finance, Audit, Legal - workflow continues only after all three complete
   
   - **"Independent"** (For parallel processing):
     - Branches work completely independently
     - Main workflow can continue immediately
     - Branches can collaborate/get data from others but don't block each other
     - Use case: Payment processing where Finance, Audit, Legal work on their parts simultaneously
     - Example: MD routes payment to Finance (process payment), Audit (verify), Legal (review contract) - all work independently, can share data, but don't wait for each other
   
   - **"Any One"**:
     - Main workflow continues as soon as ONE branch completes
     - Use case: First available resource can proceed
     - Example: Multiple departments can handle a task, workflow continues when first one completes
   
   - **"Majority"**:
     - Main workflow continues when majority (e.g., 2 of 3) branches complete
     - Use case: Consensus-based decisions
     - Example: 3 departments review, workflow continues when 2 approve
   
   **Recommendation**: 
   - Default to **"Wait for All"** for critical workflows
   - Allow **"Independent"** mode for cases like payment processing where departments work in parallel
   - Executive can select strategy when creating parallel route

4. **Purpose Enforcement**: ✅ **Yes - "For Information" recipients should be blocked from acting**
   - "For Information" = view-only, no actions permitted
   - "For Action" = must act (minute, approve, treat)
   - "For Comment" = can provide input but doesn't block workflow
   - UI should disable action buttons for "For Information" recipients

5. **Workflow Continuation**: ✅ **Depends on workflow type**
   - **Independent workflows** (e.g., payment processing): Finance, Audit, Legal work independently, can collaborate, get data from others, but don't block each other
   - **Dependent workflows**: Some branches may need to wait for others
   - **Solution**: Allow workflow creator to specify merge strategy per parallel routing
   - Default can be "Wait for All" but allow "Independent" mode for cases like payment processing

6. **Backward Compatibility**: How to handle existing sequential-only workflows?
   - Existing workflows remain sequential (default behavior)
   - New parallel routing is opt-in feature
   - No migration needed for existing data

---

## Recommendations

1. **Start with Purpose-Based Routing**: Simplest to implement, high value
2. **Add Additional Minutes Support**: Natural extension, improves flexibility
3. **Implement Parallel Routing Carefully**: Complex feature, needs thorough testing
4. **Consider Recall/Edit Later**: Lower priority, can be added incrementally
5. **Maintain Audit Trail**: All changes must be logged for compliance

---

## Next Steps

1. Review and discuss this document
2. Prioritize features based on business needs
3. Design detailed technical specifications
4. Create implementation plan with phases
5. Begin with Phase 1 features

---

*Document created: 2025-01-18*
*Status: Requirements Resolved - Ready for Implementation Planning*
*Last updated: 2025-01-18*

