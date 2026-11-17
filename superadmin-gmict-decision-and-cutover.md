# Decision and cutover — `superadmin` and `gmict`

Prepared 2026-11-13 against the live database.

> **Executed 2026-11-13:** `gmict` was removed (deactivated, not deleted) at the
> owner's instruction. `is_active=False`, unusable password, the `OFF_DIV_ICT`
> principal membership disabled, 4 refresh tokens blacklisted, sessions cleared,
> and a `user_updated` audit entry written. `superadmin` is unchanged and remains
> the only entry in `HOLD_USERNAMES`; the command now targets active accounts only,
> so the dry run reports 116 mock accounts.
>
> Follow-up: `NPA/PROC/2025/0089` was reassigned from `gmict` to `gmengineering`
> on the same day (audited `case_updated`); the case's `created_by` attribution is
> unchanged. `OFF_DIV_ICT` approval rights were then granted to `as.abubakar`
> (Principal Manager ICT (HOD)) alongside `b.idowu`, and the draft
> `NPA/FORM/COMP/2025/002` was transferred to `gmengineering`. Both changes are
> audited; the six published documents keep `gmict` as historical author.
>
> **Mock cutover executed 2026-11-13.** All four open items were reassigned, then
> `deactivate_mock_accounts --apply --allow-headless-offices` deactivated **115**
> accounts and disabled **99** memberships (audited per account). Only
> `superadmin` remains active (held). No real staff account was touched
> (3,037 active staff with employee numbers, unchanged). 27 offices were left
> without a principal; 25 were then staffed with the senior real officer of the
> same division as acting principal (audited `organization_updated`), leaving
> **3 offices with no real officer available**: `OFF_DEPT_SEAVIEW`,
> `OFF_DIV_SEAVIEW_PROPERTIES` and `OFF_DIV_EDFA_DIRECT` (listed in
> `headless-offices.csv`). The break-glass cutover in §4 has still not been
> executed.

Evidence base: `accounts.models.User`, `LoginSecuritySettings`,
`ExecutiveSignature`, `DocumentSeal`, `OutstandingToken`/`BlacklistedToken`,
`django.contrib.sessions`, `audit.ActivityLog`, `organization.OfficeMembership`,
`correspondence.*`, `dms.Document`, plus
`cleaned_npa_nominal_roll2-reconciliation.csv` and the seed
`MOCK_USERS` / `organization_data.json`.

---

## 1. Decision

**D1 — `superadmin` (pk 124) is retained as the secured break-glass account.**
It stays active and keeps `is_superuser=True` / `is_staff=True`. It is never
matched to an employee, never given an office or routing role, and never used for
routine administration. Access is re-credentialed, forced behind TOTP MFA, token-
revoked, alerted and reviewed under the rules in §3. It remains in the permanent
deactivation hold list.

**D2 — `gmict` (pk 75) is a legacy placeholder for the GM ICT seat, not a person.**
It should **not** be matched to an employee. It was deactivated on 2026-11-13 at
the owner's instruction; the substantive GM ICT seat is
already held by a real officer: `b.idowu` — BABATUNDE IDOWU, employee 2545,
designation *GENERAL MANAGER ICT (HOD)*, active principal of `OFF_DIV_ICT`.

The match path (§7) is retained only for the case where HR confirms that
"Gbotolorun Ayodele" is a distinct current employee who substantively holds GM
ICT in addition to, or instead of, Idowu. That is the one fact this document
cannot establish from system data, so it is the first confirmation gate.

---

## 2. Current state (evidence)

### `superadmin`

