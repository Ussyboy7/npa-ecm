# Sidebar Access and Archive Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align navigation, backend authorization, role presets, archive-level visibility, unarchiving, retention, and DMS ACLs with the approved page-access and records policy.

**Architecture:** Backend `PAGE_ACCESS_RULES` in `organization/permissions_catalog.py` is the page-level policy source. A new authenticated page-access endpoint resolves role permissions plus office/org scope for the frontend; backend endpoints call the same resolver as authorization, while action-specific permissions remain independently enforced. Archive operations share one org-level resolver, and unarchive state is persisted before filing so restoration is exact.

**Tech Stack:** Django/DRF, Django ORM, Next.js App Router, React, TypeScript, pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-sidebar-access-and-archive-governance-design.md`

## Global Constraints

- Keep the backend as the authorization authority; hiding a sidebar link is not access control.
- Do not auto-grant office memberships to System Administrators.
- Archive level is one authoritative value on the correspondence record; no duplicate archive record is created.
- Unarchive must require a reason, preserve audit history, and restore the exact pre-archive status.
- Preserve legal-hold protections and additive document-package grants.
- Do not deploy, force-seed a live environment, or alter production data.
- Preserve pre-existing unrelated worktree modifications.

## Review Focus

- Existing archived rows have no persisted pre-archive status; migration/backfill must choose a safe fallback, tested for inward and outward records.
- Role preset sync runs with `--force` at startup; AGM reduction and System Administrator expansion must be explicit in tests and documented as affecting seeded roles at restart.
- Case list scopes and detail endpoints must not allow a caller to evade page authorization by manually changing the `scope` parameter.
- Archive legacy rows with blank `archive_level` must not become accidentally public or invisible outside the documented legacy org-boundary rule.
- Package ACL reconciliation must preserve prior user/office grants while adding org-level grants.

---

### Task 1: Canonical page access rules and authenticated resolver

**Files:**
- Modify: `backend/organization/permissions_catalog.py`
- Modify: `backend/organization/permission_utils.py`
- Modify: `backend/accounts/views_auth.py`
- Modify: account/auth URL registration
- Test: `backend/organization/tests/test_page_access.py`
- Test: `backend/accounts/tests.py` or focused endpoint test module

**Interfaces:**
- Produce `PAGE_ACCESS_RULES: dict[str, dict[str, object]]` with each page id, required any/all permission keys, and scope mode.
- Produce `resolve_page_access(user) -> dict[str, dict[str, bool | str]]` and `require_page_access(user, page_id, scope=None) -> None`.
- Produce authenticated endpoint returning `{"pages": resolve_page_access(request.user)}`.

- [ ] Test resolver for officer, office seat, AGM, GM/ED, secretary, superuser and unauthorised page ids.
- [ ] Test authenticated endpoint response and anonymous denial.
- [ ] Implement one backend rule map using existing precise role flags and `get_office_queue_office_ids` / `resolve_user_org_scope` for contextual pages.
- [ ] Run focused resolver/API tests.

### Task 2: Role preset rebalance

**Files:**
- Modify: `backend/organization/permissions_catalog.py`
- Test: `backend/organization/tests/test_permission_utils.py` or new preset tests

**Interfaces:**
- Existing `ROLE_PERMISSION_PRESETS` remains canonical for role bootstrap.

- [ ] Assert Assistant General Manager has no `can_manage_users`, `can_manage_roles`, or `can_manage_org_structure` by default, while preserving operational/archive permissions.
- [ ] Assert System Administrator has the requested full correspondence capabilities plus existing system administration capabilities, but no office membership is created by role setup.
- [ ] Modify presets and run permission tests plus a focused setup-role command test with isolated test data.

### Task 3: Archive-level visibility and archive permissions

**Files:**
- Modify: `backend/correspondence/correspondence_views.py`
- Modify: `backend/correspondence/archive_policy.py`
- Test: `backend/correspondence/tests/test_archive_levels.py`
- Test: new or existing registered/archive scope tests

**Interfaces:**
- `_get_allowed_archive_levels(user)` delegates to explicit role-level permissions, retaining the documented legacy `can_archive` → department-only fallback.
- `_get_archived_queryset(user)` scopes each archive level to its unit and allows read visibility upward only.

- [ ] Test department-level memo visibility to department, containing division and containing directorate; reject unrelated scopes and downward access.
- [ ] Test division-level memo visibility to division/directorate, and directorate-level visibility to directorate only.
- [ ] Test query-level archive filter rejects levels outside permission/scope.
- [ ] Implement row-level predicates based on `archive_level` and the resolved department/division/directorate hierarchy; preserve participation-only access to a record where current policy explicitly grants it, but never grant archive filing authority from participation.
- [ ] Run archive and registered-scope tests.

### Task 4: Audited unarchive / return to records

**Files:**
- Modify: `backend/correspondence/models.py`
- Create migration: `backend/correspondence/migrations/<generated>_...py`
- Modify: `backend/correspondence/correspondence_views.py`
- Modify: `backend/correspondence/serializers.py` if needed
- Modify: `frontend/app/correspondence/[id]/components/ActionsPanel.tsx`
- Test: `backend/correspondence/tests/test_archive_levels.py`

**Interfaces:**
- Persist `pre_archive_status` as nullable lifecycle status.
- Add `POST /correspondence/items/{id}/unarchive/` accepting `reason`.

- [ ] Test restoring completed, dispatched and acknowledged prior statuses; clear active archive level/timestamp; require reason; deny non-authorised/out-of-scope users; assert audit metadata.
- [ ] Generate migration with safe legacy backfill: outward items with dispatch/ack evidence restore to acknowledged/dispatched as applicable; other legacy archived items restore to completed.
- [ ] Implement unarchive using archive-level authority and scope against the current filing unit.
- [ ] Add confirmation/reason UI for archived records and verify cancellation/submission state in component tests.
- [ ] Run focused backend and frontend tests.

### Task 5: Retention schedule selection follows current filing level

**Files:**
- Modify: `backend/records/services.py`
- Test: `backend/records/tests/test_retention_policy.py` (or existing records tests)

**Interfaces:**
- `find_retention_schedule(correspondence)` resolves exact archive-level+unit match first, then matching org scope, then existing global fallback; explicit per-correspondence schedule remains highest priority.

- [ ] Test schedule selection where multiple schedules exist at department/division/directorate/global scope.
- [ ] Test refiling changes the selected applicable schedule for future due-disposal calculations; do not silently reset `archived_at`.
- [ ] Test due-for-disposal calculation still excludes legal holds and disposed rows.
- [ ] Implement deterministic schedule precedence and run records tests.

### Task 6: Department members inherit division-level document ACL

**Files:**
- Modify: `backend/dms/visibility.py`
- Modify: `backend/dms/drm.py`
- Test: `backend/dms/tests/test_visibility_and_access.py`

**Interfaces:**
- Both ACL evaluators match `permissions__divisions__departments=user.department_id` when the user lacks `division_id`.

- [ ] Test list, search and effective DRM access for department-only user under the granted division; ensure other division remains denied.
- [ ] Implement identical inheritance in queryset and effective-rights resolution.
- [ ] Run focused DMS test file.

### Task 7: Tabbed page hubs and sidebar gates

**Files:**
- Modify: `frontend/components/AppSidebar.tsx`
- Modify: `frontend/hooks/use-sidebar-visibility.ts`
- Modify: `frontend/app/cases/page.tsx`
- Modify: `frontend/app/cases/components/CasesListContent.tsx`
- Modify: `frontend/app/approvals/page.tsx`
- Modify: `frontend/components/dms/DocumentsListPage.tsx`
- Modify: `frontend/components/registry/RegistryTabList.tsx`
- Modify: `frontend/app/physical-documents/page.tsx` and `frontend/app/correspondence/registered/page.tsx` as needed
- Modify: admin overview copy/nav label
- Test: focused sidebar/hub Vitest tests

**Interfaces:**
- Canonical hubs use query parameters `?tab=my|office|all`, `?level=executive|departmental`, `?tab=documents|forms`, and `?tab=registered|physical` (preserve existing route aliases).
- Frontend receives page visibility from Task 1; no duplicated permission inference for page gates.

- [ ] Add tests that nav entries are singular and inaccessible tabs are unavailable/redirected.
- [ ] Merge Cases pages into query-backed tabs while retaining old paths as redirects to their corresponding scope.
- [ ] Keep Approvals and Registry tabs; consolidate their sidebar entries and apply resolved tab visibility.
- [ ] Add Forms as a tab in Documents, retain `/audit/forms` as a compatibility redirect to the Forms tab, and enforce correct backend form-library access.
- [ ] Keep one Dashboard entry and rename Admin Dashboard to Admin Overview.
- [ ] Fix Templates, Audit Trail, My Cases and office queue sidebar gates to match backend page rules.
- [ ] Run targeted TypeScript, ESLint and frontend unit tests.

### Task 8: Enforce shared page rules on page APIs

**Files:**
- Modify relevant: `backend/correspondence/case_views.py`, `backend/correspondence/minutes_views.py`, `backend/dms/views.py`, `backend/forms/views.py`, `backend/correspondence/physical_views.py`, `backend/audit/views.py`, `backend/records/views.py`, `backend/analytics/views.py`, plus other endpoints identified by the page map.
- Test: corresponding feature test modules and `backend/organization/tests/test_page_access.py`

**Interfaces:**
- Page collection/detail operations enforce the same page id and contextual scope used by `require_page_access`; action permissions remain additional checks.

- [ ] Add denial tests for direct API calls by a user who lacks page access despite manually entering the URL.
- [ ] Apply rule map to page entry endpoints and contextual query scopes; verify detail endpoints still enforce object-level org/participant checks.
- [ ] Run affected API test modules.

### Task 9: Final verification and review

**Files:** all changed files above.

- [ ] Run backend correspondence, DMS, records, organization, accounts/forms, and case tests.
- [ ] Run frontend `npm run type-check`, focused lint, and focused Vitest suites.
- [ ] Run Django `manage.py check`, `makemigrations --check --dry-run`, and `git diff --check`.
- [ ] Inspect resulting sidebar in preview and test representative role scenarios without mutating seeded records.
- [ ] Refresh code graph and perform a separate review pass against this plan/spec.

## Review Focus

- Archived outward rows with different dispatch evidence are backfilled/restored to the right lifecycle status.
- `archive_level=all` does not bypass page/org filtering.
- User detail access by route does not bypass case/document/archive object scopes.
- Submissions remain personally scoped after Forms moves under Documents.
- System Administrator's requested correspondence permissions do not imply office seat membership.
