/**
 * Frontend API client for Advanced Search.
 */

import { apiFetch } from './api-client';
import { logError } from './client-logger';

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
}

export interface SearchResult {
  results: unknown[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

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
export const search = async (request: SearchRequest, signal?: AbortSignal): Promise<SearchResult> => {
  try {
    const response = await apiFetch<SearchResult>('/search/operations/search/', {
      method: 'POST',
      body: JSON.stringify(request),
      signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    logError('Failed to perform search', error);
    throw error;
  }
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
  try {
    const response = await apiFetch<{
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
    return response;
  } catch (error) {
    logError('Failed to search within documents', error);
    throw error;
  }
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
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    logError('Failed to get search suggestions', error);
    return [];
  }
};

/**
 * Get saved searches.
 */
export const getSavedSearches = async (): Promise<SavedSearch[]> => {
  try {
    const response = await apiFetch<SavedSearch[]>('/search/saved/');
    return response;
  } catch (error) {
    logError('Failed to get saved searches', error);
    throw error;
  }
};

/**
 * Create a saved search.
 */
export const createSavedSearch = async (
  data: Partial<SavedSearch>
): Promise<SavedSearch> => {
  try {
    const response = await apiFetch<SavedSearch>('/search/saved/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    logError('Failed to create saved search', error);
    throw error;
  }
};

/**
 * Delete a saved search.
 */
export const deleteSavedSearch = async (id: string): Promise<void> => {
  try {
    await apiFetch(`/search/saved/${id}/`, {
      method: 'DELETE',
    });
  } catch (error) {
    logError('Failed to delete saved search', error);
    throw error;
  }
};

/**
 * Get search history.
 */
export const getSearchHistory = async (limit: number = 50): Promise<SearchHistory[]> => {
  try {
    const response = await apiFetch<SearchHistory[]>(`/search/history/?limit=${limit}`);
    return response;
  } catch (error) {
    logError('Failed to get search history', error);
    return [];
  }
};

