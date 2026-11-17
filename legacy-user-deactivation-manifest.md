# NPA ECM mock-user deactivation manifest (read-only)

Generated 2026-11-13T21:15:49+00:00. **No accounts were deactivated; no memberships or work were reassigned.**

Workbook: `legacy-user-deactivation-manifest.xlsx` — account roster, all-office coverage, 27 blockers, 56 duplicate-principal list and roster, open work, and proposed batches.

## Snapshot

- 117 blank-employee-ID users; 117 match the seed MOCK_USERS list.
- 117 active; 117 still accept ChangeMe123!.
- 98 have any active office membership; 96 have an active primary membership; 19 have none; 21 have no active primary membership.
- 27 offices have mock principal(s) and no real principal; 56 offices have more than one active principal. These sets overlap.
- 5 actionable open-work references; 9 separate creator-attribution references that should remain historical.

## Actionable open work

| Account | Type | Reference | Status | Relationship |
|---|---|---|---|---|
| edfa | correspondence | HQ/AGM/SA&DM/AD/002 | in-progress | current approver |
| superadmin | case | AQ-2026-001 | open | assigned owner |
| gmict | case | NPA/PROC/2025/0089 | in_progress | assigned owner |
| agmabuja | case | NPA/PROC/2025/0147 | in_progress | assigned owner |
| edfa | minute | HQ/AGM/SA&DM/AD/002 | pending response | direct recipient |

Creator-only rows appear in the workbook and are historical attribution; do not reassign them solely to deactivate the account.

## Proposed order (not executed)

1. Pre-cutover: backup; HR/business/security owners; name and test real principals for all 27 blockers; normalize 56 duplicate-principal lists; resolve assigned work; approve a change window.
2. Hold `superadmin` until a replacement superuser is named and tested, credentials/MFA are secured, and open cases are reviewed. Never disable the last superuser.
3. Hold `gmict` pending HR identity decision; rotate credential, preserve its history, resolve its office and case dependencies.
4. Pilot unseated users with no actionable assignments; verify login denial and no queue/history damage.
5. Deactivate covered office members in small office-based batches after owner sign-off and duplicate-principal normalization.
6. Deactivate blocker-office principals only after each real replacement is assigned and inbox/routing/approval is tested.
7. Make an explicit final keep/deactivate decision for `superadmin` and `gmict`; never hard-delete.

Re-run the live dependency queries immediately before any future action; this workbook is a point-in-time snapshot.
