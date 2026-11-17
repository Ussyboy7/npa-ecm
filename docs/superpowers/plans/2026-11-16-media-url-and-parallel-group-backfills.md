# Media URL and Parallel-Routing Group Backfill Plan

**Status:** Draft for phase-specific approval. The counter, absolute-URL, write-rejection, and batch-size policies are decided and recorded below. No data has been changed.
**Date:** 2026-11-16
**Policy decisions recorded:** 2026-11-17
**Scope:** Two independent data repairs, executed and approved separately:

1. **Media URL normalization** — rewrite legacy storage-pointer values in
   `dms_documentversion.file_url` and `correspondence_correspondenceattachment.file_url`
   to the canonical `/media/<storage-path>` form.
2. **Parallel-routing group repair** — create missing `ParallelRoutingGroup` rows for
   `Minute.parallel_group_id` values that already exist on parallel-routing minutes.

**Non-goals**

- No schema migration, no `makemigrations`, no column type or length changes.
- No deletion of any row in either phase (rollback of created groups is the only delete,
  and only for IDs this backfill inserted).
- No rewriting of `/media/` URLs embedded inside `content_html`, notification
  `action_url`, integration URLs, or `seal_verification_url`.
- No changes to `Correspondence.workflow_state`, `completed_parallel_branches`, or
  `current_office` / `current_approver`.
- No calling `ParallelRoutingGroup.check_and_update_completion()` during the backfill.
- No touching external `http(s)` URLs in this backfill.

---

## 1. Verified current state

### 1.1 Code and schema facts

| Fact | Value |
|------|-------|
| Canonical builder | `common.media_urls.build_media_url(path)` → `MEDIA_URL` + `path.lstrip("/")` |
| `MEDIA_URL` | `/media/` (fixed in `ecm_backend/settings.py`, not env-driven) |
| `MEDIA_BASE_URL` | `""` by default; applied only at serialization, never stored |
| `MEDIA_ROOT` | `BASE_DIR / "media"` (`/app/media` in Docker; a named volume, not the host checkout) |
| `dms_documentversion.file_url` | `varchar(2000)`, blank allowed |
| `correspondence_correspondenceattachment.file_url` | `varchar(200)`, blank allowed |
| `Minute.parallel_group_id` | nullable `uuid`, **no foreign key** |
| `ParallelRoutingGroup.created_by` | **NOT NULL**, `ON DELETE CASCADE` |
| `Minute.user` | **NOT NULL** |
| `Correspondence.created_by` | nullable |
| Group counters | `total_branches`, `completed_branches` NOT NULL; `is_complete` default false |
| Runtime lazy creation | `correspondence.services._find_or_create_parallel_group()` and `force_complete_branch` already create missing groups on demand |

Because `parallel_group_id` has no FK, creating a group cannot violate referential
integrity. Because `check_and_update_completion()` mutates `Correspondence.workflow_state`
when a group completes, it must not be used as the backfill mechanism.

### 1.2 Dry-run against the local stack (read-only, 2026-11-16)

Database: `npa_ecm_local` on `localhost:5433` (container `ecm-postgres-local`,
PostgreSQL 16.14). Query ran inside `SET TRANSACTION READ ONLY`.

**Document versions** (`dms_documentversion`, 14 rows)

| Class | Rows |
|-------|------|
| blank | 9 |
| canonical `/media/...` | 5 |
| `/api/media/...` | 0 |
| `http(s)://...` | 0 |
| `data:` | 0 |
| other non-blank | 0 |
| **rewrite candidates** | **0** |
| **review required** | **0** |

**Correspondence attachments** (`correspondence_correspondenceattachment`, 3 rows)

| Class | Rows |
|-------|------|
| blank | 1 |
| canonical `/media/...` | 2 |
| `/api/media/...` | 0 |
| `http(s)://...` | 0 |
| `data:` | 0 |
| other non-blank | 0 |
| **rewrite candidates** | **0** |
| **review required** | **0** |

**File existence inside the backend container** (authoritative; the host checkout is
not the media volume): 5/5 and 2/2 non-blank URLs resolve to an existing file under
`/app/media`. Host-side checks falsely report 4/5 and 0/2 missing — never run the
existence check from the host.

**Parallel routing**

| Metric | Rows |
|--------|------|
| branch minutes without `parallel_group_id` | 0 |
| distinct group IDs referenced by minutes | 0 |
| existing `ParallelRoutingGroup` rows | 0 |
| referenced group IDs with no row | 0 |
| group IDs spanning >1 correspondence | 0 |
| referenced IDs with <2 distinct targets | 0 |
| **auto-creatable groups** | **0** |
| **review required** | **0** |

**Conclusion:** the local database is a clean no-op for both phases. These numbers
validate the queries, not the production data. Staging and production counts **must**
be produced and reviewed before any approval; no production numbers are assumed in
this document.

---

## 2. Global safety protocol (both phases)

1. **Separate approvals.** Phase A and Phase B each get their own go/no-go after their
   own dry-run is reviewed. Do not bundle them into one window.
2. **Maintenance window and write rejection.** Announce the window, enable API-side
   rejection for all mutating requests (including uploads and parallel-route creation),
   and verify the rejection before producing the final manifest. Do not rely on a user
   write freeze alone. Keep read-only API requests available for verification. Stop and
   drain celery worker and beat so queued jobs cannot mutate these records during the
   run (they can OCR versions, create minutes, or lazily create groups):

   ```bash
   # local
   docker compose stop celery-worker celery-beat
   # staging (on the server, /srv/npa-ecm)
   docker compose -f docker-compose.stag.yml stop celery-worker celery-beat
   ```

   If there is no existing API maintenance/write-rejection gate, add and verify a
   temporary gate before the change window; do not proceed with only an announced
   freeze. Keep writes rejected until post-apply verification is complete.
3. **One reviewed manifest per run.** Every candidate is written to a CSV with its old
   value, proposed value, and classification. Apply only manifest rows, split
   deterministically into configurable batches (default 2,000 rows); do not recompute
   candidates during apply.
4. **Advisory lock** to prevent two operators running the backfill at once:

   ```sql
   SELECT pg_try_advisory_lock(4216001);   -- must return true; media phase
   SELECT pg_try_advisory_lock(4216002);   -- parallel group phase
   ```

   Release with `pg_advisory_unlock(<key>)` at the end, or by ending the session.
