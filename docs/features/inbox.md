# Inbox System

## Overview
Multi-tab inbox system for correspondence and case management with role-based views.

## Inbox Types
| Inbox | Path | Users | Description |
|-------|------|-------|-------------|
| My Inbox | `/inbox` | All | Personal correspondence |
| Office Inbox | `/correspondence/inbox` | Registry/Secretary | Office-level incoming |
| Delegated Inbox | `/inbox/delegated` | Delegates | Delegated items |
| Executive Approvals | `/approvals` | MD/ED/GM | Sealed executive approvals |

## Key Components
- `InboxFiltersPanel` - Status, priority, date filters
- `InboxItemCard` / `InboxDocumentCard` - List items
- `InboxSummaryCards` - Statistics cards
- `OfficeInboxContent` / `ExecutiveSupportInboxContent` - Role-specific views

## Key Services
- `lib/inbox-storage.ts` - API client
- `hooks/use-inbox-filters.ts` - Filter state management

## Filter Constants
Centralized in `lib/constants.ts`:
- `CORRESPONDENCE_STATUS_OPTIONS` - pending, in-progress, completed
- `PRIORITY_OPTIONS` - urgent, high, medium, low

## Recent Changes
- Consolidated status/priority filter options in `lib/constants.ts`
- Removed dead inbox components (`DelegatedInboxContent`, `ExecutiveSupportInboxContent`, `OfficeInboxContent`)
- Centralized sensitivity constants
