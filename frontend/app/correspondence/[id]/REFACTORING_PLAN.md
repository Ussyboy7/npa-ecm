# Correspondence Detail Page Refactoring Plan

## Current State
- **Main page:** `frontend/app/correspondence/[id]/page.tsx` (~550 lines)
- **Layout:** Document left (58%) + Routing right (42%); mobile **Document | Routing** tabs

## Component Map

### ✅ CorrespondenceHeader
- **Location:** `components/CorrespondenceHeader.tsx`
- Reference, metadata, fullscreen / print / download actions

### ✅ DocumentPreviewPanel
- **Location:** `components/DocumentPreviewPanel.tsx`
- Inline document preview, attachments, linked DMS documents

### ✅ RoutingPanel
- **Location:** `components/RoutingPanel.tsx`
- Composes ActionsPanel, WorkflowProgressIndicator, SealTrackingPanel, and embedded MinuteThreadPanel

### ✅ MinuteThreadPanel
- **Location:** `components/MinuteThreadPanel.tsx`
- Minute cards and thread actions (`embedded` mode for right column)

### ✅ ActionsPanel
- **Location:** `components/ActionsPanel.tsx`
- Route, treat, complete, delegate, and related actions

### ✅ CorrespondenceWorkspace
- **Location:** `components/CorrespondenceWorkspace.tsx`
- Desktop 2-column shell + mobile tab switcher

### ✅ CorrespondenceDetailModals
- **Location:** `components/CorrespondenceDetailModals.tsx`
- Lazy-mounted modals (minute, treatment, preview, delegate, link, etc.)

### ✅ MobileStickyActionBar
- **Location:** `components/MobileStickyActionBar.tsx`
- Fixed bottom actions on mobile

### ✅ useCorrespondenceDetailData
- **Location:** `hooks/use-correspondence-detail-data.ts`
- API hydrate, linked docs, parallel routing groups, mark-opened, refresh minutes

## State
- **Reducer:** `correspondence-state-reducer.ts` — minutes, linked docs, mobile tab, preview UI state

## Optional Follow-ups
- Extract DMS access / preview URL helpers into a small hook
- Wire `parallelRoutingGroups` into thread UI if not already consumed downstream
- Further trim `page.tsx` by moving delegate + completion handlers into hooks