| Attribute | Value |
|---|---|
| pk / username | 124 / `superadmin` (`Super Admin`) |
| Email | `superadmin@npa.gov.ng` (placeholder-style address, same family as seed mailboxes) |
| Auth provider | `local`; `external_auth_subject` empty |
| Flags | `is_active=True`, `is_staff=True`, `is_superuser=True` |
| Grade / role | `MDCS` / *Super Admin*; `is_management=True` |
| Employee data | `employee_id` empty, `personnel_number` empty, `designation` empty |
| Office memberships | **none** (no inbox, no routing, no approval authority) |
| Password | usable; **`ChangeMe123!` still valid** |
| MFA | `LoginSecuritySettings` exists; `mfa_enabled=False`, `mfa_required=False`, no TOTP secret |
| Exclusivity | **only superuser** and **only `is_staff` account** in the database |
| Activity | 44 `user_login`, 16 `user_impersonated`, 21 `document_shared`, 6 `document_updated`, 5 `document_comment_added`, 4 `case_updated`, 4 `role_updated`, 2 `document_created`, 2 `correspondence_created`, 1 `case_created`, 1 `correspondence_minuted`, 1 `user_updated` (107 total as actor, 45 entries targeting it) |
| Recency | last audit action 2026-11-13 15:58 (`user_login`); `last_activity=2026-11-13 19:14`; `last_login=NULL` |
| Live refresh tokens | **82 live** of 135 outstanding (87 already blacklisted); newest issued 2026-11-13 19:14 |
| Live sessions | 0 at time of inspection |
| Executive signature | present (`4df7828e-d2e3-4a7d-9947-aca260619be1`, created 2026-11-04); **0 seals** reference it |
| Open work | none assigned; its only open item was case `AQ-2026-001` (reassignment mapped separately) |

`last_login` is never populated by the JWT login path, so it must not be used for
anomaly detection. `ActivityLog.user_login` is the reliable signal.

### `gmict`

| Attribute | Value |
|---|---|
| pk / username | 75 / `gmict` (`Gbotolorun Ayodele`) |
| Email | `gm.ict@npa.gov.ng` (placeholder) |
| Auth provider | `local`; no external subject |
| Flags | `is_active=True`, `is_staff=False`, `is_superuser=False` |
| Grade / role | `MSS1` / *General Manager*; designation empty, no employee number |
| Office membership | `OFF_DIV_ICT` — **principal**, `is_primary=True`, `can_approve=True`, `can_register=True` |
| Password | usable; **`ChangeMe123!` still valid** |
| MFA | no MFA enabled, no TOTP |
| Signature / seals | none; 0 seals applied |
| Live refresh tokens | 4 |
| Activity | 2 `user_login` (2026-11-12), 1 `correspondence_minuted` + 1 `correspondence_updated` on `NPA/OFFDEPTICTSOFTWARE/2026/0000`, 2 `PHYSICAL_DOCUMENT_RETURNED` (2026-11-11) |
| Cases assigned | `NPA/PROC/2025/0089` (`in_progress`), `NPA/PROC/2024/0234` (`closed`) |
| Cases created | `0234`, `0089`, `0147` |
| Correspondence created | `HQ/AGM/PORTSENG/AD/001` (completed), `HQ/AGM/SA&DM/AD/001` (in-progress, approver `a.dantosho`), `HQ/AGM/SA&DM/AD/002` (in-progress, approver `edfa`) |
| Documents authored | 7 (incl. contract award letter, BOQ and completion reports for the wharf rehabilitation, and one draft `NPA/FORM/COMP/2025/002`) |
| Open minutes / tasks / acting appointments | 0 / 0 / 0 |

### Roll evidence that decides `gmict`

- The nominal roll contains 115 placeholder rows with **no employee number** and a
  generic office mailbox. `Ayodele Gbotolorun / gm.ict@npa.gov.ng / blank
  designation` is one of them.
- The roll also contains a real employee row: **2545, IDOWU BABATUNDE, MSS2,
  `GENERAL MANAGER ICT (HOD)`, `b.idowu@nigerianports.gov.ng`**, reconciled as
  `create` and since imported as `b.idowu`.
- The reconciliation classified `gmict` as `deactivate_missing` — *"Active,
  non-protected account absent from the roll."* It is not in
  `PROTECTED_USERNAMES` (`import_nominal_roll.py`), but it **is** in
  `HOLD_USERNAMES` (`deactivate_mock_accounts.py`).

