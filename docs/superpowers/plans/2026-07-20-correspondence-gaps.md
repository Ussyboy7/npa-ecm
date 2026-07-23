# Correspondence Feature Gap Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 10 identified gaps across 6 correspondence features.

**Architecture:** Independent tasks grouped by layer (frontend-only, backend-only, mixed). Most tasks have no dependencies on each other and can be executed in parallel.

**Tech Stack:** Django 4.2 + DRF (backend), Next.js 14 + TypeScript (frontend), Django Channels (notifications)

---

### Task 1: Split views.py into domain files

**Files:**
- Create: `backend/correspondence/correspondence_views.py` (core CRUD + reassign/withdraw/cancel/resend)
- Create: `backend/correspondence/inbox_views.py` (office-inbox, secretary-inbox, my-inbox, sidebar-counts)
- Create: `backend/correspondence/sent_views.py` (my-sent, office-sent)
- Create: `backend/correspondence/archive_views.py` (archive-records, records-archive, archive_single, bulk-archive)
- Create: `backend/correspondence/minutes_views.py` (MinuteViewSet actions - pending-approvals, recall, mark-opened, etc.)
- Create: `backend/correspondence/case_views.py` (CaseViewSet actions - comments, SLA, import/export, etc.)
- Modify: `backend/correspondence/views.py` → delete, replace with re-exports from new files
- Modify: `backend/correspondence/urls.py` → update imports

**Interfaces:**
- Consumes: existing models, serializers, services
- Produces: Same URL structure, same API contract, no breaking changes

- [ ] Create `correspondence_views.py` — extract `CorrespondenceViewSet` CRUD core (create, update, filter_queryset, get_queryset, reassign, withdraw, cancel_draft, resend_draft, resend_reminder, remind_branch, force_complete_branch, list_parallel_branches, create_dispatch, acknowledge, treat_and_respond, regenerate_completion_package)
- [ ] Create `inbox_views.py` — extract office-inbox, secretary-inbox, my-inbox, sidebar-counts actions
- [ ] Create `sent_views.py` — extract my-sent, office-sent actions
- [ ] Create `archive_views.py` — extract archive-records, records-archive, archive_single, bulk-archive, bulk-delete
- [ ] Create `minutes_views.py` — extract MinuteViewSet + ParallelRoutingGroupViewSet
- [ ] Create `case_views.py` — extract CaseViewSet + CaseTemplateViewSet + CaseCommentViewSet + CaseWorkflowRuleViewSet + CaseSLAViewSet + CaseCorrespondenceLinkViewSet
- [ ] Extract remaining viewsets (CorrespondenceAttachmentViewSet, CorrespondenceDistributionViewSet, CorrespondenceDocumentLinkViewSet, DelegationViewSet, CorrespondenceDelegationViewSet, CorrespondenceDraftViewSet, CorrespondenceTemplateViewSet, DispatchRecordViewSet) into existing pattern files or grouped files
- [ ] Replace `views.py` with re-exports from new files
- [ ] Update `urls.py` imports
- [ ] Run `python manage.py test correspondence` to verify no regressions

---

### Task 2: Add read/unread tracking for inbox

**Files:**
- Create: `backend/correspondence/migrations/XXXX_read_receipt.py`
- Modify: `backend/correspondence/models.py` — add `ReadReceipt` model or `viewed_by` field
- Modify: `backend/correspondence/inbox_views.py` — mark items as read on fetch, add unread-count to sidebar-counts
- Modify: `backend/correspondence/serializers.py` — add `is_read` field to inbox serializer
- Modify: `frontend/app/correspondence/inbox/components/InboxCorrespondenceCard.tsx` — show unread indicator
- Modify: `frontend/app/correspondence/inbox/page.tsx` — pass read status data

**Interfaces:**
- Consumes: `CorrespondenceViewSet.office_inbox` response → adds `is_read` per item
- Produces: `sidebar-counts` endpoint returns `unread_inbox_count`

- [ ] Add `ReadReceipt` model (user FK, correspondence FK, timestamp) or `viewed_by` M2M on Correspondence
- [ ] Create migration
- [ ] Add `mark_inbox_as_read` helper that bulk-creates ReadReceipt for items returned by inbox query
- [ ] Modify `office_inbox` action to annotate each item with `is_read` based on ReadReceipt existence
- [ ] Add `unread_inbox_count` to sidebar-counts response
- [ ] Test: `python manage.py test correspondence.tests.test_inbox_read_receipt`
- [ ] Frontend: Add `is_read` prop to InboxCorrespondenceCard; render blue dot for unread, faded bg for unread
- [ ] Frontend: Pass read status from inbox page to card component

---

### Task 3: Wire notifications infrastructure

