import { useState, useCallback, useMemo } from 'react';
import { DEFAULT_LIST_PAGE_SIZE } from '@/lib/pagination-constants';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  goToPage: (page: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  startIndex: number;
  endIndex: number;
  paginationInfo: {
    showing: string;
    total: number;
  };
}

/**
 * Reusable pagination hook for consistent pagination logic across pages
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = DEFAULT_LIST_PAGE_SIZE,
    totalCount = 0,
    onPageChange,
    onPageSizeChange,
  } = options;

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  const setPage = useCallback(
    (newPage: number) => {
      const clampedPage = Math.max(1, Math.min(newPage, totalPages));
      setPageState(clampedPage);
      onPageChange?.(clampedPage);
    },
    [totalPages, onPageChange]
  );

  const setPageSize = useCallback(
    (newPageSize: number) => {
      setPageSizeState(newPageSize);
      // Reset to first page when page size changes
      setPageState(1);
      onPageSizeChange?.(newPageSize);
    },
    [onPageSizeChange]
  );

  const goToPage = useCallback(
    (targetPage: number) => {
      setPage(targetPage);
    },
    [setPage]
  );

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const goToLastPage = useCallback(() => {
    setPage(totalPages);
  }, [setPage, totalPages]);

  const goToNextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const goToPreviousPage = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);

  const canGoNext = page < totalPages;
  const canGoPrevious = page > 1;

  const startIndex = useMemo(() => {
    return totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  }, [page, pageSize, totalCount]);

  const endIndex = useMemo(() => {
    return Math.min(page * pageSize, totalCount);
  }, [page, pageSize, totalCount]);

  const paginationInfo = useMemo(() => {
    if (totalCount === 0) {
      return { showing: '0', total: 0 };
    }
    return {
      showing: `${startIndex}-${endIndex}`,
      total: totalCount,
    };
  }, [startIndex, endIndex, totalCount]);

  return {
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
    paginationInfo,
  };
}

