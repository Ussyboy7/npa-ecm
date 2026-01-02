# Distribution and Reject Routing - Implementation Guide

## Overview
This document explains how Distribution (CC) and Reject actions work with the routing concept.

---

## 1. Distribution (CC) - Updated Concept

### What is Distribution?
Distribution is like routing but for **information sharing**:
- Distribution recipients see correspondence in their **Office Inbox**
- Distribution can be "For Information", "For Action", or "For Comment"
- Distribution items can be **further minuted down** (acted upon)
- Everything is **tracked and recorded**

### Key Points:
1. ✅ **Distribution items appear in Office Inbox/Outbox**
   - When you add distribution, recipients see it in their Office Inbox
   - Distribution is tracked and recorded

2. ✅ **Distribution can require action**
   - "For Action" → Recipients should take action
   - "For Comment" → Recipients should provide input
   - "For Information" → Recipients should be aware

3. ✅ **Distribution items can be minuted down**
   - Distribution recipients can minute the correspondence further
   - They can forward, approve, treat, or take other actions
   - This allows distribution items to become active routing items

4. ✅ **Everything is tracked**
   - Distribution entries are recorded
   - Actions taken on distribution items are tracked
   - Full audit trail maintained

### Distribution vs Direct Routing:

| Aspect | Direct Routing (Minutes) | Distribution (CC) |
|--------|-------------------------|-------------------|
| **Purpose** | Move correspondence between offices | Share information with recipients |
| **Appears in Inbox?** | ✅ Yes (if routed to you) | ✅ Yes (if you're in distribution) |
| **Can be acted upon?** | ✅ Yes | ✅ Yes (can be minuted down) |
| **Primary action** | Routing | Information sharing |
| **Tracking** | ✅ Full audit trail | ✅ Full audit trail |

### Implementation:
- ✅ Distribution recipients are included in Office Inbox query
- ✅ Distribution items appear alongside directly routed items
- ✅ Distribution recipients can take actions (minute, forward, etc.)
- ✅ All actions are tracked and recorded

---

## 2. Reject Action - Routing Back

### What is Reject?
Reject is an action that **routes correspondence back** to the sender:
- When you reject correspondence, it routes back to the office that sent it
- The sender's office receives it in their **Office Inbox**
- This ensures the sender knows their correspondence was rejected

### Routing Logic:
When a REJECT action is taken, the system routes back to:

1. **Priority 1: `owning_office`**
   - The office that owns/created the correspondence
   - This is the primary sender

2. **Priority 2: Previous minute's `from_office`**
   - The office that sent the correspondence in the previous minute
   - This is the immediate sender

3. **Priority 3: Creator's office**
   - The office of the user who created the correspondence
   - Fallback if no other office is found

### Reject Flow:
```
1. Office A sends correspondence to Office B (Outward)
   → Appears in Office A's Office Outbox
   → Appears in Office B's Office Inbox

2. Office B rejects the correspondence
   → REJECT action routes back to Office A
   → Appears in Office A's Office Inbox (inward)
   → Office A knows their correspondence was rejected
```

### Key Points:
- ✅ **REJECT routes back** to sender's office
- ✅ **Sender receives notification** in their Office Inbox
- ✅ **Full audit trail** maintained
- ✅ **Rejection reason** is recorded in minute text

---

## 3. Updated Action Type Summary

| Action Type | Routes? | Outward? | Inward? | Special Behavior |
|-------------|---------|----------|---------|------------------|
| **MINUTE** | ✅ Yes | ✅ Yes (if to_office) | ✅ Yes (recipient) | Routes correspondence |
| **FORWARD** | ✅ Yes | ✅ Yes (if to_office) | ✅ Yes (recipient) | Routes correspondence |
| **APPROVE** | ⚠️ Maybe | ✅ Yes (if to_office) | ✅ Yes (if routed) | Can route or complete |
| **REJECT** | ✅ Yes | ❌ No | ✅ Yes (routes back) | **Routes back to sender** |
| **TREAT** | ✅ Yes (if to_office) | ✅ Yes (if routed) | ✅ Yes (if routed) | Routes like MINUTE/FORWARD |
| **Distribution** | ⚠️ Info sharing | ✅ Appears in Outbox | ✅ Appears in Inbox | **Can be acted upon** |

---

## 4. Office Inbox/Outbox Behavior

### Office Inbox Shows:
1. ✅ **Directly routed correspondence** (minuted to your office)
2. ✅ **Distribution items** (your office/division/department is in distribution)
3. ✅ **Rejected correspondence** (routed back to you)
4. ✅ **Parallel routing branches** (if you're a recipient)

### Office Outbox Shows:
1. ✅ **Correspondence you routed** (minuted out)
2. ✅ **Correspondence you distributed** (added to distribution list)
3. ✅ **Correspondence you created** (if outward)

---

## 5. Implementation Details

### Distribution in Office Inbox:
```python
# Distribution recipients are included in Office Inbox query
distribution_correspondence_ids = CorrespondenceDistribution.objects.filter(
    Q(division_id__in=user_division_ids) |
    Q(department_id__in=user_department_ids) |
    Q(directorate_id__in=user_directorate_ids)
).values_list('correspondence_id', flat=True).distinct()

queryset = queryset.filter(
    Q(current_office_id__in=office_ids) |
    Q(owning_office_id__in=office_ids) |
    Q(id__in=distribution_correspondence_ids)  # ✅ Distribution included
)
```

### Reject Routing:
```python
# REJECT routes back to sender's office
if minute.action_type == Minute.ActionType.REJECT:
    # Priority: owning_office > from_office > created_by's office
    if correspondence.owning_office:
        reject_target_office = correspondence.owning_office
    elif previous_minute.from_office:
        reject_target_office = previous_minute.from_office
    elif correspondence.created_by:
        reject_target_office = creator_office_membership.office
    
    # Route back
    correspondence.current_office = reject_target_office
    correspondence.current_approver = reject_target_user
```

---

## 6. User Experience

### Distribution Recipient:
1. Sees correspondence in **Office Inbox** (with "CC" badge)
2. Can view the correspondence
3. Can take action (minute, forward, approve, etc.)
4. Can see distribution purpose ("For Information", "For Action", "For Comment")

### Reject Sender:
1. Receives correspondence back in **Office Inbox**
2. Sees rejection reason in minute text
3. Can see who rejected it
4. Can take further action (revise, resubmit, etc.)

---

## 7. Summary

### ✅ **Distribution (CC):**
- Appears in Office Inbox/Outbox ✅
- Can be acted upon ✅
- Everything is tracked ✅
- Can be minuted down ✅

### ✅ **Reject:**
- Routes back to sender ✅
- Sender sees it in Office Inbox ✅
- Full audit trail ✅
- Rejection reason recorded ✅

### ✅ **Overall:**
- All actions are tracked and recorded
- Everything appears in appropriate inbox/outbox
- Full routing concept is maintained
- Distribution and Reject are properly integrated

---

## Next Steps

1. ✅ **Distribution** - Already implemented in Office Inbox
2. ✅ **Reject routing** - Implemented to route back to sender
3. ✅ **Documentation** - Updated to reflect new behavior
4. ⚠️ **UI Updates** - May need to add "CC" badges and "Rejected" indicators

