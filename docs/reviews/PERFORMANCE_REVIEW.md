# ECM Performance Review & Optimization

## Critical Performance Issues Found

### 1. **Full Table Scan on Correspondence Creation** ⚠️ CRITICAL
**Location:** `backend/correspondence/views.py:192`
```python
count = Correspondence.all_objects.count() + 1
```
**Problem:** This performs a full table scan every time a correspondence is created, getting slower as data grows.
**Impact:** High - affects every correspondence creation
**Fix:** Use database sequence or cached counter

### 2. **Missing Database Indexes** ⚠️ HIGH
**Location:** Multiple models
**Problem:** Missing indexes on commonly filtered/searched fields:
- `Correspondence.status`, `Correspondence.priority`, `Correspondence.current_office`
- `Correspondence.created_at`, `Correspondence.received_date`
- `Document.status`, `Document.document_type`
- `DocumentVersion.content_text`, `DocumentVersion.ocr_text` (for search)

**Impact:** High - slow queries on filtered lists
**Fix:** Add database indexes

### 3. **Inefficient Full-Text Search** ⚠️ HIGH
**Location:** `backend/dms/views.py:144-146`
```python
version_search = (
    Q(versions__content_text__icontains=search_query) |
    Q(versions__ocr_text__icontains=search_query)
)
```
**Problem:** `icontains` on large text fields without indexes is extremely slow
**Impact:** High - search becomes unusable with large datasets
**Fix:** Use PostgreSQL full-text search with GIN indexes

### 4. **N+1 Query in Serializers** ⚠️ MEDIUM
**Location:** `backend/correspondence/serializers.py:479`
```python
version = document.versions.order_by("-version_number").first()
```
**Problem:** If not prefetched, this causes N+1 queries
**Impact:** Medium - slow when loading many correspondences
**Fix:** Ensure proper prefetch_related

### 5. **Large Prefetch Without Limits** ⚠️ MEDIUM
**Location:** `backend/correspondence/views.py:75-91`
```python
.prefetch_related(
    "linked_documents",
    "attachments",
    "distribution",
    "minutes",
    ...
)
```
**Problem:** Prefetching all related objects can load huge amounts of data
**Impact:** Medium - slow API responses, high memory usage
**Fix:** Use Prefetch with queryset limits or only() to select specific fields

### 6. **Frontend: Loading All Correspondence** ⚠️ MEDIUM
**Location:** `frontend/contexts/CorrespondenceContext.tsx:372`
```python
apiFetch('/correspondence/items/'),  // No pagination!
```
**Problem:** Frontend loads ALL correspondence on mount
**Impact:** Medium - slow initial load, high memory usage
**Fix:** Use pagination or lazy loading

### 7. **No Query Result Caching** ⚠️ MEDIUM
**Problem:** No caching for frequently accessed data (sidebar counts, summaries)
**Impact:** Medium - repeated expensive queries
**Fix:** Add Redis caching for expensive queries

### 8. **Missing `only()`/`defer()` for Large Fields** ⚠️ LOW
**Problem:** Loading all fields including large text fields (`content_text`, `ocr_text`, `body_html`) when not needed
**Impact:** Low - unnecessary data transfer
**Fix:** Use `only()` to select only needed fields in list views

