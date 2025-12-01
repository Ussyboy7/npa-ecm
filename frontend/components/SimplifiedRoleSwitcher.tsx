"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search, Shield, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { User } from "@/lib/npa-structure";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  hasTokens,
  impersonateUser,
  storeOriginalTokens,
  clearOriginalTokens,
  getOriginalTokens,
  storeTokens,
} from "@/lib/api-client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface SimplifiedRoleSwitcherProps {
  onClose?: () => void;
}

const SimplifiedRoleSwitcherComponent = ({ onClose }: SimplifiedRoleSwitcherProps) => {
  const { directorates, divisions, departments, users, refreshOrganizationData } = useOrganization();
  const { currentUser, hydrated, refresh: refreshCurrentUser, isImpersonating } = useCurrentUser();
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [, startTransition] = useTransition();
  const [isSwitching, setIsSwitching] = useState(false);
  const mountedRef = useRef(true);

  // Defer heavy computations to prevent blocking
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredUsers = useDeferredValue(users);

  // Track if component is mounted to prevent state updates after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const activeUsers = useMemo(() => deferredUsers.filter((user) => user.active), [deferredUsers]);
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

  const filteredUsers = useMemo(() => {
    let pool = activeUsers;

    // Apply search filter using deferred value
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase().trim();
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

    return pool;
  }, [activeUsers, deferredSearchQuery, directorateMap, divisionMap, departmentMap, getDirectorateNameForUser]);

  // Group users in a single pass for better performance
  // NOTE: This must be before any early returns to comply with Rules of Hooks
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

    for (const user of filteredUsers) {
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
  }, [filteredUsers]);

  // Early returns AFTER all hooks
  if (!hydrated || !currentUser) {
    return null;
  }

  const impersonationEnabled = hasTokens() && (currentUser.systemRole === "Super Admin" || isImpersonating);

  if (!impersonationEnabled) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">Role switching is only available to Super Admins</p>
      </div>
    );
  }

  const handleImpersonate = async (user: User) => {
    if (isSwitching) return; // Prevent double-clicks
    
    if (!impersonationEnabled || currentUser.systemRole !== "Super Admin") {
      toast.error("Impersonation is only available to Super Admins");
      return;
    }

    setIsSwitching(true);
    
    if (!isImpersonating) {
      storeOriginalTokens();
    }

    const identifier = user.username ?? user.id;

    try {
      await impersonateUser(identifier);
      toast.success(`Switched to ${user.name || user.username}`);
      
      // Close modal first for better UX
      onClose?.();
      
      // Then refresh data in the background
      startTransition(() => {
        void refreshCurrentUser();
        void refreshOrganizationData();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to switch user";
      toast.error(message);
      if (mountedRef.current) {
        setIsSwitching(false);
      }
    }
  };

  const handleReset = async () => {
    const originalTokens = getOriginalTokens();

    if (!originalTokens?.access || !originalTokens.refresh) {
      toast.info("You are already using your primary account");
      return;
    }

    try {
      const secondsRemaining = originalTokens.expiresAt
        ? Math.max(0, Math.floor((originalTokens.expiresAt - Date.now()) / 1000))
        : undefined;
      storeTokens(originalTokens.access, originalTokens.refresh, secondsRemaining);
      clearOriginalTokens();
      toast.success("Returned to your primary account");
      
      // Close modal first for better UX
      onClose?.();
      
      // Then refresh data in the background
      startTransition(() => {
        void refreshCurrentUser();
        void refreshOrganizationData();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore your session";
      toast.error(message);
    }
  };

  const renderUserGroup = (title: string, userList: User[]) => {
    if (userList.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
          {title}
          <Badge variant="secondary" className="text-[10px]">{userList.length}</Badge>
        </h3>
        <div className="space-y-1">
          {userList.slice(0, 10).map((user) => {
            const divisionName = user.division ? divisionMap.get(user.division)?.name : undefined;
            const departmentName = user.department ? departmentMap.get(user.department)?.name : undefined;
            const directorateName = getDirectorateNameForUser(user);

            return (
              <Button
                key={user.id}
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-3 overflow-hidden"
                onClick={() => handleImpersonate(user)}
                disabled={isSwitching}
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
                    <div className="text-sm font-medium">{user.name || user.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.systemRole || user.gradeLevel}
                      {departmentName ? ` • ${departmentName}` : divisionName ? ` • ${divisionName}` : directorateName ? ` • ${directorateName}` : ''}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
          {userList.length > 10 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              +{userList.length - 10} more (use search to find)
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 relative">
      {/* Loading Overlay */}
      {isSwitching && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Switching...</span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, email, role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
          disabled={isSwitching}
        />
      </div>

      {/* Reset to Primary Account */}
      {isImpersonating && (
        <>
          <Button
            variant="outline"
            className="w-full h-9"
            onClick={handleReset}
            disabled={isSwitching}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Return to Primary Account
          </Button>
          <Separator />
        </>
      )}

      {/* User List */}
      <div className="h-[500px] overflow-y-auto pr-4">
        <div className="space-y-6">
          {renderUserGroup("Executive Leadership", groupedUsers.executive)}
          {renderUserGroup("General Managers", groupedUsers.gm)}
          {renderUserGroup("AGMs & Managers", groupedUsers.manager)}
          {renderUserGroup("Officers & Staff", groupedUsers.officer)}
          {renderUserGroup("Assistants & Secretaries", groupedUsers.assistant)}
          {renderUserGroup("System Admins", groupedUsers.admin)}
          {renderUserGroup("Other Users", groupedUsers.other)}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const SimplifiedRoleSwitcher = memo(SimplifiedRoleSwitcherComponent);
