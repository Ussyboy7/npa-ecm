# NPA ECM - Updated TODO List

**Last Updated:** July 2026
**Status:** Active Tasks

---

## 🎯 Active Tasks

### Security Hardening (remaining)
**Priority:** Critical  
**Status:** ⏳ Partial — defaults improved; production middleware still open

- [ ] Add security headers middleware
- [ ] Review CORS configuration for production
- [ ] Implement rate limiting
- [ ] Add input validation and sanitization pass (editor emit uses `sanitizeRichText`; broader API pass still open)

### WCAG 2.1 AA (remaining)
**Priority:** P1  
**Status:** ⏳ Partial — highs + mediums closed July 2026; full AA sign-off open

- [x] Prep (skip link, focus styles, checklist)
- [x] High-severity remediations (MinuteModal, PartiesStep, DelegateModal, DocumentPreviewModal, search live region, page H1/landmarks)
- [x] Rich text editor toolbar / textbox a11y + prompt→dialogs
- [x] Medium issues (badge contrast, sidebar headings, nested dialogs, 320px reflow, inbox filter names, Sonner Toaster)
- [ ] Full AA sign-off per `docs/guides/WCAG_AUDIT_CHECKLIST.md`

### Rich text / co-authoring
**Priority:** P2 for TipTap  
**Status:** Custom editor hardened; engine migrate deferred

- [x] Rename to `RichTextEditor`; paste + sanitize + focused sync + a11y toolbar
- [ ] TipTap (+ Yjs) migration when live co-authoring is funded
- [ ] Real multi-user co-edit UI (beyond session/presence scaffolding)

---

## 📋 Future Tasks

*(See [REMAINING_WORK_BACKLOG.md](./docs/procurement/REMAINING_WORK_BACKLOG.md) for full P0/P1/P2 list.)*

### AI / inference stack (deferred)
**Status:** 🔵 Waiting on ICT AI host provisioning

- pgvector migration + Ollama sidecar
- Embed-on-ingest Celery task
- Wire `DocumentSummaryService` to Ollama chat

---

## ✅ Completed Tasks

### July 2026 — UI / a11y / editor docs sync ✅
- WCAG AA high-severity fixes documented in checklist
- `RichTextEditor` hardening documented (`docs/features/rich-text-editor.md`)
- Cases detail workspace documented (`docs/features/cases.md`)
- Component reference, DESIGN, backlog, comparison matrix refreshed

### Phase 9–11 documentation sync (June 2026) ✅
- Updated backlog, comparison matrix, setup guides, feature docs
- Documented AI deferral, infra notes (`devsecops` vs `emr`), Phase 9–11 MVP status

### Phase 9–11 platform MVPs ✅
- Tamper-evident audit compliance export
- Document version diff (API + UI)
- eDiscovery export (legal hold ZIP)
- Executive/PA calendar
- `/dms` canonical route
- WCAG prep (skip link, focus styles, checklist)
- DRM policy layer + admin UI
- Legacy import command + admin UI
- Helpdesk UI + rollout runbooks
- Semantic search MVP (FTS + hash re-rank, no vectors)
- Local Docker `ensure_dev_login_users` bootstrap

### 1. Documentation Fixes ✅
**Completed:** April 2026

**What was implemented:**
- ✅ Fixed frontend README.md (removed Lovable template, added ECM-specific content)
- ✅ Added root package.json with workspace configuration
- ✅ Fixed Django security defaults (DEBUG=False by default, proper SECRET_KEY validation)
- ✅ Verified no incorrect EMR references in documentation
- ✅ Confirmed `fix_all_remaining_users.py` is legitimate (user hierarchy script)
- ✅ Removed references to non-existent `allcheck` command

**Files Modified:**
- `frontend/README.md` - Complete rewrite with ECM-specific documentation
- `package.json` - Added root workspace configuration
- `backend/ecm_backend/settings.py` - Fixed security defaults

### 2. Security Hardening ✅
**Completed:** April 2026

**What was implemented:**
- ✅ Updated Django DEBUG default from `True` to `False` for production safety
- ✅ Enhanced SECRET_KEY validation with proper error handling for production
- ✅ Added development fallback for SECRET_KEY when DEBUG=True
- ✅ Maintained backward compatibility for existing deployments

**Security Improvements:**
- Production deployments now default to secure settings
- Clear error messages when SECRET_KEY is missing in production
- Development mode still allows insecure defaults for local development

---

**Note:** This TODO list is actively maintained. Tasks are moved to "Completed" section when finished.