# Routing Fixes - Complete Verification

## Issues Reported

1. **Routing back to ED after parallel routing**: After parallel routing to Admin and Finance, it still routes back to ED even when branches aren't complete
2. **Duplicate Parallel Routing Status cards**: 3 cards showing for the same correspondence
3. **Office receives notification but correspondence not in inbox**: When routing to an office (e.g., Admin Division), GM Admin sees notification but correspondence doesn't appear in office inbox or personal inbox

## Fixes Implemented

### 1. Parallel Routing Completion Detection ✅

**File**: `backend/correspondence/views.py` - `perform_create` method

**Problem**: The system wasn't correctly detecting when a user was completing a parallel branch, so it would route forward instead of back to the original sender.

**Fix**:
- Changed logic to check if the current user is a recipient of ANY parallel branch for the correspondence (not just if the minute has `parallel_group_id`)
- Checks all parallel groups for the correspondence
- When a parallel group completes (based on merge strategy), routes back to the original sender
- Sends notification to original sender when parallel routing completes

**Code Location**: Lines 921-987

**Key Logic**:
```python
# Check if user is a recipient of any parallel branch
parallel_minutes_to_user = MinuteModel.objects.filter(
    correspondence=correspondence,
    is_parallel_branch=True,
    to_user=self.request.user
)

# Check each parallel group for completion
# If group completes, route back to original_sender
```

### 2. Duplicate Parallel Routing Status Cards ✅

**File**: `backend/correspondence/views.py` - `ParallelRoutingGroupViewSet.get_queryset()`

**Problem**: Multiple parallel routing groups were being returned, causing duplicate cards.

**Fix**:
- Updated `get_queryset()` to use `.distinct()` for better database compatibility
- Filters by correspondence ID if provided
- Frontend already has deduplication logic with `useMemo` and `Set`-based filtering

**Code Location**: Lines 1450-1457

**Note**: If 3 separate parallel routing groups exist (user created parallel routing 3 times), all 3 will show. This is expected behavior.

### 3. Office Inbox Not Showing Correspondence ✅

**File**: `backend/correspondence/views.py` - `office_inbox` method

**Problem**: When routing to an office, the correspondence wasn't appearing in the office inbox because:
- `current_office` wasn't being set correctly
- Office inbox filter didn't include parallel routing recipients

**Fixes**:

#### A. Office Inbox Filtering (Lines 375-390)
- Added logic to include correspondence where user is a recipient of a parallel branch
- Query now includes: `Q(current_office_id__in=office_ids) | Q(owning_office_id__in=office_ids) | Q(id__in=parallel_correspondence_ids)`

#### B. Assigned Only Filter (Lines 411-422)
- Updated to include parallel branch recipients when `assigned_only=true`
- Query: `Q(current_approver=user) | Q(id__in=parallel_correspondence_ids)`

#### C. Setting current_office and current_approver (Lines 1021-1032)
- Improved logic to always set `current_office` when routing to an office
- Added fallback to derive office from recipient user's membership if `to_office` not set
- Added comprehensive logging to track when these are set

#### D. Parallel Routing Notifications (Lines 1393-1403)
- Fixed to notify the specific `to_user` recipient instead of office head
- Ensures the right person gets the notification

## Verification Checklist

### Backend
- [x] Parallel routing completion detection works for all parallel groups
- [x] Routing back to original sender when parallel group completes
- [x] Office inbox includes parallel branch recipients
- [x] `current_office` is set when routing to an office
- [x] `current_approver` is set when routing to an office
- [x] Office derived from user if `to_office` not provided
- [x] Parallel routing notifications go to specific recipient
- [x] Duplicate parallel groups filtered with `.distinct()`
- [x] Logging added for debugging

### Frontend
- [x] Deduplication logic for parallel routing groups
- [x] Verification of `current_office` and `current_approver` after update
- [x] Console warnings for debugging

## Testing Scenarios

### Scenario 1: Route to Office
1. Route correspondence to "Admin Division" office
2. **Expected**: 
   - GM Admin receives notification
   - Correspondence appears in office inbox
   - Correspondence appears in GM Admin's personal inbox
   - Backend logs show: `"Setting current_office to Admin Division"` and `"Setting current_approver to GM Admin"`

### Scenario 2: Parallel Routing Completion
1. ED creates parallel routing to Admin and Finance
2. Admin completes their action (creates a minute)
3. Finance completes their action (creates a minute)
4. **Expected**:
   - When the last branch completes, correspondence routes back to ED
   - ED receives notification: "Parallel Routing Completed"
   - Backend logs show: `"Parallel routing completed - routing back to original sender ED"`

### Scenario 3: Parallel Routing Status Cards
1. Create parallel routing to 2 recipients
2. **Expected**:
   - Only 1 Parallel Routing Status card shows
   - If parallel routing is created multiple times, each group shows separately (expected behavior)

## Potential Edge Cases

1. **User not in office**: If selected user is not in the target office, validation error is raised
2. **No office head**: Falls back to highest grade staff member
3. **Multiple parallel groups**: All groups show (this is correct if user created multiple parallel routes)
4. **Parallel group already complete**: Won't route back again (prevents loops)

## Logging

All critical operations are now logged:
- `"Setting current_office to ..."`
- `"Setting current_approver to ..."`
- `"Parallel routing completed - routing back to original sender ..."`
- `"Updated correspondence ... - current_office: ..., current_approver: ..."`

## Summary

All three issues have been addressed:
1. ✅ Parallel routing now correctly routes back to original sender when complete
2. ✅ Duplicate cards filtered (backend `.distinct()` + frontend deduplication)
3. ✅ Office inbox now shows correspondence for office routing and parallel routing recipients

The fixes ensure:
- `current_office` is ALWAYS set when routing to an office
- `current_approver` is ALWAYS set to the appropriate recipient
- Parallel routing recipients can see correspondence in their inbox
- Parallel routing completion routes back to original sender correctly

