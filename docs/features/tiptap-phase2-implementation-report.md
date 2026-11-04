# TipTap Phase 2 — Implementation report

**Date:** 2026-11-04  
**Scope:** TipTap document-composition parity (opt-in). Legacy remains production default.

## Phase 1 gaps addressed

| Issue | Resolution |
|-------|------------|
| TipTap ignored `tokens`, `signatureImageUrl`, `showPageSetup` | Wired in Phase 2 |
| `window.prompt` for link/image | Dialogs (aligned with Legacy) |
| Tables not resizable / no row-col tools | `Table.resizable` + toolbar actions |
| Deferred banner after features landed | Banner removed (features implemented) |

## Completed (Phase 2)

| Priority | Feature | Implementation |
|----------|---------|----------------|
| 1 | Word/Excel paste | Existing `sanitizePastedRichText` / `cleanOfficeHtml`; Excel detection; keep table border/background styles in allowlist |
| 2 | Page setup + print | Reuses `PageSetupDialog`, `getPageDimensions`, `buildComposePrintHtml`; paper chrome + print modal |
| 3 | Merge tokens | Fields toolbar from `tokens` prop |
| 4 | Signature image | Insert sanitized `<img alt="Signature">`; tooltip clarifies visual ≠ formal digital signature |
| 5 | Tables | Insert dialog; add/delete row/col; column resize; delete table |
| 6 | Find / replace | `lib/tiptap-find-replace.ts` + dialog; Ctrl/Cmd+F |
| 7 | Character / word count | Same plain-text strip approach as Legacy |

## Files changed

- `frontend/components/dms/editor/TiptapRichTextEditor.tsx` — Phase 2 surface  
- `frontend/lib/sanitize-html.ts` — Excel detect + table style allowlist  
- `frontend/lib/tiptap-find-replace.ts` — new  
- `frontend/lib/__tests__/tiptap-find-replace.test.ts` — new  
- `frontend/lib/__tests__/sanitize-html.test.ts` — Excel case  
- `docs/features/tiptap-migration-spec.md`  
- `docs/features/rich-text-editor.md`  
- This report  

## Tests

- `editor-engine`, `tiptap-html-roundtrip`, `sanitize-html`, `tiptap-find-replace`  
- `npx tsc --noEmit`  
- Full frontend Vitest suite  

## Known limitations

- Page “current page” estimate is heuristic from scroll height (same class of approximation as Legacy).  
- Excel formulas / charts remain static HTML or should be attached as `.xlsx`.  
- TipTap HTML serialization may still differ slightly from Legacy for edge Office pastes — acceptance corpus required before default flip.  
- Formal approval / cryptographic signing still outside the editor (unchanged).  
- No automated Playwright fixture pack yet for the six NPA corpus documents.

## Remaining risks

- Visual PDF parity: print preview uses shared `buildComposePrintHtml`; server completion-package PDF path is separate and unchanged.  
- Large Excel pastes may bloat `content_html` — attach originals for BOQ evidence of record.

## Not in Phase 2

- TipTap as production default  
- Phase 3+ (templates shells, ONLYOFFICE, collab, JSON dual-write)  
- Mid-session engine switching / pilot allowlist  

## How to verify manually

```env
NEXT_PUBLIC_EDITOR_ENGINE=tiptap
```

Exercise memo compose, DMS compose, templates hub: paste Word/Excel, page setup → print preview, Fields, Signature, tables, find/replace, save/reopen HTML.
