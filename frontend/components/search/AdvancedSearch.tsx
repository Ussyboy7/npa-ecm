"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Filter, Save, History, X, FileText, Mail, Loader2, Calendar, User, Building2, Briefcase, Shield, ExternalLink, FolderTree } from 'lucide-react';
import {
  search,
  getSearchSuggestions,
  createSavedSearch,
  getSavedSearches,
  getSearchHistory,
  type SearchRequest,
  type SearchResult,
} from '@/lib/search-storage';
import { logError } from '@/lib/client-logger';
import { useDebounce } from '@/hooks/use-debounce';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDate } from '@/lib/correspondence-helpers';
import { highlightText } from '@/lib/search-highlight';
import Link from 'next/link';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { exportToCSV } from '@/lib/admin-export';
import { Download } from 'lucide-react';

interface AdvancedSearchProps {
  onResultSelect?: (result: Record<string, unknown>) => void;
  context?: 'all' | 'documents' | 'correspondence' | 'cases';
}

export const AdvancedSearch = ({ onResultSelect, context }: AdvancedSearchProps) => {
  const { divisions, departments, users, offices } = useOrganization();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchRequest['filters']>({});
  const [searchType, setSearchType] = useState<'documents' | 'correspondence' | 'cases' | 'all'>(
    context === 'all' || !context ? 'all' : context
  );
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<unknown[]>([]);
  const [searchHistory, setSearchHistory] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionsAbortControllerRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'mod+k': (e) => {
      e.preventDefault();
      // Focus search input
      const searchInput = document.querySelector('input[placeholder*="Search by title"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    'Escape': (e) => {
      if (showFilters) {
        setShowFilters(false);
      }
    },
  });

  useEffect(() => {
    // Cancel previous suggestions request
    if (suggestionsAbortControllerRef.current) {
      suggestionsAbortControllerRef.current.abort();
    }

    if (debouncedQuery && debouncedQuery.length > 2) {
      const controller = new AbortController();
      suggestionsAbortControllerRef.current = controller;
      loadSuggestions(debouncedQuery, controller.signal);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (suggestionsAbortControllerRef.current) {
        suggestionsAbortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery]);

  useEffect(() => {
    loadSavedSearches();
    loadSearchHistory();
    
    // Handle URL query parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('q');
      const urlSearchType = params.get('search_type') as 'documents' | 'correspondence' | 'all' | null;
      const urlFilters: SearchRequest['filters'] = {};
      
      // Parse filter parameters
      params.forEach((value, key) => {
        if (key.startsWith('filters[') && key.endsWith(']')) {
          const filterKey = key.slice(8, -1);
          urlFilters[filterKey as keyof SearchRequest['filters']] = value;
        }
      });
      
      if (urlQuery) {
        setQuery(urlQuery);
        // Auto-search if query is provided
        setTimeout(() => {
          if (urlSearchType) setSearchType(urlSearchType);
          if (Object.keys(urlFilters).length > 0) setFilters(urlFilters);
          handleSearch(true);
        }, 100);
      } else {
        if (urlSearchType) setSearchType(urlSearchType);
        if (Object.keys(urlFilters).length > 0) setFilters(urlFilters);
      }
    }
  }, []);

  // Update search type when context prop changes
  useEffect(() => {
    if (context) {
      setSearchType(context === 'all' ? 'all' : context);
    }
  }, [context]);

  const loadSuggestions = async (q: string, signal?: AbortSignal) => {
    try {
      const suggs = await getSearchSuggestions(q, 5, signal);
      if (!signal?.aborted) {
        setSuggestions(suggs);
      }
      } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      // Silently fail
    }
  };

  const loadSavedSearches = async () => {
    try {
      const saved = await getSavedSearches();
      setSavedSearches(saved);
      } catch (error: unknown) {
      // Silently fail
    }
  };

  const loadSearchHistory = async () => {
    try {
      const history = await getSearchHistory(10);
      setSearchHistory(history);
      } catch (error: unknown) {
      // Silently fail
    }
  };

  const handleSearch = async (resetPage = true, pageOverride?: number) => {
    if (!query.trim() && Object.keys(filters || {}).length === 0) {
      toast.error('Please enter a search query or apply filters');
      return;
    }

    // Cancel previous search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const currentPage = pageOverride !== undefined ? pageOverride : (resetPage ? 0 : page);
      if (resetPage) setPage(0);
      
      const searchRequest: SearchRequest = {
        query: query.trim() || undefined,
        filters,
        limit: pageSize,
        offset: currentPage * pageSize,
        search_type: searchType,
      };

      const result = await search(searchRequest, controller.signal);
      
      if (controller.signal.aborted) {
        return;
      }
      
      // Handle unified search results (when search_type is 'all')
      if (searchType === 'all' && typeof result === 'object' && result !== null && 'documents' in result && 'correspondence' in result) {
        const unifiedResult = result as { documents?: { results?: unknown[] }; correspondence?: { results?: unknown[] } };
        const newResults = [
          ...(unifiedResult.documents?.results || []).map((r: Record<string, unknown>) => ({ ...r, _type: 'document' })),
          ...(unifiedResult.correspondence?.results || []).map((r: Record<string, unknown>) => ({ ...r, _type: 'correspondence' })),
          ...(unifiedResult.cases?.results || []).map((r: Record<string, unknown>) => ({ ...r, _type: 'case' }))
        ];
        const combinedResults: SearchResult = {
          results: resetPage ? newResults : [...(results?.results || []), ...newResults],
          total_count: unifiedResult.total_count,
          limit: pageSize,
          offset: currentPage * pageSize,
          has_more: unifiedResult.documents?.has_more || unifiedResult.correspondence?.has_more || unifiedResult.cases?.has_more,
        };
        setResults(combinedResults);
      } else {
        const newResults = resetPage ? result.results : [...(results?.results || []), ...result.results];
        setResults({
          ...result,
          results: newResults,
        });
      }
      } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      logError('Search failed', error);
      toast.error('Search failed. Please try again.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (suggestionsAbortControllerRef.current) {
        suggestionsAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSaveSearch = async () => {
    if (!query.trim() && Object.keys(filters || {}).length === 0) {
      toast.error('Cannot save empty search');
      return;
    }

    try {
      await createSavedSearch({
        name: query || `Search: ${searchType}`,
        query: query,
        filters: { ...filters, search_type: searchType } as SearchRequest['filters'],
        is_shared: false,
      });
      toast.success('Search saved');
      loadSavedSearches();
      } catch (error: unknown) {
      logError('Failed to save search', error);
      toast.error('Failed to save search');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
  };

  const handleHistoryClick = (historyItem: Record<string, unknown>) => {
    setQuery(historyItem.query);
    if (historyItem.filters) {
      const { search_type, ...otherFilters } = historyItem.filters;
      if (search_type) setSearchType(search_type);
      setFilters(otherFilters);
    }
  };

  const handleExport = () => {
    if (!results || results.results.length === 0) {
      toast.error('No results to export');
      return;
    }

    const exportData = results.results.map((result: Record<string, unknown>) => {
      const resultType = result._type || (result.document_type ? 'document' : result.case_type ? 'case' : 'correspondence');
      return {
        type: resultType,
        title: result.title || result.subject || result.case_number || 'Untitled',
        reference_number: result.reference_number || result.case_number || '',
        status: result.status || '',
        sensitivity: result.sensitivity || '',
        priority: result.priority || '',
        author: typeof result.author === 'object' ? result.author?.name : result.author || '',
        created_at: result.created_at || result.received_date || '',
        snippet: result._search_snippet || result.search_snippet || result.description || result.body || '',
      };
    });

    exportToCSV(exportData, [
      { key: 'type', label: 'Type' },
      { key: 'title', label: 'Title' },
      { key: 'reference_number', label: 'Reference Number' },
      { key: 'status', label: 'Status' },
      { key: 'sensitivity', label: 'Sensitivity' },
      { key: 'priority', label: 'Priority' },
      { key: 'author', label: 'Author' },
      { key: 'created_at', label: 'Created At' },
      { key: 'snippet', label: 'Snippet' },
    ], {
      filename: `search-results-${new Date().toISOString().split('T')[0]}.csv`,
    });

    toast.success(`Exported ${exportData.length} results to CSV`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </CardTitle>
          <CardDescription>
            Search documents and correspondence with full-text search and filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Type Selector */}
          <div className="space-y-2">
            <Label>Search In</Label>
            <Select value={searchType} onValueChange={(v) => setSearchType(v as 'documents' | 'correspondence' | 'cases' | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Documents, Correspondence & Cases)</SelectItem>
                <SelectItem value="documents">Documents Only</SelectItem>
                <SelectItem value="correspondence">Correspondence Only</SelectItem>
                <SelectItem value="cases">Cases Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search by title, reference number, content... (Press Cmd/Ctrl+K to focus)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="pr-10"
              aria-label="Search input"
              aria-describedby="search-description"
            />
            <span id="search-description" className="sr-only">
              Search across documents, correspondence, and cases. Press Enter to search or Cmd/Ctrl+K to focus.
            </span>
            <Button
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => handleSearch()}
              disabled={loading}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>

            <div className="flex gap-2">
              {query && (
                <Button variant="outline" size="sm" onClick={handleSaveSearch}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Search
                </Button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select
                    value={filters?.document_type || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, document_type: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="memo">Memo</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="form">Form</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters?.status || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, status: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sensitivity</Label>
                  <Select
                    value={filters?.sensitivity || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, sensitivity: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All levels</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Author</Label>
                  <Select
                    value={filters?.author_id || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, author_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All authors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All authors</SelectItem>
                      {users.filter(u => u.active).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select
                    value={filters?.division_id || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, division_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All divisions</SelectItem>
                      {divisions.filter(d => d.isActive).map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={filters?.department_id || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, department_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All departments</SelectItem>
                      {departments
                        .filter(d => d.isActive && (!filters?.division_id || d.divisionId === filters.division_id))
                        .map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {searchType === 'correspondence' || searchType === 'all' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select
                        value={filters?.source || ''}
                        onValueChange={(value) =>
                          setFilters({ ...filters, source: value || undefined })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All sources</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <Select
                        value={filters?.direction || ''}
                        onValueChange={(value) =>
                          setFilters({ ...filters, direction: value || undefined })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All directions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All directions</SelectItem>
                          <SelectItem value="upward">Upward</SelectItem>
                          <SelectItem value="downward">Downward</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const today = new Date();
                      const dates: { [key: string]: { from: string; to: string } } = {
                        today: {
                          from: today.toISOString().split('T')[0],
                          to: today.toISOString().split('T')[0],
                        },
                        this_week: {
                          from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          to: today.toISOString().split('T')[0],
                        },
                        this_month: {
                          from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                          to: today.toISOString().split('T')[0],
                        },
                        last_month: {
                          from: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0],
                          to: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0],
                        },
                        this_year: {
                          from: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
                          to: today.toISOString().split('T')[0],
                        },
                        last_year: {
                          from: new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
                          to: new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0],
                        },
                      };
                      if (value && dates[value]) {
                        setFilters({ ...filters, date_from: dates[value].from, date_to: dates[value].to });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Preset ranges..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={filters?.date_from || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, date_from: e.target.value || undefined })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={filters?.date_to || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, date_to: e.target.value || undefined })
                    }
                  />
                </div>

                {searchType === 'correspondence' || searchType === 'all' ? (
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={filters?.priority || ''}
                      onValueChange={(value) =>
                        setFilters({ ...filters, priority: value || undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All priorities</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {searchType === 'correspondence' || searchType === 'all' ? (
                  <div className="space-y-2">
                    <Label>Office</Label>
                    <Select
                      value={filters?.office_id || ''}
                      onValueChange={(value) =>
                        setFilters({ ...filters, office_id: value || undefined })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All offices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All offices</SelectItem>
                        {offices.filter(o => o.isActive).map((office) => (
                          <SelectItem key={office.id} value={office.id}>
                            {office.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({});
                    setPage(0);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </Card>
          )}

          {/* Search History & Saved Searches */}
          {!results && (searchHistory.length > 0 || savedSearches.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {searchHistory.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Recent Searches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      {searchHistory.map((item) => (
                        <button
                          key={item.id as string}
                          className="w-full text-left text-sm py-1 hover:text-primary"
                          onClick={() => handleHistoryClick(item)}
                        >
                          {item.query}
                        </button>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {savedSearches.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Saved Searches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      {savedSearches.map((item) => (
                        <button
                          key={item.id as string}
                          className="w-full text-left text-sm py-1 hover:text-primary"
                          onClick={() => {
                            setQuery(item.query);
                            if (item.filters) {
                              const { search_type, ...otherFilters } = item.filters;
                              if (search_type) setSearchType(search_type);
                              setFilters(otherFilters);
                            }
                          }}
                        >
                          {item.name}
                        </button>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Search Results ({results.total_count} found)
              </CardTitle>
              {results.results.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  aria-label="Export search results to CSV"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50 animate-spin" />
                <h3 className="text-lg font-semibold mb-2">Searching...</h3>
                <p className="text-sm text-muted-foreground">
                  {query ? `Searching for "${query}"` : 'Applying filters...'}
                </p>
              </div>
            ) : results.results.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {query
                    ? `No documents or correspondence match "${query}"`
                    : 'Try adjusting your search or filters'}
                </p>
                {query && (
                  <Button variant="outline" onClick={() => setQuery('')}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {results.results.map((result: Record<string, unknown>, idx: number) => {
                      const resultType = result._type || (result.document_type ? 'document' : result.case_type ? 'case' : 'correspondence');
                      const isCorrespondence = resultType === 'correspondence';
                      const isCase = resultType === 'case';
                      
                      return (
                        <Card
                          key={result.id || idx}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => {
                            if (isCase) {
                              window.location.href = `/cases/${result.id}`;
                            } else {
                              onResultSelect?.(result);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (isCase) {
                                window.location.href = `/cases/${result.id}`;
                              } else {
                                onResultSelect?.(result);
                              }
                            }
                          }}
                          aria-label={`${resultType}: ${result.title || result.subject || result.case_number || 'Untitled'}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isCase ? (
                                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                                  ) : isCorrespondence ? (
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {isCase ? 'Case' : isCorrespondence ? 'Correspondence' : (result.document_type || 'Document')}
                                  </Badge>
                                  {(result.reference_number || (isCase && result.case_number)) && (
                                    <span className="text-xs text-muted-foreground">
                                      {isCase ? result.case_number : result.reference_number}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-medium text-base mb-1">
                                  {highlightText(result.title || result.subject || result.case_number || 'Untitled', query)}
                                </h4>
                                {/* Show snippet if available, otherwise show description/body */}
                                {result._search_snippet || result.search_snippet ? (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {highlightText(result._search_snippet || result.search_snippet || '', query)}
                                    {(result._match_field || result.match_field) && (
                                      <span className="text-xs text-muted-foreground/70 ml-2">
                                        (matched in {result._match_field || result.match_field})
                                      </span>
                                    )}
                                  </p>
                                ) : (result.description || result.body) ? (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {highlightText(result.description || result.body || '', query)}
                                  </p>
                                ) : null}
                                {/* Show case number for cases */}
                                {isCase && result.case_number && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Case: {result.case_number}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {result.status && (
                                    <Badge variant="outline" className="text-xs">
                                      {result.status}
                                    </Badge>
                                  )}
                                  {result.sensitivity && (
                                    <Badge variant="outline" className="text-xs">
                                      <Shield className="h-3 w-3 mr-1" />
                                      {result.sensitivity}
                                    </Badge>
                                  )}
                                  {result.priority && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {result.priority}
                                    </Badge>
                                  )}
                                  {result.author && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span>{typeof result.author === 'object' ? result.author.name : result.author}</span>
                                    </div>
                                  )}
                                  {(result.created_at || result.received_date) && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(result.created_at || result.received_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
                
                {/* Pagination */}
                {results.has_more && (
                  <div className="flex justify-center mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const nextPage = page + 1;
                        setPage(nextPage);
                        handleSearch(false, nextPage);
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

