# WCAG 2.1 AA Audit Checklist — NPA-ECM

**Purpose:** Repeatable accessibility audit for go-live sign-off (BOQ §5.01).  
**Standard:** WCAG 2.1 Level AA  
**Last updated:** July 2026

---

## Automated checks (run each release)

```bash
cd frontend
npm run lint          # eslint jsx-a11y rules where configured
npm run test:e2e      # Playwright journeys include keyboard navigation
```

Manual spot-check with browser DevTools → Accessibility tree on: login, inbox, correspondence detail, DMS detail, cases detail, search, admin records.

---

## Remediation log (July 2026)

### High-severity (closed)

| # | Area | Fix | Criteria |
|---|------|-----|----------|
| 1–2 | `MinuteModal` | Real `minute-text-help` / `minute-text-error`; error `role="alert"`; conditional `aria-describedby` | 4.1.2, 4.1.3 |
| 3 | `PartiesStep` | `aria-describedby` on sender org; unique id for outward recipient org | 4.1.2 |
| 4 | `DelegateModal` | Accessible label on custom expiry date | 4.1.2 |
| 5 | `DocumentPreviewModal` | `DialogDescription` (sr-only) | 4.1.2 |
| 6 | Page H1 / landmarks | Pages use shells for H1; `main` `aria-label`; dashboard empty-state sr-only H1; Search H1 via `appType` | 1.3.1 |
| 7 | `AdvancedSearch` | Results count `role="status"` + `aria-live="polite"` | 4.1.3 |

### Editor a11y (closed with hardening)

`RichTextEditor`: toolbar `role="toolbar"`, toggle `aria-pressed` / `aria-label`, surface `role="textbox"` + `aria-multiline`, Dialogs instead of `window.prompt`. See `docs/features/rich-text-editor.md`.

### Medium-severity (closed)

| # | Area | Fix | Criteria |
|---|------|-----|----------|
| 1 | Badge / status contrast | Stronger emerald/sky light+dark classes in `status-badge`, `FlowTypeBadge`, cases list | 1.4.3 |
| 2 | Sidebar headings | Group labels as `<h2>` via `SidebarGroupLabel asChild`; subsections `<h3>` | 1.3.1 |
| 3 | Nested dialogs | Confirm / 2FA / AlertDialogs as siblings of primary `Dialog` (Minute, Treatment, Share, Upload, Metadata edit) | 2.1.2 |
| 4 | 320px reflow | Register step tabs `grid-cols-2 sm:grid-cols-4`; cases workspace `min-w-0` | 1.4.10 |
| 5 | Inbox filter focus / names | Filters before list; `role="search"` + `aria-label` on search/selects | 2.4.3, 3.3.2 |
| 6 | Sonner toasts | Mount `<Toaster />` in `Providers` (Sonner default `role="status"` / polite live) | 4.1.3 |

Remaining 🟡 rows below are residual / full AA sign-off (backlog P1), not these six mediums.

---

## Perceivable (1.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 1.1.1 | Non-text content has alt text | 🟡 | Icons use `aria-hidden` when decorative; verify uploaded images in DMS |
| 1.3.1 | Info and relationships programmatic | ✅ | Page H1s + sidebar group/subsection headings |
| 1.4.3 | Contrast (minimum) | ✅ | Status/flow badges updated for dark mode AA text contrast |
| 1.4.4 | Resize text to 200% | ✅ | Layout uses responsive units; test at 200% zoom |
| 1.4.10 | Reflow at 320px | ✅ | Register tabs + cases workspace reflow; spot-check other dense pages |

---

## Operable (2.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 2.1.1 | Keyboard accessible | 🟡 | Skip link → `#main-content`; audit modal focus traps; editor toolbar keyboard shortcuts (Cmd/Ctrl+B/I/U/K) |
| 2.1.2 | No keyboard trap | ✅ | Primary confirm/2FA dialogs un-nested as siblings |
| 2.4.1 | Bypass blocks | ✅ | `SkipToContent` in `DashboardLayout` |
| 2.4.3 | Focus order | ✅ | Inbox filters labelled and precede result list |
| 2.4.7 | Focus visible | ✅ | Global `:focus-visible` ring in `globals.css` |
| 2.5.5 | Target size (AAA aspirational) | 🟡 | Icon buttons ≥ 44px on mobile where possible |

---

## Understandable (3.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 3.1.1 | Language of page | ✅ | `<html lang="en">` in root layout |
| 3.2.2 | On input (no unexpected change) | ✅ | Filters do not auto-submit without explicit search |
| 3.3.1 | Error identification | 🟡 | Minute modal help/error wired (July 2026); audit remaining forms |
| 3.3.2 | Labels or instructions | ✅ | Delegate date, inbox filters, search inputs labelled; audit admin forms on sign-off |

---

## Robust (4.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 4.1.2 | Name, role, value | 🟡 | Highs 1–5 closed; Radix roles elsewhere; verify remaining custom widgets |
| 4.1.3 | Status messages | ✅ | Search live region, minute `role="alert"`, Sonner Toaster mounted |

---

## Platform-specific test script

1. **Login** — Tab through username, password, submit without mouse.  
2. **Inbox** — Open first item with Enter; return with browser back.  
3. **Minute modal** — Escape closes; required field announces error (`role="alert"`).  
4. **Search** — Cmd/Ctrl+K focuses search; result count announced via live region.  
5. **DMS / Cases detail** — Keyboard to rail tabs; preview dialogs have title + description.  
6. **Compose editor** — Toolbar announces pressed state; link insert uses Dialog (not browser prompt).  
7. **DMS download** — Blocked when DRM `view_only` policy applied (verify message).  
8. **Helpdesk** — Submit ticket form with screen reader (NVDA/VoiceOver).

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| ICT QA | | | |
| Accessibility lead | | | |
| Programme PM | | | |

**Exit criteria for go-live:** All P0 pages pass manual script; no Level A failures; Level AA failures documented with remediation date ≤ 30 days post go-live.
