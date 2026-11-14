"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { StatStrip } from "@/components/shared/StatStrip";
import {
  Loader2,
  Search,
  Plus,
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import {
  UsersManagementTab,
  type UsersManagementTabHandle,
} from "@/components/admin/UsersManagementTab";
import {
  RolesManagementTab,
  type RolesManagementTabHandle,
} from "@/components/admin/RolesManagementTab";
import { PermissionMatrixTab, MATRIX_CATEGORIES } from "@/components/admin/PermissionMatrixTab";
import { usePermissionCatalog } from "@/hooks/use-permission-catalog";
import {
  AssistantsManagementTab,
  MANAGEMENT_GRADES,
  type AssistantsManagementTabHandle,
} from "@/components/admin/AssistantsManagementTab";

type AssistantsTypeFilter = "all" | "TA" | "PA";

type PeopleAccessTabProps = {
  canManageUsers: boolean;
  canManageRoles: boolean;
};

export function PeopleAccessTab({ canManageUsers, canManageRoles }: PeopleAccessTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { roles, assistantAssignments } = useOrganization();
  const { users } = useOrgUsers();
  const { permissions: permissionCatalog } = usePermissionCatalog();
  const allowedTabs = useMemo(() => {
    const tabs: string[] = [];
    if (canManageUsers) tabs.push("users");
    if (canManageRoles) tabs.push("roles", "matrix");
    if (canManageUsers || canManageRoles) tabs.push("assistants");
    return tabs;
  }, [canManageUsers, canManageRoles]);
  const [activeTab, setActiveTab] = useState<string>(() => allowedTabs[0] ?? "users");
  const [rolesSearch, setRolesSearch] = useState("");
  const [assistantsSearch, setAssistantsSearch] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [assistantsTypeFilter, setAssistantsTypeFilter] = useState<AssistantsTypeFilter>("all");
  const [assistantsViewMode, setAssistantsViewMode] = useState<"executives" | "all">("executives");
  const [statsPortalTarget, setStatsPortalTarget] = useState<HTMLElement | null>(null);
  const [actionsPortalTarget, setActionsPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setStatsPortalTarget(document.getElementById("organization-people-stats-slot"));
    setActionsPortalTarget(document.getElementById("organization-people-actions-slot"));
  }, []);

  const usersRef = useRef<UsersManagementTabHandle>(null);
  const rolesRef = useRef<RolesManagementTabHandle>(null);
  const assistantsRef = useRef<AssistantsManagementTabHandle>(null);

  useEffect(() => {
    const requested = searchParams.get("subtab");
    const fallback = allowedTabs[0] ?? "users";
    if (requested && allowedTabs.includes(requested)) {
      setActiveTab(requested);
      return;
    }
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(fallback);
    }
    if (requested && allowedTabs.length > 0 && !allowedTabs.includes(requested)) {
      router.replace(`/admin/organization?tab=people&subtab=${fallback}`, { scroll: false });
    }
  }, [searchParams, allowedTabs, activeTab, router]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin/organization?tab=people&subtab=${value}`, { scroll: false });
  };

  const statItems = useMemo(() => {
    if (activeTab === "matrix") {
      const granted = roles.reduce((sum, role) => {
        const perms = role.permissions ?? {};
        return sum + Object.values(perms).filter(Boolean).length;
      }, 0);
      const catalogKeys = permissionCatalog.filter((permission) =>
        MATRIX_CATEGORIES.includes(permission.category as (typeof MATRIX_CATEGORIES)[number]),
      ).length;
      return [
        { key: "catalog", label: "Permissions", value: catalogKeys || "-" },
        { key: "roles", label: "Roles", value: roles.length },
        { key: "grants", label: "Grants (all roles)", value: granted },
      ];
    }
    if (activeTab === "roles") {
      return [
        { key: "total", label: "Total Roles", value: roles.length },
        {
          key: "assigned",
          label: "Users Assigned",
          value: roles.reduce((sum, role) => sum + (role.userCount ?? 0), 0),
        },
        {
          key: "unused",
          label: "Unused Roles",
          value: roles.filter((role) => (role.userCount ?? 0) === 0).length,
        },
      ];
    }
    if (activeTab === "assistants") {
      const coveredExecutiveIds = new Set(assistantAssignments.map((a) => a.executiveId));
      const executivesInScope = users.filter((user) => MANAGEMENT_GRADES.includes(user.gradeLevel));
      const uncoveredExecutives = executivesInScope.filter((user) => !coveredExecutiveIds.has(user.id)).length;
      return [
        { key: "assignments", label: "Total Assignments", value: assistantAssignments.length },
        { key: "executives", label: "Executives Covered", value: coveredExecutiveIds.size },
        { key: "uncovered", label: "Executives Uncovered", value: uncoveredExecutives },
        { key: "ta", label: "Technical Assistants", value: assistantAssignments.filter((a) => a.type === "TA").length },
      ];
    }
    return [
      { key: "users", label: "Total Users", value: users.length },
      {
        key: "mgmt",
        label: "Management Level",
        value: users.filter((user) => ["MDCS", "EDCS", "MSS1", "MSS2", "MSS3"].includes(user.gradeLevel)).length,
      },
      {
        key: "without-role",
        label: "Without Role",
        value: users.filter((user) => !user.systemRole).length,
      },
    ];
  }, [activeTab, users, roles, assistantAssignments, permissionCatalog]);

  const headerActions = useMemo(() => {
    if (activeTab === "roles") {
      return (
        <>
          <Button size="compact" onClick={() => rolesRef.current?.openCreateRole()}>
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
          <ContextualHelp
            title="How to manage roles"
            description="Define reusable permission sets for groups of users."
            steps={[
              "Create a role with a clear name and purpose.",
              "Select permissions that match the role scope.",
              "Assign roles to users from User Management.",
            ]}
          />
        </>
      );
    }
    if (activeTab === "matrix") {
      return (
        <ContextualHelp
          title="How to read the permission matrix"
          description="Compare action permissions across every role, then toggle a cell to grant or revoke it."
          steps={[
            "Roles are the columns and permissions are the rows.",
            "Click a cell to grant or revoke that permission for the role.",
            "Sidebar keys are edited per role in the role form.",
          ]}
        />
      );
    }
    if (activeTab === "assistants") {
      return (
        <>
          <Button size="compact" onClick={() => assistantsRef.current?.openAssignAssistant()}>
            <Plus className="h-4 w-4" />
            Assign Assistant
          </Button>
          <ContextualHelp
            title="How to manage assistants"
            description="Assign assistants to executives with the right permissions."
            steps={[
              "Create an assignment by selecting executive and assistant.",
              "Set assistant type (TA/PA) and permissions.",
              "Edit or remove assignments as staffing changes.",
            ]}
          />
        </>
      );
    }
    return (
      <>
        <Button size="compact" onClick={() => usersRef.current?.openCreateUser()}>
          <Plus className="h-4 w-4" />
          Create User
        </Button>
        <ContextualHelp
          title="How to manage users"
          description="Manage access by assigning roles and organizational context."
          steps={[
            "Search by name, email, role, or employee ID.",
            "Use filters for role, grade, division, and status.",
            "Edit users or run bulk activate/deactivate actions.",
          ]}
        />
      </>
    );
  }, [activeTab]);

  return (
    <ClientErrorBoundary>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {statsPortalTarget ? createPortal(<StatStrip items={statItems} />, statsPortalTarget) : <StatStrip items={statItems} />}
        {actionsPortalTarget ? createPortal(headerActions, actionsPortalTarget) : null}

        {activeTab === "users" ? (
          <div id="people-access-filter-slot" />
        ) : activeTab === "matrix" ? null : (
          <div className="rounded-xl bg-muted/30 p-2 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={activeTab === "roles" ? "Search roles..." : "Search assistants, executives, or permissions..."}
                  value={activeTab === "roles" ? rolesSearch : assistantsSearch}
                  onChange={(e) => {
                    if (activeTab === "roles") setRolesSearch(e.target.value);
                    else setAssistantsSearch(e.target.value);
                  }}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              {activeTab === "assistants" ? (
                <>
                  <Select value={assistantsTypeFilter} onValueChange={(v) => setAssistantsTypeFilter(v as AssistantsTypeFilter)}>
                    <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by assistant type">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="TA">Technical</SelectItem>
                      <SelectItem value="PA">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
                    <Button
                      type="button"
                      variant={assistantsViewMode === "executives" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setAssistantsViewMode("executives")}
                    >
                      By Executive
                    </Button>
                    <Button
                      type="button"
                      variant={assistantsViewMode === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setAssistantsViewMode("all")}
                    >
                      All Assistants
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-4">
          <TabsList>
            {allowedTabs.includes("users") && (
              <TabsTrigger value="users" className="text-xs px-2.5 py-1">Users</TabsTrigger>
            )}
            {allowedTabs.includes("roles") && (
              <TabsTrigger value="roles" className="text-xs px-2.5 py-1">Roles</TabsTrigger>
            )}
            {allowedTabs.includes("matrix") && (
              <TabsTrigger value="matrix" className="text-xs px-2.5 py-1">Matrix</TabsTrigger>
            )}
            {allowedTabs.includes("assistants") && (
              <TabsTrigger value="assistants" className="text-xs px-2.5 py-1">Assistants</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="users" className="mt-2 focus-visible:outline-none">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            >
              <UsersManagementTab
                ref={usersRef}
                omitStats
                hideFilterActions
                filterPortalId="people-access-filter-slot"
                searchQuery={usersSearch}
                onSearchQueryChange={setUsersSearch}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="roles" className="mt-2 focus-visible:outline-none">
            <RolesManagementTab
              ref={rolesRef}
              searchQuery={rolesSearch}
              onSearchQueryChange={setRolesSearch}
              hideInlineSearch
              hideHeaderActions
              hideCardHeader
            />
          </TabsContent>

          <TabsContent value="matrix" className="mt-2 focus-visible:outline-none">
            <PermissionMatrixTab />
          </TabsContent>

          <TabsContent value="assistants" className="mt-2 focus-visible:outline-none">
            <AssistantsManagementTab
              ref={assistantsRef}
              searchQuery={assistantsSearch}
              onSearchQueryChange={setAssistantsSearch}
              hideInlineSearch
              hideHeaderActions
              assistantsTypeFilter={assistantsTypeFilter}
              onAssistantsTypeFilterChange={setAssistantsTypeFilter}
              viewMode={assistantsViewMode}
              onViewModeChange={setAssistantsViewMode}
              hideViewModeTabs
            />
          </TabsContent>
      </Tabs>
    </ClientErrorBoundary>
  );
}
