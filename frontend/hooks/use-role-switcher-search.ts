"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { usePagination } from "@/hooks/use-pagination";
import { DEFAULT_LIST_PAGE_SIZE } from '@/lib/pagination-constants';
import { getSearchHistory, addSearchHistory } from "@/lib/role-switcher-storage";
import { fetchUsers } from "@/lib/admin-api";
import { logError } from "@/lib/client-logger";
import type { User, Division, Department } from "@/lib/npa-structure";

const BACKEND_SEARCH_THRESHOLD = 500;
const DEBOUNCE_DELAY = 300;

export function useRoleSwitcherSearch(
  users: User[],
  orgHelpers: {
    divisionMap: Map<string, Division>;
    departmentMap: Map<string, Department>;
    getDirectorateNameForUser: (user: User) => string | undefined;
  },
) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);
  const [backendSearchResults, setBackendSearchResults] = useState<User[]>([]);
  const [backendSearchTotal, setBackendSearchTotal] = useState(0);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory());
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const shouldUseBackendSearch = users.length === 0 || users.length > BACKEND_SEARCH_THRESHOLD;

  const backendPagination = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_LIST_PAGE_SIZE,
    totalCount: backendSearchTotal,
  });

  const frontendPagination = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_LIST_PAGE_SIZE,
    totalCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery.trim() && debouncedSearchQuery.length > 2) {
      addSearchHistory(debouncedSearchQuery);
      setSearchHistory(getSearchHistory());
    }
  }, [debouncedSearchQuery]);

  const performBackendSearch = useCallback(async (
    query: string,
    page: number = 1,
    pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearchingBackend(true);
    try {
      const response = await fetchUsers({
        search: query,
        page_size: pageSize,
        page,
        is_active: true,
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      const mappedUsers: User[] = response.results.map((apiUser) => ({
        id: apiUser.id,
        name: `${apiUser.first_name} ${apiUser.last_name}`.trim() || apiUser.username,
        email: apiUser.email,
        employeeId: apiUser.employee_id || "",
        gradeLevel: apiUser.grade_level || "",
        directorate: apiUser.directorate || undefined,
        division: apiUser.division || undefined,
        department: apiUser.department || undefined,
        systemRole: apiUser.system_role_name || apiUser.system_role || "",
        active: apiUser.is_active,
        username: apiUser.username,
        isSuperuser: apiUser.is_superuser,
      }));

      if (!abortController.signal.aborted) {
        setBackendSearchResults(mappedUsers);
        setBackendSearchTotal(response.count as number || mappedUsers.length);
      }
    } catch (error: unknown) {
      if ((error instanceof Error && error.name === "AbortError") || abortController.signal.aborted) return;
      logError("Backend search failed", error);
      setBackendSearchResults([]);
      setBackendSearchTotal(0);
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearchingBackend(false);
      }
    }
  }, []);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (shouldUseBackendSearch && debouncedSearchQuery.trim()) {
      backendPagination.goToFirstPage();
      performBackendSearch(debouncedSearchQuery, 1, backendPagination.pageSize);
    } else {
      setBackendSearchResults([]);
      setBackendSearchTotal(0);
      setIsSearchingBackend(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, shouldUseBackendSearch]);

  useEffect(() => {
    if (shouldUseBackendSearch && debouncedSearchQuery.trim() && !isSearchingBackend) {
      performBackendSearch(debouncedSearchQuery, backendPagination.page, backendPagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendPagination.page, backendPagination.pageSize, debouncedSearchQuery, isSearchingBackend, shouldUseBackendSearch]);

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);

  const isUsingBackendSearch = shouldUseBackendSearch && Boolean(debouncedSearchQuery.trim());

  useEffect(() => {
    if (!isUsingBackendSearch && debouncedSearchQuery.trim()) {
      frontendPagination.goToFirstPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, isUsingBackendSearch]);

  const { divisionMap, departmentMap, getDirectorateNameForUser } = orgHelpers;

  const filteredUsers = useMemo(() => {
    let result: User[];

    if (shouldUseBackendSearch && debouncedSearchQuery.trim() && backendSearchResults.length > 0) {
      result = backendSearchResults;
    } else {
      let pool = activeUsers;

      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        pool = pool.filter((user) => {
          const nameMatch = user.name?.toLowerCase().includes(query);
          const emailMatch = user.email?.toLowerCase().includes(query);
          const systemRoleMatch = user.systemRole?.toLowerCase().includes(query);
          const usernameMatch = user.username?.toLowerCase().includes(query);
          const employeeIdMatch = user.employeeId?.toLowerCase().includes(query);
          const gradeLevelMatch = user.gradeLevel?.toLowerCase().includes(query);

          const divisionName = user.division ? divisionMap.get(user.division)?.name?.toLowerCase() : "";
          const departmentName = user.department ? departmentMap.get(user.department)?.name?.toLowerCase() : "";
          const directorateName = getDirectorateNameForUser(user)?.toLowerCase() ?? "";

          return (
            nameMatch ||
            emailMatch ||
            systemRoleMatch ||
            usernameMatch ||
            employeeIdMatch ||
            gradeLevelMatch ||
            divisionName?.includes(query) ||
            departmentName?.includes(query) ||
            directorateName?.includes(query)
          );
        });
      }

      result = pool;
    }

    return result;
  }, [
    activeUsers,
    backendSearchResults,
    debouncedSearchQuery,
    departmentMap,
    divisionMap,
    getDirectorateNameForUser,
    shouldUseBackendSearch,
  ]);

  useEffect(() => {
    if (!isUsingBackendSearch && filteredUsers.length > 0) {
      const maxPage = Math.ceil(filteredUsers.length / frontendPagination.pageSize);
      if (frontendPagination.page > maxPage && maxPage > 0) {
        frontendPagination.goToFirstPage();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredUsers.length, isUsingBackendSearch, frontendPagination.page, frontendPagination.pageSize]);

  const paginatedUsers = useMemo(() => {
    if (shouldUseBackendSearch && debouncedSearchQuery.trim()) {
      return filteredUsers;
    }

    const start = (frontendPagination.page - 1) * frontendPagination.pageSize;
    const end = start + frontendPagination.pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, frontendPagination.page, frontendPagination.pageSize, debouncedSearchQuery, shouldUseBackendSearch]);

  const currentPagination = isUsingBackendSearch ? backendPagination : frontendPagination;
  const totalCount = isUsingBackendSearch ? backendSearchTotal : filteredUsers.length;

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isSearchingBackend,
    searchHistory,
    showSearchSuggestions,
    setShowSearchSuggestions,
    filteredUsers,
    paginatedUsers,
    isUsingBackendSearch,
    currentPagination,
    totalCount,
    activeUsers,
  };
}
