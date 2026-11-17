# Office Memberships and Analytics Design

## Intent

Make office-level membership management scale beyond a globally loaded catalog, make assignment conflicts visible and actionable, and let Analytics lead from division or office metrics to the correct organization view.

## Goals

- Load only the signed-in user's memberships for app-wide context; fetch other memberships only by selected user or office.
- Server-filter, search, paginate, and summarize the Offices memberships view.
- Preselect the selected office in Add Membership and preserve office/status/search/page in the view URL.
- Flag only actionable active-assignment conflicts: more than one active principal in an office; more than one active primary assignment for a person; multiple active memberships for the same person and office.
- Add workflow stage durations as **observed timestamp gaps**, without implying unrecorded transitions. Use correspondence creation, the first non-recalled routed minute, first approval minute, and completion timestamps; do not fabricate missing milestones or report missing gaps as zero.
- Link office analytics to that office's memberships; link division analytics to the Offices directory filtered to that division.
- Remove the obsolete `tab=memberships` compatibility alias. Keep the nested Offices memberships view.

## Non-goals

- Do not delete unrelated pages, the OfficeMembership model/API, or unrelated organization functionality.
- Do not add a new workflow event table or claim exact durations where event timestamps are absent.
- Do not expand quality review to general data hygiene beyond the three named conflicts.

## Constraints and decisions

- Preserve current Django/DRF and Next.js conventions and permissions.
- Use the existing paginated office-membership endpoint with bound ORM filters; never download all memberships for a narrow selection.
- Stage gap calculations use records with both observed endpoints and nonnegative chronological timestamps; clearly label the result "Observed timestamp gaps".
- Existing local environment files, generated artifacts, and unrelated worktree changes are not part of this work.

## Approaches considered

1. Keep global context data and paginate only the membership page: smallest patch, but still loads all memberships at app startup and does not meet the scale goal.
2. Scope context to the current user and fetch other rows by user/office, with server-side membership pages and summary metadata: selected because it preserves existing consumers while avoiding global membership downloads.
3. Add persisted workflow-stage events: more complete future timing, but requires a migration and cannot reconstruct history. Existing timestamps were selected for observed-gap analytics.

## Builder choices

- For a multiple-active-principals finding, group active memberships in an office whose assignment role is `principal`.
- For conflicting primary assignments, group active `is_primary` memberships by user and flag counts greater than one.
- For duplicate assignments, group active memberships by `(office, user)` and flag counts greater than one, retaining role rows so administrators can resolve the conflicting assignments.
- Use existing membership edit/delete controls as the corrective action.
