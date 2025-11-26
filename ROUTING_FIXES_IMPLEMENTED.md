# Routing Logic Fixes - Implementation Summary

## Understanding Confirmed

### 1. User vs Office Routing
**Your Clarification:**
- **Office-level routing** (MD → GM ICT): When MD sends to GM ICT office, they search for the officer's name and select them. The correspondence is for the **OFFICE**, not the user. System should validate that the user is in that office.
- **User-level routing** (AGM → Department staff): AGMs can send directly to users (minute down to user). This is for lower-level routing.

**Implementation:**
- ✅ Always validate user is in office when office is specified
- ✅ Set `to_user` when user is selected (for tracking)
- ✅ Set `to_office` to user's office (for display/context)
- ✅ Display: "User Name (Office Name)"

### 2. Office Head Fallback
**Your Clarification:**
- Even if no office head, route to that office
- Show that there's no head
- Next in hierarchy (acting office holder) should be alerted
- There's always someone acting

**Implementation:**
- ✅ Hierarchy: Principal → Acting → Highest Grade Staff
- ✅ Always finds someone to route to
- ✅ Logs when using acting head

### 3. Parallel Routing Display
**Your Response:** Not sure which is best

**Recommendation Implemented:**
- Show parallel branches in minute thread with visual grouping
- Show parallel status card at top of minute thread
- Keep routing chain simple (shows current state)

### 4. Completion Status
**Your Clarification:**
- Branch complete when recipient completes their action (creates a minute/response)

**Implementation:**
- ✅ Backend checks if `to_user` (or office head) created subsequent minute
- ✅ Frontend shows completion based on parallel group status

---

## Changes Implemented

### Backend Changes

#### 1. **New Helper Method: `_find_office_recipient()`**
**Location:** `correspondence/views.py:817-870`

**Logic:**
```python
Priority:
1. If preferred_user specified → Validate they're in office → Use them
2. If no preferred_user → Find principal
3. If no principal → Find acting head
4. If no acting → Find highest grade staff
```

**Features:**
- ✅ Validates user is in office (raises error if not)
- ✅ Falls back through hierarchy
- ✅ Returns (user, is_acting) tuple

#### 2. **Updated `perform_create()` Method**
**Location:** `correspondence/views.py:817-870`

**Changes:**
- ✅ Uses `_find_office_recipient()` to find recipient
- ✅ Validates `to_user` is in `to_office` if both are set
- ✅ Sets `current_approver` to `to_user` if set, otherwise office head
- ✅ Always sets `to_office` for display/context

#### 3. **Updated Parallel Routing**
**Location:** `correspondence/views.py:1217-1284`

**Changes:**
- ✅ Validates recipient is in office before creating minute
- ✅ Always sets `to_user` for parallel routing
- ✅ Sends notification to specific recipient (not office head)

#### 4. **Fixed Parallel Branch Completion**
**Location:** `correspondence/models.py:406-451`

**Changes:**
- ✅ Uses `to_user` if set (priority 1)
- ✅ Falls back to office head lookup if `to_user` not set
- ✅ Checks if recipient created subsequent minute (completed action)

### Frontend Changes

#### 1. **MinuteModal Validation**
**Location:** `components/correspondence/MinuteModal.tsx:693-697`

**Changes:**
- ✅ Validates user is in office before submitting
- ✅ Shows error toast if user not in office
- ✅ Always sends `to_user_id` when user is selected

#### 2. **Display Updates**
**Location:** `app/correspondence/[id]/page.tsx:1573-1575`

**Changes:**
- ✅ Shows office name next to user info: "Role • Grade • Office"
- ✅ Parallel branches show: "User Name • Office Name"

#### 3. **ParallelBranchStatus**
**Location:** `components/correspondence/ParallelBranchStatus.tsx:91-130`

**Changes:**
- ✅ Shows completion status based on parallel group progress
- ✅ Displays "User Name • Office Name" format
- ✅ Shows purpose (For Action, For Information, etc.)

---

## How It Works Now

### Scenario 1: MD Sends to GM ICT Office
1. MD searches for "GM ICT" officer name
2. Selects the user
3. System validates user is in GM ICT office
4. If valid: Creates minute with `to_user` = selected user, `to_office` = GM ICT office
5. If invalid: Shows error "User is not a member of GM ICT office"
6. Display: "GM Name (GM ICT Office)"

### Scenario 2: Office with No Head
1. System tries to find principal → Not found
2. System tries to find acting head → Not found
3. System finds highest grade staff member
4. Routes to that person
5. Logs: "Using acting/highest grade staff for office X"

### Scenario 3: Parallel Routing
1. Executive selects 2+ recipients
2. For each recipient:
   - Validates user is in their office
   - Creates minute with `to_user` = recipient, `to_office` = their office
3. All minutes share same `parallel_group_id`
4. Display shows each branch with recipient name + office
5. Completion: When recipient creates a minute, their branch is marked complete

### Scenario 4: User Not in Office
1. User selects recipient not in specified office
2. Frontend validation catches it → Shows error
3. Backend also validates → Raises ValidationError if frontend missed it
4. User must select correct user or route to office directly

---

## Testing Checklist

- [ ] MD sends to GM ICT office (user selection, validates in office)
- [ ] AGM sends directly to department staff (user-level routing)
- [ ] Office with no head (routes to acting/highest grade)
- [ ] Parallel routing to 2+ users (each in different offices)
- [ ] User not in office (shows error)
- [ ] Parallel branch completion (when recipient acts)
- [ ] Display shows "User Name • Office Name"

---

## Next Steps

1. **Run Migration:** `python manage.py migrate correspondence` (for `to_user` field)
2. **Test Scenarios:** Use the checklist above
3. **Review Display:** Check if "User Name • Office Name" format is clear
4. **Parallel Display:** Decide if routing chain should show parallel branches separately

---

## Questions for You

1. **Parallel Routing Display in Routing Chain:**
   - Should parallel branches be shown as separate paths?
   - Or keep current simple view (shows current approver only)?

2. **User-Level Routing (AGM → Staff):**
   - Should this bypass office validation?
   - Or still validate user is in their primary office?

3. **Completion Status:**
   - Is "recipient creates any minute" the right completion criteria?
   - Or should it be a specific action (e.g., "Treat & Respond")?

