# NPA ECM Component Reference

**Last updated:** June 2026

Living reference for notable frontend components. For feature-level docs see `docs/features/`. Props below reflect current TypeScript interfaces — verify in source when upgrading.

## Component index

| Component | Path | Area |
|-----------|------|------|
| CompletionSummaryModal | `components/correspondence/CompletionSummaryModal.tsx` | Correspondence |
| ActionsPanel | `app/correspondence/[id]/components/ActionsPanel.tsx` | Correspondence |
| DocumentUploadDialog | `components/dms/DocumentUploadDialog.tsx` | DMS |
| DocumentVersionDiffDialog | `components/dms/DocumentVersionDiffDialog.tsx` | DMS (Phase 9) |
| DocumentDrmBanner | `components/dms/DocumentDrmBanner.tsx` | DMS / DRM (Phase 11) |
| DocumentSummaryCard | `components/dms/DocumentSummaryCard.tsx` | DMS (extractive summary) |
| RelatedItemsPanel | `components/search/RelatedItemsPanel.tsx` | Search |
| AdvancedSearch | `components/search/AdvancedSearch.tsx` | Search |
| SkipToContent | `components/shared/SkipToContent.tsx` | Accessibility (WCAG) |
| ListRowCard | `components/shared/ListRowCard.tsx` | Shared lists |
| ErrorBoundary | `components/shared/ErrorBoundary.tsx` | Error handling |
| IntegrationLogsViewer | `components/integrations/IntegrationLogsViewer.tsx` | Integrations |
| NotificationBell | `components/notifications/NotificationBell.tsx` | Notifications |
| AppSidebar | `components/AppSidebar.tsx` | Navigation |

### Removed / consolidated (do not reference)

- `DelegatedInboxContent`, `ExecutiveSupportInboxContent`, `OfficeInboxContent` — removed; use `/inbox`, `/correspondence/inbox`, `/tasks`
- Duplicate inbox filter constants — use `lib/constants.ts`

---

## CompletionSummaryModal

**Path:** `frontend/components/correspondence/CompletionSummaryModal.tsx`

Displays completion summary for finished correspondence: final action, document preview, process stats.

```typescript
interface CompletionSummaryModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  correspondence?: Correspondence;
  minutes?: Minute[];
  documentContentHtml?: string;
}
```

---

## ActionsPanel

**Path:** `frontend/app/correspondence/[id]/components/ActionsPanel.tsx`

Context-aware correspondence actions (minute, treat, delegate, completion package) based on permissions and turn.

Key props: `correspondence`, `minutes`, `activeUser`, `isCompleted`, `isCurrentUserTurn`, `onOpenMinuteModal`, `onSyncFromApi`.

---

## DocumentUploadDialog

**Path:** `frontend/components/dms/DocumentUploadDialog.tsx`

Upload new documents or versions with validation and progress.

```typescript
interface DocumentUploadDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "document" | "version" | "create";
  currentUser?: User;
  document?: DocumentRecord;
  onComplete?: (document: DocumentRecord) => void;
  onCancel?: () => void;
  asPage?: boolean;
}
```

---

## DocumentVersionDiffDialog

**Path:** `frontend/components/dms/DocumentVersionDiffDialog.tsx`  
**API:** `lib/dms-version-diff.ts` → `GET /api/v1/dms/document-versions/{id}/diff/`

```typescript
interface DocumentVersionDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diff: DocumentVersionDiff | null;
  loading?: boolean;
}
```

Used from `DocumentVersionsPanel` on the DMS detail page. Best for text-extractable formats.

---

## DocumentDrmBanner

**Path:** `frontend/components/dms/DocumentDrmBanner.tsx`

Shows effective DRM policy on document detail when `drm_rights.policy_name` is set.

```typescript
{ rights?: DocumentDrmRights | null }
```

Policy admin: `/admin/drm-policies`. Enforcement is download-level (not byte-level PDF watermark).

---

## DocumentSummaryCard

**Path:** `frontend/components/dms/DocumentSummaryCard.tsx`

Extractive document summary in DMS sidebar. Optional remote LLM when configured; default is extractive fallback.

---

## RelatedItemsPanel

**Path:** `frontend/components/search/RelatedItemsPanel.tsx`

Related items and duplicate hints on document/correspondence/case detail views.

```typescript
interface RelatedItemsPanelProps {
  type: "document" | "correspondence" | "case";
  id: string;
  title?: string;
}
```

---

## AdvancedSearch

**Path:** `frontend/components/search/AdvancedSearch.tsx`

Unified search UI with facets and **semantic** toggle (`search_mode=semantic` — MVP re-rank, not vector DB).

---

## SkipToContent

**Path:** `frontend/components/shared/SkipToContent.tsx`

WCAG bypass link targeting `#main-content` in `DashboardLayout`.

---

## ListRowCard

**Path:** `frontend/components/shared/ListRowCard.tsx`

Accessible list row with optional `onRowClick` (avoids nested interactive elements). Used in templates hub and admin lists.

---

## IntegrationLogsViewer

**Path:** `frontend/components/integrations/IntegrationLogsViewer.tsx`

Integration Hub → Logs tab (`/integrations`). Connector CRUD UIs exist; backend ingestion/sync for email/ERP may still be partial — see backlog.

---

## ErrorBoundary

**Path:** `frontend/components/shared/ErrorBoundary.tsx`

Wrap feature sections to catch render errors. Also: `ModalErrorBoundary`, `error-boundaries/FeatureErrorBoundary`.

```typescript
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

<ErrorBoundary>
  <ActionsPanel {...props} />
</ErrorBoundary>
```

---

## Navigation (AppSidebar)

**Path:** `frontend/components/AppSidebar.tsx`

Role-aware nav with sections: Dashboard, My Workspace (My Work, My Inbox), Cases, Correspondence, DMS, Administration sub-groups. Counts from `use-sidebar-counts` (`myWork`, `myInbox`).

Visibility rules: `hooks/use-sidebar-visibility.ts`.

---

## Common patterns

### Modal state

```typescript
const [open, setOpen] = useState(false);
<CompletionSummaryModal open={open} onOpenChange={setOpen} correspondence={item} />
```

### API client

Use `apiFetch` from `lib/api-client.ts` with `hasTokens()` — do not duplicate auth logic.

### Pagination

`use-pagination` hook + `fetchAllPaginated` for list pages.

---

## Accessibility

- `SkipToContent` + `#main-content` landmark
- `:focus-visible` rings in `globals.css`
- Audit checklist: `docs/guides/WCAG_AUDIT_CHECKLIST.md`
- Prefer `ListRowCard` `onRowClick` over wrapping rows in `<button>`

---

## Testing

- Unit: Vitest (`npm test` in `frontend/`)
- Type-check: `npm run type-check`
- E2E: Playwright (planned in backlog — not yet in CI)

Components should use typed props; wrap risky trees in `ErrorBoundary`.
