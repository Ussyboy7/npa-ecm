# TipTap Phase 4 — Implementation report

**Date:** 2026-11-04  
**Scope:** TipTap becomes the default authoring engine; start soak with Legacy retained for rollback.  
**Not in scope:** Deleting Legacy, ONLYOFFICE, live co-authoring, JSON dual-write.

## Decision

Phase 3 controlled pilot (local) confirmed gated assignment and TipTap compose/print preview. Per product direction to proceed, Phase 4 **flips the default** from pilot-gated TipTap to **TipTap for all users** when `NEXT_PUBLIC_EDITOR_ENGINE` is unset, `auto`, or `tiptap`.

Emergency rollback remains: set `NEXT_PUBLIC_EDITOR_ENGINE=legacy` and redeploy/restart the frontend.

## Behaviour change

| Before (Phase 3) | After (Phase 4) |
|------------------|-----------------|
| unset/`auto` → TipTap only if `tiptap_editor_pilot` | unset/`auto` → **TipTap for everyone** |
| Pilot flag gates selection | Pilot flag ignored for selection (field kept) |
| Legacy = default for non-pilots | Legacy = force-flag or TipTap error fallback only |

## Files changed

- `frontend/lib/editor-engine.ts` — default TipTap; `legacy` force only
- `frontend/lib/__tests__/editor-engine.test.ts`
- `frontend/components/dms/RichTextEditor.tsx` — no longer waits on pilot hydrate for engine choice
- `docs/features/tiptap-migration-spec.md`
- `docs/features/rich-text-editor.md`
- This report

## Rollback

```bash
# Emergency: all users on Legacy
NEXT_PUBLIC_EDITOR_ENGINE=legacy
# Rebuild/restart frontend (Docker: rebuild frontend service)
```

Saved `content_html` is unchanged by the engine switch. TipTap-authored markup may look different in Legacy but must remain editable (Phase 3 corpus covered structural reopen).

## Soak guidance

1. Deploy with TipTap default (no `EDITOR_ENGINE=legacy`).
2. Monitor `editor_diagnostic` client logs (init/sanitize/print failures).
3. Collect real Word/Excel paste + PDF feedback from NPA users.
4. Do **not** delete `LegacyRichTextEditor` until soak exit criteria in the migration spec are met and explicitly approved.

## Known limitations

- Pilot assignment UI/Admin field is now informational only until removed in a later cleanup.
- Visual PDF parity still needs ongoing human review beyond automated print-HTML checks.
- Legacy retirement is explicitly **not** part of this phase.

## Ready for Legacy retirement?

Superseded: Legacy retired in **Phase 5** (`tiptap-phase5-implementation-report.md`).
