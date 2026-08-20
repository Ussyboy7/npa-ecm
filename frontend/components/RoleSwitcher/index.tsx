"use client";
import { SYSTEM_ROLE_SUPER_ADMIN } from "@/lib/constants";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Search, Shield, User as UserIcon, Loader2, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleSwitcherSearch } from "@/hooks/use-role-switcher-search";
import { useRoleSwitcherGroups } from "@/hooks/use-role-switcher-groups";
import { PaginationControls } from "@/components/shared/PaginationControls";
import {
  apiFetch,
  hasTokens,
  impersonateUser,
  storeOriginalTokens,
  clearOriginalTokens,
  getOriginalTokens,
  getOriginalUserId,
  storeTokens,
  hasOriginalTokens,
} from "@/lib/api-client";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import {
  getRecentUsers,
  addRecentUser,
  clearRecentUsers,
  getFavoriteUsers,
  addFavoriteUser,
  removeFavoriteUser,
} from "@/lib/role-switcher-storage";
import { SearchBar } from "./SearchBar";
import { UserButton } from "./UserButton";
import { UserGroup } from "./UserGroup";
import { ConfirmSwitchDialog } from "./ConfirmSwitchDialog";
import type { User } from "@/lib/npa-structure";
import {
  LIST_PAGE_SIZE_OPTIONS,
  MAX_CATALOG_PAGE_SIZE,
} from "@/lib/pagination-constants";

interface SimplifiedRoleSwitcherProps {
  onClose?: () => void;
}

