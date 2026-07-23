# National Rollout Runbook — NPA-ECM

**Programme:** National ports deployment (BOQ §3.x)  
**Audience:** ICT programme office, port IT leads, registry heads

---

## Phase A — HQ go-live (weeks 1–4)

1. Run deploy checklist on production (`migrate`, `setup_role_permissions`, `setup_celery_beat`, `check_environment_parity --strict`).
2. Enable SSO/MFA for all HQ divisions; verify registry SOP sign-off.
3. Pilot **My Work**, correspondence register, and records governance with two divisions.
4. Stand up helpdesk queue (`/admin/helpdesk`) with Tier-1 staffing rota.

## Phase B — Pilot ports (Apapa, Rivers, Tin Can)

| Week | Activity | Owner |
|------|----------|-------|
| 1 | Site survey: bandwidth, VPN, registry desk hardware | Port IT |
| 2 | VPN + workstation image; scanner/TWAIN smoke test | ICT |
| 3 | Train-the-trainer (2 registry leads per port) | Training |
| 4 | Parallel run: legacy log + ECM register | Registry |
| 5 | Cutover sign-off; hypercare helpdesk | Programme PM |

## Phase C — National ports wave

- Deploy in waves of 4–6 ports per month.
- Mandatory per port: registry desk checklist, local escalation card, legacy backlog import plan (`import_legacy_records`).
- DR drill quarterly; verify audit compliance export from each port admin.

## Exit criteria per port

- [ ] 95% registry staff completed foundation training  
- [ ] Inbox/Sent SLA within agreed threshold for 2 weeks  
- [ ] Helpdesk ticket backlog &lt; 10 open after week 4  
- [ ] Legacy priority batch imported with QA sample sign-off  

---

## Contacts

| Role | Responsibility |
|------|----------------|
| Programme PM | Wave scheduling, BOQ tracking |
| ICT Lead | Infrastructure, SSO, monitoring |
| Registry Lead | SOP adherence, data quality |
| Helpdesk Lead | Tier-1 triage, escalation to ICT |
