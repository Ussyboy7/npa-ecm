"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, Shield, User as UserIcon } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SimplifiedRoleSwitcherProps {
  onClose?: () => void;
}

export const SimplifiedRoleSwitcher = ({ onClose }: SimplifiedRoleSwitcherProps) => {
  const { directorates, divisions, departments, users, refreshOrganizationData } = useOrganization();
  const { currentUser, hydrated, refresh: refreshCurrentUser, isImpersonating } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  const filteredUsers = useMemo(() => {
    let pool = activeUsers;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
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
  }, [activeUsers, searchQuery, directorateMap, divisionMap, departmentMap, getDirectorateNameForUser]);

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

  const executiveUsers = filteredUsers.filter((user) =>
    ["MDCS", "EDCS"].includes(user.gradeLevel)
  );
  const gmUsers = filteredUsers.filter((user) => user.gradeLevel === "MSS1");
  const managerUsers = filteredUsers.filter((user) =>
    ["MSS2", "MSS3", "MSS4", "MSS5"].includes(user.gradeLevel)
  );
  const officerUsers = filteredUsers.filter(
    (user) =>
      ["SSS1", "SSS2", "SSS3", "SSS4", "JSS1", "JSS2", "JSS3"].includes(user.gradeLevel) &&
      !["Secretary", "Assistant", "Super Admin"].includes(user.systemRole)
  );
  const secretaryUsers = filteredUsers.filter((user) => user.systemRole === "Secretary");
  const assistantUsers = filteredUsers.filter((user) => user.systemRole === "Assistant");
  const superAdmins = filteredUsers.filter((user) => user.systemRole === "Super Admin");

  const handleImpersonate = async (user: User) => {
    if (!impersonationEnabled || currentUser.systemRole !== "Super Admin") {
      toast.error("Impersonation is only available to Super Admins");
      return;
    }

    if (!isImpersonating) {
      storeOriginalTokens();
    }

    const identifier = user.username ?? user.id;

    try {
      await impersonateUser(identifier);
      toast.success(`You are now impersonating ${user.name || user.username}`);
      await refreshCurrentUser();
      await refreshOrganizationData();
      onClose?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to impersonate user";
      toast.error(message);
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
      await refreshCurrentUser();
      await refreshOrganizationData();
      onClose?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore your session";
      toast.error(message);
    }
  };

  const renderUserGroup = (title: string, userList: User[]) => {
    if (userList.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </h3>
        <div className="space-y-2">
          {userList.map((user) => {
            const divisionName = user.division ? divisionMap.get(user.division)?.name : undefined;
            const departmentName = user.department ? departmentMap.get(user.department)?.name : undefined;
            const directorateName = getDirectorateNameForUser(user);

            return (
              <Button
                key={user.id}
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4"
                onClick={() => handleImpersonate(user)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
                    {user.name
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{user.name || user.username}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.systemRole || user.gradeLevel}
                      {departmentName ? ` • ${departmentName}` : divisionName ? ` • ${divisionName}` : directorateName ? ` • ${directorateName}` : ''}
                    </div>
                    {user.email && (
                      <div className="text-xs text-muted-foreground/70 truncate mt-0.5">
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, email, role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Reset to Primary Account */}
      {isImpersonating && (
        <>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Return to Primary Account
          </Button>
          <Separator />
        </>
      )}

      {/* User List */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
          {renderUserGroup("Executive Leadership", executiveUsers)}
          {renderUserGroup("General Managers", gmUsers)}
          {renderUserGroup("AGMs & Managers", managerUsers)}
          {renderUserGroup("Officers & Staff", officerUsers)}
          {renderUserGroup("Special Roles", [...secretaryUsers, ...assistantUsers, ...superAdmins])}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No users found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

