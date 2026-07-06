"use client";

import { useMemo } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText, Inbox, Settings, ChevronDown,
  ChevronLeft, ChevronRight, Mail, Send, Archive, UserCog,
  HelpCircle, Shield, FolderTree, LayoutTemplate, Target,
  FilePlus, ScrollText, Search, Webhook, FileCheck, FolderKanban,
  Briefcase, PackageCheck, Scan, ListTodo, Activity, Building2, BarChart3, MapPin,
  CalendarDays,
  LifeBuoy,
  Database,
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

function SidebarSubsectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  if (isCollapsed) return null;
  return (
    <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();
  const { officeMemberships } = useOrganization();
  const counts = useSidebarCounts();
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

  const isActivePath = (path: string) => {
    if (!pathname) return false;
    if (path === '/dms') {
      return pathname === '/dms' || pathname.startsWith('/dms/') || pathname === '/documents' || pathname.startsWith('/documents/');
    }
    if (path === '/verify') return pathname.startsWith('/verify');
    if (path === '/admin/users-roles') return ['/admin/users-roles', '/admin/users', '/admin/roles', '/admin/assistants'].includes(pathname);
    if (path === '/admin/workflow-sla') return ['/admin/workflow-sla', '/admin/sla-config', '/admin/escalation-rules'].includes(pathname);
    if (path === '/admin/records-governance') return pathname === '/admin/records-governance';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isCollapsed = state === "collapsed";
  const showCasesSection =
    visibility.showMyCases || visibility.showOfficeCases || visibility.showAllCases;
  const showOrgAccessAdmin =
    visibility.showOrganizationOffices ||
    visibility.showUsersRoles ||
    visibility.showExternalEntities;
  const showPolicyAdmin =
    visibility.showWorkflowSLA ||
    visibility.showRecordsGovernance ||
    visibility.showDrmPolicies ||
    visibility.showAuditCompliance;
  const showOperationsAdmin =
    visibility.showSystemHealth ||
    visibility.showHelpdeskQueue ||
    visibility.showLegacyImport ||
    visibility.showIntegrationHub ||
    visibility.showTemplates;

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
          <SidebarGroupLabel>My Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibility.showDashboard && (
                <SidebarNavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} isActive={isActivePath('/dashboard')} description="Executive overview and quick links" />
              )}
              {visibility.showMyTasksAlerts && (
                <SidebarNavItem href="/tasks" icon={ListTodo} label="My Work" isCollapsed={isCollapsed} isActive={isActivePath('/tasks')} badge={counts.myWork} badgeVariant="destructive" description="Priority queue and SLA alerts" />
              )}
              <SidebarNavItem href="/inbox" icon={Inbox} label="My Inbox" isCollapsed={isCollapsed} isActive={isActivePath('/inbox')} badge={counts.myInbox} />
              {visibility.showMyOutbox && (
                <SidebarNavItem href="/correspondence/outbox" icon={Send} label="My Outbox" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/outbox')} badge={counts.outbox} badgeVariant="secondary" />
              )}
              {hasCorrespondenceAccess && (
                <SidebarNavItem href="/approvals" icon={Shield} label="Executive Approvals" isCollapsed={isCollapsed} isActive={isActivePath('/approvals')} badge={counts.executiveApprovals} badgeVariant="secondary" />
              )}
              <SidebarNavItem href="/dms" icon={FileText} label="My Documents" isCollapsed={isCollapsed} isActive={isActivePath('/dms')} badge={counts.myDocuments} badgeVariant="secondary" description="Your documents and shared with you" />
              {visibility.showAssistantCalendar && (
                <SidebarNavItem href="/assistant/calendar" icon={CalendarDays} label="PA Calendar" isCollapsed={isCollapsed} isActive={isActivePath('/assistant/calendar')} description="Schedule meetings and reminders for executives" />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Offices & Registry */}
        {(visibility.showOfficeInbox || visibility.showRegisterCorrespondence || visibility.showOfficeOutbox || visibility.showOfficeDispatched) && (
          <SidebarGroup>
            <SidebarGroupLabel>Offices & Registry</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibility.showOfficeInbox && (
                  <SidebarNavItem href="/correspondence/inbox" icon={Mail} label="Office Inbox" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/inbox')} badge={counts.officeInbox} badgeVariant="destructive" />
                )}
                {visibility.showRegisterCorrespondence && (
                  <SidebarNavItem href="/correspondence/register" icon={FilePlus} label="Register Correspondence" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/register')} />
                )}
                {visibility.showOfficeOutbox && (
                  <SidebarNavItem href="/correspondence/office-outbox" icon={Send} label="Office Outbox" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/office-outbox')} badge={counts.officeOutbox} badgeVariant="secondary" />
                )}
                {visibility.showOfficeDispatched && (
                  <SidebarNavItem href="/correspondence/office-dispatched" icon={PackageCheck} label="Office Dispatched" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/office-dispatched')} badge={counts.officeDispatched} badgeVariant="secondary" description="Correspondence dispatched from your office" />
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Cases */}
        {showCasesSection && (
          <SidebarGroup>
            <SidebarGroupLabel>Cases</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibility.showMyCases && (
                  <SidebarNavItem href="/cases/my" icon={Briefcase} label="My Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/my')} badge={counts.myCases} badgeVariant="secondary" description="Cases assigned to you" />
                )}
                {visibility.showOfficeCases && (
                  <SidebarNavItem href="/cases/office" icon={Briefcase} label="Office Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/office')} badge={counts.officeCases} badgeVariant="secondary" description="Cases assigned to your office" />
                )}
                {visibility.showAllCases && (
                  <SidebarNavItem href="/cases/all" icon={Briefcase} label="All Cases" isCollapsed={isCollapsed} isActive={isActivePath('/cases/all')} badge={counts.allCases} badgeVariant="secondary" description="All cases in your scope" />
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
              <SidebarNavItem href="/workspaces" icon={FolderKanban} label="Workspaces" isCollapsed={isCollapsed} isActive={isActivePath('/workspaces')} description="Organize documents by project or theme" />
              <SidebarNavItem href="/search" icon={Search} label="Search" isCollapsed={isCollapsed} isActive={isActivePath('/search')} description="Find documents, correspondence, and cases" />
              {visibility.showContentCapture && (
                <SidebarNavItem href="/capture" icon={Scan} label="Content Capture" isCollapsed={isCollapsed} isActive={isActivePath('/capture')} description="Scan, batch upload, and OCR processing" />
              )}
              <SidebarNavItem href="/verify" icon={Shield} label="Verify Seal" isCollapsed={isCollapsed} isActive={isActivePath('/verify')} description="Verify digital executive seals" />
              <SidebarNavItem href="/forms" icon={FileCheck} label="Forms Library" isCollapsed={isCollapsed} isActive={isActivePath('/forms')} description="Create and manage form documents" />
              {visibility.showRecordsArchives && (
                <SidebarNavItem href="/correspondence/records" icon={Archive} label="Records & Archives" isCollapsed={isCollapsed} isActive={isActivePath('/correspondence/records')} />
              )}
              {visibility.showPhysicalRecords && (
                <SidebarNavItem href="/physical-documents" icon={MapPin} label="Physical Records" isCollapsed={isCollapsed} isActive={isActivePath('/physical-documents')} description="Track physical document check-in/out" />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analytics & Reports */}
        {visibility.showAnalyticsReports && (
          <SidebarGroup>
            <SidebarGroupLabel>Analytics & Reports</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibility.showExecutiveDashboard && (
                  <SidebarNavItem href="/analytics/executive" icon={Target} label="Executive Dashboard" isCollapsed={isCollapsed} isActive={isActivePath('/analytics/executive')} />
                )}
                {visibility.showPerformanceAnalytics && (
                  <SidebarNavItem href="/analytics/performance" icon={BarChart3} label="Performance Analytics" isCollapsed={isCollapsed} isActive={isActivePath('/analytics/performance')} />
                )}
                {visibility.showDivisionAnalytics && (
                  <SidebarNavItem href="/analytics/divisions" icon={BarChart3} label="Division & Port Analytics" isCollapsed={isCollapsed} isActive={isActivePath('/analytics/divisions')} />
                )}
                {visibility.showReportsIntelligence && (
                  <SidebarNavItem href="/analytics/reports" icon={ScrollText} label="Reports & Intelligence" isCollapsed={isCollapsed} isActive={isActivePath('/analytics/reports')} />
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
                    {showOrgAccessAdmin && (
                      <SidebarSubsectionLabel label="Org & access" isCollapsed={isCollapsed} />
                    )}
                    {visibility.showOrganizationOffices && <AdminNavItem href="/admin/organization" icon={FolderTree} label="Organization & Offices" isActive={isActivePath('/admin/organization')} isCollapsed={isCollapsed} />}
                    {visibility.showUsersRoles && <AdminNavItem href="/admin/users-roles" icon={UserCog} label="Users & Roles" isActive={isActivePath('/admin/users-roles')} isCollapsed={isCollapsed} />}
                    {visibility.showExternalEntities && <AdminNavItem href="/admin/external-entities" icon={Building2} label="External Entities" isActive={isActivePath('/admin/external-entities')} isCollapsed={isCollapsed} />}

                    {showPolicyAdmin && (
                      <SidebarSubsectionLabel label="Policy & compliance" isCollapsed={isCollapsed} />
                    )}
                    {visibility.showWorkflowSLA && <AdminNavItem href="/admin/workflow-sla" icon={Target} label="Workflow & SLA" isActive={isActivePath('/admin/workflow-sla')} isCollapsed={isCollapsed} />}
                    {visibility.showRecordsGovernance && <AdminNavItem href="/admin/records-governance" icon={Archive} label="Records Governance" isActive={isActivePath('/admin/records-governance')} isCollapsed={isCollapsed} />}
                    {visibility.showDrmPolicies && <AdminNavItem href="/admin/drm-policies" icon={Shield} label="DRM Policies" isActive={isActivePath('/admin/drm-policies')} isCollapsed={isCollapsed} />}
                    {visibility.showAuditCompliance && <AdminNavItem href="/audit" icon={ScrollText} label="Audit & Compliance" isActive={isActivePath('/audit')} isCollapsed={isCollapsed} />}

                    {showOperationsAdmin && (
                      <SidebarSubsectionLabel label="Operations" isCollapsed={isCollapsed} />
                    )}
                    {visibility.showSystemHealth && <AdminNavItem href="/admin/system-health" icon={Activity} label="System Health" isActive={isActivePath('/admin/system-health')} isCollapsed={isCollapsed} />}
                    {visibility.showHelpdeskQueue && <AdminNavItem href="/admin/helpdesk" icon={LifeBuoy} label="Support Queue" isActive={isActivePath('/admin/helpdesk')} isCollapsed={isCollapsed} />}
                    {visibility.showLegacyImport && <AdminNavItem href="/admin/legacy-import" icon={Database} label="Legacy Import" isActive={isActivePath('/admin/legacy-import')} isCollapsed={isCollapsed} />}
                    {visibility.showIntegrationHub && <AdminNavItem href="/integrations" icon={Webhook} label="Integration Hub" isActive={isActivePath('/integrations')} isCollapsed={isCollapsed} />}
                    {visibility.showTemplates && <AdminNavItem href="/admin/templates-hub" icon={LayoutTemplate} label="Templates" isActive={isActivePath('/admin/templates-hub')} isCollapsed={isCollapsed} />}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
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
