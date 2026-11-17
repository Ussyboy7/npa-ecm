# Office Memberships and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale office membership management with scoped API queries, expose actionable assignment conflicts, improve office/division analytics drill-down, and show honest observed workflow timestamp gaps.

**Architecture:** The membership API remains the source of truth and gains a quality summary plus office membership summary fields. Organization context loads only the current user's memberships; other screens request membership data by user/office, and the admin grid uses server pagination/search/filters. Analytics computes timestamp gaps from existing correspondence/minute events and exposes independent links to the appropriate Offices views.

**Tech Stack:** Django REST Framework, Django ORM/PostgreSQL, Next.js App Router, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-office-memberships-analytics-design.md`

## Global Constraints

- Do not globally fetch every office membership; fetch current-user or explicitly selected office/user rows only.
- Preserve existing permissions and use server-side membership filtering, search, and pagination.
- Stage analytics are explicitly labeled **Observed timestamp gaps** and omit unavailable gaps rather than treating them as zero.
- Office links open office-specific memberships; division links open the office directory filtered to the division.
- Remove only the obsolete `tab=memberships` alias; preserve `/admin/organization?tab=offices&view=memberships` and supported filter deep links.
- Preserve unrelated local changes and artifacts; do not commit or push.

## Review Focus

- User-filtered queries must still show the current user's memberships when they are beyond page one of the unfiltered catalog; test the scoped endpoint and the current-user context query.
- A membership search/status/office change must reset the server page and stale responses must not replace newer results; test query composition and filter behavior.
- Missing or out-of-order workflow event timestamps must not create negative or fabricated durations; test omitted stage samples and zero-sample output.
- Division office links must not open the membership list; office membership links must retain the selected office; test exact URLs.
- Each quality category must exclude inactive memberships and return only the actionable conflict groups; test active/inactive mixtures and disjoint groups.

---

### Task 1: Scoped membership API and actionable quality findings

**Files:**
- Modify: `backend/organization/views.py`
- Modify: `backend/organization/serializers.py`
- Test: `backend/organization/tests/test_office_memberships.py`

**Interfaces:**
- Produces `GET /api/v1/organization/office-memberships/quality/` with counts and conflict groups for multiple active principals by office, multiple active primary assignments by user, and multiple active membership roles per `(office,user)` pair.
- Office list serialization exposes active member count and the active principal name for the directory without loading membership rows in the browser.

- [ ] Write failing API tests for the three conflict groups, inactive exclusion, role-grouped duplicates, and office summary fields.
- [ ] Run the focused Django tests and confirm expected failures.
- [ ] Implement aggregate ORM queries, bounded result details, the quality action, and office summary annotations/serializer fields.
- [ ] Rerun focused Django tests and verify authorization behavior and query filters.

### Task 2: Replace global membership context with current-user and selected-scope queries

**Files:**
- Modify: `frontend/contexts/OrganizationContext.tsx`
- Modify: `frontend/lib/organization-types.ts`
- Modify: `frontend/app/correspondence/inbox/page.tsx`
- Modify: `frontend/app/correspondence/office-sent/page.tsx`
- Modify: `frontend/app/correspondence/records/page.tsx`
- Modify: `frontend/app/correspondence/register/page.tsx`
- Modify: `frontend/app/correspondence/[id]/page.tsx`
- Modify: `frontend/app/acting/page.tsx`
- Modify: `frontend/app/cases/components/CasesListContent.tsx`
- Modify: `frontend/hooks/use-sidebar-visibility.ts`
- Modify: `frontend/components/correspondence/MinuteModal.tsx`
- Modify: `frontend/components/correspondence/TreatmentModal.tsx`
- Modify: `frontend/components/correspondence/AdditionalMinuteModal.tsx`
- Modify: `frontend/components/dms/CorrespondenceRoutingView.tsx`
- Modify: `frontend/components/correspondence/AuditRouteDialog.tsx`
- Modify: `frontend/components/admin/UserEditDialog.tsx`
- Modify: `frontend/app/admin/organization/acting/page.tsx`
- Test: existing frontend organization/routing tests as appropriate

**Interfaces:**
- Context exposes `myOfficeMemberships`, containing only the authenticated user's active and inactive assignments fetched with `user=<currentUser.id>`; never use it to infer other users' memberships.
- Selected-user and selected-office callers use the existing `/organization/office-memberships/?user=...` or `?office=...` filters and map responses with `mapApiOfficeMembership`.
- Office directory member counts/principal labels come from Task 1 office list fields.

- [ ] Add/adjust tests proving the context request is user-scoped and consumers do not query the unfiltered membership endpoint.
- [ ] Run the focused frontend tests and observe the global-query expectation fail before implementation.
- [ ] Scope the context request; migrate current-user consumers and selected user/office flows, including dialogs and acting-management lists.
- [ ] Rerun focused frontend tests, type-check, and targeted ESLint.

### Task 3: Server-driven Offices membership view, quality panel, deep links, and legacy cleanup

**Files:**
- Modify: `frontend/app/admin/organization/page.tsx`
- Modify: `frontend/app/admin/organization/__tests__/offices-memberships-view.test.tsx`
- Modify: `frontend/lib/organization-types.ts` only if Task 1 response fields need shared typing

**Interfaces:**
- Membership URL query: `tab=offices&view=memberships&office=<id|all>&status=<active|all>&search=<text>&page=<number>`.
- Selected-office Members action includes the office in the URL and Add Membership starts with that office already selected.
- Quality links navigate to memberships filtered by the relevant office/search scope.
- `tab=memberships` no longer maps or redirects; invalid tabs fall back to Organization's standard tab behavior.

- [ ] Add failing view tests for server query params, filter/page reset, URL restore, selected-office Add Membership default, quality issue action links, office directory counts, and removal of `tab=memberships` alias.
- [ ] Run the focused Vitest file and confirm the expected failures.
- [ ] Implement API-driven search/filter/pagination, quality findings, URL state, office defaulting, and remove the alias.
- [ ] Rerun focused tests and targeted ESLint.

### Task 4: Observed workflow timestamp gaps in performance analytics

**Files:**
- Modify: `backend/analytics/services.py`
- Modify: `backend/analytics/tests.py` or `backend/analytics/tests/test_services.py`
- Modify: `frontend/lib/analytics-client.ts`

**Interfaces:**
- Performance payload adds `stageDurations` with definitions/count/average-hours for `registrationToRouting`, `routingToApproval`, `approvalToCompletion`, and `endToEnd`.
- Milestones are correspondence `created_at`, earliest non-recalled routed minute timestamp, earliest non-recalled approval minute timestamp, and correspondence `completed_at`; ignore absent endpoints, archived rows, and negative intervals.

- [ ] Add failing tests for known milestone gaps, missing route/approval stages, recalled minutes, and out-of-order events.
- [ ] Run focused analytics service tests and confirm expected failures.
- [ ] Implement one-pass stage interval aggregation using the already-fetched correspondence minutes.
- [ ] Rerun focused Django tests and frontend type-check.

### Task 5: Analytics drill-down links and observed-gap presentation

**Files:**
- Modify: `frontend/components/analytics/PerformanceAnalyticsTab.tsx`
- Modify: `frontend/components/analytics/DivisionAnalyticsTab.tsx`
- Modify: `frontend/components/analytics/ExecutiveDashboardTab.tsx`
- Modify: `frontend/app/admin/organization/page.tsx` for division-filtered directory support, if not included in Task 3
- Test: focused analytics frontend tests (create only if existing conventions provide an analytics test location)

**Interfaces:**
- Office-specific figures link to `/admin/organization?tab=offices&view=memberships&office=<id>`.
- Division figures link to `/admin/organization?tab=offices&division=<id>` and the directory filters its office rows by division.
- Stage chart title/description states **Observed timestamp gaps** and renders sample counts alongside average hours.

- [ ] Add failing tests for office-memberships vs division-directory destination URLs and missing stage data rendering.
- [ ] Run focused frontend tests and confirm failures.
- [ ] Add explicit links and the observed-gap chart with counts and no fabricated zero-duration samples.
- [ ] Run frontend tests, type-check, and targeted ESLint.

### Task 6: Final focused verification and graph refresh

**Files:** all implementation files above.

- [ ] Run focused backend organization/analytics tests and `makemigrations --check --dry-run`.
- [ ] Run the full backend test suite and full frontend test suite, plus frontend type-check and targeted lint.
- [ ] Run `git diff --check` and `graphify update .`; confirm the working tree contains only this feature's changes plus the pre-existing user artifacts.
