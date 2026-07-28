"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CorrespondenceQueueSortOrder = "asc" | "desc";

export type UseCorrespondenceQueueFiltersOptions = {
  defaultStatus?: string;
  defaultPriority?: string;
  defaultSortBy?: string;
  defaultSortOrder?: CorrespondenceQueueSortOrder;
  debounceMs?: number;
};

export function useCorrespondenceQueueFilters(options: UseCorrespondenceQueueFiltersOptions = {}) {
  const {
    defaultStatus = "",
    defaultPriority = "",
    defaultSortBy = "priority",
    defaultSortOrder = "desc",
    debounceMs = 350,
  } = options;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(defaultStatus);
  const [selectedPriority, setSelectedPriority] = useState(defaultPriority);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<CorrespondenceQueueSortOrder>(defaultSortOrder);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), debounceMs);
    return () => clearTimeout(handle);
  }, [searchQuery, debounceMs]);

  const hasActiveFilters = useMemo(() => {
    const statusActive = Boolean(selectedStatus) && selectedStatus !== "all";
    const priorityActive = Boolean(selectedPriority) && selectedPriority !== "all";
    return statusActive || priorityActive || Boolean(dateFrom) || Boolean(dateTo);
  }, [selectedStatus, selectedPriority, dateFrom, dateTo]);

  const clearFilters = useCallback(() => {
    setSelectedStatus(defaultStatus);
    setSelectedPriority(defaultPriority);
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  }, [defaultPriority, defaultStatus]);

  const handleSortChange = useCallback((value: string) => {
    const [by, order] = value.split("-");
    setSortBy(by);
    setSortOrder(order as CorrespondenceQueueSortOrder);
  }, []);

  const appendQueueParams = useCallback(
    (params: URLSearchParams, extra?: Record<string, string | boolean | undefined>) => {
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedStatus && selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedPriority && selectedPriority !== "all") params.append("priority", selectedPriority);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          if (value === undefined || value === false) continue;
          params.append(key, String(value));
        }
      }

      return params;
    },
    [dateFrom, dateTo, debouncedSearch, selectedPriority, selectedStatus, sortBy, sortOrder],
  );

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    hasActiveFilters,
    clearFilters,
    handleSortChange,
    appendQueueParams,
  };
}