5. **Short transactions, bounded lock waits.** Every apply transaction sets
   `SET LOCAL lock_timeout = '5s'` and `SET LOCAL statement_timeout = '120s'`.
6. **No ORM `save()` for URL rewrites.** A raw `UPDATE` avoids `DocumentVersion` save
   signals (OCR/summary enqueueing) and leaves `updated_at` untouched, preserving
   business timestamps. Group creation is a raw `INSERT` for the same reason.
7. **Guarded writes.** Every media update requires the row to still hold the exact old
   value (`WHERE id = ... AND file_url = ...`). A concurrent edit aborts the batch
   instead of being overwritten.
8. **Idempotency check.** Re-running the dry-run after apply must report zero rewrite
   candidates / zero auto-creatable groups.
9. **Stored artifacts.** Everything lives under a single timestamped directory:

   ```bash
   TS="$(date -u +%Y%m%dT%H%M%SZ)"
   OUT="backups/<env>/backfill-${TS}"
   mkdir -p "$OUT"
   ```

   Contains: full DB dump path, table CSVs, `media_manifest.csv`, per-batch media
   update/rollback SQL, `parallel_candidates.csv`, per-batch inserted-ID records,
   per-batch parallel rollback SQL, and the console output of every step.

---

## 3. Phase A — Media URL backfill

### 3.1 Target form and classification rules

Target: `"/media/" + <storage-relative path>` where the path is resolved from the
stored value. Only these classes are rewritten, and only when the resolved file exists
under `MEDIA_ROOT`:

| # | Input shape | Example | Action |
|---|-------------|---------|--------|
| A1 | `/api/media/<path>` | `/api/media/dms_versions/x/f.pdf` | rewrite → `/media/dms_versions/x/f.pdf` |
| A2 | `<MEDIA_ROOT>/<path>` | `/app/media/dms_versions/x/f.pdf` | rewrite → `/media/dms_versions/x/f.pdf` |
| A3 | `<path>` with no leading slash and no scheme | `dms_versions/x/f.pdf` | rewrite **only if** that file exists under `MEDIA_ROOT` |
| A4 | `media/<path>` | `media/dms_versions/x/f.pdf` | rewrite |
| A5 | `http(s)://<host>/media/<path>` | `https://ecm.example/media/dms_versions/x/f.pdf` | **review only; defer until a host allowlist exists** (see 3.6) |

Skipped without change:

| # | Input shape | Action |
|---|-------------|--------|
| S1 | empty / whitespace-only | skip (`skip_blank`) |
| S2 | `/media/<path>` already canonical | skip (`skip_canonical`), but record file presence |
| S3 | `data:` URI | skip (`skip_data`) |
| S4 | `http(s)` URL with no `/media/` segment | skip (`skip_external`) |

Sent to review with **no automatic change**:

| # | Condition | Reason code |
|---|-----------|-------------|
| R1 | value has leading/trailing whitespace | `review_whitespace` |
| R2 | `file://`, `s3://`, or other scheme | `review_unrecognized` |
| R3 | absolute path with an unknown prefix (e.g. `/files/...`) | `review_unrecognized` |
| R4 | empty path after the media prefix | `review_empty_path` |
| R5 | `..` path segment | `review_traversal` |
| R6 | backslash in path | `review_backslash` |
| R7 | percent-encoded path | `review_encoded` |
| R8 | doubled slash in path | `review_double_slash` |
| R9 | normalized value longer than the column limit (200 for attachments) | `review_too_long` |
| R10 | no file at `MEDIA_ROOT` for the proposed target | `review_missing_file` |

`review_missing_file` is deliberately blocking: rewriting a pointer whose file is gone
would turn a visible broken link into a canonical-looking broken link.

### 3.2 Dry run (read-only)

Classification and the manifest are produced by one script. It performs **no writes**
to the database. Existence checks run against the container's `/app/media`.

```bash
# local; for stag/prod run the same block on the server with -f docker-compose.<env>.yml
docker compose exec -T backend python manage.py shell <<'PY'
import csv, os
from collections import Counter
from django.conf import settings
from django.db import connection
from common.storage_utils import resolve_media_path
from dms.models import DocumentVersion
from correspondence.models import CorrespondenceAttachment

OUT = "/tmp/media_manifest.csv"
ROOT = str(settings.MEDIA_ROOT).rstrip("/")

def column_limit(table, column):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT character_maximum_length FROM information_schema.columns "
            "WHERE table_name=%s AND column_name=%s",
            [table, column],
        )
        return cur.fetchone()[0]

def classify(raw, limit):
    if raw is None or raw.strip() == "":
        return "skip_blank", "", ""
    if raw != raw.strip():
        return "review_whitespace", "", "leading/trailing whitespace"
    value = raw
    if value.startswith("data:"):
        return "skip_data", "", ""
    path = None
    if value.startswith("/api/media/"):
        path = value[len("/api/media/"):]
    elif value.startswith(ROOT + "/"):
        path = value[len(ROOT) + 1:]
    elif value.startswith("/media/"):
        path = value[len("/media/"):]
    elif value.startswith("media/"):
        path = value[len("media/"):]
    elif value.startswith(("http://", "https://")):
        if "/media/" in value:
            return "review_absolute_media", "", "absolute media URL deferred pending host allowlist"
        return "skip_external", "", ""
    elif "://" in value or value.startswith("/"):
        return "review_unrecognized", "", "unknown scheme or absolute prefix"
    else:
        path = value

    if not path:
        return "review_empty_path", "", "no path after media prefix"
    if ".." in path.split("/"):
        return "review_traversal", "", "path contains .."
    if "\\" in path:
        return "review_backslash", "", "path contains backslash"
    if "%" in path:
        return "review_encoded", "", "path is percent-encoded"
    if "//" in path:
        return "review_double_slash", "", "path contains //"

    target = f"/media/{path.lstrip('/')}"
    if len(target) > limit:
        return "review_too_long", target, f"exceeds column limit {limit}"
    if value == target:
        return "skip_canonical", target, ""
    if not os.path.isfile(resolve_media_path(target)):
        return "review_missing_file", target, "no file under MEDIA_ROOT"
    return "rewrite", target, ""

targets = [
    ("dms_documentversion", DocumentVersion, "file_url"),
    ("correspondence_correspondenceattachment", CorrespondenceAttachment, "file_url"),
]
counts = Counter()
rows = []
for table, model, field in targets:
    limit = column_limit(table, field)
    for pk, raw in model.objects.values_list("id", field).iterator():
        action, new_value, reason = classify(raw or "", limit)
        counts[(table, action)] += 1
        rows.append({
            "table": table, "id": str(pk), "old_value": raw or "",
            "new_value": new_value, "action": action, "reason": reason,
        })

with open(OUT, "w", newline="") as fh:
    writer = csv.DictWriter(
        fh, fieldnames=["table", "id", "old_value", "new_value", "action", "reason"]
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"manifest: {OUT} ({len(rows)} rows)")
for (table, action), count in sorted(counts.items()):
    print(f"{table},{action},{count}")
print("REWRITE", sum(c for (t, a), c in counts.items() if a == "rewrite"))
print("REVIEW", sum(c for (t, a), c in counts.items() if a.startswith("review_")))
PY
```

