# Helpdesk Operations — NPA-ECM (12 months)

**Tier:** 1 (all ECM users) · **BOQ:** §4.04

---

## Channels

| Channel | Entry point | SLA |
|---------|-------------|-----|
| In-app tickets | `/helpdesk` → POST `/api/v1/support/tickets/` | Acknowledge 4 business hours |
| Email | Configured support mailbox (see `NPA_ECM_SUPPORT_EMAIL`) | Same as tickets |
| Escalation | ICT Tier-2 when priority **high** or security incident | 1 business day |

## Ticket lifecycle

1. **Open** — user submits subject, description, priority  
2. **In progress** — assigned_to set by helpdesk lead  
3. **Resolved** — resolution_notes + `POST .../tickets/{id}/resolve/`  
4. **Closed** — auto after 7 days resolved or manual admin close  

## Admin queue

- URL: `/admin/helpdesk`  
- Filters: open, in-progress, high priority  
- Weekly report: count by module tag (correspondence, DMS, login, integrations)

## Common resolutions

| Symptom | First action |
|---------|----------------|
| Cannot login | Check MFA, SSO staging flag, account active |
| Missing inbox item | Verify office membership, acting officer assignment |
| Download blocked | Check document DRM policy (`drm_rights` on document) |
| Search misses content | Retry with **Semantic** mode; verify OCR on version |

## Hypercare (first 30 days per port)

- Dedicated port channel tag on all tickets  
- Daily stand-up: open count, P1 list, deploy blockers  
- Handover to steady-state helpdesk at day 31  

---

## KPIs

- Mean time to acknowledge (MTTA) ≤ 4h  
- Mean time to resolve P2 ≤ 2 business days  
- User satisfaction survey monthly (optional form link in resolved ticket email)
