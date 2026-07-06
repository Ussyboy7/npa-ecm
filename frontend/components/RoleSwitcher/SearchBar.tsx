"use client";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { clearSearchHistory } from "@/lib/role-switcher-storage";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearchingBackend: boolean;
  searchHistory: string[];
  showSearchSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  disabled?: boolean;
  onClearSearch: () => void;
}

export const SearchBar = ({
  searchQuery,
  onSearchChange,
  isSearchingBackend,
  searchHistory,
  showSearchSuggestions,
  onShowSuggestionsChange,
  disabled,
  onClearSearch,
}: SearchBarProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="text"
        placeholder="Search by name, email, role..."
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e.target.value);
          onShowSuggestionsChange(e.target.value.length > 0);
        }}
        onFocus={() => {
          if (searchHistory.length > 0 || searchQuery.length > 0) {
            onShowSuggestionsChange(true);
          }
        }}
        onBlur={() => {
          setTimeout(() => onShowSuggestionsChange(false), 200);
        }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                onShowSuggestionsChange(false);
              }
            }}
        className="pl-9 h-9"
        disabled={disabled}
        aria-label="Search users"
        aria-describedby="search-help"
        aria-autocomplete="list"
        aria-expanded={showSearchSuggestions}
      />
      {isSearchingBackend && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Searching...</span>
        </div>
      )}
      {searchQuery && (
        <button
          type="button"
          onClick={onClearSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <span id="search-help" className="sr-only">
        Search users by name, email, role, employee ID, or organizational unit
      </span>

      {showSearchSuggestions && (searchHistory.length > 0 || searchQuery.trim().length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {searchQuery.trim().length > 0 && (
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-1">Search suggestions</p>
              {searchHistory
                .filter((h) => h.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 5)
                .map((historyItem, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-sm"
                    onClick={() => {
                      onSearchChange(historyItem);
                      onShowSuggestionsChange(false);
                    }}
                  >
                    <Search className="h-3 w-3 inline mr-2 text-muted-foreground" />
                    {historyItem}
                  </button>
                ))}
            </div>
          )}
          {searchHistory.length > 0 && searchQuery.trim().length === 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-xs text-muted-foreground">Recent searches</p>
                <button
                  type="button"
                  onClick={() => {
                    clearSearchHistory();
                    onShowSuggestionsChange(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              {searchHistory.slice(0, 5).map((historyItem, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-sm flex items-center gap-2"
                  onClick={() => {
                    onSearchChange(historyItem);
                    onShowSuggestionsChange(false);
                  }}
                >
                  <Search className="h-3 w-3 text-muted-foreground" />
                  {historyItem}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