### Office coverage if `gmict` is deactivated

`OFF_DIV_ICT` has 11 active principal memberships: 10 real officers plus `gmict`.
Only two memberships carry `can_approve=True` — `b.idowu` and `gmict`. Coverage
therefore survives deactivation (one real approver remains) but becomes a single
approver for that office. See confirmation **G8**.

---

## 3. `superadmin` break-glass policy (the decision, in operative terms)

1. **Purpose.** Emergency use only: disaster recovery, credential recovery for
   named staff, stuck approval/workflow repair, data repair authorised by the MD
   or CIO. Not for daily administration, document sharing, case creation, or
   impersonating staff to "help them".
2. **Exclusivity is acknowledged.** It is currently the only superuser and only
   staff account, so it is also the only impersonation path (`AuthImpersonateView`
   requires `is_superuser`). That is a single point of failure, not a design goal
   (§9, R1).
3. **Custody.** Two named custodians (recommended: Head of ICT and Internal
   Audit). Credential stored in the organisational vault, with a sealed physical
   copy held by each custodian. No credential in chat, tickets, email, source
   control, or the project's `.env`.
4. **Authentication.** Local authentication only (`auth_provider=local`). Unique
   strong password rotated at cutover and after every use. TOTP MFA confirmed and
   `mfa_required=True`. Email OTP is **not** an acceptable second factor for this
   account until the `superadmin@npa.gov.ng` mailbox ownership is confirmed as
   controlled and monitored.
5. **No organisational identity.** Keep zero office memberships, zero assigned
   cases/tasks/minutes, no approvals, no executive signature. The account must
   never appear in an office inbox or an approval chain.
6. **Impersonation.** Permitted only during a declared incident, with the ticket
   reference recorded, and reviewed in the next audit cycle. Every
   `user_impersonated` event by this account is alerted.
7. **Detection.** Real-time alert on any `superadmin` login, impersonation, or
   role change; weekly review of its `ActivityLog` entries; quarterly access
   review confirming custodian names; annual credential rotation outside incident
   use.
8. **Holds.** `superadmin` stays in `HOLD_USERNAMES` permanently, and any future
   bulk account command must keep a regression test proving it is never targeted.
9. **Recovery without the account.** Documented DB-level recovery procedure held
   by the custodians (shell access to the application host), so break-glass is not
   the only way back in.

---

## 4. Cutover steps — `superadmin` (execute in this order, in an approved window)

Order matters: enroll TOTP **before** forcing MFA, and rotate **before** revoking
tokens, otherwise the account locks out mid-procedure.

**S1. Freeze and baseline.** Announce the window. Record the baseline read-only
(user flags, password hash prefix, MFA flags, live token count, live sessions) in
the change ticket.

**S2. Decide dual control (blocking for R1 only, not for the steps below).**
Approve or explicitly risk-accept a second named superuser. If approved, create it
as a named person before S4 so there is a tested alternate admin path.

**S3. Confirm mailbox ownership.** Establish who controls
`superadmin@npa.gov.ng`. If it is not a controlled, monitored mailbox, plan to
change the address to an approved administrative mailbox (or leave it and treat
email OTP as unavailable). Email-based self-service password reset must not reach
this account.

**S4. Enroll TOTP while MFA is still off.** As `superadmin`:
`POST /api/v1/accounts/auth/login-mfa/totp/setup/` → scan the provisioning URI
into the custodian authenticator → `POST /api/v1/accounts/auth/login-mfa/totp/verify/`
with a current code. Confirm `LoginSecuritySettings.totp_secret` is set and
`totp_confirmed=True`. Two custodians should each enrol a device only if the
policy allows multiple factors; otherwise one device held under dual custody.

**S5. Rotate the password.** Replace `ChangeMe123!` with a generated 20+ character
secret stored only in the vault. Keep `is_active`, `is_staff`, `is_superuser`
unchanged. Verify `check_password("ChangeMe123!")` is now `False`.