**Files:**
- Modify: `backend/notifications/models.py` — verify model has all needed fields (type, reference_id, action_url)
- Modify: `backend/correspondence/correspondence_views.py` — emit notifications on reassign, dispatch-ack, minute-response
- Modify: `backend/notifications/consumers.py` — verify group-send works for correspondence events
- Create: `backend/notifications/serializers.py` — serializer for notification payload
- Create: `backend/notifications/views.py` — list-notifications + mark-read endpoint
- Modify: `backend/notifications/urls.py` — register notification endpoints
- Modify: `frontend/app/correspondence/inbox/page.tsx` — listen for WebSocket notifications
- Modify: `frontend/contexts/CorrespondenceContext.tsx` — handle real-time updates

**Interfaces:**
- Consumes: existing `notifications` app, existing Django Channels setup
- Produces: WebSocket events on correspondence mutations, sidebar badge updates

- [ ] Audit `notifications/models.py` — verify `Notification` model has `type`, `action_url`, `reference_id`, `actor`, `recipient`, `is_read` fields
- [ ] Add notification triggers to key correspondence actions (reassign, dispatch-ack, minute-added)
- [ ] Create notification list endpoint (paginated, filterable by is_read)
- [ ] Create notification mark-read endpoint (single + bulk)
- [ ] Wire WebSocket to push notification events to user's group
- [ ] Frontend: Add notification badge to sidebar
- [ ] Frontend: Add notification dropdown/list component
- [ ] Frontend: Connect WebSocket on login, handle reconnect

---

### Task 4: Add frontend tests

**Files:**
- Modify: `frontend/package.json` — ensure vitest/jest config exists
- Create: `frontend/app/correspondence/inbox/__tests__/InboxCorrespondenceCard.test.tsx`
- Create: `frontend/app/correspondence/register/__tests__/register-utils.test.ts`
- Create: `frontend/app/correspondence/register/__tests__/register-state-reducer.test.ts`
- Create: `frontend/components/correspondence/__tests__/FlowTypeBadge.test.tsx`
- Create: `frontend/lib/__tests__/correspondence-helpers.test.ts`

**Interfaces:**
- Consumes: existing components, utils, and helpers
- Produces: test coverage for critical UI logic

- [ ] Set up vitest config if not present (check `frontend/vitest.config.ts` or similar)
- [ ] Write tests for `register-state-reducer.ts` — test each action type (SET_STEP, UPDATE_FORM_DATA, ADD_DOCUMENT_FILES, RESET_FORM, etc.)
- [ ] Write tests for `register-utils.ts` — test `validateStep`, `validateFormData`, `buildSubmissionFormData`, `calculateCompletionPercentage`
- [ ] Write tests for `correspondence-helpers.ts` — test `formatDate`, `formatDateTime`, priority/status badge variants, overdue check
- [ ] Write tests for `FlowTypeBadge.tsx` — render tests for inward/outward/internal/external
- [ ] Write tests for `InboxCorrespondenceCard.tsx` — render with various props, conditional badge rendering
- [ ] Verify all tests pass

---

### Task 6: Server-side draft sync

**Files:**
- Modify: `frontend/app/correspondence/register/use-draft-auto-save.ts` — add server-side sync alongside localStorage
- Modify: `frontend/app/correspondence/register/page.tsx` — load drafts from server on mount
- Modify: `frontend/components/layout/SidebarNavigation.tsx` — add "My Drafts" link with count badge
- Modify: `frontend/hooks/use-sidebar-counts.ts` — fetch draft count
- Modify: `backend/correspondence/correspondence_views.py` — add draft count to sidebar-counts endpoint

**Interfaces:**
- Consumes: `CorrespondenceDraftViewSet` (already exists at views.py:4638)
- Produces: Drafts synced to server, "My Drafts" sidebar link with badge

- [ ] Read `CorrespondenceDraftViewSet` and `CorrespondenceDraftSerializer` to confirm existing API surface
- [ ] Modify `use-draft-auto-save.ts`:
  - After saving to localStorage, also PATCH/POST to server draft endpoint
  - Debounce server sync (3s after last change)
  - Handle offline gracefully (queue for later sync)
- [ ] Modify `register/page.tsx`:
  - On mount, fetch drafts from server via `CorrespondenceDraftViewSet`
  - Show "Continue Draft" prompt if unsaved draft exists
- [ ] Get draft count from backend, add to sidebar
- [ ] Test: register a correspondence partially, navigate away, verify draft appears in sidebar

---

### Task 7: Physical document detail integration

**Files:**
- Modify: `backend/correspondence/correspondence_views.py` or `serializers.py` — include linked physical document data in correspondence detail response
- Modify: `frontend/app/correspondence/[id]/components/CorrespondenceHeader.tsx` or new section — show physical copy status
- Create: `frontend/app/correspondence/[id]/components/PhysicalCopySection.tsx`

**Interfaces:**
- Consumes: `Correspondence` detail endpoint → now includes `physical_documents` array
- Produces: Physical copy section on correspondence detail page