Copy the manifest out of the container (works with scaled services too):

```bash
CID="$(docker compose ps -q backend | head -n1)"
docker cp "$CID:/tmp/media_manifest.csv" "$OUT/media_manifest.csv"
```

**Gate A1 — do not proceed unless:**

- `REWRITE` count equals the number of rows you intend to change;
- every row with `action = rewrite` has an existing file;
- every `review_*` row is either absent or adjudicated and explicitly excluded;
  `review_absolute_media` remains deferred until a host allowlist is approved (3.6)
  and is recorded, not applied;
- the count of `skip_canonical` rows whose file is missing has been recorded as
  pre-existing breakage (informational; no action in this phase).

### 3.3 Backup

```bash
ENV=stag                      # or local / prod
OUT="backups/${ENV}/backfill-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT"

# 1. Full logical backup, verified by the project tooling.
scripts/backup/backup-db.sh "$ENV"
VERIFY_ENV="$ENV" BACKUP_DIR="backups/${ENV}" scripts/backup/verify_backup.sh
```

Record the printed dump path as the only line of `$OUT/backup_path.txt`; the restore
example in 3.7 reads that file.

```bash
# 2. Targeted, human-readable snapshot of only the affected columns.
set -a; . "backend/env/${ENV}.env"; set +a     # DB_USER / DB_NAME; never commit this file
COMPOSE="docker compose -f docker-compose.${ENV}.yml"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "\copy (SELECT id, file_url, updated_at FROM dms_documentversion ORDER BY id) TO STDOUT WITH CSV HEADER" \
  > "$OUT/dms_documentversion.csv"

$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "\copy (SELECT id, file_url, updated_at FROM correspondence_correspondenceattachment ORDER BY id) TO STDOUT WITH CSV HEADER" \
  > "$OUT/correspondence_attachment.csv"

# 3. Baseline metrics for post-apply comparison.
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c \
  "SELECT 'dms', COUNT(*), COUNT(*) FILTER (WHERE file_url LIKE '/media/%') FROM dms_documentversion
   UNION ALL
   SELECT 'att', COUNT(*), COUNT(*) FILTER (WHERE file_url LIKE '/media/%') FROM correspondence_correspondenceattachment" \
  > "$OUT/baseline_counts.txt"
```

Backup acceptance: restore verification reports success, `$OUT` contains all three
artifacts, and the dump was produced **after** API write rejection was verified and
celery was drained.

### 3.4 Apply

Generate SQL from the reviewed manifest — never from a fresh query — so execution
matches review exactly. Run this on the host (Python 3, no dependencies):

```bash
BATCH_SIZE="${BATCH_SIZE:-2000}" python3 - "$OUT/media_manifest.csv" "$OUT" <<'PY'
import csv, os, sys
manifest, out_dir = sys.argv[1], sys.argv[2]
batch_size = int(os.environ.get("BATCH_SIZE", "2000"))
if batch_size < 1:
    raise SystemExit("BATCH_SIZE must be a positive integer")

rows = sorted(
    (r for r in csv.DictReader(open(manifest)) if r["action"] == "rewrite"),
    key=lambda r: (r["table"], r["id"]),
)
by_table = {}
for r in rows:
    by_table.setdefault(r["table"], []).append(r)

def q(value):
    return "'" + value.replace("'", "''") + "'"

def block(table, items, forward):
    if forward:
        values = ",\n".join(
            f"    ({q(i['id'])}::uuid, {q(i['old_value'])}, {q(i['new_value'])})"
            for i in items
        )
        set_clause, guard = "v.new_url", "t.file_url = v.old_url"
    else:
        values = ",\n".join(
            f"    ({q(i['id'])}::uuid, {q(i['new_value'])}, {q(i['old_value'])})"
            for i in items
        )
        set_clause, guard = "v.old_url", "t.file_url = v.new_url"
    return f"""DO $$
DECLARE changed integer;
BEGIN
  WITH v(id, old_url, new_url) AS (VALUES
{values}
  )
  UPDATE {table} t SET file_url = {set_clause}
  FROM v WHERE t.id = v.id AND {guard};
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> {len(items)} THEN
    RAISE EXCEPTION 'expected {len(items)} updates in {table}, got %', changed;
  END IF;
END $$;"""

suffixes = []
for batch_number, start in enumerate(range(0, len(rows), batch_size), start=1):
    batch = rows[start:start + batch_size]
    batch_tables = {}
    for row in batch:
        batch_tables.setdefault(row["table"], []).append(row)
    suffix = f"{batch_number:04d}"
    suffixes.append(suffix)
    # Each batch file contains only rows copied from the reviewed manifest; no
    # row is selected or recomputed at apply time.
    for name, forward in ((f"media_updates_{suffix}.sql", True),
                          (f"media_rollback_{suffix}.sql", False)):
        with open(f"{out_dir}/{name}", "w") as fh:
            fh.write("BEGIN;\nSET LOCAL lock_timeout = '5s';\n")
            fh.write("SET LOCAL statement_timeout = '120s';\n")
            for table, items in batch_tables.items():
                fh.write(block(table, items, forward) + "\n")
            fh.write("COMMIT;\n")
    print(f"batch={suffix} rows={len(batch)} tables={list(batch_tables)}")
with open(f"{out_dir}/media_batches.txt", "w") as fh:
    fh.write("\n".join(suffixes) + ("\n" if suffixes else ""))
print(f"rows={len(rows)} batch_size={batch_size} tables={list(by_table)}")
PY
```

