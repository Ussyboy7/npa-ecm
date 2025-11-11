"use client";

import { useCallback, useMemo, useState } from "react";
import {
  User as UserIcon,
  ChevronDown,
  Building2,
  Users,
  Filter,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type FilterMode = "all" | "directorate" | "division" | "department";

export const RoleSwitcher = () => {
  const { directorates, divisions, departments, users, refreshOrganizationData } = useOrganization();
  const { currentUser, hydrated, refresh: refreshCurrentUser, isImpersonating } = useCurrentUser();

  const [filterType, setFilterType] = useState<FilterMode>("all");
  const [selectedDirectorate, setSelectedDirectorate] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

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
  const executiveDirectorNameMap = useMemo(() => {
    const entries = new Map<string, string>();
    directorates.forEach((dir) => {
      if (dir.executiveDirectorId) {
        entries.set(dir.executiveDirectorId, dir.name);
      }
    });
    return entries;
  }, [directorates]);

  const getDirectorateNameForUser = useCallback(
    (user: User): string | undefined => {
      const roleLabel = (user.systemRole ?? '').trim();
      if (roleLabel.length > 0 && /director/i.test(roleLabel)) {
        return roleLabel;
      }

      const byExecutiveAssignment = executiveDirectorNameMap.get(user.id ?? "");
      if (byExecutiveAssignment) {
        return byExecutiveAssignment;
      }

      const explicitDirectorate = user.directorate ? directorateMap.get(user.directorate) : undefined;
      if (explicitDirectorate) return explicitDirectorate.name;

      const directorateByExec = Array.from(directorateMap.values()).find((dir) => {
        return (
          dir.executiveDirectorId === user.id ||
          dir.executiveDirectorId === user.username ||
          dir.executiveDirectorId === user.employeeId
        );
      });
      if (directorateByExec) return directorateByExec.name;

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
    [departmentMap, directorateMap, divisionMap, executiveDirectorNameMap]
  );

  const matchesDirectorate = (user: User, directorateId: string) => {
    const directorate = directorateMap.get(directorateId);
    if (!directorate) return false;

    if (directorate.executiveDirectorId && directorate.executiveDirectorId === user.id) {
      return true;
    }

    if (user.division) {
      const division = divisionMap.get(user.division);
      if (division?.directorateId === directorateId) {
        return true;
      }
    }

    if (!user.division && user.gradeLevel === "MDCS" && directorateId === "dir-md") {
      return true;
    }

    return false;
  };

  const matchesDivision = (user: User, divisionId: string) => {
    if (user.division && user.division === divisionId) return true;
    if (!user.department) return false;
    const department = departmentMap.get(user.department);
    return department?.divisionId === divisionId;
  };

  const matchesDepartment = (user: User, departmentId: string) => user.department === departmentId;

  const filteredUsers = useMemo(() => {
    let pool = activeUsers;

    if (filterType === "directorate" && selectedDirectorate) {
      pool = pool.filter((user) => matchesDirectorate(user, selectedDirectorate));
    } else if (filterType === "division" && selectedDivision) {
      pool = pool.filter((user) => matchesDivision(user, selectedDivision));
    } else if (filterType === "department" && selectedDepartment) {
      pool = pool.filter((user) => matchesDepartment(user, selectedDepartment));
    }

    return pool;
  }, [
    activeUsers,
    filterType,
    selectedDirectorate,
    selectedDivision,
    selectedDepartment,
    directorateMap,
    divisionMap,
    departmentMap,
  ]);

  const resetFilters = () => {
    setFilterType("all");
    setSelectedDirectorate(null);
    setSelectedDivision(null);
    setSelectedDepartment(null);
  };

  if (!hydrated || !currentUser) {
    return null;
  }

  const impersonationEnabled = hasTokens() && (currentUser.systemRole === "Super Admin" || isImpersonating);

  const currentDivision = currentUser.division ? divisionMap.get(currentUser.division) : undefined;
  const currentDepartment = currentUser.department
    ? departmentMap.get(currentUser.department)
    : undefined;
  const currentDirectorateName = getDirectorateNameForUser(currentUser);

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

  const noUsersMatch = filteredUsers.length === 0;

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore your session";
      toast.error(message);
    }
  };

  if (!impersonationEnabled) {
    return (
      <Button variant="outline" className="gap-2" disabled>
        <UserIcon className="h-4 w-4" />
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm font-medium">{currentUser.name}</span>
          <Badge variant="secondary" className="text-xs">
            {currentUser.systemRole}
            {currentDepartment
              ? ` • ${currentDepartment.name}`
              : currentDivision
              ? ` • ${currentDivision.name}`
              : currentDirectorateName
              ? ` • ${currentDirectorateName}`
              : ""}
          </Badge>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserIcon className="h-4 w-4" />
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium">{currentUser.name}</span>
            <Badge variant="secondary" className="text-xs">
              {currentUser.systemRole}
              {currentDepartment
                ? ` • ${currentDepartment.name}`
                : currentDivision
                ? ` • ${currentDivision.name}`
                : currentDirectorateName
                ? ` • ${currentDirectorateName}`
                : ""}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-y-auto">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
          <Filter className="h-3 w-3" />
          Filter By
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={resetFilters}
          className={filterType === "all" ? "font-semibold" : ""}
        >
          All Users
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Building2 className="h-3 w-3 mr-2" />
            <span className={filterType === "directorate" ? "font-semibold" : ""}>Directorate</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[280px] overflow-y-auto">
            {directorates.map((dir) => (
              <DropdownMenuItem
                key={dir.id}
                onClick={() => {
                  setFilterType("directorate");
                  setSelectedDirectorate(dir.id);
                  setSelectedDivision(null);
                  setSelectedDepartment(null);
                }}
                className={selectedDirectorate === dir.id ? "bg-accent" : ""}
              >
                {dir.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Building2 className="h-3 w-3 mr-2" />
            <span className={filterType === "division" ? "font-semibold" : ""}>Division</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[280px] overflow-y-auto">
            {divisions.map((div) => (
              <DropdownMenuItem
                key={div.id}
                onClick={() => {
                  setFilterType("division");
                  setSelectedDivision(div.id);
                  setSelectedDirectorate(null);
                  setSelectedDepartment(null);
                }}
                className={selectedDivision === div.id ? "bg-accent" : ""}
              >
                {div.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Users className="h-3 w-3 mr-2" />
            <span className={filterType === "department" ? "font-semibold" : ""}>Department</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[280px] overflow-y-auto">
            {departments.map((dept) => (
              <DropdownMenuItem
                key={dept.id}
                onClick={() => {
                  setFilterType("department");
                  setSelectedDepartment(dept.id);
                  setSelectedDirectorate(null);
                  setSelectedDivision(null);
                }}
                className={selectedDepartment === dept.id ? "bg-accent" : ""}
              >
                {dept.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {(filterType !== "all" || selectedDirectorate || selectedDivision || selectedDepartment) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {filterType === "directorate" && selectedDirectorate && (
                <span>
                  Filtered by: {directorateMap.get(selectedDirectorate)?.name ?? selectedDirectorate}
                </span>
              )}
              {filterType === "division" && selectedDivision && (
                <span>Filtered by: {divisionMap.get(selectedDivision)?.name ?? selectedDivision}</span>
              )}
              {filterType === "department" && selectedDepartment && (
                <span>
                  Filtered by: {departmentMap.get(selectedDepartment)?.name ?? selectedDepartment}
                </span>
              )}
            </DropdownMenuLabel>
          </>
        )}

        <DropdownMenuSeparator />

        {noUsersMatch && (
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            No users match the selected filter.
          </DropdownMenuLabel>
        )}

        {!noUsersMatch && (
          <>
            {executiveUsers.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Executive Leadership
                </DropdownMenuLabel>
                {executiveUsers.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    directorateName={getDirectorateNameForUser(user)}
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    onSelect={handleImpersonate}
                    subtitle={user.systemRole}
                    tertiary={user.email}
                  />
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {gmUsers.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  General Managers
                </DropdownMenuLabel>
                {gmUsers.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    directorateName={getDirectorateNameForUser(user)}
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    onSelect={handleImpersonate}
                    subtitle={user.systemRole}
                  />
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {managerUsers.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  AGMs & Managers
                </DropdownMenuLabel>
                {managerUsers.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    directorateName={getDirectorateNameForUser(user)}
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    departmentName={departmentMap.get(user.department ?? "")?.name}
                    onSelect={handleImpersonate}
                    subtitle={user.systemRole}
                  />
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {officerUsers.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Officers & Staff
                </DropdownMenuLabel>
                {officerUsers.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    directorateName={getDirectorateNameForUser(user)}
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    departmentName={departmentMap.get(user.department ?? "")?.name}
                    onSelect={handleImpersonate}
                    subtitle={user.systemRole}
                  />
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {(secretaryUsers.length > 0 ||
              assistantUsers.length > 0 ||
              superAdmins.length > 0) && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Special Roles
                </DropdownMenuLabel>
                {secretaryUsers.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    directorateName={getDirectorateNameForUser(user)}
                    divisionName={divisionMap.get(user.division ?? "")?.name ?? "MD Office"}
                    icon={<Shield className="h-3 w-3" />}
                    onSelect={handleImpersonate}
                    subtitle="Secretary"
                    tertiary={user.email}
                  />
                ))}
                {assistantUsers.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    directorateName={getDirectorateNameForUser(user)}
                    divisionName={divisionMap.get(user.division ?? "")?.name ?? "MD Office"}
                    onSelect={handleImpersonate}
                    subtitle="Assistant"
                  />
                ))}
                {superAdmins.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    directorateName={getDirectorateNameForUser(user)}
                    onSelect={handleImpersonate}
                    subtitle="Super Admin"
                    tertiary={user.email}
                  />
                ))}
                <DropdownMenuSeparator />
              </>
            )}
          </>
        )}

        <DropdownMenuItem onClick={handleReset} className="text-destructive">
          Reset to Primary Account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface RoleOptionProps {
  user: User;
  directorateName?: string;
  divisionName?: string;
  departmentName?: string;
  subtitle?: string;
  tertiary?: string;
  icon?: React.ReactNode;
  onSelect?: (user: User) => void;
}

const RoleOption = ({
  user,
  directorateName,
  divisionName,
  departmentName,
  subtitle,
  tertiary,
  icon,
  onSelect,
}: RoleOptionProps) => {
  const isExecutive = user.gradeLevel === "EDCS" || user.gradeLevel === "MDCS" || user.systemRole?.includes("Executive Director") || user.systemRole?.includes("Managing Director");
  const locationLabel = isExecutive
    ? directorateName ?? divisionName ?? departmentName
    : departmentName ?? divisionName ?? directorateName;
  const detailLine = subtitle ?? user.systemRole;

  return (
    <DropdownMenuItem
      onClick={() => {
        if (onSelect) {
          onSelect(user);
        }
      }}
    >
      <div className="flex flex-col">
        <span className="font-medium flex items-center gap-2">
          {icon}
          {user.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {detailLine}
          {locationLabel ? ` • ${locationLabel}` : ""}
        </span>
        {tertiary && (
          <span className="text-[11px] text-muted-foreground/80">{tertiary}</span>
        )}
      </div>
    </DropdownMenuItem>
  );
};
