"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Filter, Save, History, X, FileText, Mail } from 'lucide-react';
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

interface AdvancedSearchProps {
  onResultSelect?: (result: any) => void;
}

export const AdvancedSearch = ({ onResultSelect }: AdvancedSearchProps) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchRequest['filters']>({});
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length > 2) {
      loadSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    loadSavedSearches();
    loadSearchHistory();
  }, []);

  const loadSuggestions = async (q: string) => {
    try {
      const suggs = await getSearchSuggestions(q, 5);
      setSuggestions(suggs);
    } catch (error) {
      // Silently fail
    }
  };

  const loadSavedSearches = async () => {
    try {
      const saved = await getSavedSearches();
      setSavedSearches(saved);
    } catch (error) {
      // Silently fail
    }
  };

  const loadSearchHistory = async () => {
    try {
      const history = await getSearchHistory(10);
      setSearchHistory(history);
    } catch (error) {
      // Silently fail
    }
  };

  const handleSearch = async () => {
    if (!query.trim() && Object.keys(filters || {}).length === 0) {
      toast.error('Please enter a search query or apply filters');
      return;
    }

    try {
      setLoading(true);
      const searchRequest: SearchRequest = {
        query: query.trim() || undefined,
        filters,
        limit: 50,
        offset: 0,
        search_type: 'documents',
      };

      const result = await search(searchRequest);
      setResults(result);
    } catch (error) {
      logError('Search failed', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!query.trim() && Object.keys(filters || {}).length === 0) {
      toast.error('Cannot save empty search');
      return;
    }

    try {
      await createSavedSearch({
        name: query || 'Saved Search',
        query: query,
        filters: filters || {},
        is_shared: false,
      });
      toast.success('Search saved');
      loadSavedSearches();
    } catch (error) {
      logError('Failed to save search', error);
      toast.error('Failed to save search');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
  };

  const handleHistoryClick = (historyItem: any) => {
    setQuery(historyItem.query);
    if (historyItem.filters) {
      setFilters(historyItem.filters);
    }
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
          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="pr-10"
            />
            <Button
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={handleSearch}
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
              <div className="grid grid-cols-2 gap-4">
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
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
                          key={item.id}
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
                          key={item.id}
                          className="w-full text-left text-sm py-1 hover:text-primary"
                          onClick={() => {
                            setQuery(item.query);
                            if (item.filters) {
                              setFilters(item.filters);
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
            <CardTitle>
              Search Results ({results.total_count} found)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {results.results.map((result: any, idx: number) => (
                    <Card
                      key={result.id || idx}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => onResultSelect?.(result)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{result.title || result.subject}</h4>
                            {result.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {result.document_type && (
                                <Badge variant="outline">{result.document_type}</Badge>
                              )}
                              {result.status && (
                                <Badge variant="outline">{result.status}</Badge>
                              )}
                            </div>
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

