# ECMS capacity & scaling notes

**Last updated:** Nov 2026  
**Scope:** Production planning for NPA ECM (document creation via TipTap; OnlyOffice deferred).

---

## Product decisions (DRM / editors)

### DRM — treated as done for ECM scope
In-app rights while documents live in ECM:

- Classification inherit (e.g. Restricted → Strictly Confidential — Time-Limited)
- View-only, watermark, download/print blocks
- Internal share (NPA users/offices) still allowed; recipients stay under DRM
- OCR / extracted text locked for Confidential / Restricted / view-only
- Copy/cut blocked in preview for those classifications

**Not claimed:** enterprise IRM (native Word/Acrobat rights, offline file crypto, full screenshot prevention). Browser DRM cannot stop photos of the screen or determined DevTools exfiltration.

### OnlyOffice — not required for Word-feel compose
- Primary compose path is **TipTap** (unlimited ECM users; Word-like ribbon/styles/page layout).
- OnlyOffice Docs would only return if native DOCX/XLSX in-browser edit is mandated.
- If revisited: plan as a **sidecar**, not a replacement for ECM or DRM; concurrent **office editors** ≠ concurrent **ECM users**.

---

## Concurrent users (ECMS web)

| Meaning | Guidance |
|---------|----------|
| 3k–5k **accounts** | Fine |
| Hundreds–low thousands **online**, normal office use | Target with scaled Compose + load test |
| **5,000 heavy concurrent** (everyone actively hammering APIs) | Needs scaled app tier + strong DB + **proven load test**; not today’s single-backend compose |

**Planning target:** size and test toward **~5,000 concurrent ECMS users** (headroom). Define “concurrent” in load tests (open session vs requests/sec).

---

## Hardware

| Spec | Role |
|------|------|
| **64 GB RAM + 1 TB+ SSD** | Solid single-host or **app** box |
| **128 GB RAM** | Preferred headroom for higher replica counts + Postgres cache |
| Two identical servers | Prefer **Data \| App** split (below), not two full stacks |

One 64 GB all-in-one can run scaled Compose for substantial load; **5k all-heavy** is safer with **128 GB** and/or two servers + load test.

---

## Two servers (same spec) — recommended use

| Server | Role | Services |
|--------|------|----------|
| **Server 1 — Data** | Source of truth | Postgres, PgBouncer, Redis (+ backups) |
| **Server 2 — App** | User traffic | nginx, frontend×N, backend×N, celery-worker×N, celery-beat×1 |

- Public HTTP(S) → **Server 2 only**.
- Server 2 → Server 1 on **private network** (DB/Redis not public).
- Env: `DB_HOST` / `REDIS_HOST` → Server 1 private hostname/IP.
- This is **performance split**, not automatic HA. Replication/failover is a separate project.

---

## Docker Compose (prod / stag) — what we have

Implemented in `docker-compose.prod.yml` / `docker-compose.stag.yml`:

- **PgBouncer** (API → pooler; Celery → Postgres direct)
- **`migrate` oneshot** (replicas do not race on migrate)
- Scalable services (no fixed `container_name`): `backend`, `celery-worker`, `frontend`
- Deploy/start scale via env (defaults):

| Env | Backend | Celery workers | Frontend |
|-----|---------|----------------|----------|
| **prod** | 4 | 4 | 2 |
| **stag** | 2 | 2 | 2 |

```bash
# defaults
scripts/staging/env-manager.sh deploy
scripts/production/env-manager.sh deploy

# override
BACKEND_REPLICAS=8 CELERY_REPLICAS=8 FRONTEND_REPLICAS=3 \
  scripts/production/env-manager.sh deploy
```

See also `backend/env/prod.env.example` / `stag.env.example` (`DB_HOST=pgbouncer`).

**Important:** replicas start at a **fixed count**. There is **no autoscaling** in Compose by itself.

---

## Autoscaling (future)

### A — Prometheus + scale script (stay on Compose)
- Keep current Compose.
- cAdvisor/Prometheus scrape backend CPU (or RPS).
- Cron script adjusts `docker compose up -d --scale backend=N` between `MIN`/`MAX`.
- Fits one (or few) big VMs; DIY; cap max replicas to avoid OOM.

### B — Kubernetes + HPA (real autoscaling)
- Deployments for backend / celery / frontend.
- HPA on CPU (and later Celery queue depth).
- Postgres/Redis fixed (VM or managed), not HPA’d.
- Better for elastic 5k concurrent + multi-node; more ops cost.

**Near term:** fixed replicas sized for peak + load test.  
**Later:** A for quick elasticity on current hosts, or B if HA/elastic capacity is required.

---

## Load test gate (before claiming 5k)

1. Define scenario: login, inbox, open document, correspondence list, search.
2. Tool: Locust or k6.
3. Pass: p95 latency, error rate, Postgres connections (via PgBouncer), Redis memory.
4. Raise `BACKEND_REPLICAS` / hardware only after evidence.

---

## Related paths

| Topic | Path |
|-------|------|
| Prod/stag compose | `docker-compose.prod.yml`, `docker-compose.stag.yml` |
| Deploy / scale | `scripts/ops/env-manager.sh`, `scripts/lib/stack-utils.sh` |
| Env templates | `backend/env/prod.env.example`, `backend/env/stag.env.example` |
| Nginx (DNS re-resolve for replicas) | `nginx/prod.conf`, `nginx/stag.conf` |
