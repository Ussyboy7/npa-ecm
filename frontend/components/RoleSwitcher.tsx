"use client";

import { useMemo, useState } from "react";
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

type FilterMode = "all" | "directorate" | "division" | "department";

export const RoleSwitcher = () => {
  const { directorates, divisions, departments, users } = useOrganization();
  const { currentUser, selectUser, clearDemoUser, isDemo, hydrated } = useCurrentUser();

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

  const currentDivision = currentUser.division ? divisionMap.get(currentUser.division) : undefined;
  const currentDepartment = currentUser.department
    ? departmentMap.get(currentUser.department)
    : undefined;

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserIcon className="h-4 w-4" />
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium">{currentUser.name}</span>
            <Badge variant="secondary" className="text-xs">
              {isDemo && "Demo: "}
              {currentUser.systemRole}
              {currentDepartment
                ? ` • ${currentDepartment.name}`
                : currentDivision
                ? ` • ${currentDivision.name}`
                : ""}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-y-auto">
        <DropdownMenuLabel>Switch Demo Role</DropdownMenuLabel>
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
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    onSelect={selectUser}
                    subtitle={user.email}
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
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    onSelect={selectUser}
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
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    departmentName={departmentMap.get(user.department ?? "")?.name}
                    onSelect={selectUser}
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
                    divisionName={divisionMap.get(user.division ?? "")?.name}
                    departmentName={departmentMap.get(user.department ?? "")?.name}
                    onSelect={selectUser}
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
                    divisionName={divisionMap.get(user.division ?? "")?.name ?? "MD Office"}
                    icon={<Shield className="h-3 w-3" />}
                    onSelect={selectUser}
                    subtitle="Secretary"
                  />
                ))}
                {assistantUsers.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    divisionName={divisionMap.get(user.division ?? "")?.name ?? "MD Office"}
                    onSelect={selectUser}
                    subtitle="Assistant"
                  />
                ))}
                {superAdmins.map((user) => (
                  <RoleOption
                    key={user.id}
                    user={user}
                    onSelect={selectUser}
                    subtitle="Super Admin • System Administrator"
                  />
                ))}
                <DropdownMenuSeparator />
              </>
            )}
          </>
        )}

        <DropdownMenuItem onClick={() => clearDemoUser()} className="text-destructive">
          Reset to Actual User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface RoleOptionProps {
  user: User;
  divisionName?: string;
  departmentName?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onSelect: (userId: string) => void;
}

const RoleOption = ({
  user,
  divisionName,
  departmentName,
  subtitle,
  icon,
  onSelect,
}: RoleOptionProps) => {
  const locationLabel = departmentName ?? divisionName;

  return (
    <DropdownMenuItem onClick={() => onSelect(user.id)}>
      <div className="flex flex-col">
        <span className="font-medium flex items-center gap-2">
          {icon}
          {user.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {subtitle ?? user.systemRole}
          {locationLabel ? ` • ${locationLabel}` : ""}
        </span>
      </div>
    </DropdownMenuItem>
  );
};
