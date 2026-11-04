# TipTap Migration Specification (NPA ECMS)

**Status:** Phase 5 complete — TipTap-only behind `RichTextEditor`; Legacy retired  
**Product decision:** Option A — NPA-native editor (TipTap OSS). Word/Excel remain desktop prep tools (paste + attach originals). ONLYOFFICE deferred unless full Office fidelity is required later.

## Working decisions

1. TipTap OSS is the editing engine, not approval or records management.
2. Word and Excel remain desktop preparation tools; ECMS supports paste and original-file attachments.
3. Django remains authoritative for versions, routing, approvals, signatures, and audit.
4. PDF generation is a separate finalisation process.
5. **`RichTextEditor` is the public façade.** Internally it always mounts TipTap. Persistence remains HTML only (`DocumentVersion.content_html` / template `content_html`). No compose-screen engine picker. No mid-session engine switching. No JSON dual-write.

## Engine selection (Phase 5)

| Control | Behaviour |
|---------|-----------|
| Public component | Always `RichTextEditor` → TipTap |
| `NEXT_PUBLIC_EDITOR_ENGINE` | **Ignored** (removed from runtime selection) |
| Legacy engine | **Retired** (source deleted) |
| TipTap init failure | Read-only sanitized preview of current value; reload to retry |
| User picker | **Not implemented** |

## Phase status

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Façade, dual engine, HTML contract, TipTap foundation | Done |
| 2 | Paste, page setup, tokens, signature image, tables, find/replace, counts | Done |
| 3 | Acceptance corpus, pilot assignment, diagnostics, rollback readiness | Done |
| 4 | TipTap default + soak (Legacy kept) | Done |
| 5 | Retire Legacy; TipTap-only façade | **Done** |

## Related

- `docs/features/rich-text-editor.md`
- `docs/features/tiptap-phase1-implementation-report.md` … `tiptap-phase5-implementation-report.md`
