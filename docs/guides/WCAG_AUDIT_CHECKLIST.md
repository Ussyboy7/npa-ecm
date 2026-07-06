# WCAG 2.1 AA Audit Checklist — NPA-ECM

**Purpose:** Repeatable accessibility audit for go-live sign-off (BOQ §5.01).  
**Standard:** WCAG 2.1 Level AA  
**Last updated:** June 2026

---

## Automated checks (run each release)

```bash
cd frontend
npm run lint          # eslint jsx-a11y rules where configured
npm run test:e2e      # Playwright journeys include keyboard navigation
```

Manual spot-check with browser DevTools → Accessibility tree on: login, inbox, correspondence detail, DMS detail, search, admin records.

---

## Perceivable (1.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 1.1.1 | Non-text content has alt text | 🟡 | Icons use `aria-hidden` when decorative; verify uploaded images in DMS |
| 1.3.1 | Info and relationships programmatic | 🟡 | Tables use `<TableHead>`; verify complex minute modals |
| 1.4.3 | Contrast (minimum) | 🟡 | Run contrast checker on badge/status colours in dark mode |
| 1.4.4 | Resize text to 200% | ✅ | Layout uses responsive units; test at 200% zoom |
| 1.4.10 | Reflow at 320px | 🟡 | Test correspondence register on mobile widths |

---

## Operable (2.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 2.1.1 | Keyboard accessible | 🟡 | Skip link → `#main-content`; audit modal focus traps |
| 2.1.2 | No keyboard trap | 🟡 | Test Dialog/Sheet escape and Tab cycle |
| 2.4.1 | Bypass blocks | ✅ | `SkipToContent` in `DashboardLayout` |
| 2.4.3 | Focus order | 🟡 | Verify filter bars before result lists |
| 2.4.7 | Focus visible | ✅ | Global `:focus-visible` ring in `globals.css` |
| 2.5.5 | Target size (AAA aspirational) | 🟡 | Icon buttons ≥ 44px on mobile where possible |

---

## Understandable (3.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 3.1.1 | Language of page | ✅ | `<html lang="en">` in root layout |
| 3.2.2 | On input (no unexpected change) | ✅ | Filters do not auto-submit without explicit search |
| 3.3.1 | Error identification | 🟡 | Form errors use `aria-invalid` on minute modal |
| 3.3.2 | Labels or instructions | 🟡 | Search inputs have `aria-label`; audit admin forms |

---

## Robust (4.x)

| ID | Criterion | Status | Notes / remediation |
|----|-----------|--------|---------------------|
| 4.1.2 | Name, role, value | 🟡 | Radix primitives provide roles; verify custom widgets |
| 4.1.3 | Status messages | 🟡 | Sonner toasts — confirm `role="status"` via library defaults |

---

## Platform-specific test script

1. **Login** — Tab through username, password, submit without mouse.  
2. **Inbox** — Open first item with Enter; return with browser back.  
3. **Minute modal** — Escape closes; required field announces error.  
4. **Search** — Cmd/Ctrl+K focuses search; results keyboard-navigable.  
5. **DMS** — Download blocked when DRM `view_only` policy applied (verify message).  
6. **Helpdesk** — Submit ticket form with screen reader (NVDA/VoiceOver).

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| ICT QA | | | |
| Accessibility lead | | | |
| Programme PM | | | |

**Exit criteria for go-live:** All P0 pages pass manual script; no Level A failures; Level AA failures documented with remediation date ≤ 30 days post go-live.
