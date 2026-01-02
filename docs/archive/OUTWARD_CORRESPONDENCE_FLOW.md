# Outward Correspondence Registration Flow

## Overview
This document explains what happens when you register **outward correspondence** (outgoing correspondence **from your office** to external organizations or other offices).

**Key Concepts**: 
- **Inward** = Coming **INTO** the office → Goes to **Office Inbox**
  - Can be **Internal** (from another NPA office) - minuted to you
  - Can be **External** (from external org) - physical copy received, registered
  
- **Outward** = Going **OUT OF** the office → Goes to **Office Outbox**
  - Can be **Internal** (to another NPA office) - you minute it out
  - Can be **External** (to external org) - registered, printed, mailed

**Minutes = Routes**: Minutes are like routes - short forms of sending correspondence to other offices/users. Like physical documents with handwritten minutes.

**External Organizations**: When sending to external organizations (outside NPA), the correspondence will be:
- ✅ Registered in the system (digital record)
- ✅ Printed as hard copy
- ✅ Physically mailed to the recipient
- The system tracks what was sent, even though physical delivery happens outside the system

---

## Registration Process

### 1. **Frontend Form (Register Correspondence Page)**

When you select **"Outward"** flow type:

**Required Fields**:
- Subject
- Letter Date
- Dispatch Date
- Recipient Name
- Owning Office
- Assign To (Executive)
- Distribution (Directorates/Divisions/Departments)

**Auto-Set Values**:
- `source` = `'internal'` (vs `'external'` for inward)
- `direction` = `'downward'` (vs `'upward'` for inward)
- `sender_name` = Office name (auto-filled)
- `owning_office` = Selected office
- `current_office` = Same as owning_office

---

## What Happens After Registration

### 2. **Backend Processing**

When the correspondence is created:

1. **Correspondence Created**:
   - Status: `PENDING`
   - Source: `INTERNAL`
   - Direction: `DOWNWARD`
   - `owning_office`: Your office (or selected office)
   - `current_office`: Same as owning_office
   - `current_approver`: Executive you assigned in routing step
   - `created_by`: You (the user registering)

2. **Auto-Created Resources**:
   - ✅ **DMS Document**: Auto-created from correspondence
     - Title: Correspondence subject
     - Status: DRAFT
     - Linked to correspondence
   
   - ✅ **Case** (if applicable): Auto-created if document type is:
     - Complaint
     - Request
     - Inquiry
   
   - ✅ **Distribution Entries**: Created for selected directorates/divisions/departments

3. **Attachments**:
   - Files uploaded are saved as `CorrespondenceAttachment`
   - Stored in: `/media/correspondence_attachments/{correspondence_id}/`

4. **Audit Log**:
   - Activity logged: `CORRESPONDENCE_CREATED`
   - User, timestamp, and details recorded

---

## Where Does It Go?

### 3. **Visibility & Location**

