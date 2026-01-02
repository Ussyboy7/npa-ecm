# Outbox Clarification: My Outbox vs Office Outbox

## Overview
This document clarifies the difference between **My Outbox** and **Office Outbox**, and explains how **Delete** and **Withdraw** work compared to **Recall** in minutes.

**Last Updated**: Based on user clarification of actual workflow.

---

## 1. Delete vs Recall in Minutes

### Recall in Minutes
- **What it does**: Undoes a minute that was sent
- **When it works**: Within 30 minutes of creation, if recipient hasn't opened it
- **What happens**:
  - Marks minute as `is_recalled=True`
  - Stores `recall_reason`
  - Routes correspondence back to sender
  - Sends notification to recipient
- **Purpose**: "Undo" a minute before it's acted upon
- **Result**: Minute is cancelled, correspondence returns to sender

### Delete in Correspondence
- **What it does**: Permanently removes correspondence from the system
- **When it works**: Only for pending items (before dispatch)
- **Who can use**: **Admin/Superuser only** (regular users should use Withdraw)
- **What happens**:
  - Sets `is_deleted=True` (soft delete)
  - Correspondence is hidden from all views
  - Cannot be recovered (unless admin restores)
- **Purpose**: Remove correspondence that shouldn't exist (admin cleanup)
- **Result**: Correspondence is permanently deleted
- **Note**: Regular users should use "Withdraw" instead for reversible cancellation

### Withdraw in Correspondence
- **What it does**: Cancels a pending correspondence (similar to recall in minutes)
- **When it works**: Only for pending or in-progress items
- **What happens**:
  - Sets status to `WITHDRAWN` (reversible)
  - Stores `withdraw_reason` and `withdrawn_by`
  - Marks `withdrawn_at` timestamp
  - Allows editing and resending later
  - Sends notification to current approver
- **Purpose**: Fix mistakes and resend to correct recipient
- **Result**: Correspondence is withdrawn but can be restored/edited (like recall)
- **Similar to**: Recall in minutes - reversible, allows correction

**Answer**: No, delete does NOT work like recall. They're different:
- **Recall**: Undoes a minute, routes back, but doesn't delete
- **Delete**: Permanently removes correspondence
- **Withdraw**: Cancels correspondence (currently uses delete, but could be improved)

---

## 2. My Outbox vs Office Outbox

### Register Correspondence (Inward)
- **Concept**: Coming **INTO** the office
- **Types**:
  - **Inward - Internal**: From another NPA office (minuted to you) → **Office Inbox**
  - **Inward - External**: From external organization (physical copy received) → **Office Inbox**
- **What happens**: 
  - **Internal**: Someone minutes correspondence to you → You receive in **Office Inbox**
  - **External**: External org sends physical copy → You register it → Goes to **Office Inbox**
- **NOT in outbox**: This is incoming correspondence, not outgoing
- **Example**: 
  - **Internal**: MD minutes to you → You receive in **Office Inbox**
  - **External**: External organization sends letter → You receive physical copy → Register it → Goes to **Office Inbox**
  - Office head (AGM/GM/ED/MD) sees it in office inbox and can minute it out

### My Outbox (`/correspondence/outbox`)
- **What it shows**: Correspondence items **YOU personally sent out**
- **Filter**: `created_by = current_user` AND `status IN (pending, in-progress)`
- **Purpose**: Track items you personally created and sent
- **Use case**: 
  - "I responded to a minute, where is my response?"
  - "What items did I send that are pending?"
- **Example**: 
  - AGM minutes to you → You see it in **My Inbox**
  - You respond/treat → Your response appears in **My Outbox**
  - You register new correspondence → Appears in **My Outbox** (until dispatched)

### Office Outbox (`/correspondence/office-outbox`)
- **Concept**: Going **OUT OF** the office
- **Types**:
  - **Outward - Internal**: To another NPA office (you minute it out) → **Office Outbox**
  - **Outward - External**: To external organization (registered, printed, mailed) → **Office Outbox**
- **What it shows**: Correspondence items **sent from your office** (outgoing)
- **Filter**: `owning_office IN (user's offices)` AND `status IN (pending, in-progress)`
- **Purpose**: Track all correspondence **going OUT OF your office** (to other NPA offices or external orgs)
- **Use case**:
  - "What has my office sent out?"
  - "What items are pending dispatch from our office?"
  - "What correspondence will be/has been mailed to external organizations?"
