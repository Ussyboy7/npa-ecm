# Rich text editor

## Overview

NPA-ECM exposes a single public component, **`RichTextEditor`**, used for memo composition, DMS compose/replace, and templates hub content.

Internally (Phase 5): **TipTap only**. There is no Legacy engine and no user-facing engine picker.

**Product direction:** TipTap Word-feel compose (ribbon, styles, page layout, colors, indent, borders, ruler, picture wrap theater). Prefer deepening TipTap over embedding OnlyOffice unless true DOCX/XLSX round-trip editing becomes a hard requirement.

| Item | Path |
|------|------|
| Public façade | `frontend/components/dms/RichTextEditor.tsx` |
| Props | `frontend/components/dms/editor/types.ts` |
| TipTap engine | `frontend/components/dms/editor/TiptapRichTextEditor.tsx` |
| Page ruler | `frontend/components/dms/editor/EditorPageRuler.tsx` |
| Engine identity | `frontend/lib/editor-engine.ts` (always TipTap) |
| Diagnostics | `frontend/lib/editor-diagnostics.ts` |
| Sanitize / Office paste | `frontend/lib/sanitize-html.ts` |
| TipTap find/replace | `frontend/lib/tiptap-find-replace.ts` |
| Text styles / document styles | `frontend/lib/tiptap-text-styles.ts` |
| Paragraph layout (indent/spacing/borders) | `frontend/lib/tiptap-paragraph-kit.ts` |
| Image size / wrap theater | `frontend/lib/tiptap-image-kit.ts` |
| Page theater helpers | `frontend/lib/compose-page-theater.ts` |
| Acceptance fixtures | `frontend/lib/__tests__/fixtures/editor-acceptance/` |
| Page setup / print HTML | `frontend/components/dms/PageSetupDialog.tsx` (shared) |

## Call sites

- `DocumentUploadDialog` — compose upload
- `ReplaceVersionDialog` — compose replace
- `MemoCompositionSection` — correspondence memo body
- `app/admin/templates-hub` — template HTML body

## Capability

Word-like Home ribbon (Clipboard, Font, Paragraph, Insert, Picture when selected, Layout); Normal / Heading 1–3 styles; text + highlight color palettes; Bold/italic/underline/strike; sub/sup; clear formatting; font family/size (+/−); indent; paragraph spacing presets; paragraph border presets; line spacing; lists; align; links/images; tables (incl. cell border/shade); image width presets, align, wrap theater (CSS float left/right / in-line — not Word absolute position); page ruler (margin guides + indent markers); **page theater** (estimated page-break guides + page X of Y); **header/footer** (top/bottom margin bands; double-click to edit; print via fixed HF + CSS page counters); **horizontal + vertical rulers** (Word-like); Word/Excel paste cleanup; page setup + print/PDF preview on `doc-paper`; merge-token Fields; signature image insert (visual only); find & replace; character/word count.

**Still deferred:** live co-authoring; formal digital signature / approval workflows inside the editor; true Word multi-page layout engine (widow/orphan, section breaks); track changes; native `.docx` save round-trip.

**OnlyOffice:** not required for the Word-*feel* path. Revisit only if in-browser native DOCX/XLSX editing (many concurrent editors) is mandated.

## Related Docs

- `docs/features/tiptap-migration-spec.md`
- `docs/features/tiptap-phase5-implementation-report.md`
- `docs/features/dms.md`
- `docs/features/correspondence.md`
