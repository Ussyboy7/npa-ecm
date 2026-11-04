# Rich text editor

## Overview

NPA-ECM exposes a single public component, **`RichTextEditor`**, used for memo composition, DMS compose/replace, and templates hub content.

Internally (Phase 5): **TipTap only**. There is no Legacy engine and no user-facing engine picker.

| Item | Path |
|------|------|
| Public façade | `frontend/components/dms/RichTextEditor.tsx` |
| Props | `frontend/components/dms/editor/types.ts` |
| TipTap engine | `frontend/components/dms/editor/TiptapRichTextEditor.tsx` |
| Engine identity | `frontend/lib/editor-engine.ts` (always TipTap) |
| Diagnostics | `frontend/lib/editor-diagnostics.ts` |
| Sanitize / Office paste | `frontend/lib/sanitize-html.ts` |
| TipTap find/replace | `frontend/lib/tiptap-find-replace.ts` |
| Acceptance fixtures | `frontend/lib/__tests__/fixtures/editor-acceptance/` |
| Page setup | `frontend/components/dms/PageSetupDialog.tsx` (shared) |

## Call sites

- `DocumentUploadDialog` — compose upload
- `ReplaceVersionDialog` — compose replace
- `MemoCompositionSection` — correspondence memo body
- `app/admin/templates-hub` — template HTML body

## Capability

Bold/italic/underline/strike; highlight; sub/sup; font family/size; line height; H1–H3; lists; align left/center/right/justify; links/images (dialogs); tables (insert, row/col, cell align/width, column resize); Word/Excel paste cleanup; page setup + print/PDF preview; merge-token Fields; signature image insert (visual only); find & replace; character/word count.

**Still deferred:** live co-authoring; ONLYOFFICE; formal digital signature / approval workflows inside the editor.

## Related Docs

- `docs/features/tiptap-migration-spec.md`
- `docs/features/tiptap-phase5-implementation-report.md`
- `docs/features/dms.md`
- `docs/features/correspondence.md`