**S6. Force MFA.** Set `LoginSecuritySettings.mfa_required=True` and
`mfa_enabled=True`, `preferred_method="totp"`.

**S7. Revoke everything.** Delete the account's Django sessions and blacklist all
of its outstanding refresh tokens — 82 were live at inspection and password
rotation does **not** invalidate them (refresh lifetime is 7 days):

```python
from django.contrib.sessions.models import Session
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

for s in Session.objects.filter(expire_date__gte=timezone.now()):
    if str(s.get_decoded().get("_auth_user_id")) == str(user.pk):
        s.delete()

for t in OutstandingToken.objects.filter(user=user):
    BlacklistedToken.objects.get_or_create(token=t)
```

**S8. Remove the executive signature (recommended).** The account holds signature
`4df7828e-…` with zero seals referencing it. A shared break-glass account must not
hold a seal signature. Confirm with the executive whose signature it is, then
delete it and re-create it on that person's named account if required. Skip only
on written legal instruction.

**S9. Smoke test.** Log in as `superadmin`: password must return an
`mfa_required` challenge, TOTP must complete it, a wrong code must fail, and the
old password must fail. Confirm no office inbox, no assigned work, no approvals.
Then revoke the test session and blacklist the token it created.

**S10. Record and monitor.** Write an `ActivityLog` `user_updated` entry against
the account describing the break-glass hardening (metadata: `break_glass`,
`mfa_totp`, `tokens_revoked`, `signature_removed`, custodian initials). Update the
runbook with custodian names, vault location, and the DB-level recovery procedure.
Review all `superadmin` events for 24 hours and at the next audit cycle.

**Rollback.** No rollback is expected to be needed except S6: if TOTP enrolment
is incomplete, keep `mfa_required=False` until a code has been verified, while the
password rotation (S5) and token revocation (S7) stand.

---

## 5. `gmict` — what must be confirmed before matching or deactivating

Every item must be answered and recorded in the change ticket. G1 determines which
path (§6 or §7) is taken; G2–G12 apply to both paths.

| # | Must confirm | Owner | Why it blocks |
|---|---|---|---|
| **G1** | Is "Gbotolorun Ayodele" a real, current NPA employee with an employee number, personnel number and substantive designation? | HR | No match may be created from a placeholder row; without this the account is surplus. |
| **G2** | Who substantively holds **GM ICT (HOD)** today? Roll row 2545 (Babatunde Idowu, `b.idowu`) is already imported and active as a principal of `OFF_DIV_ICT`. | HR | If Idowu holds it, `gmict` must be deactivated, not matched — two GM ICT identities would split approval authority. |
| **G3** | If HR says both men exist, what is `gmict`'s actual grade/designation and relationship to Idowu (acting, assistant, predecessor)? | HR | Determines whether the seat is shared and whether `MSS1`/`General Manager` is correct. |
| **G4** | Does any other account already belong to the same person (employee/personnel number, email, name)? | HR / ICT | `employee_id` has a unique constraint when set; a wrong match either fails or duplicates a person. |
| **G5** | Is `gm.ict@npa.gov.ng` a working shared mailbox, and is `gmict`'s password reset or MFA email path dependent on it? | ICT | A dead or unowned mailbox is an account-takeover path while the account stays active. |
| **G6** | Are all open items reassigned? `NPA/PROC/2025/0089` → proposed `gmengineering`; `NPA/PROC/2024/0234` is closed; `HQ/AGM/SA&DM/AD/001` (approver `a.dantosho`), `AD/002` (approver `edfa` → `v.redet`) and `0147` are creator-history only. | Business owner | Deactivation must not strand actionable work. |
| **G7** | Are the 2 open physical-document returns and the minute on `NPA/OFFDEPTICTSOFTWARE/2026/0000` complete, with no pending receipt owed by `gmict`? | Records | Physical custody obligations are not discharged by disabling a login. |
| **G8** | Will a second real principal be granted `can_approve` on `OFF_DIV_ICT`? After deactivation `b.idowu` is the only approver. Proposed: `as.abubakar` (emp 3516, Principal Manager ICT (HOD)). | ICT / Office head | Prevents a single-approver bottleneck in the ICT division. |
| **G9** | Do the 7 documents authored by `gmict` need authorship transfer, and which ones? At minimum the draft `NPA/FORM/COMP/2025/002`; published contract/BOQ/completion records are historical evidence and should keep their attribution. | Records | `Document.author` is `SET_NULL`, so deactivation alone leaves drafts owned by a disabled account. |
| **G10** | Is there any MFA/TOTP enrolment, executive signature, seal, delegation or acting appointment tied to `gmict` that must be revoked? | ICT / Registry | Currently none found; must be re-checked at execution time. |
| **G11** | Is the intent to keep the historical `created_by` attribution on the 3 cases and 3 correspondence (not rewrite it)? | Audit | Rewriting attribution would falsify the audit trail. |
| **G12** | Has HR, ICT and Audit signed the change, and is the target window agreed? | All three | `--apply`-class action on identity data. |

