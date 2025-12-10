import { useState, useCallback, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortOption<T extends string = string> {
  field: T;
  direction: SortDirection;
  label?: string;
}

export interface UseTableSortOptions<T extends string = string> {
  initialSort?: SortOption<T>;
  sortOptions?: Array<{ value: T; label: string }>;
  onSortChange?: (sort: SortOption<T>) => void;
}

export interface UseTableSortReturn<T extends string = string> {
  sort: SortOption<T>;
  setSort: (field: T, direction?: SortDirection) => void;
  toggleSort: (field: T) => void;
  sortOptions: Array<{ value: T; label: string }> | undefined;
  getSortIcon: (field: T) => 'asc' | 'desc' | 'none';
}

/**
 * Reusable table sorting hook for consistent sorting logic
 */
export function useTableSort<T extends string = string>(
  options: UseTableSortOptions<T> = {}
): UseTableSortReturn<T> {
  const { initialSort, sortOptions, onSortChange } = options;

  const [sort, setSortState] = useState<SortOption<T>>(
    initialSort || { field: '' as T, direction: 'asc' }
  );

  const setSort = useCallback(
    (field: T, direction: SortDirection = 'asc') => {
      const newSort: SortOption<T> = { field, direction };
      setSortState(newSort);
      onSortChange?.(newSort);
    },
    [onSortChange]
  );

  const toggleSort = useCallback(
    (field: T) => {
      if (sort.field === field) {
        // Toggle direction if same field
        const newDirection: SortDirection = sort.direction === 'asc' ? 'desc' : 'asc';
        setSort(field, newDirection);
      } else {
        // New field, default to ascending
        setSort(field, 'asc');
      }
    },
    [sort.field, sort.direction, setSort]
  );

  const getSortIcon = useCallback(
    (field: T): 'asc' | 'desc' | 'none' => {
      if (sort.field !== field) return 'none';
      return sort.direction;
    },
    [sort.field, sort.direction]
  );

  return {
    sort,
    setSort,
    toggleSort,
    sortOptions,
    getSortIcon,
  };
}

