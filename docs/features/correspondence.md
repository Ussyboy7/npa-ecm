# Correspondence Management

## Overview
Handles letters, memos, official communications with approval workflows, digital signatures, executive seals, parallel routing, and physical copy tracking.

## Key Features
- Letter/memo creation and routing
- Multi-step approval workflows with sequential and parallel routing
- Digital signatures (user) and executive seals (MD/ED/GM)
- Parallel routing with branches, deadlines, and force-complete
- Delegation and recall
- Physical copy tracking (`has_physical_copy`)
- Office-scoped visibility (division/department/directorate/office)
- My Sent / Office Sent (replaces old outbox/office-outbox)

## Architecture
- **Backend**: `correspondence/` app with `Correspondence`, `Minute`, `Case`, `Delegation`, `Distribution`, `ParallelBranch` models
- **Frontend**: `app/correspondence/`, `components/correspondence/`
- **Seal Flow**: `architecture/signature-seal-flow.md`

## Key Models
- `Correspondence` — Core letter/memo with `has_physical_copy` flag
- `Minute` — Approval/rejection with `signature_payload` or `seal_applied`, `branch_originator` FK for parallel branches
- `ParallelBranch` — Parallel routing branch with deadline, status, originator
- `Distribution` — Recipient tracking with `read_at`, `read_by`
- `Case` — Case management linked to correspondence
- `Delegation` — Temporary authority delegation

## Key Components
- `CorrespondenceRegisterForm` — Multi-step registration wizard with `hasPhysicalCopy` checkbox
- `MinuteModal` / `MinuteDetailModal` — Approval with parallel branch deadline/group selection
- `ActionsPanel` — Context-aware actions (document generation, workspace removed)
- `TreatmentModal` — Parallel treatment options, branch routing toggle
- `RoutingPanel` — Parallel routing tree visualization with branch status badges, force-complete for originators
- `ParallelRoutingStatusPanel` — Tree visualization with deadline tracking, branch status, force-complete flow
- `WorkflowProgressIndicator` — Step labels with physical copy indicator
- `DistributionSelector` — Routing with parallel branches

## Key Services
- `correspondence/services.py` — `CorrespondenceService`, `SealGenerationService`, `create_document_from_correspondence` (now returns `list[Document]` for primary + attachments), parallel routing branching logic
- `lib/correspondence-helpers.ts` — Frontend helpers
- `lib/correspondence-storage.ts` — API client
- `lib/correspondence-parallel.ts` — Parallel branch utilities (status icons, deadline formatting, branch tree building)

## Page Structure
| Route | Description |
|-------|-------------|
| `/correspondence/inbox` | Incoming correspondence |
| `/correspondence/my-sent` | Sent by me (replaces `/correspondence/outbox`) |
| `/correspondence/office-sent` | Sent by my office (replaces `/correspondence/office-dispatched`, `/correspondence/office-outbox`) |
| `/correspondence/registered` | Registered correspondence |
| `/correspondence/records` | Archived records (replaces `/correspondence/archived`) |
| `/correspondence/[id]` | Detail view with routing/minutes/documents |

## Deleted Pages
| Old Route | Replaced By |
|-----------|-------------|
| `/correspondence/outbox` | `/correspondence/my-sent` |
| `/correspondence/office-outbox` | `/correspondence/office-sent` |
| `/correspondence/office-dispatched` | `/correspondence/office-sent` |
| `/correspondence/archived` | `/correspondence/records` |

## Seal Flow
See `architecture/signature-seal-flow.md` for complete flow:
1. Executive configures signature/seal in Settings
2. Executive approves minute → backend generates seal via `SealGenerationService`
3. Seal stored in `DocumentSeal`, linked to `Minute.seal_applied`
4. Executive Approvals page shows only sealed approvals

## Status lifecycle

Shared statuses: `pending` → `in-progress` → `completed`, then flow-specific terminals.

| Flow | After `completed` | Notes |
|------|-------------------|--------|
| **Inward** | → `archived` | No dispatch. Replies are registered as a **new outward** letter. |
| **Outward** | → `dispatched` → (`acknowledged`) → `archived` | Dispatch is registry send (courier/email/etc.). |

- `withdrawn` is a side exit from `pending` / `in-progress` (cancelled draft).
- `acknowledged` remains for filters/clients; receipt is also stored on `DispatchRecord`.
- Backend rejects `POST …/dispatch/` for inward items.
- UI closed state includes completed / dispatched / acknowledged / archived / withdrawn (not only `completed`).

## Recent Changes
- **Status flow**: Inward completed → archive only; outward completed → dispatch; closed-state UI fixed
- **Outbox → Sent**: `/correspondence/outbox` → `/correspondence/my-sent`, `/correspondence/office-outbox`/`office-dispatched` → `/correspondence/office-sent`
- **Parallel routing**: `ParallelBranch` model, branch tree visualization, force-complete, deadline tracking
- **Physical copies**: `has_physical_copy` on register form, indicator in detail views
- **Read tracking**: `read_at`/`read_by` on `Distribution`
- **Scope enforcement**: Org-scope filtering for correspondence visibility
- **Document generation**: `create_document_from_correspondence` returns `list[Document]` (primary + attachments)
- **Archived removed**: Folded into `/correspondence/records`
