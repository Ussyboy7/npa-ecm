# Correspondence Routing Concept

## Overview
This document explains the core concepts of correspondence routing, minutes, distribution (CC), reject actions, and the inward/outward flow within and outside NPA.

---

## Core Concepts

### 1. **Minutes = Routes**
- **Minutes are like routes** - they're short forms of using correspondence to send to other offices/users
- **Minutes are like physical annotations** - when you receive a document with minutes on them (like real-life physical documents with handwritten minutes)
- **Minutes route correspondence** - they move correspondence from one office/user to another

### 2. **Inward vs Outward**
- **Inward** = Coming **INTO** your office
- **Outward** = Going **OUT OF** your office

### 3. **Internal vs External**
- **Internal** = Within NPA (between NPA offices/users)
- **External** = Outside NPA (to/from external organizations)

---

## Correspondence Flow Matrix

### Inward (Coming INTO Office)

#### ✅ **Inward - Internal** (From another NPA office)
- **Source**: Another NPA office/user
- **How it arrives**: Minuted to your office
- **Where it goes**: **Office Inbox**
- **Example**: 
  - MD minutes correspondence to GM → GM's **Office Inbox**
  - GM minutes to Department → Department's **Office Inbox**

#### ✅ **Inward - External** (From external organization)
- **Source**: External organization (outside NPA)
- **How it arrives**: **Physical copy** received (mail, courier, etc.)
- **What you do**: Register it in the system
- **Where it goes**: **Office Inbox**
- **Example**: 
  - External org sends letter → You receive **physical copy**
  - You register it → Goes to **Office Inbox**
  - Office head sees it and can minute it out

---

### Outward (Going OUT OF Office)

#### ✅ **Outward - Internal** (To another NPA office)
- **Destination**: Another NPA office/user
- **How it's sent**: **Minute it out** (route it)
- **Where it appears**: **Office Outbox**
- **Example**: 
  - You minute correspondence to GM → Appears in your **Office Outbox**
  - GM receives it in their **Office Inbox**

#### ✅ **Outward - External** (To external organization)
- **Destination**: External organization (outside NPA)
- **How it's sent**: 
  1. Registered in system (digital record)
  2. **Printed as hard copy**
  3. **Physically mailed** to recipient
- **Where it appears**: **Office Outbox**
- **Example**: 
  - You register outward correspondence to external org
  - Appears in **Office Outbox**
  - Executive approves/dispatches
  - **Printed & mailed** physically
  - System maintains digital record

---

## Minutes as Routes

### What Are Minutes?
- **Minutes = Routes** - Short form of sending correspondence
- **Like physical annotations** - Similar to handwritten minutes on physical documents
- **Move correspondence** - Route it from one office/user to another

### Minute Flow

#### **Minute Inward (Received)**
- You receive correspondence (internal or external)
- Someone minutes it to you
- Appears in your **Office Inbox**
- You can minute it further (route it to others)

#### **Minute Outward (Sent)**
- You minute correspondence to another office/user
- Appears in your **Office Outbox**
- Recipient receives it in their **Office Inbox**
- Can be internal (NPA) or external (outside NPA)

### Distribution (CC) - Information Sharing

#### **Distribution Inward (Received)**
- Your office/division/department is in the distribution list
- Correspondence appears in your **Office Inbox** (with CC badge)
- You can see it and take action (minute, forward, approve, etc.)
- Distribution can be "For Information", "For Action", or "For Comment"
- Everything is tracked and recorded

#### **Distribution Outward (Sent)**
- You add correspondence to distribution list
- Appears in your **Office Outbox**
- Recipients see it in their **Office Inbox**
- Distribution items can be further minuted down

### Reject Action - Routing Back

#### **Reject Flow**
- When you reject correspondence, it routes back to the sender
- Sender's office receives it in their **Office Inbox**
- Sender knows their correspondence was rejected
- Rejection reason is recorded in minute text
- Sender can take further action (revise, resubmit, etc.)

**Routing Priority for Reject:**
1. `owning_office` (office that owns/created the correspondence)
2. Previous minute's `from_office` (office that sent it)
3. Creator's office (fallback)

---

## Complete Flow Examples

### Example 1: Internal Inward → Outward
1. **MD minutes to GM** (Inward - Internal)
   - GM receives in **Office Inbox**
   - Physical concept: Document with MD's minutes arrives at GM office

2. **GM minutes to Department** (Outward - Internal)
   - GM's **Office Outbox** shows it
   - Department receives in **Office Inbox**
   - Physical concept: GM adds minutes and routes to Department

### Example 2: External Inward → Internal Outward
1. **External org sends letter** (Inward - External)
   - You receive **physical copy**
   - Register it → **Office Inbox**
   - Physical concept: Physical document received

2. **You minute to GM** (Outward - Internal)
   - Your **Office Outbox** shows it
   - GM receives in **Office Inbox**
   - Physical concept: You add minutes and route internally

### Example 3: Internal Inward → External Outward
1. **MD minutes to you** (Inward - Internal)
   - You receive in **Office Inbox**
   - Physical concept: Document with MD's minutes

2. **You prepare response to external org** (Outward - External)
   - Register outward correspondence
   - Appears in **Office Outbox**
   - Executive approves
   - **Printed & mailed** to external org
   - Physical concept: Physical copy sent via mail

---

## Summary Table

| Flow Type | Source/Destination | How It Works | Primary Location |
|-----------|------------------|--------------|------------------|
| **Inward - Internal** | Another NPA office | Minuted to you | **Office Inbox** |
| **Inward - External** | External org | Physical copy received, registered | **Office Inbox** |
| **Outward - Internal** | Another NPA office | You minute it out | **Office Outbox** |
| **Outward - External** | External org | Registered, printed, mailed | **Office Outbox** |
| **Distribution (CC)** | Any | Your office/division/department in distribution list | **Office Inbox** (can be acted upon) |
| **Reject** | Back to sender | Rejected correspondence routes back | **Office Inbox** (sender's office) |

---

## Key Points

1. **Minutes = Routes**: Minutes are like routes - they move correspondence between offices/users
2. **Minutes = Physical Annotations**: Like handwritten minutes on physical documents
3. **Inward = Coming IN**: Whether from internal (NPA) or external (outside NPA)
4. **Outward = Going OUT**: Whether to internal (NPA) or external (outside NPA)
5. **Office Inbox**: Where you receive (inward) - both internal and external
   - Also shows **Distribution (CC)** items where your office/division/department is in distribution list
   - Distribution items can be acted upon (minuted down, forwarded, etc.)
6. **Office Outbox**: Where you send from (outward) - both internal and external
   - Also shows correspondence you've distributed (added to distribution list)
7. **External = Physical**: External orgs receive/send physical copies, but system tracks digitally
8. **Distribution (CC)**: Appears in Office Inbox/Outbox, can be acted upon, everything is tracked
9. **Reject**: Routes back to sender's office so they know their correspondence was rejected

---

## Physical vs Digital

### Internal (NPA to NPA)
- **Digital routing**: Minutes route correspondence digitally
- **Physical concept**: Like physical documents with minutes, but handled digitally

### External (NPA ↔ External Org)
- **Inward**: Physical copy received → Registered digitally
- **Outward**: Registered digitally → Printed → Mailed physically
- **System tracks**: Digital record maintained for audit/tracking

