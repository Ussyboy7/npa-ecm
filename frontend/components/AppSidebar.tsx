"use client";

import { useMemo } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  CheckSquare,
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
import { useOrganization } from '@/contexts/OrganizationContext';

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { currentUser, hydrated } = useCurrentUser();
  const { users } = useOrganization();

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);
  const effectiveUser = useMemo(() => {
    if (currentUser) return currentUser;
    return activeUsers[0] ?? null;
  }, [currentUser, activeUsers]);
  const permissions = useUserPermissions(effectiveUser ?? undefined);

  const isActive = (path: string) => pathname === path;
  const isCollapsed = state === "collapsed";

  const showSkeleton = !hydrated && !effectiveUser;

  if (showSkeleton) {
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
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
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

        {/* Correspondence */}
        <SidebarGroup>
          <Collapsible defaultOpen>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="group/collapsible">
                Correspondence
                {!isCollapsed && (
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/inbox')}>
                      <Link href="/correspondence/inbox">
                        <Mail className="h-4 w-4" />
                        {!isCollapsed && <span>Correspondence Inbox</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/inbox')}>
                      <Link href="/inbox">
                        <Inbox className="h-4 w-4" />
                        {!isCollapsed && <span>My Inbox</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

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

                  {permissions.canViewCorrespondenceRegistry && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/correspondence/registered')}>
                        <Link href="/correspondence/registered">
                          <FileText className="h-4 w-4" />
                          {!isCollapsed && <span>Registered Correspondence</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/archived')}>
                      <Link href="/correspondence/archived">
                        <Archive className="h-4 w-4" />
                        {!isCollapsed && <span>Archived</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Workflows & Approvals */}
        {permissions.canAccessApprovals && (
          <SidebarGroup>
            <SidebarGroupLabel>Workflows</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/approvals')}>
                    <Link href="/approvals">
                      <CheckSquare className="h-4 w-4" />
                      {!isCollapsed && <span>Approvals</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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

                    {permissions.canAccessExecutiveDashboard && (
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
