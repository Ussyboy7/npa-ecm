# TipTap Phase 3 — Implementation report

**Date:** 2026-11-04  
**Scope:** Controlled pilot assignment, acceptance corpus, operational diagnostics, rollback readiness.  
**Not in scope:** TipTap as production default, Legacy retirement, Phase 4 soak.

## Step 1 — Read-only pre-check (findings)

| Area | Finding | Phase 3 path |
|------|---------|--------------|
| Phase 1–2 reports | Present and match repo (façade, TipTap parity, sanitize) | Build on them |
| Engine resolver | Env-only `legacy`/`tiptap`; unset → legacy | Extend with `auto` + pilot |
| Auth / me | `UserSerializer` on `/accounts/auth/me/`; no SystemConfig | Add `User.tiptap_editor_pilot` |
| Admin patterns | `accounts.UserAdmin` fieldsets | Expose pilot checkbox |
| Logging | `client-logger` → `/support/client-logs/` | Metadata-only `logEditorDiagnostic` |
| Save / PDF | `content_html` + shared `buildComposePrintHtml` | Corpus tests + TipTap try/catch diagnostics |
| New Django model? | Not required | Boolean on existing `User` |

**Smallest safe path chosen:** one User boolean + serializer/admin + resolver precedence + façade lock/fallback + fixture corpus + diagnostics helper. No permanent picker, no JSON dual-write, no auth weakening.

## Files changed

### Backend
- `accounts/models.py` — `tiptap_editor_pilot`
- `accounts/migrations/0012_user_tiptap_editor_pilot.py`
- `accounts/admin.py` — fieldset / list / filter
- `accounts/serializers.py` — expose on list + me; **read-only on me** (no self-assign)

### Frontend
- `lib/editor-engine.ts` — `legacy` / `tiptap` / `auto` + pilot
- `lib/editor-diagnostics.ts` — privacy-safe diagnostics
- `components/dms/RichTextEditor.tsx` — pilot resolve, hydrate lock, TipTap→Legacy error boundary
- `components/dms/editor/TiptapRichTextEditor.tsx` — sanitize/print diagnostic hooks
- `hooks/use-current-user.ts`, `lib/npa-structure.ts`, `lib/organization-data.ts` — `tiptapEditorPilot`
- `lib/__tests__/fixtures/editor-acceptance/*.html` — eight corpus fixtures
- `lib/__tests__/editor-acceptance-corpus.test.ts`
- `lib/__tests__/editor-engine.test.ts`
- `lib/__tests__/editor-diagnostics.test.ts`

### Docs
- `docs/features/tiptap-migration-spec.md`
- `docs/features/rich-text-editor.md`
- This report

## Acceptance fixtures and results

| # | Fixture | Sanitize | TipTap round-trip | Legacy reopen | Print preview HTML |
|---|---------|----------|-------------------|---------------|--------------------|
| 1 | Standard memo | Pass | Pass | Pass | Pass |
| 2 | Official letter | Pass | Pass | Pass | Pass |
| 3 | Word tables paste | Pass | Pass | Pass | Pass |
| 4 | Excel BOQ memo | Pass | Pass | Pass | Pass |
| 5 | Merge-token template | Pass | Pass | Pass | Pass |
| 6 | Signature images | Pass | Pass | Pass | Pass |
| 7 | Long submission | Pass | Pass | Pass | Pass |
| 8 | Legacy-created HTML | Pass | Pass | Pass | Pass |

Suite: `npx vitest run lib/__tests__/editor-acceptance-corpus.test.ts` (35 tests in corpus file).

**Comparison rule:** structural signals (tables, lists, headings, images, `{{tokens}}`, meaningful text) — not HTML string identity.

**Human / browser PDF:** compose print uses shared `buildComposePrintHtml`; server completion-package PDF path unchanged. Pilots should still spot-check real Print dialog output.

## Pilot assignment

1. Deploy with unset/`auto` (default) or explicitly `NEXT_PUBLIC_EDITOR_ENGINE=auto`.
2. In Django Admin → Users → enable **TipTap editor pilot**.
3. User refreshes session (`/auth/me/` includes `tiptap_editor_pilot`).
4. Façade locks engine after hydrate; no compose picker.

**Rollback:** set `NEXT_PUBLIC_EDITOR_ENGINE=legacy` (redeploy/restart frontend). Pilots immediately resolve to Legacy regardless of DB flag.

**Force TipTap (lab only):** `NEXT_PUBLIC_EDITOR_ENGINE=tiptap`.

## Diagnostics implemented

Events (via existing client-logger; no document bodies):

