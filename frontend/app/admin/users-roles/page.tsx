"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PageSuspenseFallback } from "@/components/shared/PageSuspenseFallback";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
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
  UserCog,
  Search,
  Plus,
  Download,
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
import { PermissionMatrixTab } from "@/components/admin/PermissionMatrixTab";
import {
  AssistantsManagementTab,
  type AssistantsManagementTabHandle,
} from "@/components/admin/AssistantsManagementTab";

type AssistantsTypeFilter = "all" | "TA" | "PA";

function UsersRolesForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { roles, assistantAssignments } = useOrganization();
  const { users } = useOrgUsers();
  const [activeTab, setActiveTab] = useState<string>("users");
  const [rolesSearch, setRolesSearch] = useState("");
  const [assistantsSearch, setAssistantsSearch] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [assistantsTypeFilter, setAssistantsTypeFilter] = useState<AssistantsTypeFilter>("all");
  const [assistantsViewMode, setAssistantsViewMode] = useState<"executives" | "all">("executives");
  const [usersTotalCount, setUsersTotalCount] = useState<number | null>(null);

  const usersRef = useRef<UsersManagementTabHandle>(null);
  const rolesRef = useRef<RolesManagementTabHandle>(null);
  const assistantsRef = useRef<AssistantsManagementTabHandle>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["users", "roles", "matrix", "assistants"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin/users-roles?tab=${value}`, { scroll: false });
  };

  const tabSubtitle = useMemo(() => {
    if (activeTab === "roles") return "Manage system roles, permissions, and assignment coverage across the organization.";
    if (activeTab === "matrix") return "Compare and edit role permissions across the full catalog.";
    if (activeTab === "assistants") return "Manage executive assistant assignments, permissions, and delegation coverage.";
    return "Manage users, role assignments, and organizational access context.";
  }, [activeTab]);

  const statItems = useMemo(() => {
    if (activeTab === "matrix") {
      const granted = roles.reduce((sum, role) => {
        const perms = role.permissions ?? {};
        return sum + Object.values(perms).filter(Boolean).length;
      }, 0);
      return [
        { key: "catalog", label: "Catalog Keys", value: 36 },
        { key: "roles", label: "Roles", value: roles.length },
        { key: "grants", label: "Grants (all roles)", value: granted },
      ];
    }
    if (activeTab === "roles") {
      const inUse = roles.filter((role) => (role.userCount ?? 0) > 0).length;
      return [
        { key: "total", label: "Total Roles", value: roles.length },
        { key: "in-use", label: "Roles In Use", value: inUse },
        { key: "active", label: "Active Roles", value: roles.filter((role) => role.isActive).length },
      ];
    }
    if (activeTab === "assistants") {
      const executivesCovered = new Set(assistantAssignments.map((a) => a.executiveId)).size;
      return [
        { key: "assignments", label: "Total Assignments", value: assistantAssignments.length },
        { key: "executives", label: "Executives Covered", value: executivesCovered },
        { key: "ta", label: "Technical Assistants", value: assistantAssignments.filter((a) => a.type === "TA").length },
      ];
    }
    return [
      { key: "users", label: "Total Users", value: usersTotalCount ?? users.length },
      {
        key: "mgmt",
        label: "Management Level",
        value: users.filter((user) => ["MDCS", "EDCS", "MSS1", "MSS2", "MSS3"].includes(user.gradeLevel)).length,
      },
      {
        key: "divisions",
        label: "Divisions Covered",
        value: new Set(users.map((user) => user.division).filter(Boolean)).size,
      },
    ];
  }, [activeTab, users, roles, assistantAssignments, usersTotalCount]);

  const headerActions = useMemo(() => {
    if (activeTab === "roles") {
      return (
        <>
          <Button size="sm" className="bg-gradient-primary" onClick={() => rolesRef.current?.openCreateRole()}>
            <Plus className="h-4 w-4 mr-2" />
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
    if (activeTab === "assistants") {
      return (
        <>
          <Button size="sm" className="bg-gradient-primary" onClick={() => assistantsRef.current?.openAssignAssistant()}>
            <Plus className="h-4 w-4 mr-2" />
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
        <Button variant="outline" size="sm" onClick={() => usersRef.current?.exportUsers()}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button size="sm" className="bg-gradient-primary" onClick={() => usersRef.current?.openCreateUser()}>
          <Plus className="h-4 w-4 mr-2" />
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
      <AdminPageShell title="Users & Roles" subtitle={tabSubtitle} icon={UserCog} actions={headerActions}>
        <StatStrip items={statItems} />

        {activeTab === "users" ? (
          <div id="users-roles-filter-slot" />
        ) : activeTab === "matrix" ? null : (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-2">
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
                    <SelectTrigger className="h-8 w-[130px] text-xs">
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
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="users" className="text-xs px-2.5 py-1">Users</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs px-2.5 py-1">Roles</TabsTrigger>
            <TabsTrigger value="matrix" className="text-xs px-2.5 py-1">Matrix</TabsTrigger>
            <TabsTrigger value="assistants" className="text-xs px-2.5 py-1">Assistants</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 focus-visible:outline-none">
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
                filterPortalId="users-roles-filter-slot"
                searchQuery={usersSearch}
                onSearchQueryChange={setUsersSearch}
                onTotalCountChange={setUsersTotalCount}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="roles" className="mt-6 focus-visible:outline-none">
            <RolesManagementTab
              ref={rolesRef}
              searchQuery={rolesSearch}
              onSearchQueryChange={setRolesSearch}
              hideInlineSearch
              hideHeaderActions
              hideCardHeader
            />
          </TabsContent>

          <TabsContent value="matrix" className="mt-6 focus-visible:outline-none">
            <PermissionMatrixTab />
          </TabsContent>

          <TabsContent value="assistants" className="mt-6 focus-visible:outline-none">
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
      </AdminPageShell>
    </ClientErrorBoundary>
  );
}

export default function UsersRolesPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Loading..." />}>
      <UsersRolesForm />
    </Suspense>
  );
}