const SimplifiedRoleSwitcherComponent = ({ onClose }: SimplifiedRoleSwitcherProps) => {
  const { directorates, divisions, departments, users: orgUsers } = useOrganization();
  const { currentUser, isImpersonating } = useCurrentUser();

  const {
    directorateMap: _directorateMap,
    divisionMap,
    departmentMap,
    getDirectorateNameForUser,
    collapsedGroups,
    expandedGroups,
    groupOrder,
    toggleGroupCollapse,
    toggleGroupExpand,
  } = useRoleSwitcherGroups(directorates, divisions, departments);

  const {
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
  } = useRoleSwitcherSearch(orgUsers, {
    divisionMap,
    departmentMap,
    getDirectorateNameForUser,
  });

  const [isSwitching, setIsSwitching] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(getFavoriteUsers()));
  const [recentUsers, setRecentUsers] = useState(getRecentUsers());

  const mountedRef = useRef(true);
  const userListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setFavorites(new Set(getFavoriteUsers()));
    setRecentUsers(getRecentUsers());
  }, []);

  useEffect(() => {
    if (currentUser?.id && searchInputRef.current) {
      searchInputRef.current.focus();
    }
     
  }, [currentUser?.id]);

  const recentUserObjects = useMemo(() => {
    return recentUsers
      .map((ru) => activeUsers.find((u) => u.id === ru.id))
      .filter((u): u is User => u !== undefined)
      .slice(0, 10);
  }, [recentUsers, activeUsers]);

  const favoriteUserObjects = useMemo(() => {
    return activeUsers.filter((u) => favorites.has(u.id));
  }, [activeUsers, favorites]);

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

    const usersToGroup = isUsingBackendSearch ? filteredUsers : paginatedUsers;

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
      } else if (role === SYSTEM_ROLE_SUPER_ADMIN) {
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

  const orderedGroups = useMemo(() => {
    const defaultOrder = [
      { key: "executive" as const, title: "Executive Leadership", users: groupedUsers.executive },
      { key: "gm" as const, title: "General Managers", users: groupedUsers.gm },
      { key: "manager" as const, title: "AGMs & Managers", users: groupedUsers.manager },
      { key: "officer" as const, title: "Officers & Staff", users: groupedUsers.officer },
      { key: "assistant" as const, title: "Assistants & Secretaries", users: groupedUsers.assistant },
      { key: "admin" as const, title: "System Admins", users: groupedUsers.admin },
      { key: "other" as const, title: "Other Users", users: groupedUsers.other },
    ];

    if (groupOrder.length > 0) {
      const ordered: typeof defaultOrder = [];
      const unordered: typeof defaultOrder = [];
      groupOrder.forEach((key) => {
        const group = defaultOrder.find((g) => g.key === key);
        if (group) ordered.push(group);
      });
      defaultOrder.forEach((group) => {
        if (!groupOrder.includes(group.key)) {
          unordered.push(group);
        }
      });
      return [...ordered, ...unordered];
    }
    return defaultOrder;
  }, [groupOrder, groupedUsers]);

  if (!currentUser?.id) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-label="Loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading user data...</span>
      </div>
    );
  }

  const impersonationEnabled = hasTokens() && (currentUser.systemRole === SYSTEM_ROLE_SUPER_ADMIN || isImpersonating);

  if (!impersonationEnabled) {
    return (
      <div className="text-center py-8 text-muted-foreground" role="alert">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
        <p className="text-sm">Role switching is only available to Super Admins</p>
      </div>
    );
  }

  const handleImpersonateClick = (user: User) => {
    setSelectedUser(user);
    setConfirmDialogOpen(true);
  };

  const handleImpersonateConfirm = async () => {
    if (!selectedUser || isSwitching) return;

    if (currentUser.systemRole !== SYSTEM_ROLE_SUPER_ADMIN) {
      toast.error("Impersonation is only available to Super Admins");
      return;
    }

    const originalTokens = getOriginalTokens();
    if (originalTokens?.expiresAt) {
      const timeRemaining = originalTokens.expiresAt - Date.now();
      if (timeRemaining <= 0) {
        toast.error("Your original session has expired. Please log in again.");
        clearOriginalTokens();
        return;
      }
      if (timeRemaining < 60 * 1000) {
        toast.warning("Your original session is about to expire. You may need to log in again soon.");
      }
    }

    // If picking the original user, just return to primary instead of re-impersonating same user
    const originalUserId = getOriginalUserId();
    if (originalUserId && selectedUser.id === originalUserId) {
      setConfirmDialogOpen(false);
      const origTokens = getOriginalTokens();
      if (!origTokens?.access || !origTokens?.refresh) {
        toast.info("You are already using your primary account");
        return;
      }
      const secondsRemaining = origTokens.expiresAt ? Math.max(0, Math.floor((origTokens.expiresAt - Date.now()) / 1000)) : undefined;
      storeTokens(origTokens.access, origTokens.refresh, secondsRemaining);
      clearOriginalTokens();
      toast.success("Returned to your primary account");
      onClose?.();
      setTimeout(() => window.location.reload(), 500);
      return;
    }

    setIsSwitching(true);
    setConfirmDialogOpen(false);

    const hadOriginalTokens = hasOriginalTokens();
    if (!isImpersonating && !hadOriginalTokens) {
      storeOriginalTokens(currentUser.id);
    }

    try {
      const freshUser = await apiFetch<Record<string, unknown>>(`/accounts/users/${selectedUser.id}/`);
      const freshUserId = typeof freshUser.id === "string" ? freshUser.id : selectedUser.id;
      const freshIsActive = Boolean(
        typeof freshUser.is_active === "boolean" ? freshUser.is_active : freshUser.isActive,
      );

      if (!freshUserId || freshUserId !== selectedUser.id) {
        throw new Error("Selected user is invalid.");
      }
      if (!freshIsActive) {
        throw new Error("Selected user is not active.");
      }

      await impersonateUser(freshUserId);

      const firstName = typeof freshUser.first_name === "string" ? freshUser.first_name.trim() : "";
      const lastName = typeof freshUser.last_name === "string" ? freshUser.last_name.trim() : "";
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || selectedUser.name || selectedUser.username || "User";
      addRecentUser({
        id: freshUserId,
        name: displayName,
        username: typeof freshUser.username === "string" ? freshUser.username : selectedUser.username,
        email: typeof freshUser.email === "string" ? freshUser.email : "",
      });
      setRecentUsers(getRecentUsers());

      toast.success(`Switched to ${displayName}`);

      onClose?.();

      setTimeout(() => window.location.reload(), 500);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to switch user";
      toast.error(message);

      if (hadOriginalTokens) {
        const originalTokens = getOriginalTokens();
        if (originalTokens?.access && originalTokens.refresh) {
          try {
            const secondsRemaining = originalTokens.expiresAt
              ? Math.max(0, Math.floor((originalTokens.expiresAt - Date.now()) / 1000))
              : undefined;
            storeTokens(originalTokens.access, originalTokens.refresh, secondsRemaining);
          } catch (restoreError) {
            logError("Failed to restore original tokens", restoreError);
          }
        }
      }

      if (mountedRef.current) {
        setIsSwitching(false);
      }
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

    if (originalTokens.expiresAt) {
      const timeRemaining = originalTokens.expiresAt - Date.now();
      if (timeRemaining <= 0) {
        toast.error("Your original session has expired. Please log in again.");
        clearOriginalTokens();
        onClose?.();
        return;
      }
      if (timeRemaining < 60 * 1000) {
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

      setTimeout(() => window.location.reload(), 500);
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

  const isSearching = debouncedSearchQuery.trim() !== "";
  const hasResults = filteredUsers.length > 0 || recentUserObjects.length > 0 || favoriteUserObjects.length > 0;


  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  return (
    <ClientErrorBoundary>
      <div className="space-y-4 relative" onKeyDown={handleKeyDown} tabIndex={-1}>
        {isSwitching && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg" role="status" aria-label="Switching user">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Switching...</span>
            </div>
          </div>
        )}

        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchingBackend={isSearchingBackend}
          searchHistory={searchHistory}
          showSearchSuggestions={showSearchSuggestions}
          onShowSuggestionsChange={setShowSearchSuggestions}
          onClearSearch={() => {
            setSearchQuery("");
            setShowSearchSuggestions(false);
          }}
          disabled={isSwitching}
        />

        {isSearching && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Found {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
            </span>
          </div>
        )}

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

        <div className="max-h-[60vh] overflow-y-auto pr-4" ref={userListRef} role="main" aria-label="User list">
          <div className="space-y-6">
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
                      <UserButton
                        user={user}
                        onClick={handleImpersonateClick}
                        disabled={isSwitching}
                        showFavorite={false}
                      />
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
              </div>
            )}

            {!isSearching && favoriteUserObjects.length > 0 && (
              <div role="group" aria-labelledby="favorite-users">
                <h3 id="favorite-users" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  Favorites
                </h3>
                <div className="space-y-1" role="list">
                  {favoriteUserObjects.map((user) => (
                    <div key={user.id} role="listitem">
                      <UserButton
                        user={user}
                        searchQuery={debouncedSearchQuery}
                        isFavorite={favorites.has(user.id)}
                        showFavorite
                        onToggleFavorite={toggleFavorite}
                        onClick={handleImpersonateClick}
                        disabled={isSwitching}
                        divisionName={user.division ? divisionMap.get(user.division)?.name : undefined}
                        departmentName={user.department ? departmentMap.get(user.department)?.name : undefined}
                        directorateName={getDirectorateNameForUser(user)}
                      />
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
              </div>
            )}

            {orderedGroups.map((group) => (
              <div key={group.key}>
                <UserGroup
                  title={group.title}
                  groupKey={group.key}
                  users={group.users}
                  collapsedGroups={collapsedGroups}
                  expandedGroups={expandedGroups}
                  onToggleCollapse={toggleGroupCollapse}
                  onToggleExpand={toggleGroupExpand}
                  searchQuery={debouncedSearchQuery}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  isSwitching={isSwitching}
                  onImpersonateClick={handleImpersonateClick}
                  divisionMap={divisionMap}
                  departmentMap={departmentMap}
                  getDirectorateNameForUser={getDirectorateNameForUser}
                />
              </div>
            ))}

            {!hasResults && !isSearchingBackend && (
              <div className="text-center py-12 text-muted-foreground" role="status">
                {isSearching ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                    <p className="text-sm font-medium mb-1">No users found</p>
                    <p className="text-xs">Try a different search term or clear the search to see all users</p>
                  </>
                ) : orgUsers.length === 0 ? (
                  <>
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                    <p className="text-sm font-medium mb-1">Type to search users</p>
                    <p className="text-xs">User results load from the server as you search</p>
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
              pageSizeOptions={[...LIST_PAGE_SIZE_OPTIONS, MAX_CATALOG_PAGE_SIZE]}
              compact={false}
            />
          </div>
        )}
      </div>

      <ConfirmSwitchDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        user={selectedUser}
        onConfirm={handleImpersonateConfirm}
        isSwitching={isSwitching}
      />
    </ClientErrorBoundary>
  );
};

export const SimplifiedRoleSwitcher = memo(SimplifiedRoleSwitcherComponent);
