"use client";

import { useMemo } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Inbox, Settings, ChevronDown,
  ChevronLeft, ChevronRight, Mail, Send, Archive, UserCog,
  HelpCircle, Shield, FolderTree, LayoutTemplate, Target,
  FilePlus, ScrollText, Search, Webhook, FileCheck,
  Briefcase,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { useSidebarCounts } from "@/hooks/use-sidebar-counts";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SidebarNavItem, AdminNavItem } from "@/components/shared/SidebarNavItem";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();
  const { officeMemberships } = useOrganization();
  const { counts, loading: countsLoading } = useSidebarCounts();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const visibility = useSidebarVisibility();

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((m) => m.userId === currentUser.id && m.isActive)
      .map((m) => m.officeId);
  }, [currentUser, officeMemberships]);

  const hasCorrespondenceAccess = useMemo(() => (
    permissions.canViewCorrespondenceRegistry ||
    permissions.canDistribute ||
    userOfficeIds.length > 0
  ), [permissions.canViewCorrespondenceRegistry, permissions.canDistribute, userOfficeIds.length]);

  const isActivePath = (path: string) => {
    if (!pathname) return false;
    if (path === '/verify') return pathname.startsWith('/verify');
    if (path === '/admin/users-roles') return ['/admin/users-roles', '/admin/users', '/admin/roles', '/admin/assistants'].includes(pathname);
    if (path === '/admin/workflow-sla') return ['/admin/workflow-sla', '/admin/sla-config', '/admin/escalation-rules'].includes(pathname);
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isCollapsed = state === "collapsed";

  if (!currentUser?.id) {
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border overflow-hidden">
      <SidebarHeader className="px-2 py-3">
        <div className={`flex items-center w-full min-w-0 ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-sidebar-primary/20 bg-white transition-transform group-hover:scale-105">
              <Image src={NPA_LOGO_URL} alt={`${NPA_BRAND_NAME} crest`} fill unoptimized className="object-contain p-0.5" sizes="36px" priority />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">NPA ECM</span>
                <span className="text-[10px] text-sidebar-foreground/60 truncate">Content Management</span>
              </div>
            )}
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}
            className={`text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground ${isCollapsed ? 'h-6 w-6' : 'h-7 w-7'}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-4 w-4" />}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        {/* My Workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>My Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarNavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} isActive={isActivePath('/dashboard')} />
              <SidebarNavItem href="/inbox" icon={Inbox} label="My Inbox" isCollapsed={isCollapsed} isActive={isActivePath('/inbox')} badge={counts.myInbox} countsLoading={countsLoading} />
              {visibility.showMyOutbox && (
                <SidebarNavItem href="/correspondence/outbox" icon={Send} label="My Outbox" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/outbox')} badge={counts.outbox} badgeVariant="secondary" countsLoading={countsLoading} />
              )}
              {visibility.showMyCases && (
                <SidebarNavItem href="/cases/my" icon={Briefcase} label="My Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/my')} badge={counts.myCases} badgeVariant="secondary" description="Cases assigned to you" countsLoading={countsLoading} />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Offices & Registry */}
        {(visibility.showOfficeInbox || visibility.showRegisterCorrespondence || visibility.showOfficeOutbox) && (
          <SidebarGroup>
            <SidebarGroupLabel>Offices & Registry</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibility.showOfficeInbox && (
                  <SidebarNavItem href="/correspondence/inbox" icon={Mail} label="Office Inbox" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/inbox')} badge={counts.officeInbox} badgeVariant="destructive" countsLoading={countsLoading} />
                )}
                {visibility.showRegisterCorrespondence && (
                  <SidebarNavItem href="/correspondence/register" icon={FilePlus} label="Register Correspondence" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/register')} />
                )}
                {visibility.showOfficeOutbox && (
                  <SidebarNavItem href="/correspondence/office-outbox" icon={Send} label="Office Outbox" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/office-outbox')} badge={counts.officeOutbox} badgeVariant="secondary" countsLoading={countsLoading} />
                )}
                {visibility.showOfficeCases && (
                  <SidebarNavItem href="/cases/office" icon={Briefcase} label="Office Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/office')} badge={counts.officeCases} badgeVariant="secondary" description="Cases assigned to your office" countsLoading={countsLoading} />
                )}
                {visibility.showAllCases && (
                  <SidebarNavItem href="/cases/all" icon={Briefcase} label="All Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/all')} badge={counts.allCases} badgeVariant="secondary" description="All cases in your scope" countsLoading={countsLoading} />
                )}
                {hasCorrespondenceAccess && (
                  <SidebarNavItem href="/approvals" icon={Shield} label="Executive Approvals" isCollapsed={isCollapsed} isActive={isActivePath('/approvals')} badge={counts.executiveApprovals} badgeVariant="secondary" countsLoading={countsLoading} />
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Documents & Records */}
        <SidebarGroup>
          <SidebarGroupLabel>Documents & Records</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarNavItem href="/documents" icon={FileText} label="My Documents" isCollapsed={isCollapsed} isActive={isActivePath('/documents')} badge={counts.myDocuments} badgeVariant="secondary" description="Your documents, shared with you, and awaiting action" countsLoading={countsLoading} />
              <SidebarNavItem href="/search" icon={Search} label="Search Documents" isCollapsed={isCollapsed} isActive={isActivePath('/search')} description="Full-text search with context filters" />
              <SidebarNavItem href="/verify" icon={Shield} label="Verify Seal" isCollapsed={isCollapsed} isActive={isActivePath('/verify')} description="Verify digital executive seals" />
              <SidebarNavItem href="/forms" icon={FileCheck} label="Forms Library" isCollapsed={isCollapsed} isActive={isActivePath('/forms')} description="Create and manage form documents" />
              {visibility.showRecordsArchives && (
                <SidebarNavItem href="/correspondence/records" icon={Archive} label="Records & Archives" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/records')} />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration */}
        {visibility.showAdministration && (
          <SidebarGroup>
            <Collapsible defaultOpen={true}>
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
                    {visibility.showOrganizationOffices && <AdminNavItem href="/admin/organization" icon={FolderTree} label="Organization & Offices" isActive={isActivePath('/admin/organization')} isCollapsed={isCollapsed} />}
                    {visibility.showUsersRoles && <AdminNavItem href="/admin/users-roles" icon={UserCog} label="Users & Roles" isActive={isActivePath('/admin/users-roles')} isCollapsed={isCollapsed} />}
                    {visibility.showWorkflowSLA && <AdminNavItem href="/admin/workflow-sla" icon={Target} label="Workflow & SLA" isActive={isActivePath('/admin/workflow-sla')} isCollapsed={isCollapsed} />}
                    {visibility.showTemplates && <AdminNavItem href="/admin/templates-hub" icon={LayoutTemplate} label="Templates" isActive={isActivePath('/admin/templates-hub')} isCollapsed={isCollapsed} />}
                    {visibility.showAuditCompliance && <AdminNavItem href="/audit" icon={ScrollText} label="Audit & Compliance" isActive={isActivePath('/audit')} isCollapsed={isCollapsed} />}

                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Integration Hub */}
        {visibility.showIntegrationHub && (
          <SidebarGroup>
            <SidebarGroupLabel>Integration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarNavItem href="/integrations" icon={Webhook} label="Integration Hub" isCollapsed={isCollapsed} isActive={isActivePath('/integrations')} description="Webhooks, email, ERP connectors" />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActivePath('/settings')}>
                  <Link href="/settings"><Settings className="h-4 w-4" />{!isCollapsed && <span>Settings</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActivePath('/help')}>
                  <Link href="/help"><HelpCircle className="h-4 w-4" />{!isCollapsed && <span>Help & Guides</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
