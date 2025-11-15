"# NPA-ECM Documentation Hub

This page gives the current, high-level view of the platform. Each section
links out to the most relevant deep-dive or historical reference so we can keep
one source of truth while still preserving the detailed write‑ups that guided
the project to date.

## Platform overview

- **Backend stack** – Django/DRF apps for accounts, correspondence, workflow,
  notifications, analytics, and DMS. Celery + Redis handle async work, Channels
  powers WebSockets. See the root `README.md` for a concise architecture
  diagram.
- **Frontend stack** – Next.js 16 (App Router + Turbopack) with shadcn/ui,
  Tailwind, and custom hooks/contexts (`CorrespondenceContext`,
  `OrganizationContext`). Notifications use the `/ws/notifications/`
  WebSocket plus polling fallback.
- **Data tier** – PostgreSQL + Redis (for Channels and task queues), S3‑compatible
  storage (or local `media/`) for documents.

## Day‑to‑day references

| Topic | Description | Primary doc |
| --- | --- | --- |
| Quick start | Local prerequisites, env vars, seeding | [`QUICK_START.md`](../QUICK_START.md) |
| Backend setup | Detailed Django bootstrap instructions | [`docs/backend-setup.md`](./backend-setup.md) |
| CI/CD + environments | Pipelines, deployment targets, env files | [`CI-CD-README.md`](../CI-CD-README.md) & [`NPA_ECM_SETUP_GUIDE.md`](../NPA_ECM_SETUP_GUIDE.md) |
| Manual deploy | Step-by-step playbook for prod/stage | [`MANUAL_DEPLOYMENT.md`](../MANUAL_DEPLOYMENT.md) |
| Notifications & audit | Realtime stack, audit logging, verification steps | [`NOTIFICATIONS_AND_AUDIT_IMPLEMENTATION.md`](../NOTIFICATIONS_AND_AUDIT_IMPLEMENTATION.md) |
| DMS module | Document model, versioning, collaboration | [`DMS_MODULE.md`](../DMS_MODULE.md) |
| Digital signatures | Signing workflow design + future work | [`DIGITAL_SIGNATURE_MODULE.md`](../DIGITAL_SIGNATURE_MODULE.md) |

## Scripts & operations

Shell utilities live in `scripts/`. These cover the common lifecycle commands
(`start-*.sh`, `restart-*.sh`, `seed-data.sh`, etc.) and will feed into the
future CI/CD pipeline. See [`scripts/stack-utils.sh`](../scripts/stack-utils.sh)
for shared helpers.

## Historical references

Older milestone reports, reviews, and retros have been moved to
`docs/archive/`. They are still useful for context when we prepare the formal
documentation set, but they no longer clutter the project root:

- `ECM_COMPREHENSIVE_REVIEW*.md`
- `FRONTEND_*` completion reports
- `IMPLEMENTATION_COMPLETE.md`
- `PROJECT_REVIEW.md`
- `ROLE_BASED_ANALYSIS_AND_RECOMMENDATIONS.md`
- `ROLES_DISCUSSION.md`
- `NOTIFICATIONS_VERIFICATION.md`

## Next steps

1. Treat this file as the living index—update links here when adding new docs.
2. When we are ready for the “proper” documentation site (e.g., Docusaurus or
   MkDocs), use this outline as the table of contents.
3. If a document becomes obsolete, move it into `docs/archive/` (or delete it)
   after confirming it is no longer needed.

> Tip: keeping the working docs in one place makes it much easier to onboard
> new contributors and to see exactly what still needs polishing before the
> final publication.


