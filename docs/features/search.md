# Search System

## Overview
Full-text search across documents, correspondence, and cases with faceted filters.

## Architecture
- **Backend**: `search/` app with PostgreSQL `SearchVector`
- **Frontend**: `app/search/`, `components/search/AdvancedSearch.tsx`
- **API**: `SearchService` in `search/services.py`

## Key Features
- Full-text search with `SearchVector` + `SearchRank`
- Faceted filters: document type, status, sensitivity, author, date range
- Saved searches and search history
- Cross-module search (documents, correspondence, cases)

## Key Services
- `search/services.py` - `SearchService` with visibility filtering
- `lib/search-storage.ts` - Frontend API client

## Visibility Filtering
- Grade-based access: `SENSITIVITY_HIGH_CONFIDENTIAL_GRADES`, `SENSITIVITY_HIGH_RESTRICTED_GRADES`
- Permission-based: explicit permissions, division/department/grade-level

## Constants
- `SENSITIVITY_OPTIONS`, `SENSITIVITY_VALUES` in `lib/constants.ts`
- `SENSITIVITY_HIGH_CONFIDENTIAL_GRADES` in `common/grade_utils.py`