- `engine_selected`
- `engine_init_failed` / `engine_fallback_legacy`
- `sanitize_failed`
- `print_preview_failed`

Metadata: engine, workflow, coarse reason/error name, app version env, browser family.

Intentionally **not** logged: HTML, titles, patient/PII, credentials, merge-token values.

## Rollback test results

| Scenario | Result |
|----------|--------|
| Force `legacy` overrides pilot=true | Unit-tested in `editor-engine.test.ts` |
| TipTap-saved HTML reopened via Legacy sanitize | Corpus “Legacy reopen” cases pass |
| TipTap React failure → Legacy fallback | Error boundary mounts Legacy with same props (parent value retained) |
| Formatting rollback caveat | Engine rollback does **not** reverse TipTap-authored markup already saved — verified as limitation, not a silent data wipe |

Unsaved content: façade does not clear parent-controlled `value` on engine fallback; parent compose forms remain source of truth for in-progress drafts.

## Production promotion gate (explicit — not executed)

See migration spec. Phase 3 does **not** flip the default or start soak.

## Known limitations

- Automated corpus does not drive a real browser Print→PDF binary; print HTML builder is covered.
- TipTap vs Legacy HTML serialization may still differ cosmetically for Office pastes.
- Pilot flag requires migration `0012` applied on each environment before Admin assignment works.
- `engine_selected` warn-level volume: acceptable for pilot; revisit if noisy in soak.

## Outstanding risks

- Real-world Word/Excel pastes may still surprise users beyond fixtures.
- Large BOQ pastes can bloat `content_html` — attach originals.
- Incomplete human pilot workflows until authorised users exercise memo/DMS/templates in staging.

## Ready for controlled pilot?

**Yes — with constraints:**

- Keep deployment default on Legacy/`auto` (non-pilots stay Legacy).
- Assign a small pilot cohort via Admin.
- Do **not** set production `NEXT_PUBLIC_EDITOR_ENGINE=tiptap`.
- Do **not** begin Phase 4 / default flip without explicit approval after pilot evidence review.

## How to operate

```bash
# Apply backend migration
cd backend && python manage.py migrate accounts

# Assign / revoke pilots (staging or local)
python manage.py set_tiptap_pilot --usernames alice,bob --enable
python manage.py set_tiptap_pilot --usernames alice --disable

# Frontend: leave unset/auto for pilot-gated mode
# Rollback: NEXT_PUBLIC_EDITOR_ENGINE=legacy

# Acceptance suite
cd frontend && npx vitest run lib/__tests__/editor-acceptance-corpus.test.ts \
  lib/__tests__/editor-engine.test.ts lib/__tests__/editor-diagnostics.test.ts
```

## Local pilot kickoff (2026-11-04)

Migration `0012` applied. Local cohort enabled via `set_tiptap_pilot`:

| Username | Pilot |
|----------|-------|
| `superadmin` | yes |
| `gmict` | yes |
| `pamd` | yes |
| others (e.g. `md`) | no (Legacy) |

`ensure_dev_login_users` re-applies that local cohort when `IS_LOCAL_ENV` so local reboots stay consistent. Staging/production must assign explicitly — no auto-enable outside local.

**Human pilot checklist (sign off before default flip):**

1. Log in as `superadmin` / `gmict` / `pamd` → compose uses TipTap (no engine picker).
2. Log in as a non-pilot → Legacy only.
3. Memo + DMS compose: edit, save, reopen.
4. Paste Word table + Excel BOQ; confirm structure acceptable.
5. Page setup → print preview / PDF.
6. Merge tokens + signature image insert.
7. Reopen a pre-TipTap Legacy document.
8. Rollback drill: force `NEXT_PUBLIC_EDITOR_ENGINE=legacy`, reopen TipTap-saved HTML in Legacy.

### Local browser smoke (2026-11-04)

| Check | Result |
|-------|--------|
| `superadmin` → `/dms/new` | **Pass** — surface labelled `Rich text editor (TipTap)`; TipTap toolbar (H1/H2, no Legacy block-style select) |
| TipTap type + Print / PDF preview | **Pass** — preview dialog opened; body included typed smoke text |
| `md` (non-pilot) → `/dms/new` | **Pass** — surface labelled `Rich text editor` (Legacy); Legacy toolbar (`Clear formatting`, block style, align) |
| No compose engine picker | **Pass** |
| Word/Excel paste (human) | Pending |
| Save/reopen + Legacy reopen of TipTap HTML | Pending |
| Forced `EDITOR_ENGINE=legacy` rollback drill | Pending |

**Verdict:** Local gated assignment works end-to-end in UI. Still need deeper workflow sign-off (paste, save/reopen, rollback) before any default-flip approval.