- [ ] Backend: Add `PhysicalDocument` inline serializer or include in `CorrespondenceDetailSerializer`
- [ ] Frontend: Create `PhysicalCopySection.tsx` showing tracking number, location, status, checkout history
- [ ] Frontend: Integrate into detail page layout (below header or in sidebar panel)
- [ ] Test: create correspondence with `hasPhysicalCopy=true`, verify physical document appears on detail page

---

### Task 8: Mobile responsive for list pages

**Files:**
- Modify: `frontend/app/correspondence/inbox/page.tsx` — add responsive breakpoints
- Modify: `frontend/app/correspondence/inbox/components/InboxCorrespondenceCard.tsx` — condensed mobile card
- Modify: `frontend/app/correspondence/office-sent/page.tsx` — responsive layout
- Modify: `frontend/app/correspondence/registered/page.tsx` — responsive layout (switch table to cards on mobile)
- Modify: `frontend/app/correspondence/records/page.tsx` — responsive layout

**Interfaces:**
- Consumes: existing pages and components
- Produces: Mobile-adapted versions of all 4 list pages

- [ ] Add `useIsMobile` or CSS breakpoints to detect mobile viewport
- [ ] Inbox: Cards should be full-width on mobile, hide summary metadata in condensed view, filter panel slides in as overlay
- [ ] Office Sent: Same card-to-condensed pattern
- [ ] Registered: Switch from table to stacked card layout on mobile (`hidden md:table-cell` approach)
- [ ] Records: Same card-stack on mobile
- [ ] Add bottom nav or sticky filter button for mobile
- [ ] Test: resize browser to mobile widths, verify usability

---

### Task 9: Accessibility improvements

**Files:**
- Modify: `frontend/app/correspondence/inbox/page.tsx` — add aria-labels
- Modify: `frontend/app/correspondence/inbox/components/InboxCorrespondenceCard.tsx` — card roles and labels
- Modify: `frontend/app/correspondence/office-sent/page.tsx` — aria-labels
- Modify: `frontend/app/correspondence/registered/page.tsx` — table roles and labels
- Modify: `frontend/app/correspondence/records/page.tsx` — aria-labels
- Modify: `frontend/components/ui/PaginationControls.tsx` — aria-labels
- Modify: `frontend/components/ui/LoadingState.tsx` — aria-live polite

**Interfaces:**
- Consumes: existing page/component props
- Produces: Accessible filter controls, lists, and navigation

- [ ] Add `aria-label` to all search inputs across inbox, office-sent, registered, records pages
- [ ] Add `aria-label` to filter Select components
- [ ] Add `role="list"` and `role="listitem"` to card containers (inbox, office-sent)
- [ ] Add `role="region"` with `aria-label` to stat card sections
- [ ] Add `aria-live="polite"` to LoadingState
- [ ] Add `aria-label` to PaginationControls (page numbers, next/prev)
- [ ] Add focus management when filter change triggers data reload
- [ ] Test: run aXe DevTools or similar on each page

---

### Task 10: Standardize Archives/Records naming

**Files:**
- Modify: `frontend/app/correspondence/records/page.tsx` — update if naming needs change
- Modify: `frontend/app/correspondence/department-files/page.tsx` — update redirect
- Modify: `frontend/components/layout/SidebarNavigation.tsx` — update sidebar label
- Create: `frontend/app/correspondence/archives/page.tsx` — (if choosing "Archives")

**Interfaces:**
- Consumes: current route structure
- Produces: Consistent naming

- [ ] Decide: standardize on "Archives" (user-facing) or "Records" (route name)
- [ ] Update route if choosing "Archives" → create redirect from `/records` to `/archives`
- [ ] Update sidebar label to match chosen name
- [ ] Update page title/heading
- [ ] Update any internal links

---

### Task 12: Error handling consistency

**Files:**
- Modify: `frontend/app/correspondence/registered/page.tsx` — replace inline table error with ErrorState component
- Modify: `frontend/app/correspondence/inbox/page.tsx` — keep ErrorState, verify consistency
- Modify: `frontend/app/correspondence/office-sent/page.tsx` — keep ErrorState, verify consistency
- Modify: `frontend/app/correspondence/records/page.tsx` — keep ErrorState, verify consistency
- Modify: `frontend/components/ui/ErrorState.tsx` — add optional `onRetry` prop if missing

**Interfaces:**
- Consumes: `ErrorState` component
- Produces: Consistent error presentation across all list pages

- [ ] Read `registered/page.tsx` — find inline "[{errorMessage}]" or similar and replace with `<ErrorState>`
- [ ] Audit inbox, office-sent, records to confirm they all use `<ErrorState>` consistently
- [ ] Ensure all pages use the same pattern: fetch → loading/error/data ternary
- [ ] Verify `ErrorState` component accepts `title`, `message`, `onRetry`, `variant` props
- [ ] Test: trigger errors on each page, verify consistent appearance
