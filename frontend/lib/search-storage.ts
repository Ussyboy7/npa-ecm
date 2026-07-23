/**
 * Frontend API client for Advanced Search.
 */

import { apiFetch } from './api-client';


export interface SearchRequest {
  query?: string;
  filters?: {
    document_type?: string;
    status?: string;
    sensitivity?: string;
    author_id?: string;
    division_id?: string;
    department_id?: string;
    date_from?: string;
    date_to?: string;
    tags?: string[];
    priority?: string;
    source?: string;
    direction?: string;
    office_id?: string;
  };
  limit?: number;
  offset?: number;
  search_type?: 'documents' | 'correspondence' | 'cases' | 'all';
  search_mode?: 'keyword' | 'semantic';
}

export interface SearchResult {
  results: unknown[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface UnifiedSearchBucket {
  results?: unknown[];
  total_count?: number;
  has_more?: boolean;
}

export interface UnifiedSearchResult {
  documents?: UnifiedSearchBucket;
  correspondence?: UnifiedSearchBucket;
  cases?: UnifiedSearchBucket;
  total_count?: number;
  limit?: number;
  offset?: number;
  has_more?: boolean;
}

export type SearchResponse = SearchResult | UnifiedSearchResult;

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: string;
  filters: Record<string, unknown>;
  is_shared: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  result_count: number;
  filters: Record<string, unknown>;
  created_at: string;
}

/**
 * Perform advanced search.
 */
export const search = async (request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> => {
  return await apiFetch<SearchResponse>('/search/operations/search/', {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  });
};

/**
 * Search within documents (OCR text, content).
 */
export const searchWithin = async (
  query: string,
  documentIds?: string[]
): Promise<{
  results: Array<{
    document: Record<string, unknown>;
    version: Record<string, unknown>;
    snippet: string;
    rank: number;
  }>;
  total_count: number;
}> => {
  return await apiFetch<{
    results: Array<{
      document: Record<string, unknown>;
      version: Record<string, unknown>;
      snippet: string;
      rank: number;
    }>;
    total_count: number;
  }>('/search/operations/search_within/', {
    method: 'POST',
    body: JSON.stringify({
      query,
      document_ids: documentIds || [],
    }),
  });
};

export interface RelatedSearchItem {
  type: 'document' | 'correspondence' | 'case';
  id: string;
  title: string;
  reference?: string;
  reason: string;
}

export interface RelatedSearchResponse {
  related: RelatedSearchItem[];
  duplicates: RelatedSearchItem[];
  total_count: number;
}

export const fetchRelatedItems = async (
  type: 'document' | 'correspondence' | 'case',
  id: string,
  limit = 8,
): Promise<RelatedSearchResponse> => {
  return apiFetch<RelatedSearchResponse>('/search/operations/related/', {
    method: 'POST',
    body: JSON.stringify({ type, id, limit }),
  });
};

/**
 * Get search suggestions.
 */
export const getSearchSuggestions = async (
  query: string,
  limit: number = 10,
  signal?: AbortSignal
): Promise<string[]> => {
  try {
    const response = await apiFetch<{ suggestions: string[] }>(
      '/search/operations/suggestions/',
      {
        method: 'POST',
        body: JSON.stringify({ query, limit }),
        signal,
      }
    );
    return response.suggestions;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    throw error;
  }
};

/**
 * Get saved searches.
 */
export const getSavedSearches = async (): Promise<SavedSearch[]> => {
  return await apiFetch<SavedSearch[]>('/search/saved/');
};

/**
 * Create a saved search.
 */
export const createSavedSearch = async (
  data: Partial<SavedSearch>
): Promise<SavedSearch> => {
  return await apiFetch<SavedSearch>('/search/saved/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Delete a saved search.
 */
export const deleteSavedSearch = async (id: string): Promise<void> => {
  await apiFetch(`/search/saved/${id}/`, {
    method: 'DELETE',
  });
};

/**
 * Get search history.
 */
export const getSearchHistory = async (limit: number = 50): Promise<SearchHistory[]> => {
  return await apiFetch<SearchHistory[]>(`/search/history/?limit=${limit}`);
};

