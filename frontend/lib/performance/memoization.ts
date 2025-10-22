"use client";

import { useMemo, useCallback } from "react";

// Deep comparison for objects
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

// Memoized callback with deep comparison
export const useDeepCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

// Memoized value with deep comparison
export const useDeepMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps);
};

// Stable reference for objects
export const useStableObject = <T extends Record<string, any>>(obj: T): T => {
  return useMemo(() => obj, Object.values(obj));
};

// Memoized filter function for arrays
export const useMemoizedFilter = <T>(
  items: T[],
  filterFn: (item: T) => boolean,
  deps: React.DependencyList = []
): T[] => {
  return useMemo(() => items.filter(filterFn), [items, ...deps]);
};

// Memoized sort function
export const useMemoizedSort = <T>(
  items: T[],
  sortFn: (a: T, b: T) => number,
  deps: React.DependencyList = []
): T[] => {
  return useMemo(() => [...items].sort(sortFn), [items, ...deps]);
};

// Memoized search/filter combination
export const useMemoizedSearch = <T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  deps: React.DependencyList = []
): T[] => {
  return useMemo(() => {
    if (!searchTerm) return items;

    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      searchFields.some(field =>
        String(item[field]).toLowerCase().includes(term)
      )
    );
  }, [items, searchTerm, ...deps]);
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const start = performance.now();

    return () => {
      const end = performance.now();
      console.log(`${componentName} render time: ${end - start}ms`);
    };
  });
};

// Debounced callback
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
};

// Throttled callback
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = React.useRef<number>(0);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    }
  }, [callback, delay]) as T;
};

// Virtual scrolling helper
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    }
  };
};
