import { useState, useCallback, useMemo, useEffect } from 'react';

export type FilterValue = string | number | boolean | string[] | undefined;

export interface FilterDefinition<T extends Record<string, FilterValue> = Record<string, FilterValue>> {
  key: keyof T;
  value: FilterValue;
  label?: string;
}

export interface UseFiltersOptions<T extends Record<string, FilterValue> = Record<string, FilterValue>> {
  initialFilters?: Partial<T>;
  storageKey?: string;
  onFiltersChange?: (filters: Partial<T>) => void;
  debounceMs?: number;
}

export interface UseFiltersReturn<T extends Record<string, FilterValue> = Record<string, FilterValue>> {
  filters: Partial<T>;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  removeFilter: (key: keyof T) => void;
  clearFilters: () => void;
  activeFilters: FilterDefinition<T>[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
  getFilterValue: <K extends keyof T>(key: K) => T[K] | undefined;
}

/**
 * Reusable filter hook for consistent filter state management
 */
export function useFilters<T extends Record<string, FilterValue> = Record<string, FilterValue>>(
  options: UseFiltersOptions<T> = {}
): UseFiltersReturn<T> {
  const {
    initialFilters = {},
    storageKey,
    onFiltersChange,
    debounceMs = 0,
  } = options;

  // Load from localStorage if storageKey provided
  const loadFromStorage = useCallback((): Partial<T> => {
    if (!storageKey || typeof window === 'undefined') return initialFilters;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initialFilters, ...parsed };
      }
    } catch (err) {
      // Ignore parse errors
    }
    return initialFilters;
  }, [storageKey, initialFilters]);

  const [filters, setFiltersState] = useState<Partial<T>>(loadFromStorage);

  // Save to localStorage when filters change
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters));
      } catch (err) {
        // Ignore storage errors
      }
    }
  }, [filters, storageKey]);

  // Debounced callback
  useEffect(() => {
    if (debounceMs > 0) {
      const timer = setTimeout(() => {
        onFiltersChange?.(filters);
      }, debounceMs);
      return () => clearTimeout(timer);
    } else {
      onFiltersChange?.(filters);
    }
  }, [filters, debounceMs, onFiltersChange]);

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, [key]: value };
        return newFilters;
      });
    },
    []
  );

  const removeFilter = useCallback((key: keyof T) => {
    setFiltersState((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        // Ignore storage errors
      }
    }
  }, [storageKey]);

  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (typeof value === 'number' && value === 0) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
      .map(([key, value]) => ({
        key: key as keyof T,
        value: value as FilterValue,
      })) as FilterDefinition<T>[];
  }, [filters]);

  const activeFilterCount = activeFilters.length;
  const hasActiveFilters = activeFilterCount > 0;

  const getFilterValue = useCallback(
    <K extends keyof T>(key: K): T[K] | undefined => {
      return filters[key];
    },
    [filters]
  );

  return {
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    activeFilters,
    activeFilterCount,
    hasActiveFilters,
    getFilterValue,
  };
}