The generator uses operator-configurable `BATCH_SIZE` (default `2000`) and
deterministically splits the reviewed rewrite rows into numbered batches of at most
that size. It creates matching update and rollback SQL for each batch. Each file has
its own transaction, bounded lock/statement timeouts, and guarded row-count checks.
Review all generated batch SQL against the aggregate manifest before applying batches
in order.

Apply one batch at a time in manifest order, recording only batches whose transaction
commits. Stop on the first failure and do not run later batches. The aggregate manifest
remains the review source; each batch is a separate transaction and checkpoint.

```bash
set -o pipefail
touch "$OUT/media_committed_batches.txt"
while read -r BATCH; do
  [ -n "$BATCH" ] || continue
  if grep -qx "$BATCH" "$OUT/media_committed_batches.txt"; then
    echo "batch ${BATCH} already committed; skipping" >&2
    continue
  fi
  if $COMPOSE exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
      < "$OUT/media_updates_${BATCH}.sql" 2>&1 | tee "$OUT/media_apply_${BATCH}.log"; then
    printf '%s\n' "$BATCH" >> "$OUT/media_committed_batches.txt"
  else
    echo "batch ${BATCH} failed; stopping" >&2
    break
  fi
done < "$OUT/media_batches.txt"
```

### 3.5 Verify

```bash
# 1. No non-canonical local prefixes remain among rows that were rewritten.
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT 'dms' AS t, COUNT(*) FROM dms_documentversion
   WHERE file_url LIKE '/api/media/%' OR file_url LIKE 'media/%' OR file_url LIKE '/app/media/%'
  UNION ALL
  SELECT 'att', COUNT(*) FROM correspondence_correspondenceattachment
   WHERE file_url LIKE '/api/media/%' OR file_url LIKE 'media/%' OR file_url LIKE '/app/media/%';"
# Expect 0 and 0.

# 2. Row counts unchanged (no inserts/deletes).
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c \
  "SELECT 'dms', COUNT(*), COUNT(*) FILTER (WHERE file_url LIKE '/media/%') FROM dms_documentversion
   UNION ALL
   SELECT 'att', COUNT(*), COUNT(*) FILTER (WHERE file_url LIKE '/media/%') FROM correspondence_correspondenceattachment" \
  | tee "$OUT/post_apply_counts.txt"
diff "$OUT/baseline_counts.txt" "$OUT/post_apply_counts.txt"

# 3. Re-run the dry-run script (3.2). Expect rewrite=0 and review=0.
# 4. Resolve every rewritten target against the container filesystem.
docker compose exec -T backend python manage.py shell <<'PY'
import csv, os
from common.storage_utils import resolve_media_path
rows = [r for r in csv.DictReader(open('/tmp/media_manifest.csv')) if r['action'] == 'rewrite']
bad = [r['new_value'] for r in rows if not os.path.isfile(resolve_media_path(r['new_value']))]
print('rewritten', len(rows), 'unresolvable', len(bad))
for value in bad[:10]:
    print('BAD', value)
PY
```

Manual spot check: open two rewritten documents and one attachment in the UI and
confirm preview/download works (attachments use the download/content endpoints, not the
raw URL, so a 200 from `/api/v1/.../attachments/<id>/content/` is the meaningful check).
Complete the data cleanup by removing the table CSVs from any shared location only
after the change window closes.

### 3.6 Deferred: absolute `http(s)://…/media/…` URLs

These are counted as `review_absolute_media` and left untouched. Absolute URLs stay
deferred until an explicit host allowlist is reviewed and approved. This plan does not
define or authorize a later rewrite pass; a separate approved procedure is required
once the allowlist exists, because a foreign host may point at a separate storage
origin that cannot be reconstructed from the path.

### 3.7 Rollback

**Preferred — value replay (fast, preserves everything written after the backup):**

Replay only committed batches in reverse order. Each rollback file is a separate
transaction bounded to at most `BATCH_SIZE` manifest rows.

```bash
set -o pipefail
# Iterate only committed batches, newest first, using the matching rollback file.
# Stop on the first mismatch; do not force a rollback over a subsequently edited row.
sort -r "$OUT/media_committed_batches.txt" | while read -r BATCH; do
  [ -n "$BATCH" ] || continue
  if $COMPOSE exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
      < "$OUT/media_rollback_${BATCH}.sql" 2>&1 | tee -a "$OUT/media_rollback.log"; then
    printf '%s\n' "$BATCH" >> "$OUT/media_rolled_back_batches.txt"
  else
    echo "rollback of batch ${BATCH} failed; stopping" >&2
    break
  fi
done
```

Each rollback file is generated in 3.4 from that batch's manifest rows: it restores
each `old_value` only where the row still holds that exact `new_value`, and aborts on any
mismatch. A mismatch means someone edited the row after apply — inspect it manually
rather than forcing the write. Batches that never committed are never replayed, even
though a rollback file was generated for them.

Then verify rollback:

```bash
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c \
  "SELECT 'dms', COUNT(*), COUNT(*) FILTER (WHERE file_url LIKE '/media/%') FROM dms_documentversion
   UNION ALL
   SELECT 'att', COUNT(*), COUNT(*) FILTER (WHERE file_url LIKE '/media/%') FROM correspondence_correspondenceattachment"
diff "$OUT/baseline_counts.txt" -
```

Re-run the dry-run: the rewrite count must equal the pre-apply `REWRITE` number.

**Last resort — full restore** (only if the rollback SQL cannot run or the database is
inconsistent; this discards every write made after the dump):

```bash
scripts/backup/restore_backup.sh --env "$ENV" --backup-file "$(cat "$OUT/backup_path.txt")" --yes
```

Restoring also reverts Phase B if it ran after this dump — which is why the phases are
approved and backed up separately.

