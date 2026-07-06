# Search System

## Overview
Full-text search across documents, correspondence, and cases with faceted filters. Optional **semantic re-rank** (MVP — no vector DB) improves relevance via synonym expansion and in-process scoring.

## Architecture
- **Backend**: `search/` app with PostgreSQL `SearchVector`
- **Semantic MVP**: `search/semantic_service.py` — `expand_query`, `embed_text` (hash-based), `rerank_documents`
- **Frontend**: `app/search/`, `components/search/AdvancedSearch.tsx`
- **API**: `SearchService` in `search/services.py`; pass `search_mode=semantic` to enable re-rank

## Key Features
- Full-text search with `SearchVector` + `SearchRank`
- Semantic toggle (synonym expansion + hash re-rank on FTS results) — **not** pgvector/Ollama
- Faceted filters: document type, status, sensitivity, author, date range
- Saved searches and search history
- Cross-module search (documents, correspondence, cases)
- Related-items panel on search results

## Key Services
- `search/services.py` - `SearchService` with visibility filtering and optional semantic rerank
- `search/semantic_service.py` - MVP semantic layer (deferred upgrade: pgvector + Ollama when AI host provisioned)
- `lib/search-storage.ts` - Frontend API client

## Visibility Filtering
- Grade-based access: `SENSITIVITY_HIGH_CONFIDENTIAL_GRADES`, `SENSITIVITY_HIGH_RESTRICTED_GRADES`
- Permission-based: explicit permissions, division/department/grade-level

## AI roadmap (deferred)
Vector embeddings and LLM-assisted search require ICT-provisioned inference hosts. See `docs/procurement/REMAINING_WORK_BACKLOG.md` § Phase 9–11 and infrastructure notes.

## Constants
- `SENSITIVITY_OPTIONS`, `SENSITIVITY_VALUES` in `lib/constants.ts`
- `SENSITIVITY_HIGH_CONFIDENTIAL_GRADES` in `common/grade_utils.py`
