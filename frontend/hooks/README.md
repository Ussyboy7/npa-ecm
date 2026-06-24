# Reusable Hooks

This directory contains reusable React hooks for common patterns across the ECM frontend.

## Available Hooks

### `usePagination`

Handles pagination state and logic consistently across pages.

**Usage:**
```typescript
import { usePagination } from '@/hooks/use-pagination';

const MyPage = () => {
  const { data, totalCount } = useMyData();
  
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_LIST_PAGE_SIZE,
    totalCount,
    onPageChange: (page) => {
      // Optional: handle page change
    },
  });

  return (
    <div>
      <div>
        Showing {pagination.paginationInfo.showing} of {pagination.paginationInfo.total}
      </div>
      <button onClick={pagination.goToPreviousPage} disabled={!pagination.canGoPrevious}>
        Previous
      </button>
      <button onClick={pagination.goToNextPage} disabled={!pagination.canGoNext}>
        Next
      </button>
    </div>
  );
};
```

### `useTableSort`

Manages table sorting state and provides sorting utilities.

**Usage:**
```typescript
import { useTableSort } from '@/hooks/use-table-sort';

type SortField = 'name' | 'date' | 'status';

const MyTable = () => {
  const sort = useTableSort<SortField>({
    initialSort: { field: 'name', direction: 'asc' },
    sortOptions: [
      { value: 'name', label: 'Name' },
      { value: 'date', label: 'Date' },
      { value: 'status', label: 'Status' },
    ],
  });

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => sort.toggleSort('name')}>
            Name {sort.getSortIcon('name') === 'asc' && '↑'}
            {sort.getSortIcon('name') === 'desc' && '↓'}
          </th>
        </tr>
      </thead>
    </table>
  );
};
```

### `useDebounce`

Debounces a value to reduce unnecessary re-renders and API calls.

**Usage:**
```typescript
import { useDebounce } from '@/hooks/use-debounce';

const MyComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  useEffect(() => {
    if (debouncedQuery) {
      // Perform search with debounced query
    }
  }, [debouncedQuery]);
  
  return (
    <input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  );
};
```

### `useFilters` (Removed)

This hook was removed as it was not being used. Components implement their own filter logic as needed.
    initialFilters: { status: 'all', type: 'all' },
    storageKey: 'my_page_filters', // Optional: persist to localStorage
    debounceMs: 300, // Optional: debounce filter changes
    onFiltersChange: (filters) => {
      // Optional: handle filter changes
    },
  });

  return (
    <div>
      <input
        value={filters.getFilterValue('search') || ''}
        onChange={(e) => filters.setFilter('search', e.target.value)}
      />
      <button onClick={() => filters.clearFilters()}>
        Clear All ({filters.activeFilterCount})
      </button>
    </div>
  );
};
```

## Benefits

1. **Consistency**: Same pagination/filter/sort logic across all pages
2. **Less Code**: No need to rewrite pagination logic in every component
3. **Type Safety**: Full TypeScript support
4. **Features**: Built-in localStorage persistence, debouncing, etc.
5. **Maintainability**: Update logic in one place, affects all pages