---

## 4. Phase B — Parallel-routing group backfill

### 4.1 Problem being repaired

`Minute.parallel_group_id` is a bare UUID. Several legacy paths wrote the UUID onto
branch minutes without always creating the `ParallelRoutingGroup` row; the runtime
compensates lazily (`_find_or_create_parallel_group`, `force_complete_branch`), but
until that happens the group is absent from `/api/v1/parallel-routing-groups/`, and
group-level completion bookkeeping has nothing to attach to.

The backfill restores the missing grouping rows. It does **not** recompute or assert
completion.

### 4.2 Eligibility

A referenced group UUID is auto-created only when **all** of the following hold:

| Condition | Rationale |
|-----------|-----------|
| No `ParallelRoutingGroup` row exists with that UUID | nothing to repair otherwise |
| Minutes referencing the UUID belong to exactly **one** correspondence | a UUID reused across records cannot be attributed safely |
| At least **2** top-level recipient branches exist | matches `create_parallel_route`, which rejects fewer than 2 recipients |
| All referencing minutes share one `merge_strategy` value | conflicting strategies have no defensible winner |

Top-level branches are computed exactly as `check_and_update_completion()` does:
the earliest `is_parallel_branch` minute per distinct `to_office`/`to_user` target,
restricted to minutes with a non-empty `assignment_outcome` when any branch minute in
that group has one.

Everything else is reported, never written:

| Condition | Bucket |
|-----------|--------|
| referenced UUID has a row, but the row's correspondence differs from the minutes' | `review_existing_mismatch` |
| minutes span multiple correspondences | `review_multiple_correspondences` |
| no top-level branch minutes | `review_no_branches` |
| exactly one top-level branch | `review_single_target` |
| more than one `merge_strategy` | `review_conflicting_strategy` |
| group row exists with no minutes at all | reported only; **not deleted** |

Field values for inserted rows:

| Field | Value |
|-------|-------|
| `id` | the existing `Minute.parallel_group_id` |
| `correspondence_id` | the single referencing correspondence |
| `created_by_id` | `correspondence.created_by_id`, else the earliest branch minute's `user_id` (guarantees NOT NULL) |
| `merge_strategy` | the one shared value |
| `total_branches` | computed top-level branch count |
| `completed_branches` | `0` (see 4.6 decision) |
| `is_complete` | `false` |
| `completed_at` | `NULL` |
| `created_at` / `updated_at` | `NOW()` |

### 4.3 Dry run (read-only SQL)

Run inside the database container so the query uses server-side data only:

```bash
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
SET TRANSACTION READ ONLY;
WITH branch AS (
  SELECT DISTINCT ON (m.parallel_group_id, COALESCE(m.to_office_id::text, m.to_user_id::text))
         m.parallel_group_id AS gid,
         m.assignment_outcome,
         m.timestamp
  FROM correspondence_minute m
  WHERE m.parallel_group_id IS NOT NULL
    AND m.is_parallel_branch
    AND (m.to_office_id IS NOT NULL OR m.to_user_id IS NOT NULL)
  ORDER BY m.parallel_group_id,
           COALESCE(m.to_office_id::text, m.to_user_id::text),
           m.timestamp
), flags AS (
  SELECT gid, BOOL_OR(assignment_outcome <> '') AS has_explicit
  FROM branch GROUP BY gid
), top_level AS (
  SELECT b.gid, COUNT(*) AS total_branches
  FROM branch b JOIN flags f USING (gid)
  WHERE NOT f.has_explicit OR b.assignment_outcome <> ''
  GROUP BY b.gid
), ids AS (
  SELECT parallel_group_id AS gid,
         COUNT(DISTINCT correspondence_id) AS correspondence_count,
         COUNT(DISTINCT merge_strategy) AS strategy_count,
         MIN(merge_strategy) AS merge_strategy,
         MIN(user_id) AS first_user_id,
         COUNT(*) AS minute_count,
         COUNT(*) FILTER (WHERE is_parallel_branch) AS branch_count
  FROM correspondence_minute
  WHERE parallel_group_id IS NOT NULL
  GROUP BY parallel_group_id
)
SELECT ids.gid,
       ids.correspondence_count,
       ids.strategy_count,
       ids.branch_count,
       COALESCE(t.total_branches, 0) AS total_branches,
       g.id IS NOT NULL AS has_group,
       CASE
         WHEN g.id IS NOT NULL AND g.correspondence_id <> MIN(m.correspondence_id::text)::uuid THEN 'review_existing_mismatch'
         WHEN g.id IS NOT NULL THEN 'already_present'
         WHEN ids.correspondence_count > 1 THEN 'review_multiple_correspondences'
         WHEN COALESCE(t.total_branches, 0) = 0 THEN 'review_no_branches'
         WHEN ids.strategy_count > 1 THEN 'review_conflicting_strategy'
         WHEN t.total_branches = 1 THEN 'review_single_target'
         ELSE 'insert'
       END AS action
FROM ids
JOIN correspondence_minute m ON m.parallel_group_id = ids.gid
LEFT JOIN top_level t ON t.gid = ids.gid
LEFT JOIN correspondence_parallelroutinggroup g ON g.id = ids.gid
GROUP BY ids.gid, ids.correspondence_count, ids.strategy_count, ids.branch_count,
         t.total_branches, g.id, g.correspondence_id
ORDER BY action, ids.gid;

-- Summary + orphan report
WITH ids AS (
  SELECT parallel_group_id AS gid FROM correspondence_minute
  WHERE parallel_group_id IS NOT NULL GROUP BY parallel_group_id
)
SELECT
  (SELECT COUNT(*) FROM ids) AS referenced_ids,
  (SELECT COUNT(*) FROM correspondence_parallelroutinggroup) AS existing_groups,
  (SELECT COUNT(*) FROM ids i LEFT JOIN correspondence_parallelroutinggroup g ON g.id = i.gid
    WHERE g.id IS NULL) AS missing_groups,
  (SELECT COUNT(*) FROM correspondence_parallelroutinggroup g
    WHERE NOT EXISTS (SELECT 1 FROM correspondence_minute m WHERE m.parallel_group_id = g.id)) AS orphan_groups;
SQL
```

