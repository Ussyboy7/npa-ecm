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
  Users2,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Archive,
  BarChart3,
  FolderKanban,
  UserCog,
  Activity,
  HelpCircle,
  Shield,
  FolderTree,
  LayoutTemplate,
  Target,
  Zap,
  FilePlus,
  ScrollText,
  TrendingUp,
  Scan,
  FileClock,
  Search,
  Webhook,
  Database,
  FileCheck,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { useSidebarCounts } from "@/hooks/use-sidebar-counts";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { currentUser, hydrated } = useCurrentUser();
  const { officeMemberships, assistantAssignments } = useOrganization();
  const { counts, loading: countsLoading } = useSidebarCounts();

  const permissions = useUserPermissions(currentUser ?? undefined);

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);
  }, [currentUser?.id, officeMemberships]);

  // Use API-provided counts for accuracy
  const officeInboxCount = counts.officeInbox;
  const myInboxCount = counts.myInbox;
  const outboxCount = counts.outbox;
  const delegatedCount = counts.delegated;

  // Check if user has assistant assignments (can receive delegations)
  const hasAssistantAssignments = useMemo(() => {
    if (!currentUser) return false;
    return assistantAssignments.some(
      (assignment) => String(assignment.assistantId) === String(currentUser.id)
    );
  }, [assistantAssignments, currentUser?.id]);

  const hasCorrespondenceAccess =
    permissions.canViewCorrespondenceRegistry ||
    permissions.canDistribute ||
    userOfficeIds.length > 0;

  const shouldShowRecordsArchive =
    hasCorrespondenceAccess ||
      userOfficeIds.length > 0 ||
    Boolean(currentUser?.division || currentUser?.department);

  const shouldShowOutbox = permissions.canRegisterCorrespondence || outboxCount > 0;

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
     <Sidebar collapsible="icon" className="border-r border-sidebar-border overflow-hidden">
       <SidebarHeader className="px-2 py-3">
         <div className={`flex items-center w-full min-w-0 ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <Link 
            href="/" 
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-sidebar-primary/20 bg-white transition-transform group-hover:scale-105">
              <Image
                src={NPA_LOGO_URL}
                alt={`${NPA_BRAND_NAME} crest`}
                fill
                className="object-contain p-0.5"
                sizes="36px"
                priority
              />
            </div>
             {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">
                  NPA ECM
                </span>
                <span className="text-[10px] text-sidebar-foreground/60 truncate">
                  Content Management
                </span>
              </div>
             )}
           </Link>
           <Button
             variant="ghost"
             size="icon"
             onClick={toggleSidebar}
             className={`text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground ${
               isCollapsed ? 'h-6 w-6' : 'h-7 w-7'
             }`}
             title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
           >
             {isCollapsed ? (
               <ChevronRight className="h-3.5 w-3.5" />
             ) : (
               <ChevronLeft className="h-4 w-4" />
             )}
             <span className="sr-only">Toggle Sidebar</span>
           </Button>
         </div>
       </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {/* Standard workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>My Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive('/dashboard')}>
                          <Link href="/dashboard">
                            <LayoutDashboard className="h-4 w-4" />
                            <span className="sr-only">Dashboard</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Dashboard</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/dashboard')}>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Correspondence */}
        <SidebarGroup>
          <SidebarGroupLabel>Offices & Registry</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasCorrespondenceAccess && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/correspondence/inbox')}>
                            <Link href="/correspondence/inbox" className="relative">
                              <Mail className="h-4 w-4" />
                              {officeInboxCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {officeInboxCount > 99 ? '99+' : officeInboxCount}
                                </Badge>
                              )}
                              <span className="sr-only">Office Inbox</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Office Inbox{officeInboxCount > 0 && ` (${officeInboxCount})`}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/inbox')}>
                      <Link href="/correspondence/inbox" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>Office Inbox</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : officeInboxCount > 0 ? (
                          <Badge variant="destructive" className="ml-auto shrink-0">
                            {officeInboxCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive('/inbox')}>
                          <Link href="/inbox" className="relative">
                            <Inbox className="h-4 w-4" />
                            {myInboxCount > 0 && (
                              <Badge
                                variant="default"
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                              >
                                {myInboxCount > 99 ? '99+' : myInboxCount}
                              </Badge>
                            )}
                            <span className="sr-only">My Inbox</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>My Inbox{myInboxCount > 0 && ` (${myInboxCount})`}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/inbox')}>
                    <Link href="/inbox" className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        <span>My Inbox</span>
                      </div>
                      {countsLoading ? (
                        <Skeleton className="h-5 w-8" />
                      ) : myInboxCount > 0 ? (
                        <Badge variant="default" className="ml-auto shrink-0">
                          {myInboxCount}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {(delegatedCount > 0 || hasAssistantAssignments) && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/inbox/delegated')}>
                            <Link href="/inbox/delegated" className="relative">
                              <Users2 className="h-4 w-4" />
                              {delegatedCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                >
                                  {delegatedCount > 99 ? '99+' : delegatedCount}
                                </Badge>
                              )}
                              <span className="sr-only">Delegated to Me</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Delegated to Me{delegatedCount > 0 && ` (${delegatedCount})`}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/inbox/delegated')}>
                      <Link href="/inbox/delegated" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Users2 className="h-4 w-4" />
                          <span>Delegated to Me</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : delegatedCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="ml-auto shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            {delegatedCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {permissions.canRegisterCorrespondence && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/correspondence/register')}>
                            <Link href="/correspondence/register">
                              <FilePlus className="h-4 w-4" />
                              <span className="sr-only">Register Correspondence</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Register Correspondence</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/register')}>
                      <Link href="/correspondence/register">
                        <FilePlus className="h-4 w-4" />
                        <span>Register Correspondence</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {shouldShowRecordsArchive && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/correspondence/records')}>
                            <Link href="/correspondence/records">
                              <Archive className="h-4 w-4" />
                              <span className="sr-only">Records & Archive</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Records & Archive</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/records')}>
                      <Link href="/correspondence/records" className="flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        <span>Records & Archive</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {shouldShowOutbox && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/correspondence/outbox')}>
                            <Link href="/correspondence/outbox" className="relative">
                              <Send className="h-4 w-4" />
                              {outboxCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {outboxCount > 99 ? '99+' : outboxCount}
                                </Badge>
                              )}
                              <span className="sr-only">Outbox</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Outbox{outboxCount > 0 && ` (${outboxCount})`}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/outbox')}>
                      <Link href="/correspondence/outbox" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <span>Outbox</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : outboxCount > 0 ? (
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            {outboxCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* Executive Approvals */}
              {hasCorrespondenceAccess && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/approvals')}>
                            <Link href="/approvals">
                              <Shield className="h-4 w-4" />
                              <span className="sr-only">Executive Approvals</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Executive Approvals</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/approvals')}>
                      <Link href="/approvals">
                        <Shield className="h-4 w-4" />
                        <span>Executive Approvals</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
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
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive('/documents')}>
                          <Link href="/documents">
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">My Documents</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>My Documents</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Documents you own or have access to
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/documents')}>
                    <Link href="/documents">
                      <FileText className="h-4 w-4" />
                      <span>My Documents</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {permissions.canAccessDocumentManagement && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/dms')}>
                            <Link href="/dms">
                              <FolderKanban className="h-4 w-4" />
                              <span className="sr-only">Document Management</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Document Management</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Central workspace for all ECM documents
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/dms')}>
                      <Link href="/dms">
                        <FolderKanban className="h-4 w-4" />
                        <span>Document Management</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* Forms */}
              {permissions.canAccessDocumentManagement && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/forms')}>
                            <Link href="/forms">
                              <FileCheck className="h-4 w-4" />
                              <span className="sr-only">Forms</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Forms</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Create and manage form documents
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/forms')}>
                      <Link href="/forms">
                        <FileCheck className="h-4 w-4" />
                        <span>Forms</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* Advanced Search */}
              <SidebarMenuItem>
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive('/search')}>
                          <Link href="/search">
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Advanced Search</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Advanced Search</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Full-text search with filters
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/search')}>
                    <Link href="/search">
                      <Search className="h-4 w-4" />
                      <span>Advanced Search</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Content Capture */}
              {permissions.canAccessDocumentManagement && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/capture')}>
                            <Link href="/capture">
                              <Scan className="h-4 w-4" />
                              <span className="sr-only">Content Capture</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Content Capture</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            OCR, scanning, batch processing
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/capture')}>
                      <Link href="/capture">
                        <Scan className="h-4 w-4" />
                        <span>Content Capture</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* Records Management */}
              {permissions.canAccessDocumentManagement && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/records')}>
                            <Link href="/records">
                              <FileClock className="h-4 w-4" />
                              <span className="sr-only">Records Management</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Records Management</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Retention policies, legal holds
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/records')}>
                      <Link href="/records">
                        <FileClock className="h-4 w-4" />
                        <span>Records Management</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
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
                            <TrendingUp className="h-4 w-4" />
                            {!isCollapsed && <span>Reports & Intelligence</span>}
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
                      <SidebarMenuButton asChild isActive={isActive('/admin/organization')}>
                        <Link href="/admin/organization">
                          <FolderTree className="h-4 w-4" />
                          {!isCollapsed && <span>Organization Structure</span>}
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
                          {!isCollapsed && <span>System Roles</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/templates-hub')}>
                        <Link href="/admin/templates-hub">
                          <LayoutTemplate className="h-4 w-4" />
                          {!isCollapsed && <span>Templates Hub</span>}
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

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/sla-config')}>
                        <Link href="/admin/sla-config">
                          <Target className="h-4 w-4" />
                          {!isCollapsed && <span>SLA Configuration</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/admin/escalation-rules')}>
                        <Link href="/admin/escalation-rules">
                          <Zap className="h-4 w-4" />
                          {!isCollapsed && <span>Escalation Rules</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive('/audit')}>
                        <Link href="/audit">
                          <ScrollText className="h-4 w-4" />
                          {!isCollapsed && <span>Audit Trail</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Integration Hub */}
        {permissions.canAccessAdministration && (
          <SidebarGroup>
            <SidebarGroupLabel>Integration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/integrations')}>
                            <Link href="/integrations">
                              <Webhook className="h-4 w-4" />
                              <span className="sr-only">Integration Hub</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Integration Hub</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Webhooks, email, ERP connectors
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/integrations')}>
                      <Link href="/integrations">
                        <Webhook className="h-4 w-4" />
                        <span>Integration Hub</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
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
