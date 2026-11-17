import { useState, useCallback, useMemo } from 'react';
import { DEFAULT_LIST_PAGE_SIZE } from '@/lib/pagination-constants';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalCount?: number;
  controlledPage?: number;
  onControlledPageChange?: (page: number) => void;
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
    controlledPage,
    onControlledPageChange,
    onPageChange,
    onPageSizeChange,
  } = options;

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);
  const currentPage = controlledPage ?? page;

  const setPage = useCallback(
    (newPage: number) => {
      const clampedPage = Math.max(1, Math.min(newPage, totalPages));
      if (controlledPage === undefined) setPageState(clampedPage);
      onControlledPageChange?.(clampedPage);
      onPageChange?.(clampedPage);
    },
    [totalPages, controlledPage, onControlledPageChange, onPageChange]
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
    setPage(currentPage + 1);
  }, [currentPage, setPage]);

  const goToPreviousPage = useCallback(() => {
    setPage(currentPage - 1);
  }, [currentPage, setPage]);

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  const startIndex = useMemo(() => {
    return totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  }, [currentPage, pageSize, totalCount]);

  const endIndex = useMemo(() => {
    return Math.min(currentPage * pageSize, totalCount);
  }, [currentPage, pageSize, totalCount]);

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
    page: currentPage,
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