Export the exact insert manifest for review. This is a SELECT-only query and writes
nothing; its output is the only input to the apply generator in 4.5. It reproduces the
`insert` eligibility rule, including a non-null `created_by_id`:

```bash
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "\copy (WITH branch AS (
       SELECT DISTINCT ON (m.parallel_group_id, COALESCE(m.to_office_id::text, m.to_user_id::text))
              m.parallel_group_id AS gid, m.assignment_outcome, m.timestamp, m.user_id
       FROM correspondence_minute m
       WHERE m.parallel_group_id IS NOT NULL
         AND m.is_parallel_branch
         AND (m.to_office_id IS NOT NULL OR m.to_user_id IS NOT NULL)
       ORDER BY m.parallel_group_id,
                COALESCE(m.to_office_id::text, m.to_user_id::text), m.timestamp
     ), flags AS (
       SELECT gid, BOOL_OR(assignment_outcome <> '') AS has_explicit
       FROM branch GROUP BY gid
     ), top_level AS (
       SELECT b.gid, COUNT(*) AS total_branches
       FROM branch b JOIN flags f USING (gid)
       WHERE NOT f.has_explicit OR b.assignment_outcome <> ''
       GROUP BY b.gid
     ), first_branch AS (
       SELECT DISTINCT ON (gid) gid, user_id
       FROM branch ORDER BY gid, timestamp
     ), ids AS (
       SELECT parallel_group_id AS gid,
              COUNT(DISTINCT correspondence_id) AS correspondence_count,
              COUNT(DISTINCT merge_strategy) AS strategy_count,
              MIN(merge_strategy) AS merge_strategy,
              MIN(correspondence_id::text)::uuid AS correspondence_id
       FROM correspondence_minute
       WHERE parallel_group_id IS NOT NULL
       GROUP BY parallel_group_id
     )
     SELECT ids.gid AS id,
            ids.correspondence_id,
            COALESCE(c.created_by_id, fb.user_id) AS created_by_id,
            ids.merge_strategy,
            t.total_branches
     FROM ids
     JOIN correspondence_correspondence c ON c.id = ids.correspondence_id
     JOIN top_level t ON t.gid = ids.gid
     LEFT JOIN first_branch fb ON fb.gid = ids.gid
     LEFT JOIN correspondence_parallelroutinggroup g ON g.id = ids.gid
     WHERE g.id IS NULL
       AND ids.correspondence_count = 1
       AND ids.strategy_count = 1
       AND t.total_branches >= 2
       AND COALESCE(c.created_by_id, fb.user_id) IS NOT NULL
     ORDER BY ids.gid) TO STDOUT WITH CSV HEADER" \
  > "$OUT/parallel_insert_manifest.csv"
```

`parallel_candidates.csv` from the review step may be kept as an audit record, but it is
not an apply input. Only `parallel_insert_manifest.csv` is.

**Gate B1 — do not proceed unless:**

- the manifest row count is recorded and every row shows `total_branches >= 2`;
- every `created_by_id` is non-empty;
- each `review_*` bucket is either empty or explicitly adjudicated;
- `orphan_groups` is recorded but scheduled for a separate cleanup decision;
- `workflow_state` distribution is captured as a baseline (see 4.4).

### 4.4 Backup

```bash
scripts/backup/backup-db.sh "$ENV"
VERIFY_ENV="$ENV" BACKUP_DIR="backups/${ENV}" scripts/backup/verify_backup.sh

# Targeted snapshot of everything the phase can touch.
for spec in \
  "correspondence_minute:SELECT id, correspondence_id, parallel_group_id, is_parallel_branch, merge_strategy, assignment_outcome, to_office_id, to_user_id, user_id, timestamp, branch_completed_at FROM correspondence_minute ORDER BY id" \
  "correspondence_parallelroutinggroup:SELECT * FROM correspondence_parallelroutinggroup ORDER BY created_at" \
  "correspondence_correspondence:SELECT id, reference_number, workflow_state, completed_parallel_branches, current_office_id, current_approver_id FROM correspondence_correspondence ORDER BY id"
do
  table="${spec%%:*}"; query="${spec#*:}"
  $COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
    "\copy ($query) TO STDOUT WITH CSV HEADER" > "$OUT/${table}.csv"
done

# Baseline workflow-state distribution and minute count (must remain unchanged).
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c \
  "SELECT workflow_state, COUNT(*) FROM correspondence_correspondence GROUP BY workflow_state ORDER BY workflow_state" \
  > "$OUT/baseline_workflow_state.txt"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c \
  "SELECT COUNT(*) FROM correspondence_minute" > "$OUT/baseline_minutes_count.txt"
```

### 4.5 Apply

Generate batch SQL from the reviewed manifest — never from a live eligibility query at
apply time. `parallel_insert_manifest.csv` from 4.3 is the only input, so the rows
inserted are exactly the rows reviewed. Use an operator-configurable `BATCH_SIZE`
(default `2000`) and split manifest rows deterministically by ID.

