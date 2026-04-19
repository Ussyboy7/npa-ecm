"use client";

import { useMemo } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  Bell,
  Briefcase,
  CheckCircle2,
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
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { useSidebarCounts } from "@/hooks/use-sidebar-counts";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, hydrated } = useCurrentUser();
  const { officeMemberships, assistantAssignments } = useOrganization();
  const { counts, loading: countsLoading } = useSidebarCounts();

  const permissions = useUserPermissions(currentUser ?? undefined);
  const visibility = useSidebarVisibility();

  const userOfficeIds = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships
      .filter((membership) => membership.userId === currentUser.id && membership.isActive)
      .map((membership) => membership.officeId);
  }, [currentUser?.id, officeMemberships]);

  const hasCorrespondenceAccess = useMemo(() => {
    return (
      permissions.canViewCorrespondenceRegistry ||
      permissions.canDistribute ||
      userOfficeIds.length > 0
    );
  }, [permissions.canViewCorrespondenceRegistry, permissions.canDistribute, userOfficeIds.length]);

  // Use API-provided counts for accuracy
  const officeInboxCount = counts.officeInbox;
  const myInboxCount = counts.myInbox;
  const outboxCount = counts.outbox;
  const officeOutboxCount = counts.officeOutbox;
  const delegatedCount = counts.delegated;
  const myCasesCount = counts.myCases;
  const officeCasesCount = counts.officeCases;
  const allCasesCount = counts.allCases;
  const executiveApprovalsCount = counts.executiveApprovals;
  const myDocumentsCount = counts.myDocuments;

  // Unified active path detection that handles exact matches, sub-paths, and query params
  const isActivePath = (path: string, exact: boolean = false): boolean => {
    if (!pathname) return false;
    
    // Exact match
    if (exact) {
      return pathname === path;
    }
    
    // Handle special cases
    if (path === '/verify') {
      return pathname.startsWith('/verify');
    }
    
    // Handle admin routes with multiple paths
    if (path === '/admin/users-roles') {
      return pathname === '/admin/users-roles' || 
             pathname === '/admin/users' || 
             pathname === '/admin/roles' || 
             pathname === '/admin/assistants';
    }
    
    if (path === '/admin/workflow-sla') {
      return pathname === '/admin/workflow-sla' || 
             pathname === '/admin/sla-config' || 
             pathname === '/admin/escalation-rules';
    }
    
    // Default: exact match or sub-path
    return pathname === path || pathname.startsWith(path + '/');
  };
  
  // Legacy function for backward compatibility
  const isActive = (path: string) => isActivePath(path, true);
  const isCollapsed = state === "collapsed";

  const showSkeleton = !currentUser?.id;

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
     <Sidebar collapsible="icon" className="border-r border-sidebar-border overflow-hidden">
       <SidebarHeader className="px-2 py-3">
         <div className={`flex items-center w-full min-w-0 ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <Link 
            href="/dashboard" 
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
        {/* My Workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>My Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {isCollapsed ? (
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
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/dashboard')}>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* My Inbox - moved from Offices & Registry */}
              <SidebarMenuItem>
                {isCollapsed ? (
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
                            {myInboxCount > 99 ? '99+' : myInboxCount}
                          </Badge>
                        ) : null}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* My Outbox - moved from Offices & Registry */}
              {visibility.showMyOutbox && (
                <SidebarMenuItem>
                  {isCollapsed ? (
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
                              <span className="sr-only">My Outbox</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>My Outbox{outboxCount > 0 && ` (${outboxCount})`}</p>
                        </TooltipContent>
                      </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/outbox')}>
                      <Link href="/correspondence/outbox" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <span>My Outbox</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : outboxCount > 0 ? (
                          <Badge variant="default" className="ml-auto shrink-0">
                            {outboxCount > 99 ? '99+' : outboxCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* My Tasks & Alerts - Merged into My Inbox */}
              {/* Removed: Tasks functionality is now integrated into My Inbox with SLA sections */}

              {/* My Cases - Moved from Case Management */}
              {visibility.showMyCases && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/cases/my')}>
                            <Link href="/cases/my" className="relative">
                              <Briefcase className="h-4 w-4" />
                              {myCasesCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {myCasesCount > 99 ? '99+' : myCasesCount}
                                </Badge>
                              )}
                              <span className="sr-only">My Cases</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>My Cases{myCasesCount > 0 && ` (${myCasesCount})`}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Cases assigned to you
                          </p>
                        </TooltipContent>
                      </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/cases/my')}>
                      <Link href="/cases/my" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span>My Cases</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : myCasesCount > 0 ? (
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            {myCasesCount > 99 ? '99+' : myCasesCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
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
                <SidebarMenuItem>
                  {isCollapsed ? (
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
                            {officeInboxCount > 99 ? '99+' : officeInboxCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

                {visibility.showRegisterCorrespondence && (
                <SidebarMenuItem>
                  {isCollapsed ? (
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

                {/* Office Outbox - NEW */}
                {visibility.showOfficeOutbox && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/correspondence/office-outbox')}>
                            <Link href="/correspondence/office-outbox" className="relative">
                              <Send className="h-4 w-4" />
                              {officeOutboxCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {officeOutboxCount > 99 ? '99+' : officeOutboxCount}
                                </Badge>
                              )}
                              <span className="sr-only">Office Outbox</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Office Outbox{officeOutboxCount > 0 && ` (${officeOutboxCount})`}</p>
                        </TooltipContent>
                      </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/office-outbox')}>
                      <Link href="/correspondence/office-outbox" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <span>Office Outbox</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : officeOutboxCount > 0 ? (
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            {officeOutboxCount > 99 ? '99+' : officeOutboxCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* Office Cases - Moved from Case Management */}
              {visibility.showOfficeCases && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/cases/office')}>
                            <Link href="/cases/office" className="relative">
                              <Briefcase className="h-4 w-4" />
                              {officeCasesCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {officeCasesCount > 99 ? '99+' : officeCasesCount}
                                </Badge>
                              )}
                              <span className="sr-only">Office Cases</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Office Cases{officeCasesCount > 0 && ` (${officeCasesCount})`}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Cases assigned to your office
                          </p>
                        </TooltipContent>
                      </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/cases/office')}>
                      <Link href="/cases/office" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span>Office Cases</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : officeCasesCount > 0 ? (
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            {officeCasesCount > 99 ? '99+' : officeCasesCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* All Cases - Moved from Case Management */}
              {visibility.showAllCases && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/cases/all')}>
                            <Link href="/cases/all" className="relative">
                              <Briefcase className="h-4 w-4" />
                              {allCasesCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {allCasesCount > 99 ? '99+' : allCasesCount}
                                </Badge>
                              )}
                              <span className="sr-only">All Cases</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>All Cases{allCasesCount > 0 && ` (${allCasesCount})`}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            All cases in your scope
                          </p>
                        </TooltipContent>
                      </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/cases/all')}>
                      <Link href="/cases/all" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span>All Cases</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : allCasesCount > 0 ? (
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            {allCasesCount > 99 ? '99+' : allCasesCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

              {/* Executive Approvals - Moved from My Workspace */}
              {hasCorrespondenceAccess && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/approvals')}>
                            <Link href="/approvals" className="relative">
                              <Shield className="h-4 w-4" />
                              {executiveApprovalsCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {executiveApprovalsCount > 99 ? '99+' : executiveApprovalsCount}
                                </Badge>
                              )}
                              <span className="sr-only">Executive Approvals</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Executive Approvals{executiveApprovalsCount > 0 && ` (${executiveApprovalsCount})`}</p>
                        </TooltipContent>
                      </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/approvals')}>
                      <Link href="/approvals" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>Executive Approvals</span>
                        </div>
                        {countsLoading ? (
                          <Skeleton className="h-5 w-8" />
                        ) : executiveApprovalsCount > 0 ? (
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            {executiveApprovalsCount > 99 ? '99+' : executiveApprovalsCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Case Management section removed - Cases moved to My Workspace and Offices & Registry */}

        {/* Documents & Records */}
        <SidebarGroup>
          <SidebarGroupLabel>Documents & Records</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* My Documents */}
              <SidebarMenuItem>
                {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive('/documents')}>
                          <Link href="/documents" className="relative">
                            <FileText className="h-4 w-4" />
                            {myDocumentsCount > 0 && (
                              <Badge
                                variant="secondary"
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                              >
                                {myDocumentsCount > 99 ? '99+' : myDocumentsCount}
                              </Badge>
                            )}
                            <span className="sr-only">My Documents</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>My Documents{myDocumentsCount > 0 && ` (${myDocumentsCount})`}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your documents, shared with you, and awaiting action
                        </p>
                      </TooltipContent>
                    </Tooltip>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/documents')}>
                    <Link href="/documents" className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>My Documents</span>
                      </div>
                      {countsLoading ? (
                        <Skeleton className="h-5 w-8" />
                      ) : myDocumentsCount > 0 ? (
                        <Badge variant="secondary" className="ml-auto shrink-0">
                          {myDocumentsCount > 99 ? '99+' : myDocumentsCount}
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Search Documents - renamed from Advanced Search */}
              <SidebarMenuItem>
                {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive('/search')}>
                          <Link href="/search">
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Search Documents</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Search Documents</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Full-text search with context filters
                        </p>
                      </TooltipContent>
                    </Tooltip>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/search')}>
                    <Link href="/search">
                      <Search className="h-4 w-4" />
                      <span>Search Documents</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Verify Seal - Public verification page */}
              <SidebarMenuItem>
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/verify')}>
                          <Link href="/verify">
                            <Shield className="h-4 w-4" />
                            <span className="sr-only">Verify Seal</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Verify Seal</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Verify digital executive seals
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild isActive={pathname?.startsWith('/verify')}>
                    <Link href="/verify">
                      <Shield className="h-4 w-4" />
                      <span>Verify Seal</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Content Capture */}
              <SidebarMenuItem>
                {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive('/forms')}>
                          <Link href="/forms">
                            <FileCheck className="h-4 w-4" />
                            <span className="sr-only">Forms Library</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Forms Library</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Create and manage form documents
                        </p>
                      </TooltipContent>
                    </Tooltip>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive('/forms')}>
                    <Link href="/forms">
                      <FileCheck className="h-4 w-4" />
                      <span>Forms Library</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Verify Seal */}
              <SidebarMenuItem>
                {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActivePath('/verify')}>
                          <Link href="/verify">
                            <Shield className="h-4 w-4" />
                            <span className="sr-only">Verify Seal</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Verify Seal</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Verify digital executive seals
                        </p>
                      </TooltipContent>
                    </Tooltip>
                ) : (
                  <SidebarMenuButton asChild isActive={isActivePath('/verify')}>
                    <Link href="/verify">
                      <Shield className="h-4 w-4" />
                      <span>Verify Seal</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Records & Archives - moved from Offices & Registry */}
              {visibility.showRecordsArchives && (
                <SidebarMenuItem>
                  {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive('/correspondence/records')}>
                            <Link href="/correspondence/records">
                              <Archive className="h-4 w-4" />
                              <span className="sr-only">Records & Archives</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Records & Archives</p>
                        </TooltipContent>
                      </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive('/correspondence/records')}>
                      <Link href="/correspondence/records" className="flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        <span>Records & Archives</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>



        {/* Administration */}
        {visibility.showAdministration && (
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
                    {visibility.showOrganizationOffices && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/admin/organization')}>
                          <Link href="/admin/organization">
                            <FolderTree className="h-4 w-4" />
                            {!isCollapsed && <span>Organization & Offices</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {visibility.showUsersRoles && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActivePath('/admin/users-roles')}>
                          <Link href="/admin/users-roles">
                            <UserCog className="h-4 w-4" />
                            {!isCollapsed && <span>Users & Roles</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {visibility.showWorkflowSLA && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActivePath('/admin/workflow-sla')}>
                          <Link href="/admin/workflow-sla">
                            <Target className="h-4 w-4" />
                            {!isCollapsed && <span>Workflow & SLA</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {visibility.showTemplates && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/admin/templates-hub')}>
                          <Link href="/admin/templates-hub">
                            <LayoutTemplate className="h-4 w-4" />
                            {!isCollapsed && <span>Templates</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {visibility.showAuditCompliance && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/audit')}>
                          <Link href="/audit">
                            <ScrollText className="h-4 w-4" />
                            {!isCollapsed && <span>Audit & Compliance</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {visibility.showAdministration && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/records')}>
                          <Link href="/records">
                            <FileClock className="h-4 w-4" />
                            {!isCollapsed && <span>Records Management</span>}
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

        {/* Integration Hub */}
        {visibility.showIntegrationHub && (
          <SidebarGroup>
            <SidebarGroupLabel>Integration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  {isCollapsed ? (
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
