"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Search, Shield, User as UserIcon, Loader2, ChevronDown, ChevronRight, Star, StarOff, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { User } from "@/lib/npa-structure";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import {
  hasTokens,
  impersonateUser,
  storeOriginalTokens,
  clearOriginalTokens,
  getOriginalTokens,
  storeTokens,
  hasOriginalTokens,
} from "@/lib/api-client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/hooks/use-debounce";
import { logError } from "@/lib/client-logger";
import { highlightText } from "@/lib/search-highlight";
import {
  getRecentUsers,
  addRecentUser,
  clearRecentUsers,
  getFavoriteUsers,
  addFavoriteUser,
  removeFavoriteUser,
  isFavoriteUser,
  getCollapsedGroups,
  saveCollapsedGroups,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  getGroupOrder,
  saveGroupOrder,
} from "@/lib/role-switcher-storage";
import { fetchUsers } from "@/lib/admin-api";

interface SimplifiedRoleSwitcherProps {
  onClose?: () => void;
}

const USERS_PER_GROUP = 25;
const BACKEND_SEARCH_THRESHOLD = 500;
const DEBOUNCE_DELAY = 300;
const DEFAULT_PAGE_SIZE = 50; // Default page size for pagination

const SimplifiedRoleSwitcherComponent = ({ onClose }: SimplifiedRoleSwitcherProps) => {
  const { directorates, divisions, departments, users, refreshOrganizationData, isSyncing } = useOrganization();
  const { currentUser, hydrated, refresh: refreshCurrentUser, isImpersonating } = useCurrentUser();
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);
  const [, startTransition] = useTransition();
  const [isSwitching, setIsSwitching] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(getCollapsedGroups());
  const [favorites, setFavorites] = useState<Set<string>>(new Set(getFavoriteUsers()));
  const [recentUsers, setRecentUsers] = useState(getRecentUsers());
  const [backendSearchResults, setBackendSearchResults] = useState<User[]>([]);
  const [backendSearchTotal, setBackendSearchTotal] = useState(0);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory());
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [groupOrder, setGroupOrder] = useState<string[]>(getGroupOrder());
  const [performanceMetrics, setPerformanceMetrics] = useState({
    searchTime: 0,
    filterTime: 0,
    renderTime: 0,
  });
  
  // Pagination for backend search
  const backendPagination = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_PAGE_SIZE,
    totalCount: backendSearchTotal,
  });
  
  // Pagination for frontend filtered results
  const frontendPagination = usePagination({
    initialPage: 1,
    initialPageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0, // Will be updated dynamically in pagination controls
  });
  
  const mountedRef = useRef(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userListRef = useRef<HTMLDivElement>(null);
  const userButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track if component is mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cleanup: abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Save collapsed groups to localStorage
  useEffect(() => {
    saveCollapsedGroups(collapsedGroups);
  }, [collapsedGroups]);

  // Load favorites and search history on mount
  useEffect(() => {
    setFavorites(new Set(getFavoriteUsers()));
    setRecentUsers(getRecentUsers());
    setSearchHistory(getSearchHistory());
    setGroupOrder(getGroupOrder());
  }, []);

  // Save search to history when search is performed
  useEffect(() => {
    if (debouncedSearchQuery.trim() && debouncedSearchQuery.length > 2) {
      addSearchHistory(debouncedSearchQuery);
      setSearchHistory(getSearchHistory());
    }
  }, [debouncedSearchQuery]);

  // Backend search if user count exceeds threshold
  useEffect(() => {
    // Cancel previous request if still in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (users.length > BACKEND_SEARCH_THRESHOLD && debouncedSearchQuery.trim()) {
      // Reset to page 1 when search query changes
      backendPagination.goToFirstPage();
      performBackendSearch(debouncedSearchQuery, backendPagination.page, backendPagination.pageSize);
    } else {
      setBackendSearchResults([]);
      setBackendSearchTotal(0);
      setIsSearchingBackend(false);
    }

    // Cleanup: abort request on unmount or when query changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearchQuery, users.length]);

  // Re-fetch when backend pagination changes
  useEffect(() => {
    if (users.length > BACKEND_SEARCH_THRESHOLD && debouncedSearchQuery.trim() && !isSearchingBackend) {
      performBackendSearch(debouncedSearchQuery, backendPagination.page, backendPagination.pageSize);
    }
  }, [backendPagination.page, backendPagination.pageSize]);

  const performBackendSearch = async (query: string, page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE) => {
    // Cancel previous request if still in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearchingBackend(true);
    try {
      // Fetch single page of users
      const response = await fetchUsers({ 
        search: query, 
        page_size: pageSize, 
        page,
        is_active: true,
        signal: abortController.signal,
      });
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      // Map API users to local User type
      const mappedUsers: User[] = response.results.map((apiUser) => ({
        id: apiUser.id,
        name: `${apiUser.first_name} ${apiUser.last_name}`.trim() || apiUser.username,
        email: apiUser.email,
        employeeId: apiUser.employee_id || '',
        gradeLevel: apiUser.grade_level || '',
        directorate: apiUser.directorate || undefined,
        division: apiUser.division || undefined,
        department: apiUser.department || undefined,
        systemRole: apiUser.system_role_name || apiUser.system_role || '',
        active: apiUser.is_active,
        username: apiUser.username,
        isSuperuser: apiUser.is_superuser,
      }));
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted && mountedRef.current) {
        setBackendSearchResults(mappedUsers);
        setBackendSearchTotal(response.count as number || mappedUsers.length);
      }
    } catch (error: unknown) {
      // Ignore abort errors
      if ((error instanceof Error && error.name === 'AbortError') || abortController.signal.aborted) {
        return;
      }
      logError('Backend search failed', error);
      if (mountedRef.current) {
        setBackendSearchResults([]);
        setBackendSearchTotal(0);
      }
    } finally {
      if (!abortController.signal.aborted && mountedRef.current) {
        setIsSearchingBackend(false);
      }
    }
  };

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);
  const directorateMap = useMemo(
    () => new Map(directorates.map((dir) => [dir.id, dir])),
    [directorates]
  );
  const divisionMap = useMemo(() => new Map(divisions.map((div) => [div.id, div])), [divisions]);
  const departmentMap = useMemo(
    () => new Map(departments.map((dept) => [dept.id, dept])),
    [departments]
  );

  const getDirectorateNameForUser = useCallback(
    (user: User): string | undefined => {
      const explicitDirectorate = user.directorate ? directorateMap.get(user.directorate) : undefined;
      if (explicitDirectorate) return explicitDirectorate.name;

      if (user.division) {
        const division = divisionMap.get(user.division);
        if (division) {
          const parentDirectorate = division.directorateId ? directorateMap.get(division.directorateId) : undefined;
          if (parentDirectorate) return parentDirectorate.name;
        }
      }

      if (user.department) {
        const department = departmentMap.get(user.department);
        if (department) {
          const division = department.divisionId ? divisionMap.get(department.divisionId) : undefined;
          if (division?.directorateId) {
            const parentDirectorate = directorateMap.get(division.directorateId);
            if (parentDirectorate) return parentDirectorate.name;
          }
        }
      }

      return undefined;
    },
    [departmentMap, directorateMap, divisionMap]
  );

  // Use backend search results if available, otherwise filter locally
  const filteredUsers = useMemo(() => {
    const startTime = performance.now();
    
    let result: User[];
    
    if (users.length > BACKEND_SEARCH_THRESHOLD && debouncedSearchQuery.trim() && backendSearchResults.length > 0) {
      // Use backend search results directly (already paginated)
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
          
          const divisionName = user.division ? divisionMap.get(user.division)?.name?.toLowerCase() : '';
          const departmentName = user.department ? departmentMap.get(user.department)?.name?.toLowerCase() : '';
          const directorateName = getDirectorateNameForUser(user)?.toLowerCase() ?? '';
          
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
    
    const filterTime = performance.now() - startTime;
    setPerformanceMetrics(prev => ({ ...prev, filterTime }));
    
    return result;
  }, [activeUsers, debouncedSearchQuery, directorateMap, divisionMap, departmentMap, getDirectorateNameForUser, backendSearchResults, users.length]);

  // Determine which pagination to use (defined after filteredUsers)
  const isUsingBackendSearch = users.length > BACKEND_SEARCH_THRESHOLD && debouncedSearchQuery.trim();
  
  // Reset frontend pagination to page 1 when search query changes
  useEffect(() => {
    if (!isUsingBackendSearch && debouncedSearchQuery.trim()) {
      frontendPagination.goToFirstPage();
    }
  }, [debouncedSearchQuery]);

  // Update frontend pagination when filtered users change
  useEffect(() => {
    if (!isUsingBackendSearch && filteredUsers.length > 0) {
      // Reset to page 1 if current page is beyond available pages
      const maxPage = Math.ceil(filteredUsers.length / frontendPagination.pageSize);
      if (frontendPagination.page > maxPage && maxPage > 0) {
        frontendPagination.goToFirstPage();
      }
    }
  }, [filteredUsers.length, isUsingBackendSearch, frontendPagination.page, frontendPagination.pageSize]);

  // Get paginated users (for frontend filtering)
  const paginatedUsers = useMemo(() => {
    if (users.length > BACKEND_SEARCH_THRESHOLD && debouncedSearchQuery.trim()) {
      // Backend search is already paginated
      return filteredUsers;
    }
    
    // Frontend pagination
    const start = (frontendPagination.page - 1) * frontendPagination.pageSize;
    const end = start + frontendPagination.pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, frontendPagination.page, frontendPagination.pageSize, users.length, debouncedSearchQuery]);

  // Get recent and favorite users
  const recentUserObjects = useMemo(() => {
    return recentUsers
      .map(ru => activeUsers.find(u => u.id === ru.id))
      .filter((u): u is User => u !== undefined)
      .slice(0, 10);
  }, [recentUsers, activeUsers]);

  const favoriteUserObjects = useMemo(() => {
    return activeUsers.filter(u => favorites.has(u.id));
  }, [activeUsers, favorites]);

  // Group users (use paginated users for frontend, all results for backend)
  const groupedUsers = useMemo(() => {
    const groups = {
      executive: [] as User[],
      gm: [] as User[],
      manager: [] as User[],
      officer: [] as User[],
      assistant: [] as User[],
      admin: [] as User[],
      other: [] as User[],
    };

    // Use paginated users for grouping (frontend) or all results (backend)
    const usersToGroup = users.length > BACKEND_SEARCH_THRESHOLD && debouncedSearchQuery.trim()
      ? filteredUsers // Backend search - already paginated
      : paginatedUsers; // Frontend - use paginated slice

    for (const user of usersToGroup) {
      const grade = user.gradeLevel || "";
      const role = user.systemRole || "";

      if (["MDCS", "EDCS"].includes(grade) || ["Managing Director", "Executive Director"].includes(role)) {
        groups.executive.push(user);
      } else if (grade === "MSS1" || role === "General Manager") {
        groups.gm.push(user);
      } else if (["MSS2", "MSS3", "MSS4", "MSS5"].includes(grade) || 
                 ["Assistant General Manager", "Manager", "Senior Manager", "Principal Manager"].includes(role)) {
        groups.manager.push(user);
      } else if (role === "Super Admin") {
        groups.admin.push(user);
      } else if (["Secretary", "Assistant", "Personal Assistant", "Secretariat"].includes(role)) {
        groups.assistant.push(user);
      } else if (["SSS1", "SSS2", "SSS3", "SSS4", "JSS1", "JSS2", "JSS3"].includes(grade) || 
                 ["Officer", "Senior Officer", "Staff"].includes(role)) {
        groups.officer.push(user);
      } else {
        groups.other.push(user);
      }
    }

    return groups;
  }, [filteredUsers, paginatedUsers, isUsingBackendSearch]);
  
  // Determine which pagination to use and get total count
  const currentPagination = isUsingBackendSearch ? backendPagination : frontendPagination;
  const totalCount = isUsingBackendSearch ? backendSearchTotal : filteredUsers.length;

  // Early returns AFTER all hooks
  if (!hydrated || !currentUser) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-label="Loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading user data...</span>
      </div>
    );
  }

  const impersonationEnabled = hasTokens() && (currentUser.systemRole === "Super Admin" || isImpersonating);

  if (!impersonationEnabled) {
    return (
      <div className="text-center py-8 text-muted-foreground" role="alert">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
        <p className="text-sm">Role switching is only available to Super Admins</p>
      </div>
    );
  }

  // Loading state
  if (isSyncing || (users.length === 0 && !isSearchingBackend)) {
    return (
      <div className="flex flex-col items-center justify-center py-12" role="status" aria-label="Loading users">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading users...</p>
        <span className="sr-only">Loading user list, please wait</span>
      </div>
    );
  }

  const handleImpersonateClick = (user: User) => {
    setSelectedUser(user);
    setConfirmDialogOpen(true);
  };

  const handleImpersonateConfirm = async () => {
    if (!selectedUser || isSwitching) return;
    
    if (!impersonationEnabled || currentUser.systemRole !== "Super Admin") {
      toast.error("Impersonation is only available to Super Admins");
      return;
    }

    // Check token expiration before switching
    const originalTokens = getOriginalTokens();
    if (originalTokens?.expiresAt) {
      const timeRemaining = originalTokens.expiresAt - Date.now();
      if (timeRemaining <= 0) {
        toast.error("Your original session has expired. Please log in again.");
        clearOriginalTokens();
        return;
      }
      if (timeRemaining < 60 * 1000) { // Less than 1 minute
        toast.warning("Your original session is about to expire. You may need to log in again soon.");
      }
    }

    setIsSwitching(true);
    setConfirmDialogOpen(false);
    
    // Store original tokens before attempting switch
    const hadOriginalTokens = hasOriginalTokens();
    if (!isImpersonating && !hadOriginalTokens) {
      storeOriginalTokens();
    }

    const identifier = selectedUser.username ?? selectedUser.id;

    try {
      await impersonateUser(identifier);
      
      // Add to recent users
      addRecentUser({
        id: selectedUser.id,
        name: selectedUser.name || selectedUser.username || 'Unknown',
        username: selectedUser.username,
        email: selectedUser.email,
      });
      setRecentUsers(getRecentUsers());
      
      toast.success(`Switched to ${selectedUser.name || selectedUser.username}`);
      
      // Close modal on success
      onClose?.();
      
      // Refresh data in background
      startTransition(() => {
        void refreshCurrentUser();
        void refreshOrganizationData();
      });
      } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to switch user";
      toast.error(message);
      
      // Restore original tokens on error if we had them
      if (hadOriginalTokens) {
        const originalTokens = getOriginalTokens();
        if (originalTokens?.access && originalTokens.refresh) {
          try {
            const secondsRemaining = originalTokens.expiresAt
              ? Math.max(0, Math.floor((originalTokens.expiresAt - Date.now()) / 1000))
              : undefined;
            storeTokens(originalTokens.access, originalTokens.refresh, secondsRemaining);
          } catch (restoreError) {
            logError('Failed to restore original tokens', restoreError);
          }
        }
      }
      
      if (mountedRef.current) {
        setIsSwitching(false);
      }
      // Keep modal open on error so user can retry
    } finally {
      setSelectedUser(null);
    }
  };

  const handleReset = async () => {
    const originalTokens = getOriginalTokens();

    if (!originalTokens?.access || !originalTokens.refresh) {
      toast.info("You are already using your primary account");
      return;
    }

    // Check if token is expired or about to expire
    if (originalTokens.expiresAt) {
      const timeRemaining = originalTokens.expiresAt - Date.now();
      if (timeRemaining <= 0) {
        toast.error("Your original session has expired. Please log in again.");
        clearOriginalTokens();
        onClose?.();
        return;
      }
      if (timeRemaining < 60 * 1000) { // Less than 1 minute
        toast.warning("Your original session is about to expire. You may need to log in again soon.");
      }
    }

    try {
      const secondsRemaining = originalTokens.expiresAt
        ? Math.max(0, Math.floor((originalTokens.expiresAt - Date.now()) / 1000))
        : undefined;
      storeTokens(originalTokens.access, originalTokens.refresh, secondsRemaining);
      clearOriginalTokens();
      toast.success("Returned to your primary account");
      
      onClose?.();
      
      startTransition(() => {
        void refreshCurrentUser();
        void refreshOrganizationData();
      });
      } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to restore your session";
      toast.error(message);
    }
  };

  const handleClearRecent = () => {
    clearRecentUsers();
    setRecentUsers([]);
    toast.success("Recent users cleared");
  };

  const toggleFavorite = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.has(userId)) {
      removeFavoriteUser(userId);
      setFavorites(new Set(getFavoriteUsers()));
    } else {
      addFavoriteUser(userId);
      setFavorites(new Set(getFavoriteUsers()));
    }
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Keyboard navigation - Escape to close
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  };

  const renderUserButton = (user: User, showFavorite: boolean = true) => {
    const divisionName = user.division ? divisionMap.get(user.division)?.name : undefined;
    const departmentName = user.department ? departmentMap.get(user.department)?.name : undefined;
    const directorateName = getDirectorateNameForUser(user);
    const isFav = favorites.has(user.id);
    const userInfo = `${user.email || ''}${user.employeeId ? ` • ID: ${user.employeeId}` : ''}${user.gradeLevel ? ` • ${user.gradeLevel}` : ''}`;

    return (
      <div key={user.id} className="relative group">
        <Tooltip>
          <TooltipTrigger asChild>
              <Button
                ref={(el) => {
                  if (el) userButtonRefs.current.set(user.id, el);
                  else userButtonRefs.current.delete(user.id);
                }}
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-3 overflow-hidden"
                onClick={() => handleImpersonateClick(user)}
                disabled={isSwitching}
                aria-label={`Switch to ${user.name || user.username}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleImpersonateClick(user);
                  }
                }}
              >
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                    {user.name
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </div>
                  <div className="flex-1 text-left min-w-0 overflow-hidden">
                    <div className="text-sm font-medium">
                      {debouncedSearchQuery.trim() ? highlightText(user.name || user.username || '', debouncedSearchQuery) : (user.name || user.username)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {debouncedSearchQuery.trim() && user.systemRole ? (
                        highlightText(user.systemRole, debouncedSearchQuery)
                      ) : (
                        user.systemRole || user.gradeLevel
                      )}
                      {departmentName ? ` • ${departmentName}` : divisionName ? ` • ${divisionName}` : directorateName ? ` • ${directorateName}` : ''}
                    </div>
                  </div>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div className="font-medium">{user.name || user.username}</div>
                {userInfo && <div className="text-muted-foreground">{userInfo}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        {showFavorite && (
          <button
            type="button"
            onClick={(e) => toggleFavorite(user.id, e)}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            tabIndex={0}
          >
            {isFav ? (
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    );
  };

  const renderUserGroup = (title: string, groupKey: string, userList: User[]) => {
    if (userList.length === 0) return null;

    const isCollapsed = collapsedGroups.has(groupKey);
    const isExpanded = expandedGroups.has(groupKey);
    const displayCount = isExpanded ? userList.length : USERS_PER_GROUP;
    const hasMore = userList.length > USERS_PER_GROUP;

    return (
      <div className="mb-4" role="group" aria-labelledby={`group-${groupKey}`}>
        <button
          type="button"
          onClick={() => toggleGroupCollapse(groupKey)}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
          aria-expanded={!isCollapsed}
          aria-controls={`group-content-${groupKey}`}
          id={`group-${groupKey}`}
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {title}
          </div>
          <Badge variant="secondary" className="text-[10px]">{userList.length}</Badge>
        </button>
        {!isCollapsed && (
          <div id={`group-content-${groupKey}`} className="space-y-1" role="list">
            {userList.slice(0, displayCount).map((user) => (
              <div key={user.id} role="listitem">
                {renderUserButton(user)}
              </div>
            ))}
            {hasMore && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => toggleGroupExpand(groupKey)}
                aria-label={`Show all ${userList.length} users in ${title}`}
              >
                Show all {userList.length} users
              </Button>
            )}
            {isExpanded && hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => toggleGroupExpand(groupKey)}
                aria-label={`Show first ${USERS_PER_GROUP} users in ${title}`}
              >
                Show less
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasResults = filteredUsers.length > 0 || recentUserObjects.length > 0 || favoriteUserObjects.length > 0;
  const isSearching = debouncedSearchQuery.trim() !== '';

  return (
    <ClientErrorBoundary>
    <div className="space-y-4 relative" onKeyDown={handleKeyDown} tabIndex={-1}>
        {/* Loading Overlay */}
        {isSwitching && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg" role="status" aria-label="Switching user">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Switching...</span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, email, role..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => {
              if (searchHistory.length > 0 || searchQuery.length > 0) {
                setShowSearchSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay to allow clicking on suggestions
              setTimeout(() => setShowSearchSuggestions(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                addSearchHistory(searchQuery.trim());
                setSearchHistory(getSearchHistory());
                setShowSearchSuggestions(false);
              }
            }}
            className="pl-9 h-9"
            disabled={isSwitching}
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
              onClick={() => {
                setSearchQuery('');
                setShowSearchSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <span id="search-help" className="sr-only">
            Search users by name, email, role, employee ID, or organizational unit
          </span>
          
          {/* Search Suggestions */}
          {showSearchSuggestions && (searchHistory.length > 0 || searchQuery.trim().length > 0) && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
              {searchQuery.trim().length > 0 && (
                <div className="p-2">
                  <p className="text-xs text-muted-foreground px-2 py-1">Search suggestions</p>
                  {searchHistory
                    .filter(h => h.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 5)
                    .map((historyItem, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-sm"
                        onClick={() => {
                          setSearchQuery(historyItem);
                          setShowSearchSuggestions(false);
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
                        setSearchHistory([]);
                        setShowSearchSuggestions(false);
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
                        setSearchQuery(historyItem);
                        setShowSearchSuggestions(false);
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

        {/* Search Results Count & Performance */}
        {isSearching && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Found {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </span>
            {process.env.NODE_ENV === 'development' && performanceMetrics.filterTime > 0 && (
              <span className="text-[10px]">
                {performanceMetrics.filterTime.toFixed(2)}ms
              </span>
            )}
          </div>
        )}

        {/* Reset to Primary Account */}
        {isImpersonating && (
          <>
            <Button
              variant="outline"
              className="w-full h-9"
              onClick={handleReset}
              disabled={isSwitching}
              aria-label="Return to your primary account"
            >
              <UserIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Return to Primary Account
            </Button>
            <Separator />
          </>
        )}

        {/* User List */}
        <div className="max-h-[60vh] overflow-y-auto pr-4" ref={userListRef} role="main" aria-label="User list">
          <div className="space-y-6">
            {/* Recent Users */}
            {!isSearching && recentUserObjects.length > 0 && (
              <div role="group" aria-labelledby="recent-users">
                <div className="flex items-center justify-between mb-2">
                  <h3 id="recent-users" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearRecent}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    aria-label="Clear recent users"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1" role="list">
                  {recentUserObjects.map((user) => (
                    <div key={user.id} role="listitem">
                      {renderUserButton(user, false)}
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
              </div>
            )}

            {/* Favorite Users */}
            {!isSearching && favoriteUserObjects.length > 0 && (
              <div role="group" aria-labelledby="favorite-users">
                <h3 id="favorite-users" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  Favorites
                </h3>
                <div className="space-y-1" role="list">
                  {favoriteUserObjects.map((user) => (
                    <div key={user.id} role="listitem">
                      {renderUserButton(user)}
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
              </div>
            )}

            {/* Grouped Users - Use custom order if available */}
            {(() => {
              const defaultOrder = [
                { key: "executive", title: "Executive Leadership", users: groupedUsers.executive },
                { key: "gm", title: "General Managers", users: groupedUsers.gm },
                { key: "manager", title: "AGMs & Managers", users: groupedUsers.manager },
                { key: "officer", title: "Officers & Staff", users: groupedUsers.officer },
                { key: "assistant", title: "Assistants & Secretaries", users: groupedUsers.assistant },
                { key: "admin", title: "System Admins", users: groupedUsers.admin },
                { key: "other", title: "Other Users", users: groupedUsers.other },
              ];
              
              // Apply custom order if available
              if (groupOrder.length > 0) {
                const ordered: typeof defaultOrder = [];
                const unordered: typeof defaultOrder = [];
                
                // Add groups in custom order
                groupOrder.forEach(key => {
                  const group = defaultOrder.find(g => g.key === key);
                  if (group) ordered.push(group);
                });
                
                // Add remaining groups not in custom order
                defaultOrder.forEach(group => {
                  if (!groupOrder.includes(group.key)) {
                    unordered.push(group);
                  }
                });
                
                return [...ordered, ...unordered].map(group => (
                  <div key={group.key}>
                    {renderUserGroup(group.title, group.key, group.users)}
                  </div>
                ));
              }
              
              return defaultOrder.map(group => (
                <div key={group.key}>
                  {renderUserGroup(group.title, group.key, group.users)}
                </div>
              ));
            })()}
            
            {/* Empty States */}
            {!hasResults && !isSyncing && !isSearchingBackend && (
              <div className="text-center py-12 text-muted-foreground" role="status">
                {isSearching ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                    <p className="text-sm font-medium mb-1">No users found</p>
                    <p className="text-xs">Try a different search term or clear the search to see all users</p>
                  </>
                ) : (
                  <>
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                    <p className="text-sm font-medium mb-1">No users available</p>
                    <p className="text-xs">No active users found in the system</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Pagination Controls */}
        {hasResults && totalCount > currentPagination.pageSize && (
          <div className="border-t pt-4">
            <PaginationControls
              pagination={{
                ...currentPagination,
                totalPages: Math.max(1, Math.ceil(totalCount / currentPagination.pageSize)),
                paginationInfo: {
                  showing: `${currentPagination.startIndex}-${Math.min(currentPagination.endIndex, totalCount)}`,
                  total: totalCount,
                },
              }}
              showPageSizeSelector={true}
              pageSizeOptions={[25, 50, 100, 200]}
              compact={false}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent aria-describedby="confirm-description">
          <DialogHeader>
            <DialogTitle>Confirm Role Switch</DialogTitle>
            <DialogDescription id="confirm-description">
              You are about to switch to <strong>{selectedUser?.name || selectedUser?.username}</strong>. 
              You will be able to return to your primary account at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImpersonateConfirm} disabled={isSwitching}>
              {isSwitching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                'Switch Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientErrorBoundary>
  );
};

export const SimplifiedRoleSwitcher = memo(SimplifiedRoleSwitcherComponent);