```bash
BATCH_SIZE="${BATCH_SIZE:-2000}" python3 - "$OUT/parallel_insert_manifest.csv" "$OUT" <<'PY'
import csv, os, sys

manifest, out_dir = sys.argv[1], sys.argv[2]
batch_size = int(os.environ.get("BATCH_SIZE", "2000"))
if batch_size < 1:
    raise SystemExit("BATCH_SIZE must be a positive integer")

rows = []
seen = set()
for row in csv.DictReader(open(manifest)):
    gid = (row.get("id") or "").strip()
    correspondence_id = (row.get("correspondence_id") or "").strip()
    created_by_id = (row.get("created_by_id") or "").strip()
    merge_strategy = (row.get("merge_strategy") or "").strip()
    total_branches = int(row.get("total_branches") or 0)
    if not gid or not correspondence_id or not created_by_id:
        raise SystemExit(f"manifest row missing a required value: {row}")
    if gid in seen:
        raise SystemExit(f"duplicate manifest id: {gid}")
    if total_branches < 2:
        raise SystemExit(f"manifest id {gid} has fewer than 2 branches")
    seen.add(gid)
    rows.append({
        "id": gid,
        "correspondence_id": correspondence_id,
        "created_by_id": created_by_id,
        "merge_strategy": merge_strategy,
        "total_branches": total_branches,
    })

rows.sort(key=lambda r: r["id"])

def q(value):
    return "'" + str(value).replace("'", "''") + "'"

def values_sql(items):
    columns = ("id", "correspondence_id", "created_by_id", "merge_strategy", "total_branches")
    return ",\n".join(
        "  (" + ", ".join(q(item[column]) for column in columns) + ")" for item in items
    )

suffixes = []
for batch_number, start in enumerate(range(0, len(rows), batch_size), start=1):
    batch = rows[start:start + batch_size]
    suffix = f"{batch_number:04d}"
    suffixes.append(suffix)
    sql = f"""BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
CREATE TEMP TABLE backfill_batch (
  id uuid PRIMARY KEY,
  correspondence_id uuid NOT NULL,
  created_by_id uuid NOT NULL,
  merge_strategy varchar(20) NOT NULL,
  total_branches integer NOT NULL
) ON COMMIT DROP;
INSERT INTO backfill_batch (id, correspondence_id, created_by_id, merge_strategy, total_branches) VALUES
{values_sql(batch)};
WITH inserted AS (
  INSERT INTO correspondence_parallelroutinggroup
    (id, correspondence_id, created_by_id, merge_strategy, is_complete,
     completed_at, total_branches, completed_branches, created_at, updated_at)
  SELECT b.id, b.correspondence_id, b.created_by_id, b.merge_strategy, FALSE,
         NULL, b.total_branches, 0, NOW(), NOW()
  FROM backfill_batch b
  JOIN correspondence_correspondence c ON c.id = b.correspondence_id
  JOIN accounts_user u ON u.id = b.created_by_id
  WHERE NOT EXISTS (
    SELECT 1 FROM correspondence_parallelroutinggroup g WHERE g.id = b.id
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
SELECT id FROM inserted;
DO $$
DECLARE expected bigint := {len(batch)}; actual bigint;
BEGIN
  SELECT count(*) INTO actual
  FROM correspondence_parallelroutinggroup g
  JOIN backfill_batch b ON b.id = g.id;
  IF actual <> expected THEN
    RAISE EXCEPTION 'expected % manifest rows present after batch, found %', expected, actual;
  END IF;
END $$;
COMMIT;
"""
    with open(f"{out_dir}/parallel_insert_{suffix}.sql", "w") as fh:
        fh.write(sql)
    print(f"batch={suffix} rows={len(batch)}")

with open(f"{out_dir}/parallel_batches.txt", "w") as fh:
    fh.write("\n".join(suffixes) + ("\n" if suffixes else ""))
print(f"rows={len(rows)} batch_size={batch_size}")
PY
```

Review the generated `parallel_insert_*.sql` files against the manifest before applying.
Each file inserts only its manifest rows, joins them to an existing correspondence and
creator, skips IDs already present, and aborts if the batch is not fully represented
after the insert.

Apply one batch at a time, recording only batches that commit:

```bash
touch "$OUT/parallel_inserted_ids.txt" "$OUT/parallel_committed_batches.txt"
while read -r BATCH; do
  [ -n "$BATCH" ] || continue
  if grep -qx "$BATCH" "$OUT/parallel_committed_batches.txt"; then
    echo "batch ${BATCH} already committed; skipping" >&2
    continue
  fi
  if $COMPOSE exec -T postgres psql -q -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -At \
      < "$OUT/parallel_insert_${BATCH}.sql" \
      > "$OUT/parallel_inserted_ids_${BATCH}.txt" 2> "$OUT/parallel_apply_${BATCH}.err"; then
    cat "$OUT/parallel_inserted_ids_${BATCH}.txt" >> "$OUT/parallel_inserted_ids.txt"
    printf '%s\n' "$BATCH" >> "$OUT/parallel_committed_batches.txt"
  else
    echo "batch ${BATCH} failed; stopping" >&2
    break
  fi
done < "$OUT/parallel_batches.txt"
```

`ON CONFLICT DO NOTHING` is deliberate: if the application lazily creates a group
between manifest review and apply, the application's row wins and the backfill skips it.
The batch still commits because the post-insert check requires every manifest row to be
present, whether this backfill or the application created it. Record which batches
committed; rollback is limited to the IDs this run actually returned.

### 4.6 Counter policy (approved)

Use structural-only counters:

- write `total_branches` from the reviewed structural branch calculation,
- write `completed_branches = 0`, `is_complete = false`, `completed_at = NULL`,
- never compute a completed count (including a read-only completion count) in this
  backfill,
- never touch `Correspondence.workflow_state` or `completed_parallel_branches`.

Completion is business state derived from recipient responses. Computing it here
would duplicate `check_and_update_completion()` and risks marking records merged
outside the normal approval flow. A later legitimate completion check can refresh the
counters.

### 4.7 Verify

```bash
# 1. Every referenced UUID now has a row.
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c "
  SELECT COUNT(*) FROM (
    SELECT DISTINCT parallel_group_id FROM correspondence_minute
    WHERE parallel_group_id IS NOT NULL
  ) i LEFT JOIN correspondence_parallelroutinggroup g ON g.id = i.parallel_group_id
  WHERE g.id IS NULL;"
# Expect 0.

# 2. Inserted rows match the combined per-batch captured IDs and have sane counters.
#    Skip when the run-level parallel_inserted_ids.txt is empty.
IDS="$(paste -sd, "$OUT/parallel_inserted_ids.txt" | sed "s/\([^,]*\)/'\1'/g")"
if [ -n "$IDS" ]; then
  $COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT id, correspondence_id, created_by_id, merge_strategy, total_branches,
           completed_branches, is_complete, completed_at
    FROM correspondence_parallelroutinggroup
    WHERE id IN ($IDS);"
fi

# 3. Correspondence workflow state is unchanged.
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c \
  "SELECT workflow_state, COUNT(*) FROM correspondence_correspondence GROUP BY workflow_state ORDER BY workflow_state" \
  > "$OUT/post_apply_workflow_state.txt"
diff "$OUT/baseline_workflow_state.txt" "$OUT/post_apply_workflow_state.txt"

# 4. No minute rows were added or removed.
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -At -c \
  "SELECT COUNT(*) FROM correspondence_minute" > "$OUT/post_apply_minutes_count.txt"
diff "$OUT/baseline_minutes_count.txt" "$OUT/post_apply_minutes_count.txt"

# 5. Re-run 4.3: missing_groups must be 0 (or only race-created rows already present).
```

