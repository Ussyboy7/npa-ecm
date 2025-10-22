"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  User,
  Building,
  Tag,
  Clock,
  ArrowUpDown,
  Save,
  History,
  Settings,
  Download,
  SlidersHorizontal
} from "lucide-react";

export interface SearchFilter {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "multiselect";
  options?: { value: string; label: string }[];
  value?: any;
}

export interface SortOption {
  key: string;
  label: string;
  direction?: "asc" | "desc";
}

export interface AdvancedSearchProps {
  placeholder?: string;
  filters?: SearchFilter[];
  sortOptions?: SortOption[];
  onSearch: (query: string, filters: Record<string, any>, sort: SortOption | null) => void;
  onExport?: () => void;
  onSaveSearch?: (name: string) => void;
  searchHistory?: string[];
  savedSearches?: { name: string; query: string; filters: Record<string, any> }[];
  className?: string;
}

export default function AdvancedSearch({
  placeholder = "Search...",
  filters = [],
  sortOptions = [],
  onSearch,
  onExport,
  onSaveSearch,
  searchHistory = [],
  savedSearches = [],
  className = ""
}: AdvancedSearchProps) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      onSearch(query, activeFilters, sortBy);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeFilters, sortBy]);

  const handleFilterChange = (filterKey: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilter = (filterKey: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setQuery("");
    setSortBy(null);
  };

  const handleSaveSearch = () => {
    if (saveSearchName.trim() && onSaveSearch) {
      onSaveSearch(saveSearchName);
      setShowSaveDialog(false);
      setSaveSearchName("");
    }
  };

  const loadSavedSearch = (saved: { name: string; query: string; filters: Record<string, any> }) => {
    setQuery(saved.query);
    setActiveFilters(saved.filters);
    setShowSavedSearches(false);
  };

  const activeFiltersCount = Object.keys(activeFilters).length + (query ? 1 : 0) + (sortBy ? 1 : 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded-lg border ${
              showAdvanced || activeFiltersCount > 0
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
            title="Advanced Filters"
            aria-label={`${showAdvanced ? "Hide" : "Show"} advanced filters`}
            aria-expanded={showAdvanced}
            aria-controls="advanced-filters-panel"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {activeFiltersCount > 0 && (
              <span
                className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]"
                aria-label={`${activeFiltersCount} active filter${activeFiltersCount !== 1 ? 's' : ''}`}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>

          {sortOptions.length > 0 && (
            <div className="relative">
              <select
                value={sortBy?.key || ""}
                onChange={(e) => {
                  const selected = sortOptions.find(opt => opt.key === e.target.value);
                  setSortBy(selected || null);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Sort by...</option>
                {sortOptions.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchHistory.length > 0 || savedSearches.length > 0) && (
            <div className="relative">
              <button
                onClick={() => setShowSavedSearches(!showSavedSearches)}
                className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
                title="Search History & Saved Searches"
              >
                <History className="h-4 w-4" />
              </button>

              {showSavedSearches && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Search History & Saved</h3>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    {savedSearches.length > 0 && (
                      <div className="p-2">
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">Saved Searches</h4>
                        {savedSearches.map((saved, index) => (
                          <button
                            key={index}
                            onClick={() => loadSavedSearch(saved)}
                            className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
                          >
                            <div className="font-medium text-gray-900">{saved.name}</div>
                            <div className="text-xs text-gray-500 truncate">{saved.query}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchHistory.length > 0 && (
                      <div className="p-2 border-t border-gray-200">
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">Recent Searches</h4>
                        {searchHistory.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => setQuery(search)}
                            className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm text-gray-700"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {onSaveSearch && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
              title="Save Current Search"
            >
              <Save className="h-4 w-4" />
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
              title="Export Results"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div
          id="advanced-filters-panel"
          className="bg-white border border-gray-200 rounded-lg p-4"
          role="region"
          aria-labelledby="advanced-filters-heading"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 id="advanced-filters-heading" className="text-sm font-medium text-gray-900">Advanced Filters</h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map(filter => (
              <div key={filter.key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {filter.label}
                </label>

                {filter.type === "text" && (
                  <input
                    type="text"
                    value={activeFilters[filter.key] || ""}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={`Enter ${filter.label.toLowerCase()}`}
                  />
                )}

                {filter.type === "select" && (
                  <select
                    value={activeFilters[filter.key] || ""}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === "date" && (
                  <input
                    type="date"
                    value={activeFilters[filter.key] || ""}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                )}

                {filter.type === "multiselect" && (
                  <div className="space-y-2">
                    {filter.options?.map(option => (
                      <label key={option.value} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(activeFilters[filter.key] || []).includes(option.value)}
                          onChange={(e) => {
                            const current = activeFilters[filter.key] || [];
                            const updated = e.target.checked
                              ? [...current, option.value]
                              : current.filter((v: string) => v !== option.value);
                            handleFilterChange(filter.key, updated);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {activeFilters[filter.key] && (
                  <button
                    onClick={() => clearFilter(filter.key)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Save Search Query</h3>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Enter search name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
