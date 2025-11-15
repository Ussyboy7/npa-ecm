"use client";

import { useMemo } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Users,
  Building2,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Archive,
  BarChart3,
  FolderKanban,
  Network,
  UserCog,
  FilePenLine,
  Activity,
  HelpCircle,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { Badge } from "@/components/ui/badge";
import { useCorrespondence } from "@/contexts/CorrespondenceContext";
import { useOrganization } from "@/contexts/OrganizationContext";

const EXECUTIVE_GRADES = new Set([
  "MD",
  "ED",
  "GM",
  "AGM",
  "MDCS",
  "EDCS",
  "GMCS",
  "AGMCS",
]);

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { currentUser, hydrated } = useCurrentUser();
  const { correspondence } = useCorrespondence();
  const { officeMemberships } = useOrganization();

  const permissions = useUserPermissions(currentUser ?? undefined);

  const isExecutiveUser = useMemo(() => {
    const grade = (currentUser?.gradeLevel ?? '').toUpperCase();
    const roleName = (currentUser?.systemRole ?? '').toLowerCase();
    return (
      permissions.canAccessExecutiveDashboard ||
      EXECUTIVE_GRADES.has(grade) ||
      roleName.includes('executive')
    );
  }, [currentUser?.gradeLevel, currentUser?.systemRole, permissions.canAccessExecutiveDashboard]);

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);
  }, [currentUser?.id, officeMemberships]);

  const officeInboxCount = useMemo(() => {
    if (!correspondence.length) return 0;
    const inboxItems = userOfficeIds.length
      ? correspondence.filter(
          (item) =>
            item.currentOfficeId && userOfficeIds.includes(item.currentOfficeId) && item.status !== 'completed',
        )
      : currentUser?.isSuperuser
        ? correspondence.filter((item) => item.status !== 'completed')
        : [];
    return inboxItems.length;
  }, [correspondence, currentUser?.isSuperuser, userOfficeIds]);

  const myInboxCount = useMemo(() => {
    if (!currentUser) return 0;
    return correspondence.filter((item) => item.currentApproverId === currentUser.id).length;
  }, [correspondence, currentUser?.id]);

  const departmentFilesCount = useMemo(() => {
    if (!currentUser) return 0;
    const userDivisionId = currentUser.division;
    const userDepartmentId = currentUser.department;
    return correspondence.filter((item) => {
      const isRecord = item.status === 'completed' || item.status === 'archived';
      if (!isRecord) return false;
      if (item.departmentId && userDepartmentId && item.departmentId === userDepartmentId) return true;
      if (item.divisionId && userDivisionId && item.divisionId === userDivisionId) return true;
      if (item.owningOfficeId && userOfficeIds.includes(item.owningOfficeId)) return true;
      return false;
    }).length;
  }, [correspondence, currentUser?.department, currentUser?.division, userOfficeIds]);

  const outboxCount = useMemo(() => {
    if (!currentUser) return 0;
    const pendingStatuses = new Set(['pending', 'in-progress']);
    return correspondence.filter(
      (item) => item.createdById === currentUser.id && pendingStatuses.has(item.status),
    ).length;
  }, [correspondence, currentUser?.id]);

  const hasCorrespondenceAccess =
    permissions.canViewCorrespondenceRegistry ||
    permissions.canDistribute ||
    userOfficeIds.length > 0;

  const shouldShowDepartmentFiles =
    hasCorrespondenceAccess &&
    (departmentFilesCount > 0 ||
      userOfficeIds.length > 0 ||
      Boolean(currentUser?.division || currentUser?.department));

  const shouldShowOutbox = permissions.canRegisterCorrespondence || outboxCount > 0;
  const departmentLinkLabel = isExecutiveUser ? 'Records & Intelligence' : 'Department Files';
  const showDepartmentLinkInExecGroup = isExecutiveUser && shouldShowDepartmentFiles;

  const isActive = (path: string) => pathname === path;
  const isCollapsed = state === "collapsed";

  const showSkeleton = !hydrated && !currentUser;

  if (showSkeleton || (!hydrated && !currentUser)) {
    return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader>
          <div className="flex items-center justify-between w-full">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          </div>
        </SidebarHeader>
      </Sidebar>
    );
  }

   return (
     <Sidebar collapsible="icon" className="border-r border-sidebar-border">
       <SidebarHeader>
         <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg shadow-sm ring-1 ring-primary/30 bg-white">
              <Image
                src={NPA_LOGO_URL}
                alt={`${NPA_BRAND_NAME} crest`}
                fill
                className="object-contain"
                sizes="32px"
                priority
              />
            </div>
             {!isCollapsed && (
              <span className="text-base font-semibold tracking-tight text-foreground">
                {NPA_BRAND_NAME.split(' ')[0]} ECM
              </span>
             )}
           </Link>
           <Button
             variant="ghost"
             size="icon"
             onClick={toggleSidebar}
             className="h-7 w-7 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
           >
             {isCollapsed ? (
               <ChevronRight className="h-4 w-4" />
             ) : (
               <ChevronLeft className="h-4 w-4" />
             )}
             <span className="sr-only">Toggle Sidebar</span>
           </Button>
         </div>
       </SidebarHeader>
      <SidebarContent>
        {/* Standard workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>My Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard')}>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    {!isCollapsed && <span>Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Executive oversight */}
        {showDepartmentLinkInExecGroup || permissions.canAccessExecutiveDashboard ? (
          <SidebarGroup>
            <SidebarGroupLabel>Executive Oversight</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {permissions.canAccessExecutiveDashboard && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/analytics/executive')}>
                      <Link href="/analytics/executive">
                        <Activity className="h-4 w-4" />
                        {!isCollapsed && <span>Executive Dashboard</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {showDepartmentLinkInExecGroup && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/correspondence/department-files')}
                    >
                      <Link href="/correspondence/department-files" className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {!isCollapsed && <span>{departmentLinkLabel}</span>}
                        </div>
                        {!isCollapsed && (
                          <Badge
                            variant={departmentFilesCount > 0 ? 'secondary' : 'secondary'}
                            className={departmentFilesCount > 0 ? 'ml-auto' : 'ml-auto opacity-70'}
                          >
                            {departmentFilesCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {/* Correspondence */}
        <SidebarGroup>
          <SidebarGroupLabel>Offices & Registry</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasCorrespondenceAccess && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/correspondence/inbox')}>
                    <Link href="/correspondence/inbox" className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {!isCollapsed && <span>Office Inbox</span>}
                      </div>
                      {!isCollapsed && (
                        <Badge
                          variant={officeInboxCount > 0 ? 'destructive' : 'secondary'}
                          className="ml-auto"
                        >
                          {officeInboxCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/inbox')}>
                  <Link href="/inbox" className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Inbox className="h-4 w-4" />
                      {!isCollapsed && <span>My Inbox</span>}
                    </div>
                    {!isCollapsed && (
                      <Badge
                        variant={myInboxCount > 0 ? 'secondary' : 'secondary'}
                        className={myInboxCount > 0 ? 'ml-auto' : 'ml-auto opacity-70'}
                      >
                        {myInboxCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {permissions.canRegisterCorrespondence && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/correspondence/register')}>
                    <Link href="/correspondence/register">
                      <Send className="h-4 w-4" />
                      {!isCollapsed && <span>Register New</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isExecutiveUser && shouldShowDepartmentFiles && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/correspondence/department-files')}
                  >
                    <Link
                      href="/correspondence/department-files"
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {!isCollapsed && <span>{departmentLinkLabel}</span>}
                      </div>
                      {!isCollapsed && (
                        <Badge
                          variant={departmentFilesCount > 0 ? 'secondary' : 'secondary'}
                          className={departmentFilesCount > 0 ? 'ml-auto' : 'ml-auto opacity-70'}
                        >
                          {departmentFilesCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasCorrespondenceAccess && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/correspondence/archived')}>
                    <Link href="/correspondence/archived" className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      {!isCollapsed && <span>Archive</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {shouldShowOutbox && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/correspondence/outbox')}>
                    <Link href="/correspondence/outbox" className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        {!isCollapsed && <span>Outbox</span>}
                      </div>
                      {!isCollapsed && outboxCount > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {outboxCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Documents & Records */}
        <SidebarGroup>
          <SidebarGroupLabel>Documents & Records</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/documents')}>
                  <Link href="/documents">
                    <FileText className="h-4 w-4" />
                    {!isCollapsed && <span>My Documents</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {permissions.canAccessDocumentManagement && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dms')}>
                    <Link href="/dms">
                      <FolderKanban className="h-4 w-4" />
                      {!isCollapsed && <span>Document Management</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analytics & Reports */}
        {permissions.canAccessAnalytics && (
          <SidebarGroup>
            <Collapsible defaultOpen>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="group/collapsible">
                  Analytics & Reports
                  {!isCollapsed && (
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {permissions.canAccessAnalytics && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/analytics")}>
                          <Link href="/analytics">
                            <BarChart3 className="h-4 w-4" />
                            {!isCollapsed && <span>Performance Analytics</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {!isExecutiveUser && permissions.canAccessExecutiveDashboard && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/analytics/executive")}>
                          <Link href="/analytics/executive">
                            <Activity className="h-4 w-4" />
                            {!isCollapsed && <span>Executive Dashboard</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {permissions.canAccessReports && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/reports")}>
                          <Link href="/reports">
                            <FileText className="h-4 w-4" />
                            {!isCollapsed && <span>Reports</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Administration */}
        {permissions.canAccessAdministration && (
          <SidebarGroup>
            <Collapsible defaultOpen={false}>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="group/collapsible">
                  Administration
                  {!isCollapsed && (
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/directorates')}>
                        <Link href="/admin/directorates">
                          <Network className="h-4 w-4" />
                          {!isCollapsed && <span>Directorates</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/divisions')}>
                        <Link href="/admin/divisions">
                          <Building2 className="h-4 w-4" />
                          {!isCollapsed && <span>Divisions</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/departments')}>
                        <Link href="/admin/departments">
                          <Building2 className="h-4 w-4" />
                          {!isCollapsed && <span>Departments</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/users')}>
                        <Link href="/admin/users">
                          <UserCog className="h-4 w-4" />
                          {!isCollapsed && <span>User Management</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/roles')}>
                        <Link href="/admin/roles">
                          <Shield className="h-4 w-4" />
                          {!isCollapsed && <span>Roles</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/templates')}>
                        <Link href="/admin/templates">
                          <FilePenLine className="h-4 w-4" />
                          {!isCollapsed && <span>Templates</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/assistants')}>
                        <Link href="/admin/assistants">
                          <Users className="h-4 w-4" />
                          {!isCollapsed && <span>Assistants</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/settings')}>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    {!isCollapsed && <span>Settings</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/help')}>
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4" />
                    {!isCollapsed && <span>Help & Guides</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