Manual smoke check (read-only): `GET /api/v1/parallel-routing-groups/?correspondence=<id>`
returns the restored group for one affected record, and the correspondence detail page
shows its branch panel without a "group not found" fallback.

### 4.8 Rollback

Delete only IDs returned by committed batch transactions, and only while those rows are
still untouched. Generate one rollback file per committed batch from its recorded
inserted-ID file; no manifest row is deleted unless this run actually inserted it.

```bash
while read -r BATCH; do
  [ -n "$BATCH" ] || continue
  python3 - "$OUT/parallel_inserted_ids_${BATCH}.txt" "$OUT/parallel_rollback_${BATCH}.sql" <<'PY' || break
import sys

ids_path, sql_path = sys.argv[1], sys.argv[2]
ids = [line.strip() for line in open(ids_path) if line.strip()]
if not ids:
    # Nothing was inserted by this batch (all manifest rows already existed), so a
    # no-op transaction keeps the committed-batch loop consistent.
    open(sql_path, "w").write("BEGIN;\nCOMMIT;\n")
    print(f"no inserted IDs in {ids_path}; wrote no-op rollback")
    raise SystemExit(0)

values = ",\n".join(f"    ('{i}'::uuid)" for i in ids)
sql = f"""BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
CREATE TEMP TABLE backfill_batch (id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO backfill_batch (id) VALUES
{values};
DO $$
DECLARE expected bigint := {len(ids)}; actual bigint;
BEGIN
  DELETE FROM correspondence_parallelroutinggroup g
  USING backfill_batch b
  WHERE g.id = b.id
    AND g.is_complete = FALSE
    AND g.completed_at IS NULL
    AND g.updated_at = g.created_at;
  GET DIAGNOSTICS actual = ROW_COUNT;
  IF actual <> expected THEN
    RAISE EXCEPTION 'expected % inserted rows to delete, deleted %', expected, actual;
  END IF;
END $$;
COMMIT;
"""
open(sql_path, "w").write(sql)
print(f"rollback={sql_path} ids={len(ids)}")
PY
done < "$OUT/parallel_committed_batches.txt"
```

Apply rollback newest first, recording only batches whose delete commits:

```bash
set -o pipefail
sort -r "$OUT/parallel_committed_batches.txt" | while read -r BATCH; do
  [ -n "$BATCH" ] || continue
  if $COMPOSE exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
      < "$OUT/parallel_rollback_${BATCH}.sql" 2>&1 | tee -a "$OUT/parallel_rollback.log"; then
    printf '%s\n' "$BATCH" >> "$OUT/parallel_rolled_back_batches.txt"
  else
    echo "rollback of batch ${BATCH} failed; stopping" >&2
    break
  fi
done
```

The `updated_at = created_at` guard skips any group that runtime code has since
recomputed, and the row-count check aborts that batch instead of reporting a partial
delete. Inspect a mismatch manually; do not remove the guard to force the delete. After
rollback, none of the committed inserted IDs should remain, `referenced_ids` should again
exceed `existing_groups` by the original missing-group count, and the workflow-state
distribution must still match the baseline (rollback never touches correspondence).

Full restore remains the last resort, with the same caveat as 3.7: it reverts every
write after the dump, including Phase A if that ran later.

---

## 5. Execution order and run sheet

| Step | Environment | Action | Stop condition |
|------|-------------|--------|----------------|
| 0 | local | Re-run both dry-runs | Non-zero rewrite/insert counts where the local baseline says 0 → investigate before trusting the queries |
| 1 | staging | Phase A approved window: enable API write rejection, stop/drain celery, full backup + verify | Writes are not rejected or backup verification fails |
| 2 | staging | Phase A dry-run, review manifest | Any unexplained `review_*` row |
| 3 | staging | Phase A apply + verify + UI spot check | Count mismatch, unresolvable target, or 5xx on preview |
| 4 | staging | Phase A read-only verification while writes remain rejected | Any regression → 3.7 rollback |
| 5 | staging | End Phase A window; re-enable API writes and resume celery after verification | Verification incomplete or mismatched |
| 6 | staging | In its own approved Phase B window, repeat API write rejection and celery drain, backup, dry-run, review, apply + verify | Any `review_*` row unresolved, missing group, or workflow-state diff |
| 7 | staging | End Phase B window; re-enable API writes and resume celery only after verification | Verification incomplete or mismatched |
| 8 | production | Repeat steps 1–7 with `prod` compose file and a change ticket; each phase has a separate approval/window | Same gates; one phase per window |

Deferred to a separate change (not this plan): absolute media URLs until an explicit
host allowlist is approved (3.6), orphan group rows, `content_html` embedded URLs, and
any column widening.

---

## 6. Remaining approval gate

The following policies are decided for this plan:

- **Counters:** structural-only; no completed count is calculated (4.6).
- **Absolute media URLs:** deferred until an explicit host allowlist is approved (3.6).
- **Writes:** reject API writes throughout each backfill window; stop and drain celery
  as an additional safeguard (2.2).
- **Batching:** configurable transaction batches, default 2,000 rows (2.5, 3.4, 4.5).

Remaining phase-specific approvals still apply. **Attachment length:** normalization
must keep values ≤200 characters; if the staging dry-run produces any `review_too_long`,
that row is excluded and column widening requires a separate approved change.

---

## 7. Post-backfill follow-ups (after both phases are verified)

- Add `manage.py backfill_media_urls --dry-run|--apply` and
  `manage.py backfill_parallel_groups --dry-run|--apply` so the procedures are
  repeatable without ad-hoc SQL, following the `--apply` convention of
  `backfill_correspondence_references`.
- Add regression tests: classification matrix for URL shapes, and group-eligibility
  cases (multi-correspondence, conflicting strategy, single target, already present).
- Add a read-only health check that reports non-canonical URLs and referenced-but-
  missing groups, so drift is caught before the next backfill.
- Record the executed manifests and verification logs with the change ticket.
