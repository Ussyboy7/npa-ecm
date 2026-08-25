"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText, Settings, ChevronDown,
  ChevronLeft, ChevronRight, Mail, Send, Archive, UserCog,
  HelpCircle, Shield, FolderTree, LayoutTemplate, Target,
  UserCheck, ScrollText, Search, FileCheck, ClipboardCheck,
  Briefcase, PackageCheck, Bell, Activity, BarChart3,
  LifeBuoy,
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
import { useHomePath } from "@/hooks/use-home-path";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SidebarNavItem, AdminNavItem } from "@/components/shared/SidebarNavItem";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { currentUser, hydrated } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { officeMemberships } = useOrganization();
  const counts = useSidebarCounts(currentUser?.id);
  const permissions = useUserPermissions(currentUser ?? undefined);
  const visibility = useSidebarVisibility();
  const homePath = useHomePath();

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

  // Keep the sidebar canonical to the hydrated auth state. Until the current
  // user is resolved, do not render a partial permission-based navigation.
  if (!hydrated || !currentUser) return null;

  const isActivePath = (path: string) => {
    if (!mounted || !pathname) return false;
    if (path === '/dms') {
      return pathname === '/dms' || pathname.startsWith('/dms/') || pathname === '/documents' || pathname.startsWith('/documents/');
    }
    if (path === '/inbox') return pathname === '/inbox';
    if (path === '/verify') return pathname.startsWith('/verify');
    if (path === '/admin') return pathname === '/admin';
    if (path === '/admin/organization') {
      return pathname === '/admin/organization' || pathname.startsWith('/admin/organization/');
    }
    if (path === '/admin/records-governance') {
      return pathname === '/admin/records-governance' || pathname.startsWith('/admin/records-governance/');
    }
    if (path === '/audit') {
      return pathname === '/audit';
    }
    if (path === '/audit/forms') {
      return pathname === '/audit/forms' || pathname.startsWith('/audit/forms/');
    }
    if (path === '/admin/platform') {
      return pathname === '/admin/platform' || pathname.startsWith('/admin/platform/');
    }
    if (path === '/admin/users-roles') return ['/admin/users-roles', '/admin/users', '/admin/roles', '/admin/assistants'].includes(pathname);
    if (path === '/admin/workflow-sla') return ['/admin/workflow-sla', '/admin/sla-config', '/admin/escalation-rules'].includes(pathname);
    if (path === '/foia') return pathname === '/foia' || pathname.startsWith('/foia/');
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isCollapsed = state === "collapsed";
  const showRegistrySection =
    visibility.showOfficeInbox ||
    visibility.showRegisteredCorrespondence ||
    visibility.showPhysicalRecords ||
    visibility.showOfficeSent ||
    visibility.showOfficeCases ||
    visibility.showAllCases ||
    visibility.showRecordsArchives;
  const showOrganizationHub =
    visibility.showOrganizationOffices || visibility.showExternalEntities;
  const showRecordsSecurityHub =
    visibility.showRecordsGovernance || visibility.showDrmPolicies;
  const showAuditHub = visibility.showAuditCompliance;
  const showPlatformHub =
    visibility.showSystemHealth ||
    visibility.showHelpdeskQueue ||
    visibility.showLegacyImport ||
    visibility.showIntegrationHub;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border overflow-hidden">
      <SidebarHeader className="px-2 py-3">
        <div className={`flex items-center w-full min-w-0 ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <Link href={homePath} className="flex items-center gap-2.5 min-w-0 group">
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
          <SidebarGroupLabel asChild>
            <h2>My Workspace</h2>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarNavItem href={homePath} icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} isActive={pathname === homePath} />
              {visibility.showMyInbox && (
                <SidebarNavItem href="/inbox" icon={Mail} label="My Inbox" isCollapsed={isCollapsed} isActive={isActivePath('/inbox')} badge={counts.myInbox} badgeVariant="destructive" description="Correspondence assigned to you" />
              )}
              {visibility.showMySent && (
                <SidebarNavItem href="/correspondence/my-sent" icon={Send} label="My Sent" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/my-sent')} badge={counts.mySent} badgeVariant="secondary" />
              )}
              {visibility.showMyCases && (
                <SidebarNavItem href="/cases/my" icon={Briefcase} label="My Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/my')} badge={counts.myCases} badgeVariant="secondary" description="Cases assigned to you" />
              )}
              {visibility.showDocumentsList && (
                <SidebarNavItem
                  href="/dms"
                  icon={FileText}
                  label="My Documents"
                  isCollapsed={isCollapsed}
                  isActive={pathname === '/dms' || pathname === '/documents'}
                  badge={counts.pendingSignatures}
                  badgeVariant="destructive"
                  description="Documents, pending signatures, and forms you signed"
                />
              )}
              {visibility.showAuditForms && (
                <SidebarNavItem
                  href="/audit/forms"
                  icon={ClipboardCheck}
                  label="Forms"
                  isCollapsed={isCollapsed}
                  isActive={isActivePath('/audit/forms')}
                  description="Office forms, checklists, and submissions"
                />
              )}
              {visibility.showExecutiveApprovals && (
                <SidebarNavItem href="/approvals" icon={FileCheck} label="Approvals" isCollapsed={isCollapsed} isActive={isActivePath('/approvals')} badge={counts.executiveApprovals} badgeVariant="secondary" description="Sealed executive approvals" />
              )}
              {visibility.showNotifications && (
                <SidebarNavItem href="/notifications" icon={Bell} label="Notifications" isCollapsed={isCollapsed} isActive={isActivePath('/notifications')} />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Registry */}
        {showRegistrySection && (
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <h2>Registry</h2>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibility.showOfficeInbox && (
                  <SidebarNavItem href="/correspondence/inbox" icon={Mail} label="Office Inbox" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/inbox')} badge={counts.officeInbox} badgeVariant="destructive" description="All items in the office inbox" />
                )}
                {visibility.showOfficeSent && (
                  <SidebarNavItem href="/correspondence/office-sent" icon={PackageCheck} label="Office Sent" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/office-sent')} badge={counts.officeSent} badgeVariant="secondary" description="Correspondence sent from your office" />
                )}
                {visibility.showOfficeCases && (
                  <SidebarNavItem href="/cases/office" icon={Briefcase} label="Office Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/office')} badge={counts.officeCases} badgeVariant="secondary" description="Cases for your office seat" />
                )}
                {visibility.showAllCases && (
                  <SidebarNavItem href="/cases/all" icon={Briefcase} label="All Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/all')} badge={counts.allCases} badgeVariant="secondary" description="Organisation-wide case oversight" />
                )}
                {(visibility.showRegisteredCorrespondence || visibility.showPhysicalRecords) && (
                  <SidebarNavItem
                    href={
                      visibility.showRegisteredCorrespondence
                        ? "/correspondence/registered"
                        : "/physical-documents"
                    }
                    icon={Archive}
                    label={visibility.showRegisteredCorrespondence ? "Registered" : "Physical"}
                    isCollapsed={isCollapsed}
                    isActive={
                      isActivePath('/correspondence/registered') || isActivePath('/physical-documents')
                    }
                    description="Registry of registered correspondence and physical check-in/out"
                  />
                )}
                {visibility.showRecordsArchives && (
                  <SidebarNavItem href="/correspondence/records" icon={Archive} label="Archives" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/records')} />
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <h2>Tools</h2>
          </SidebarGroupLabel>
          <SidebarGroupContent>
              <SidebarMenu>
                <SidebarNavItem href="/search" icon={Search} label="Search" isCollapsed={isCollapsed} isActive={isActivePath('/search')} description="Find documents, correspondence, and cases" />
                <SidebarNavItem href="/acting" icon={UserCheck} label="Acting" isCollapsed={isCollapsed} isActive={isActivePath('/acting')} description="Appoint or request office seat succession" />
                {visibility.showFOIA && (
                  <SidebarNavItem href="/foia" icon={ScrollText} label="FOIA" isCollapsed={isCollapsed} isActive={isActivePath('/foia')} description="Freedom of Information Act requests" />
                )}
                <SidebarNavItem href="/verify" icon={Shield} label="Verify" isCollapsed={isCollapsed} isActive={isActivePath('/verify')} description="Verify digital executive seals" />
                {visibility.showAnalyticsReports && (
                  <SidebarNavItem
                    href="/analytics"
                    icon={BarChart3}
                    label="Analytics"
                    isCollapsed={isCollapsed}
                    isActive={pathname.startsWith('/analytics')}
                    description="Executive, performance, division, and case analytics"
                  />
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
                  <h2 className="flex-1 text-left text-sm font-medium">Administration</h2>
                  {!isCollapsed && (
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibility.showAdminDashboard && (
                      <AdminNavItem href="/admin" icon={LayoutDashboard} label="Dashboard" isActive={isActivePath('/admin')} isCollapsed={isCollapsed} />
                    )}
                    {showOrganizationHub && (
                      <AdminNavItem href="/admin/organization" icon={FolderTree} label="Organization" isActive={isActivePath('/admin/organization')} isCollapsed={isCollapsed} />
                    )}
                    {visibility.showUsersRoles && (
                      <AdminNavItem href="/admin/users-roles" icon={UserCog} label="Users & Roles" isActive={isActivePath('/admin/users-roles')} isCollapsed={isCollapsed} />
                    )}
                    {visibility.showWorkflowSLA && (
                      <AdminNavItem href="/admin/workflow-sla" icon={Target} label="Workflow & SLA" isActive={isActivePath('/admin/workflow-sla')} isCollapsed={isCollapsed} />
                    )}
                    {visibility.showTemplates && (
                      <AdminNavItem href="/admin/templates-hub" icon={LayoutTemplate} label="Templates" isActive={isActivePath('/admin/templates-hub')} isCollapsed={isCollapsed} />
                    )}
                    {showRecordsSecurityHub && (
                      <AdminNavItem href="/admin/records-governance" icon={Archive} label="Records & security" isActive={isActivePath('/admin/records-governance')} isCollapsed={isCollapsed} />
                    )}
                    {showAuditHub && (
                      <AdminNavItem href="/audit" icon={ScrollText} label="Audit Trail" isActive={isActivePath('/audit')} isCollapsed={isCollapsed} />
                    )}
                    {showPlatformHub && (
                      <AdminNavItem href="/admin/platform" icon={Activity} label="Platform" isActive={isActivePath('/admin/platform')} isCollapsed={isCollapsed} />
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <h2>System</h2>
          </SidebarGroupLabel>
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
              {visibility.showHelpdeskSubmit && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActivePath('/helpdesk')}>
                    <Link href="/helpdesk"><LifeBuoy className="h-4 w-4" />{!isCollapsed && <span>Get Support</span>}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