- **Example**: 
  - **Internal**: You minute correspondence to GM → appears in **Office Outbox** (going OUT OF office)
  - **External**: You register outward correspondence to external org → appears in **Office Outbox**
  - MD minutes correspondence to GM → appears in **MD Office Outbox**
  - GM minutes to Department → appears in **GM Office Outbox**
  - AGM minutes to Officer → appears in **AGM Office Outbox**
- **External Organizations**: 
  - Registered digitally in system
  - **Printed as hard copy** and **physically mailed**
  - System maintains digital record of what was sent
- **Minutes = Routes**: When you minute correspondence, it's like routing it - appears in your **Office Outbox**, recipient receives in their **Office Inbox**

### Key Differences

| Aspect | My Outbox | Office Outbox |
|--------|-----------|---------------|
| **Scope** | Personal (you only) | Office-wide (all office members) |
| **Filter** | `created_by = you` | `owning_office = your office(s)` |
| **Shows** | Items you created | Items from your office |
| **Visibility** | Only you | All office members |
| **Use Case** | Personal tracking | Office tracking |

### Examples

**Scenario 1: You create correspondence**
- You register new correspondence → **My Outbox** ✅
- If `owning_office` is your office → **Office Outbox** ✅ (if you're a member)

**Scenario 2: Office minutes out**
- MD office minutes correspondence to GM → **Office Outbox** ✅ (for MD office members)
- Does NOT appear in **My Outbox** (unless you're the one who created it)

**Scenario 3: Multiple offices**
- If you're a member of multiple offices, Office Outbox shows items from ALL your offices
- My Outbox only shows items YOU created

---

## 3. What Are These Items?

### Office Outbox Items
These are **outgoing correspondence** that:
1. Are **owned by your office** (`owning_office`)
2. Have been **minuted/routed out** to other offices/divisions/departments/users
3. Are **pending dispatch** (status: pending or in-progress)

**Examples**:
- MD minutes to GM → appears in MD Office Outbox
- GM minutes to Department → appears in GM Office Outbox
- Department minutes to Officer → appears in Department Office Outbox

### My Outbox Items
These are **outgoing correspondence** that:
1. **You created** (`created_by = you`)
2. Are **pending dispatch** (status: pending or in-progress)

**Examples**:
- You register new correspondence → appears in My Outbox
- You create a draft → appears in My Outbox

---

## 4. Backend Implementation

### Current Backend Support

**My Outbox** (`/correspondence/items/outbox/`):
- ✅ Fully implemented
- Filters by: `created_by = current_user`
- Status: `pending` or `in-progress`

**Office Outbox** (`/correspondence/items/outbox/?office=...`):
- ✅ Now implemented (updated)
- Filters by: `owning_office IN (user's offices)`
- Status: `pending` or `in-progress`
- Verifies user is a member of requested office(s)

---

## 5. Recommendations

### Withdraw vs Delete - Implementation

**✅ IMPLEMENTED**: 
- **Withdraw**: Uses new `WITHDRAWN` status (reversible, like recall)
  - Status: `Correspondence.Status.WITHDRAWN`
  - Fields: `withdrawn_at`, `withdraw_reason`, `withdrawn_by`
  - Endpoint: `POST /correspondence/items/{id}/withdraw/`
  - Available to: Creator or office members
  
- **Delete**: Admin-only, permanent removal
  - Uses soft delete (`is_deleted=True`)
  - Endpoint: `DELETE /correspondence/items/{id}/`
  - Available to: Admins/Superusers only

**Benefits**:
- ✅ Better audit trail (withdrawn items tracked separately)
- ✅ Reversible (can restore withdrawn items)
- ✅ Clear distinction between withdraw (user action) and delete (admin action)
- ✅ Similar to recall in minutes (familiar UX)

### Office Outbox Filtering
✅ **Fixed**: Backend now properly filters by `owning_office` when `office` parameter is provided.

---

## Summary

1. **Delete ≠ Recall**: Delete permanently removes, Recall undoes a minute
2. **My Outbox**: Items YOU created
3. **Office Outbox**: Items from YOUR OFFICE(S) that are minuted out
4. **Both are outgoing**: Items being sent/dispatched, not incoming
5. **Withdraw**: Currently uses delete, but could be improved to use status

