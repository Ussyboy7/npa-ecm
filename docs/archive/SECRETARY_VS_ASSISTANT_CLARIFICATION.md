# Secretary vs Assistant (TA/PA) Role Clarification

## Overview

The NPA ECM system has two distinct but related concepts for supporting executives:
1. **Secretary** - A functional role assigned to users
2. **Assistant (TA/PA)** - A delegation-based assignment through the Delegation model

This document clarifies the differences, use cases, and implementation details.

---

## Key Differences

| Aspect | Secretary | Assistant (TA/PA) |
|--------|-----------|-------------------|
| **Assignment Method** | Role-based (`systemRole: "Secretary"`) | Delegation-based (`Delegation` model) |
| **Scope** | Office-level support | Personal support to specific executive |
| **Relationship** | Implicit (office-based) | Explicit (principal-assistant relationship) |
| **Permissions** | Fixed role permissions | Configurable per delegation |
| **Tracking** | `acted_by_secretary` flag | `acted_by_assistant` + `assistant_type` (TA/PA) |
| **Use Case** | General office secretariat | Personal assistant to specific executive |

---

## Secretary Role

### Definition
**Secretary** is a **functional role** (`systemRole`) assigned to users who provide office-level support to executives.

### Characteristics
- ✅ **Role-based**: User has `systemRole: "Secretary"` in their profile
- ✅ **Office-level**: Supports the office/department, not tied to a specific executive
- ✅ **Fixed permissions**: Uses the Secretary permission preset
- ✅ **Broad scope**: Can view all correspondence, register, minute, treat
- ✅ **Audit trail**: Actions tracked with `acted_by_secretary: true` flag

### Current Permissions
- ✅ Register correspondence
- ✅ Minute & forward correspondence
- ✅ Treat & respond to correspondence
- ✅ Add distribution (CC) lists
- ✅ View all correspondence
- ✅ View registry
- ✅ Create and edit documents
- ✅ Share documents
- ❌ Cannot approve/reject
- ❌ Cannot archive
- ❌ No analytics access

### Implementation
```typescript
// User model
{
  systemRole: "Secretary",
  // ... other fields
}

// Minute model
{
  acted_by_secretary: true,
  user: executive, // Action appears to be from executive
  performed_by: secretary_user, // Actual user who performed action
}
```

---

## Assistant (TA/PA) Role

### Definition
**Assistant** is a **delegation-based assignment** where a specific executive (principal) delegates authority to an assistant (TA or PA).

### Characteristics
- ✅ **Delegation-based**: Created through `Delegation` model
- ✅ **Personal support**: Assigned to a specific executive (principal)
- ✅ **Configurable permissions**: Can set `can_approve`, `can_minute`, `can_forward`
- ✅ **Two types**: TA (Technical Assistant) or PA (Personal Assistant)
- ✅ **Per-correspondence**: Can delegate specific correspondences via `CorrespondenceDelegation`
- ✅ **Audit trail**: Actions tracked with `acted_by_assistant: true` + `assistant_type` (TA/PA)

### Types

#### Technical Assistant (TA)
- Typically handles technical/operational tasks
- May have `can_approve: true` permission
- Focuses on technical correspondence and approvals

#### Personal Assistant (PA)
- Typically handles administrative/personal tasks
- Usually `can_approve: false`
- Focuses on scheduling, coordination, and administrative tasks

### Implementation
```python
# Delegation model (general assignment)
{
  principal: executive_user,
  assistant: assistant_user,
  can_approve: True/False,
  can_minute: True,
  can_forward: True,
  active: True
}

# CorrespondenceDelegation model (per-correspondence)
{
  correspondence: correspondence_instance,
  principal: executive_user,
  assistant: assistant_user,
  delegation: delegation_reference,
  status: "active",
  notes: "Instructions from executive"
}

# Minute model
{
  acted_by_assistant: true,
  assistant_type: "TA" or "PA",
  user: principal, // Action appears to be from principal
  performed_by: assistant_user, // Actual user who performed action
}
```

---

## When to Use Each

### Use Secretary When:
- ✅ User provides **office-level** support
- ✅ User needs **broad access** to all correspondence
- ✅ User supports **multiple executives** in an office
- ✅ User handles **general secretariat** functions
- ✅ Relationship is **implicit** (office-based)

### Use Assistant (TA/PA) When:
- ✅ User provides **personal support** to a specific executive
- ✅ Executive wants to **delegate specific correspondences**
- ✅ Need **configurable permissions** (e.g., can approve or not)
- ✅ Need to **distinguish between TA and PA** roles
- ✅ Relationship is **explicit** (principal-assistant)

---

## Current Implementation Status

### ✅ Secretary Role
- **Status**: Fully implemented
- **Features**:
  - Role-based assignment
  - Fixed permission preset
  - `acted_by_secretary` flag tracking
  - Can register, minute, treat, distribute, share documents

### ✅ Assistant (TA/PA) Role
- **Status**: Fully implemented
- **Features**:
  - `Delegation` model for general assignments
  - `CorrespondenceDelegation` model for per-correspondence delegation
  - `acted_by_assistant` flag + `assistant_type` tracking
  - Configurable permissions (can_approve, can_minute, can_forward)
  - Frontend UI for managing delegations

### ⚠️ Areas for Improvement
1. **Clarification in UI**: Better distinction in user interface
2. **Documentation**: Clearer user guidance on when to use each
3. **Permission inheritance**: Should assistants inherit secretary permissions?
4. **Dual assignment**: Can a user be both Secretary and Assistant?

---

## Recommendations

### 1. **Clarify in User Interface**
- Add clear labels distinguishing Secretary vs Assistant
- Show relationship type (office-level vs personal)
- Display delegation status for assistants

### 2. **Improve Documentation**
- Add tooltips explaining the difference
- Create user guides for each role type
- Document best practices for assignment

### 3. **Consider Permission Inheritance**
- Should assistants automatically have secretary permissions?
- Or should they only have what's explicitly delegated?

### 4. **Support Dual Assignment**
- Allow users to be both Secretary (office-level) and Assistant (personal)
- System should handle both flags appropriately

### 5. **Enhanced Tracking**
- Better visibility into secretary vs assistant actions
- Clearer audit trail showing relationship type
- Analytics separating secretary vs assistant performance

---

## Code References

### Backend Models
- `correspondence/models.py`:
  - `Delegation` (lines 591-612) - General assistant assignment
  - `CorrespondenceDelegation` (lines 615-700) - Per-correspondence delegation
  - `Minute` (lines 249-289) - Has `acted_by_secretary`, `acted_by_assistant`, `assistant_type` fields

### Frontend
- `lib/npa-structure.ts` - System role types including "Secretary" and "Assistant"
- `contexts/OrganizationContext.tsx` - `AssistantAssignment` interface
- `components/admin/AssistantAssignmentModal.tsx` - UI for managing assistant assignments
- `components/correspondence/DelegateModal.tsx` - UI for delegating correspondences

### Permissions
- `lib/role-permissions.ts` - Secretary permission preset
- `lib/permissions.ts` - Permission profile logic

---

## Summary

**Secretary** and **Assistant (TA/PA)** serve different purposes:
- **Secretary**: Office-level, role-based, broad permissions
- **Assistant**: Personal, delegation-based, configurable permissions

Both are fully implemented but could benefit from:
1. Better UI distinction
2. Clearer documentation
3. Enhanced tracking and analytics
4. Support for dual assignment