**Primary Location**: **Office Outbox** (because it's going OUT OF the office)

After registration, outward correspondence appears in:

#### ✅ **Office Outbox** (`/correspondence/office-outbox`) - **PRIMARY**
- **Why**: It's going **OUT OF** your office (`owning_office = your office`)
- **Filter**: `owning_office IN (your offices)` AND `status IN (pending, in-progress)`
- **Purpose**: Track all correspondence **sent from your office** (outgoing)
- **Concept**: External orgs → Office Inbox (incoming), Your office → Office Outbox (outgoing)

#### ✅ **My Outbox** (`/correspondence/outbox`) - **SECONDARY**
- **Why**: You created it (`created_by = you`)
- **Filter**: `created_by = current_user` AND `status IN (pending, in-progress)`
- **Purpose**: Track items you personally created (personal tracking)
- **Note**: This is a convenience view - primary location is Office Outbox

#### ✅ **Assigned Executive's Inbox**
- **Why**: You assigned it to an executive (`current_approver`)
- **Location**: Executive's inbox (Office Inbox or My Inbox depending on their role)
- **Purpose**: Executive reviews, approves, and can dispatch it (print & mail for external orgs)

---

## Workflow After Registration

### 4. **Next Steps**

1. **Executive Review**:
   - Assigned executive sees it in their inbox
   - Can review, edit, or approve for dispatch

2. **Dispatch Process**:
   - **For External Organizations** (outside NPA):
     - ✅ Executive approves/dispatches
     - ✅ System marks as dispatched
     - ✅ **Printed as hard copy**
     - ✅ **Physically mailed** to recipient
     - ✅ System maintains digital record of what was sent
     - Status changes to `IN_PROGRESS` or `COMPLETED`
   
   - **For Internal Routing**:
     - Executive can minute it to other offices/users
     - When minuted, it routes to recipient's inbox
     - Appears in **Office Outbox** of the office that minutes it

3. **After Dispatch**:
   - Status changes to `IN_PROGRESS` or `COMPLETED`
   - Removed from outbox (no longer pending)
   - Digital record maintained for audit/tracking

4. **Withdraw** (if needed):
   - If mistake found before dispatch, can withdraw (status → `WITHDRAWN`)
   - Can edit and resend later
   - **Note**: If already printed/mailed, withdrawal marks it in system but physical copy already sent

---

## Key Differences: Inward vs Outward

| Aspect | Inward | Outward |
|--------|--------|---------|
| **Concept** | Coming **INTO** office | Going **OUT OF** office |
| **Flow** | External → NPA | NPA → External |
| **Source** | `external` | `internal` |
| **Direction** | `upward` | `downward` |
| **Date Field** | `received_date` | `dispatch_date` + `letter_date` |
| **Sender** | External organization | Your office |
| **Recipient** | Your office | External organization |
| **Primary Location** | **Office Inbox** | **Office Outbox** |
| **Secondary Location** | - | My Outbox (if you created it) |
| **Distribution** | Not required | Required (directorates/divisions/departments) |
| **Physical Delivery** | Received physically, registered digitally | Registered digitally, **printed & mailed** physically |

---

## Example Flow

**Scenario**: You register outward correspondence to external organization

1. **You register** → "Request for Information" to External Org (Outward)
   - Assign to: MD
   - Distribution: All Directorates
   - Recipient: External Organization

2. **System creates**:
   - Correspondence (status: PENDING)
   - DMS Document (DRAFT)
   - Distribution entries

3. **Appears in**:
   - ✅ **MD Office Outbox** (going OUT OF MD office) - **PRIMARY**
   - ✅ Your **My Outbox** (you created it) - **SECONDARY**
   - ✅ **MD's Inbox** (assigned to MD for review)

4. **MD reviews**:
   - MD sees it in their inbox
   - MD reviews and approves for dispatch

5. **Dispatch Process**:
   - MD dispatches/approves
   - System marks as dispatched
   - **Printed as hard copy**
   - **Physically mailed** to external organization
   - Status changes to `COMPLETED`
   - Removed from outbox
   - Digital record maintained for tracking

6. **Tracking**:
   - System maintains record of what was sent
   - Can track in archive/records
   - Physical copy delivered via postal service

---

## Summary

**When you register outward correspondence**:

**Concept**: Going **OUT OF** your office → **Office Outbox**

**What Happens**:
- ✅ Created with `source=internal`, `direction=downward`
- ✅ **Primary Location**: **Office Outbox** (going OUT OF office)
- ✅ **Secondary Location**: My Outbox (if you created it)
- ✅ Assigned to selected executive (appears in their inbox for review)
- ✅ Auto-creates DMS Document and Case (if applicable)
- ✅ Creates distribution entries
- ✅ Status: `PENDING` (waiting for approval/dispatch)

**For External Organizations**:
- ✅ Registered digitally in system
- ✅ Executive approves/dispatches
- ✅ **Printed as hard copy**
- ✅ **Physically mailed** to recipient
- ✅ System maintains digital record of what was sent

**Key Points**:
1. **Inward** = Coming INTO office (External → NPA) → **Office Inbox**
2. **Outward** = Going OUT OF office (NPA → External) → **Office Outbox**
3. External orgs receive **physical copies** via mail, but system tracks the digital record
4. Office Outbox is the **primary location** for outward correspondence

