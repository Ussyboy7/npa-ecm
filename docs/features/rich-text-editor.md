# Rich text editor

## Overview

NPA-ECM uses a **custom** rich-text surface for memo composition, document upload/replace compose mode, and templates hub content. It is **not** Quill.js, TipTap, or ProseMirror.

| Item | Path |
|------|------|
| Component | `frontend/components/dms/RichTextEditor.tsx` |
| Compat re-export | `QuillEditor` → `RichTextEditor` in `QuillEditor.tsx` (deprecated name) |
| Sanitize | `frontend/lib/sanitize-html.ts` (`sanitizeRichText` / DOMPurify) |
| Page setup | `frontend/components/dms/PageSetupDialog.tsx` |

## Call sites

- `DocumentUploadDialog` — compose upload
- `ReplaceVersionDialog` — compose replace
- `MemoCompositionSection` — correspondence memo body
- `app/admin/templates-hub` — template HTML body

## Hardening status (July 2026)

**Done (custom-editor Phase 1):**

- Rename / honest labelling (“Rich text editor”)
- Paste pipeline (`onPaste` → sanitize HTML or plain text)
- Sanitize on emit and on insert (link / image / table / signature)
- Focused value sync (external `value` does not overwrite while focused)
- Toolbar a11y: `role="toolbar"`, `aria-pressed` / `aria-label` on toggles
- Editor a11y: `role="textbox"`, `aria-multiline`, labelled header
- Link / image / table via Dialog (no `window.prompt`)
- Image selection overlay via `getBoundingClientRect` relative to editor shell
- Word + character count; cleaned font-size / line-height options

**Explicitly deferred (needs TipTap / ProseMirror + Yjs):**

- Replacing deprecated `document.execCommand`
- Real document model (not `innerHTML` as source of truth)
- Engine-grade undo / paste / list / IME behaviour
- Live multi-user co-authoring (CRDT/OT)

Live co-authoring today remains **session/presence scaffolding only** (`DocumentEditorSession` + Channels WS). See backlog P2.

## Product domain features (keep when migrating engines)

Page setup (paper/margins), signature insert, merge tokens, table row/col tools, NPA memo chrome. These should become TipTap extensions if/when the engine migrates — not discarded.

## Related Docs

- `docs/features/dms.md` — compose upload/replace
- `docs/features/correspondence.md` — memo composition
- `docs/procurement/REMAINING_WORK_BACKLOG.md` — live co-authoring P2
- `docs/guides/WCAG_AUDIT_CHECKLIST.md` — a11y checklist
