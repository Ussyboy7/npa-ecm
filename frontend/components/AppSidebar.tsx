"use client";

import { useEffect, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText, Settings, ChevronDown,
  ChevronLeft, ChevronRight, Mail, Send, Archive,
  HelpCircle, Shield, FolderTree, LayoutTemplate, Target,
  ScrollText, Search, FileCheck,
  Briefcase, PackageCheck, Bell,
  LifeBuoy,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarCounts } from "@/hooks/use-sidebar-counts";
import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { useHomePath } from "@/hooks/use-home-path";
import { SidebarNavItem, AdminNavItem } from "@/components/shared/SidebarNavItem";
import { APP_ROUTES, PAGE_ROUTES } from "@/lib/authorization";

interface AppSidebarProps {
  visibility: SidebarVisibility;
}

export function AppSidebar({ visibility }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { currentUser, hydrated } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const counts = useSidebarCounts();
  const homePath = useHomePath();

  // Keep the sidebar canonical to the hydrated auth state. Until the current
  // user is resolved, do not render a partial permission-based navigation.
  if (!hydrated || !currentUser) return null;

  const isActivePath = (path: string) => {
    if (!mounted || !pathname) return false;
    if (path === APP_ROUTES.dms) {
      return pathname === '/dms' || pathname.startsWith('/dms/') || pathname === '/documents' || pathname.startsWith('/documents/');
    }
    if (path === APP_ROUTES.myInbox) return pathname === APP_ROUTES.myInbox;
    if (path === APP_ROUTES.verify) return pathname.startsWith(APP_ROUTES.verify);
    if (path === APP_ROUTES.admin) return pathname === APP_ROUTES.admin || pathname.startsWith('/admin/platform');
    if (path === APP_ROUTES.adminOrganization) {
      return (
        pathname === APP_ROUTES.adminOrganization ||
        pathname.startsWith('/admin/organization/')
      );
    }
    if (path === APP_ROUTES.adminRecordsGovernance) {
      return (
        pathname === APP_ROUTES.adminRecordsGovernance ||
        pathname.startsWith('/admin/records-governance/') ||
        pathname === '/audit'
      );
    }
    if (path === '/audit/forms') {
      return pathname === '/audit/forms' || pathname.startsWith('/audit/forms/');
    }
    if (path === '/admin/platform') {
      return pathname === '/admin/platform' || pathname.startsWith('/admin/platform/');
    }
    if (path === APP_ROUTES.adminWorkflowSla) return [APP_ROUTES.adminWorkflowSla, '/admin/sla-config', '/admin/escalation-rules'].includes(pathname);
    if (path === APP_ROUTES.foia) return pathname === APP_ROUTES.foia || pathname.startsWith('/foia/');
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
    visibility.showOrganizationOffices ||
    visibility.showOrganizationActing ||
    visibility.showExternalEntities ||
    visibility.showUsersRoles;
  const showRecordsSecurityHub =
    visibility.showRecordsGovernance ||
    visibility.showDrmPolicies ||
    visibility.showAuditCompliance;
  const showPlatformHub =
    visibility.showSystemHealth ||
    visibility.showHelpdeskQueue ||
    visibility.showLegacyImport ||
    visibility.showIntegrationHub;
  const showAdminHub = visibility.showAdminDashboard || showPlatformHub;
  const organizationHref =
    visibility.showOrganizationActing &&
    !visibility.showOrganizationOffices &&
    !visibility.showUsersRoles &&
    !visibility.showExternalEntities
      ? APP_ROUTES.adminActingAppointments
      : APP_ROUTES.adminOrganization;

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
                <SidebarNavItem href={PAGE_ROUTES.my_inbox} icon={Mail} label="My Inbox" isCollapsed={isCollapsed} isActive={isActivePath(PAGE_ROUTES.my_inbox)} badge={counts.myInbox} badgeLabel="assigned item" badgeVariant="destructive" description="Correspondence assigned to you" />
              )}
              {visibility.showMySent && (
                <SidebarNavItem href={PAGE_ROUTES.my_sent} icon={Send} label="My Sent" isCollapsed={isCollapsed} isActive={isActivePath(PAGE_ROUTES.my_sent)} />
              )}
              {(visibility.showMyCases || visibility.showOfficeCases || visibility.showAllCases) && (
                <SidebarNavItem href={PAGE_ROUTES.cases} icon={Briefcase} label="Cases" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.casesBase)} description="My, office, and organisation case views" />
              )}
              {(visibility.showDocumentsList || visibility.showFormsLibrary) && (
                <SidebarNavItem
                  href={visibility.showDocumentsList ? PAGE_ROUTES.documents : APP_ROUTES.documentsForms}
                  icon={FileText}
                  label={visibility.showDocumentsList ? "Documents" : "Forms"}
                  isCollapsed={isCollapsed}
                  isActive={pathname === APP_ROUTES.dms || pathname === APP_ROUTES.documents}
                  badge={counts.pendingSignatures}
                  badgeLabel="pending signature"
                  badgeVariant="destructive"
                  description={
                    visibility.showDocumentsList
                      ? "Documents, pending signatures, and forms you signed"
                      : "Forms library available to your role"
                  }
                />
              )}
              {(visibility.showExecutiveApprovals || visibility.showDepartmentalApprovals) && (
                <SidebarNavItem href={PAGE_ROUTES.approvals} icon={FileCheck} label="Approvals" isCollapsed={isCollapsed} isActive={isActivePath(PAGE_ROUTES.approvals)} badge={counts.pendingApprovals} badgeLabel="pending approval" badgeVariant="secondary" description="Executive and departmental approval registers" />
              )}
              {visibility.showNotifications && (
                <SidebarNavItem href={APP_ROUTES.notifications} icon={Bell} label="Notifications" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.notifications)} />
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
                  <SidebarNavItem href={PAGE_ROUTES.office_inbox} icon={Mail} label="Office Inbox" isCollapsed={isCollapsed} isActive={isActivePath(PAGE_ROUTES.office_inbox)} badge={counts.officeInbox} badgeLabel="queued item" badgeVariant="destructive" description="All items in the office inbox" />
                )}
                {visibility.showOfficeSent && (
                  <SidebarNavItem href={APP_ROUTES.officeSent} icon={PackageCheck} label="Office Sent" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.officeSent)} description="Correspondence sent from your office" />
                )}
                {(visibility.showRegisteredCorrespondence || visibility.showPhysicalRecords) && (
                  <SidebarNavItem
                    href={visibility.showRegisteredCorrespondence ? PAGE_ROUTES.registered : PAGE_ROUTES.physical_records}
                    icon={Archive}
                    label="Registry Records"
                    isCollapsed={isCollapsed}
                    isActive={isActivePath(PAGE_ROUTES.registered) || isActivePath(PAGE_ROUTES.physical_records)}
                    description="Registered correspondence and physical check-in/out"
                  />
                )}
                {visibility.showRecordsArchives && (
                  <SidebarNavItem href={PAGE_ROUTES.records} icon={Archive} label="Archives" isCollapsed={isCollapsed} isActive={isActivePath(PAGE_ROUTES.records)} />
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
                <SidebarNavItem href={APP_ROUTES.search} icon={Search} label="Search" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.search)} description="Find documents, correspondence, and cases" />
                {visibility.showFOIA && (
                  <SidebarNavItem href={APP_ROUTES.foia} icon={ScrollText} label="FOIA" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.foia)} description="Freedom of Information Act requests" />
                )}
                <SidebarNavItem href={APP_ROUTES.verify} icon={Shield} label="Verify" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.verify)} description="Verify digital executive seals" />
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
                    {showAdminHub && (
                      <AdminNavItem
                        href={PAGE_ROUTES.admin_overview}
                        icon={LayoutDashboard}
                        label={visibility.showAdminDashboard ? "Admin Overview" : "Platform"}
                        isActive={isActivePath(PAGE_ROUTES.admin_overview)}
                        isCollapsed={isCollapsed}
                      />
                    )}
                    {showOrganizationHub && (
                      <AdminNavItem href={organizationHref} icon={FolderTree} label="Organization" isActive={isActivePath(APP_ROUTES.adminOrganization)} isCollapsed={isCollapsed} />
                    )}
                    {visibility.showWorkflowSLA && (
                      <AdminNavItem href={APP_ROUTES.adminWorkflowSla} icon={Target} label="Workflow & SLA" isActive={isActivePath(APP_ROUTES.adminWorkflowSla)} isCollapsed={isCollapsed} />
                    )}
                    {visibility.showTemplates && (
                      <AdminNavItem href={PAGE_ROUTES.templates} icon={LayoutTemplate} label="Templates" isActive={isActivePath(PAGE_ROUTES.templates)} isCollapsed={isCollapsed} />
                    )}
                    {showRecordsSecurityHub && (
                      <AdminNavItem href={PAGE_ROUTES.records_governance} icon={Archive} label="Records & security" isActive={isActivePath(PAGE_ROUTES.records_governance)} isCollapsed={isCollapsed} />
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
              <SidebarNavItem href={APP_ROUTES.settings} icon={Settings} label="Settings" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.settings)} />
              <SidebarNavItem href={APP_ROUTES.help} icon={HelpCircle} label="Help & Guides" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.help)} />
              {visibility.showHelpdeskSubmit && (
                <SidebarNavItem href={APP_ROUTES.helpdesk} icon={LifeBuoy} label="Get Support" isCollapsed={isCollapsed} isActive={isActivePath(APP_ROUTES.helpdesk)} />
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