If **G1 = no** (or G2 shows Idowu holds the seat), proceed to §6. If **G1 = yes**
and G2/G3 show a genuine distinct seat holder, proceed to §7.

---

## 6. Recommended path — deactivate `gmict`

Do these in order, after §5 is signed off. Nothing here deletes the account.

**G-1. Reassign open work.** Apply the previously mapped owner changes:
`NPA/PROC/2025/0089` → `gmengineering`; `NPA/PROC/2025/0147` → `gmengineering` with
`current_office` corrected from `OFF_DIV_AUDIT` to `OFF_DEPT_CIVIL`. Leave
`created_by` untouched on all three cases and three correspondence.

**G-2. Transfer draft authorship (if G9 requires).** Reassign `Document.author` for
the named drafts; keep published records as they are.

**G-3. Close physical-document obligations (G7).**

**G-4. Grant second approver (G8).** Set `can_approve=True` on the chosen real
principal's `OFF_DIV_ICT` membership before disabling `gmict`.

**G-5. Revoke access.** Delete `gmict`'s Django sessions and blacklist all
outstanding refresh tokens (4 live at inspection). Deactivation alone does not
invalidate them.

**G-6. Deactivate.** Set `is_active=False`, `is_staff=False`,
`set_unusable_password()`, and disable the `OFF_DIV_ICT` membership
(`OfficeMembership.is_active=False`). Never delete the user, its audit entries, or
its historical `created_by` references.

**G-7. Code gate.** Remove `"gmict"` from `HOLD_USERNAMES` in
`accounts/management/commands/deactivate_mock_accounts.py`, leaving
`{"superadmin"}`. Without this the command will keep reporting `gmict` as `HOLD`
and never touch it.

**G-8. Command interaction to resolve before running.** `--apply` is all-or-nothing
and currently refuses because 27 offices would lose their only principal. To
deactivate `gmict` alone, either (a) wait until those offices are resolved, or
(b) add a scoped `--only <username>` filter to the command so the blocker gate is
evaluated for that subset only. Option (b) is the cleaner change and keeps the
gate intact; it must be tested on the test database before use.

**G-9. Verify.**
- `gmict` cannot authenticate (`is_active=False`, unusable password).
- 0 live refresh tokens, 0 sessions.
- No office inbox, approval task, minute, or case assigned to `gmict`.
- `OFF_DIV_ICT` still has an active real approver (`b.idowu`, plus the G8 grant).
- `ActivityLog` records the deactivation; historical entries remain.

**G-10. Rollback.** Reactivate, set a new password, re-enable the membership,
re-grant `can_approve` if it was added for G8. History is intact because nothing
was deleted.

---

## 7. Alternative path — match `gmict` (only if G1 and G3 confirm a real person)

Matching means turning the placeholder into a verified staff account, not merging
it into `b.idowu`.

1. Obtain the HR-confirmed employee number, personnel number, grade, substantive
   designation and official email. Do not derive these from the seed.
