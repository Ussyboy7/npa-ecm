# TipTap Phase 1 — Implementation report

**Date:** 2026-11-04  
**Scope:** Dual-engine foundation only. Legacy remains production default. TipTap is opt-in via env.

## Completed

| Item | Detail |
|------|--------|
| Public façade | `frontend/components/dms/RichTextEditor.tsx` — same import path and `RichTextEditorProps` |
| Legacy engine | Moved to `frontend/components/dms/editor/LegacyRichTextEditor.tsx` (behaviour preserved; import path for `PageSetupDialog` adjusted) |
| TipTap engine | `frontend/components/dms/editor/TiptapRichTextEditor.tsx` — StarterKit, underline, link, image, tables; HTML load/save |
| Engine resolve | `frontend/lib/editor-engine.ts` — default `legacy`; `tiptap` only when `NEXT_PUBLIC_EDITOR_ENGINE=tiptap` |
| Dynamic import | TipTap loaded via `next/dynamic` only when engine is `tiptap` |
| Sanitization | TipTap `onUpdate` → `sanitizeRichText` before `onChange`; paste uses `sanitizePastedRichText` |
| Controlled value | TipTap mirrors legacy: no emit on external sync; sync only when unfocused; no emit on blur alone; skip emit when sanitized HTML unchanged |
| Deferred UX honesty | Amber banner lists missing TipTap features |
| Tests | `editor-engine.test.ts`, `tiptap-html-roundtrip.test.ts` |
| Docs | This report + `tiptap-migration-spec.md` + updated `rich-text-editor.md` |

## Legacy onChange contract (followed by TipTap)

1. **Initial load:** does not call `onChange`.  
2. **External `value`:** applied when editor is not focused; does not emit.  
3. **Blur:** does not emit.  
4. **Edits:** emit sanitized HTML on each update; TipTap skips emit if sanitized output equals last emitted.  
5. **Second arg:** `{ html, editor: "rich-text" \| "tiptap" }`.

## Deferred (not Phase 1)

- TipTap merge tokens, signature insert, page setup / print, find/replace, advanced tables  
- Admin/pilot allowlist and mid-session engine switch  
- `content_json` persistence  
- TipTap as production default  
- Phase 2+ templates / PDF / signature workflow work  
- Restoring documented `QuillEditor` re-export (file was already absent)

## How to try TipTap locally

```bash
# frontend/.env.local
NEXT_PUBLIC_EDITOR_ENGINE=tiptap
```

Omit the variable or set `legacy` for the production path.

## Call sites (unchanged)

- `MemoCompositionSection` / TreatmentModal  
- `DocumentUploadDialog`  
- `ReplaceVersionDialog`  
- `app/admin/templates-hub/page.tsx`
