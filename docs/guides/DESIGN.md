# Product UI language (Apple density)

Guidance for agents and humans working on NPA-ECM frontend. Brand colors stay NPA navy/teal/amber — “Apple” here means hierarchy, quiet chrome, and restraint.

## Theme

- **Light** and **Dark** are first-class app modes (`next-themes`, class on `<html>`). Default is Light.
- Toggle: TopBar sun/moon control; Settings → Appearance; Login and Landing page toggles.
- Preference persists as `npa-ecm-theme`.
- **Document paper** (compose editor, memo/PDF previews) uses `.doc-paper` — always white, both themes — so print-like content stays readable.

## Source of truth

| Pattern | Use |
|---------|-----|
| Type scale | [`lib/app-type.ts`](../../frontend/lib/app-type.ts) (`appType` / `detailType`) |
| Status strip shell | [`DetailStatusStrip`](../../frontend/components/shared/DetailStatusStrip.tsx) |
| Queue/list page shell | [`QueuePageShell`](../../frontend/components/shared/QueuePageShell.tsx) |
| Admin shell | [`AdminPageShell`](../../frontend/components/shared/AdminPageShell.tsx) |
| Stats | [`StatStrip`](../../frontend/components/shared/StatStrip.tsx) — not four large icon Cards |
| List rows | [`ListRowCard`](../../frontend/components/shared/ListRowCard.tsx) |
| Status/priority badges | [`lib/status-badge.ts`](../../frontend/lib/status-badge.ts) |
| Buttons | `size="compact"` (rail CTAs), `size="quiet"` (secondary rows), primary + `⋯` overflow |
| Modals | [`DialogContent`](../../frontend/components/ui/dialog.tsx) / [`AlertDialogContent`](../../frontend/components/ui/alert-dialog.tsx) `size` + `height` + `density` |
| Rich text | [`RichTextEditor`](../../frontend/components/dms/RichTextEditor.tsx) — custom compose; see [`rich-text-editor.md`](../features/rich-text-editor.md) |
| Detail type scale | [`lib/detail-type.ts`](../../frontend/lib/detail-type.ts) alongside `appType` |

### Modal tokens

| Prop | Values | When |
|------|--------|------|
| `size` | `sm` · `md` (default) · `lg` · `xl` · `2xl` · `3xl` · `full` | Prefer tokens over `max-w-*` |
| `height` | `auto` (default) · `scroll` · `fill` · `screen` (Dialog only) | `scroll` = long forms; `fill` = header + scroll body; `screen` = preview/share |
| `density` | `default` · `flush` | `flush` = edge-to-edge preview chrome (`p-0`) |

Sizes: sm=simple confirm/forms · md=default · lg=compose · xl=pickers · 2xl=rich review · 3xl=upload · full=document preview.

Do **not** use `window.prompt` / `window.alert` for editor or modal flows — use Dialog tokens.

## Rules

1. **Header = identity; strip = state; body = work; rail = secondary.**
2. **One composition per viewport** — avoid dashboards of competing cards unless the page is a dashboard.
3. **Cards only when they wrap interaction** — prefer `bg-muted/30 rounded-xl` section strips in rails.
4. **Stats = `StatStrip`** by default on queues.
5. **Primary CTA + one overflow menu** — don’t equal-weight every action.
6. **Status strips**: one line, full text, horizontal scroll — do not put org/office on a second line; do not mid-word truncate without ellipsis intent.
7. **Comments/chat**: summary in rail; full thread in modal.
8. **Admin**: same tokens/buttons/spacing; **keep tables**.
9. **Rich text**: use `RichTextEditor` (not a new `contentEditable`); keep paste/sanitize/a11y behaviour intact.

## Do / don’t

- Do use `appType.pageTitleList` for list H1s (not `text-3xl font-bold`).
- Do reuse `getStatusBadgeVariant` / `getPriorityBadgeVariant` instead of local copies.
- Don’t invent purple gradients or cream/serif “AI landing” looks.
- Don’t nest “Details” headings inside a Details tab.
- Don’t put Link to case / Edit metadata under “More details” when they already live in `⋯`.
- Don’t call the compose editor “Quill” in UI copy — it is not Quill.js.

## Detail pages already aligned

- `/correspondence/[id]`
- `/dms/[id]` — preview | rail (Vers/Chat/Links/Info); `DocumentStatusStrip` / `DocumentHeader`
- `/cases/[id]` — case file | rail (Links/Chat/Activity/Info); `CaseWorkspace` family
- `/foia/[id]` (list uses `StatStrip` + `QueuePageShell`)
- `/correspondence/my-sent/[id]` → redirects to `/correspondence/[id]`

Port the same shell to remaining detail routes when touching them.
