# TipTap Phase 5 — Implementation report

**Date:** 2026-11-04  
**Scope:** Retire Legacy editor; `RichTextEditor` is TipTap-only.  
**Not in scope:** ONLYOFFICE, live co-authoring, JSON dual-write.

## Decision

Keep the public **`RichTextEditor`** API. Replace the dual-engine interior with TipTap only. Users cannot select between engines. `NEXT_PUBLIC_EDITOR_ENGINE` no longer selects an engine.

## Behaviour

| Item | Result |
|------|--------|
| Call sites | Unchanged — still import `RichTextEditor` |
| Engine | Always TipTap (dynamic import) |
| Legacy source | Deleted `editor/LegacyRichTextEditor.tsx` |
| Init failure | Read-only sanitized HTML preview; draft not discarded |
| Persistence | Still `content_html` only |

## Files changed

- `frontend/components/dms/RichTextEditor.tsx` — TipTap-only + failure shell
- `frontend/components/dms/editor/LegacyRichTextEditor.tsx` — **deleted**
- `frontend/lib/editor-engine.ts` — always `"tiptap"`
- `frontend/lib/editor-diagnostics.ts` — drop `engine_fallback_legacy`
- `frontend/lib/__tests__/editor-engine.test.ts`
- `frontend/components/dms/editor/types.ts` — TipTap-only wording
- Docs: migration spec, `rich-text-editor.md`, COMPONENTS/DMS notes, this report

## Rollback note

Legacy binary rollback via env flag is **no longer available**. Recovery options:

1. Reload (TipTap remount) when init failed but HTML is held by the parent form.
2. Git revert of Phase 5 if a release must restore Legacy (last resort).

## Pilot-flag cleanup (follow-up)

- Removed `User.tiptap_editor_pilot` (migration `0013_remove_user_tiptap_editor_pilot`)
- Removed Admin/API exposure and `set_tiptap_pilot` management command
- Removed frontend `tiptapEditorPilot` mapping
- Frontend README / env examples mentioning `EDITOR_ENGINE` cleaned in this phase

## Tests

- `editor-engine`, `editor-diagnostics`, `editor-acceptance-corpus`
- `npx tsc --noEmit`

## Ready for production TipTap-only?

**Yes**, with monitoring of `engine_init_failed` / paste / print diagnostics. Formal approval workflows remain outside the editor.