2. Confirm no other user holds that employee number (G4) — the unique constraint
   will otherwise reject the match.
3. Update `employee_id`, `personnel_number`, `grade_level`, `designation`,
   `honorific`/name parts and `email` from the roll. Keep `username` unchanged so
   history and the `HOLD` entry remain valid.
4. Rotate the password off `ChangeMe123!` and require TOTP MFA (same mechanics as
   §4 S4–S7 for that user).
5. Remove `"gmict"` from `HOLD_USERNAMES`; the account is then excluded from mock
   targeting automatically because `employee_id` is non-empty.
6. Keep `created_by` attribution. Re-run the deactivation dry run and confirm
   `gmict` no longer appears as a mock target.
7. If HR later confirms the seat belongs to Idowu, abandon this path and execute
   §6 instead — never run both.

---

## 8. Code/config changes required at cutover

| Change | File | When |
|---|---|---|
| `HOLD_USERNAMES = {"superadmin"}` (drop `gmict`) | `accounts/management/commands/deactivate_mock_accounts.py` | Only when §6 is approved |
| Optional `--only <username>` scoped gate | same command | Before any single-account `--apply` |
| Regression test: `superadmin` is never targeted | `accounts/test_deactivate_mock_accounts.py` | With the hold-list change |
| OIDC guard for superusers (see R3) | `accounts/views_auth.py` | Before `OIDC_ENABLED=true` anywhere |
| Break-glass runbook (custodians, vault, DB recovery) | operations documentation | With §4 |

---

## 9. Risks and residual decisions

**R1 — Single admin.** `superadmin` is the only superuser and only staff account.
If its credential is lost, there is no in-app recovery. Decision needed: approve a
named second superuser for dual control, or formally accept single-custodian risk
with the DB-level recovery procedure.

**R2 — Default credential in active use.** `ChangeMe123!` is still valid on both
accounts, and both have been used recently (16 impersonations by `superadmin`,
logins by `gmict` on 2026-11-12). This is the highest-severity item in the
document; §4 S5 and §6 G-6 remove it.

**R3 — OIDC can bind to `superadmin` without MFA.** The SSO callback resolves a
user by `external_auth_subject`, then **email**, then **username**, and issues
tokens directly without the MFA challenge
(`accounts/views_auth.py`, `oidc_callback`). While `OIDC_ENABLED=false` this is
dormant, but before SSO is switched on, an IdP identity with username
`superadmin` or email `superadmin@npa.gov.ng` would take over the account and
overwrite `auth_provider`. Mitigation: block OIDC binding for superusers, or pin
`external_auth_subject` to a reserved value and never match this account by
email/username.

**R4 — Token lifetime.** Refresh tokens live 7 days and are not invalidated by
deactivation or password change. Both cutovers therefore include explicit token
blacklisting.

**R5 — `last_login` is unreliable.** It is `NULL` for `superadmin` despite 44
recorded logins. Monitoring must use `ActivityLog`, not `last_login`.

**R6 — Signature on a shared account.** `superadmin` holds an executive signature
with no dependent seals. Leaving it in place lets a shared credential produce
sealed documents under an unclear identity.

**R7 — `gmict` holds the only second approver flag in ICT.** Deactivating without
G8 leaves `b.idowu` as the sole approver for `OFF_DIV_ICT`.

---

## 10. Re-verification (read-only) after preparation

```text
superadmin: active, staff, superuser; 0 office memberships; ChangeMe123! valid;
            mfa_required=False; 82 live refresh tokens; last action 2026-11-13 15:58
gmict:      active; OFF_DIV_ICT principal (can_approve); ChangeMe123! valid;
            4 live refresh tokens; case NPA/PROC/2025/0089 in_progress
b.idowu:    active; emp 2545; GENERAL MANAGER ICT (HOD); OFF_DIV_ICT principal, can_approve
```

No account field, membership, token, signature, password or record was changed in
producing this document. All operations were read-only ORM queries; no management
command with `--apply` was run.
