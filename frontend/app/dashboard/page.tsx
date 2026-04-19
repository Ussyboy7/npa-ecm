"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  registryQueueSearchStatsShellContentClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
} from '@/components/shared/registry-queue-styles';
import { cn } from '@/lib/utils';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Mail,
  Send,
  AlertTriangle,
  Layers,
  Building2,
  Loader2,
  Users,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleChecks } from '@/hooks/use-role-checks';
import { hasTokens } from '@/lib/api-client';
import { formatDateShort } from '@/lib/correspondence-helpers';
import Link from 'next/link';
import { ExecutivePortfolio, fetchExecutivePortfolio } from '@/lib/analytics-client';
import { apiFetch } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import type { Correspondence } from '@/lib/npa-structure';
import dynamic from 'next/dynamic';

const SecretaryDashboardContent = dynamic(
  () => import('./components/SecretaryDashboardContent'),
  {
    loading: () => <div className="p-6 text-center text-muted-foreground">Loading secretary dashboard...</div>,
    ssr: false,
  }
);

const Dashboard = () => {
  const { currentUser, refresh } = useCurrentUser();
  const { divisions, officeMemberships, offices } = useOrganization();
  const [executiveRange, setExecutiveRange] = useState<string>('30');
  const [executivePortfolio, setExecutivePortfolio] = useState<ExecutivePortfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  
  // Dashboard data from API
  const [pendingCorrespondence, setPendingCorrespondence] = useState<Correspondence[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completedToday: 0,
    urgent: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Use role checks hook for type-safe role checking
  const { isSecretary } = useRoleChecks();

  // Force refresh user when tokens exist but currentUser is null
  // This handles the case where login just completed
  useEffect(() => {
    if (!currentUser && hasTokens()) {
      const attemptRefresh = async () => {
        try {
          await refresh();
        } catch (err) {
          logError('Failed to refresh user after login', err);
        }
      };
      
      attemptRefresh();
    }
  }, [currentUser, refresh]);

  const division = useMemo(() => {
    if (!currentUser?.division) return undefined;
    return divisions.find((item) => item.id as string === currentUser.division);
  }, [currentUser?.division, divisions]);

  const roleDisplay = useMemo(() => {
    if (!currentUser) return 'User';
    if (typeof currentUser.systemRole === 'string') return currentUser.systemRole;
    const o = currentUser.systemRole as Record<string, unknown> | undefined;
    return o && typeof o.name === 'string' ? o.name : 'User';
  }, [currentUser]);

  // Memoize user ID as a stable string value (with empty deps so it's recalculated every render)
  // This way the effect depends on a primitive string, avoiding dependency array size issues
  const userId = useMemo(() => {
    return currentUser?.id ? String(currentUser.id) : null;
  }, [currentUser?.id]);

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      type InboxResponse = Array<Record<string, unknown>> | { results: Array<Record<string, unknown>>; summary?: Record<string, unknown> };
      const inboxResponse = await apiFetch<InboxResponse>('/correspondence/items/my-inbox/?page_size=10');
      const inboxDataArray = Array.isArray(inboxResponse) ? inboxResponse : (inboxResponse?.results || []);
      const summary = (inboxResponse && typeof inboxResponse === 'object' && 'summary' in inboxResponse) ? inboxResponse.summary as Record<string, unknown> : {};
      const pending = inboxDataArray
        .map(mapApiCorrespondence)
        .filter((item) => item.status as string !== 'completed')
        .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())
        .slice(0, 10);

      setPendingCorrespondence(pending);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const completedTodayResponse = await apiFetch<Record<string, unknown>>(
        `/correspondence/items/?status=completed&page_size=100`
      );
      type CompletedResponse = Array<Record<string, unknown>> | { results: Array<Record<string, unknown>> };
      const completedTodayResponseTyped = completedTodayResponse as CompletedResponse;
      const completedItems = Array.isArray(completedTodayResponseTyped) 
        ? completedTodayResponseTyped 
        : (completedTodayResponseTyped?.results || []);
      const completedToday = completedItems.filter((item) => {
        const referenceDate = (item.updated_at && typeof item.updated_at === 'string') ? item.updated_at : ((item.received_date && typeof item.received_date === 'string') ? item.received_date : null);
        return referenceDate && new Date(referenceDate).getTime() >= startOfToday.getTime();
      }).length;

      setStats({
        pending: (summary && typeof summary.pending === 'number') ? summary.pending : pending.length,
        inProgress: (summary && typeof summary.in_progress === 'number') ? summary.in_progress : 0,
        completedToday,
        urgent: (summary && typeof summary.urgent === 'number') ? summary.urgent : 0,
      });
    } catch (error: unknown) {
      logError('Failed to load dashboard data:', error);
      setPendingCorrespondence([]);
      setStats({ pending: 0, inProgress: 0, completedToday: 0, urgent: 0 });
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setPendingCorrespondence([]);
      setStats({ pending: 0, inProgress: 0, completedToday: 0, urgent: 0 });
      return;
    }

    fetchDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const statsArray = useMemo(() => {
    return [
      {
        title: 'Pending',
        value: stats.pending.toString(),
        icon: Clock,
        description: 'Items awaiting your action',
      },
      {
        title: 'In Progress',
        value: stats.inProgress.toString(),
        icon: Send,
        description: 'Items being processed',
      },
      {
        title: 'Completed Today',
        value: stats.completedToday.toString(),
        icon: CheckCircle,
        description: 'Items resolved today',
      },
      {
        title: 'Urgent Items',
        value: stats.urgent.toString(),
        icon: AlertCircle,
        description: 'High priority items',
      },
    ];
  }, [stats]);

  const userOfficeMemberships = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships.filter(
      (membership) => membership.userId === currentUser.id && membership.isActive,
    );
  }, [currentUser, officeMemberships]);

  const officeAssignments = useMemo(() => {
    return userOfficeMemberships
      .map((membership) => {
        const office = offices.find((item) => item.id as string === membership.officeId);
        if (!office) return null;
        return { membership, office };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [userOfficeMemberships, offices]);

  const executiveOfficeTypes = new Set(['md', 'ed', 'gm', 'agm']);
  const isExecutive = officeAssignments.some((assignment) =>
    executiveOfficeTypes.has(assignment.office.officeType),
  );

  useEffect(() => {
    if (!isExecutive) {
      setExecutivePortfolio(null);
      setPortfolioError(null);
      return;
    }
    let ignore = false;
    setPortfolioLoading(true);
    setPortfolioError(null);
    fetchExecutivePortfolio({ range: executiveRange, records: 8 })
      .then((data) => {
        if (ignore) return;
        setExecutivePortfolio(data);
      })
      .catch((error) => {
        if (ignore) return;
        setPortfolioError(error instanceof Error ? error.message : 'Unable to load executive overview');
      })
      .finally(() => {
        if (!ignore) {
          setPortfolioLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [isExecutive, executiveRange]);

  const officeWorkload = useMemo(() => {
    if (!isExecutive || !executivePortfolio) return [];
    return executivePortfolio.offices.map((office) => ({
      id: office.id,
      name: office.name,
      officeType: office.officeType,
      total: office.total,
      urgent: office.urgent,
      overdue: office.slaBreaches,
      approaching: office.approachingSLA,
    }));
  }, [isExecutive, executivePortfolio]);

  const escalationItems = useMemo(() => {
    if (!isExecutive || !executivePortfolio) return [];
    return executivePortfolio.escalations;
  }, [executivePortfolio, isExecutive]);

  const executiveStats = useMemo(() => {
    if (!isExecutive || !executivePortfolio) return [];
    const summary = executivePortfolio.summary;
    return [
      {
        title: 'Office Workload',
        value: summary.totalQueue.toString(),
        icon: Layers,
        description: 'Total items in queue',
      },
      {
        title: 'Urgent Items',
        value: summary.urgent.toString(),
        icon: AlertTriangle,
        description: 'High priority items',
      },
      {
        title: 'SLA Breaches',
        value: summary.slaBreaches.toString(),
        icon: AlertCircle,
        description: 'Items past deadline',
      },
      {
        title: 'Completion Rate',
        value: `${summary.completionRate ?? 0}%`,
        icon: TrendingUp,
        description: 'Items completed',
      },
    ];
  }, [executivePortfolio, isExecutive]);

  const inboxPreview = executivePortfolio?.inboxPreview ?? [];
  const approvalsList = executivePortfolio?.approvals ?? [];
  const delegationSnapshot = executivePortfolio?.delegations ?? [];

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <HelpGuideCard
            title="Select a persona"
            description="Use the Role Switcher to choose a user context after signing in."
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {currentUser.name}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              <span className="font-medium text-foreground">{roleDisplay}</span>
              {division ? ` · ${division.name}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <ContextualHelp
              title="How to use the dashboard"
              description="Switch persona with the Role Switcher to change metrics and queues. Your workload card reflects your inbox; executives also see portfolio-wide sections below."
              steps={[
                'Use the Role Switcher in the header to view as MD, ED, GM, or department roles.',
                'Start with My workload and recent items, then open the inbox or a row to act.',
                'Executives: review escalations and combined office inbox before office-level queue totals.',
              ]}
            />
            <Badge variant="secondary" className="px-3 py-1.5 font-mono text-xs">
              {currentUser.employeeId}
            </Badge>
          </div>
        </div>

        {isSecretary ? (
          <SecretaryDashboardContent />
        ) : (
          <>
            <HelpGuideCard
              title="Workspace guide"
              description="Metrics follow your current persona. MD/ED/GM views add portfolio KPIs, escalations, and delegation—switch roles to compare."
              links={[
                { label: 'Role Switcher', href: '/settings' },
                { label: 'Help & Guides', href: '/help' },
              ]}
            />

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">My workload</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      From your personal inbox and items completed today.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/inbox">Open inbox</Link>
                    </Button>
                    {isExecutive ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/approvals">Executive approvals</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={registryQueueSearchStatsShellContentClass}>
                {dashboardLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading your stats…
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {statsArray.map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <Card key={index}>
                          <CardContent className={registryQueueStatCardContentClass}>
                            <div className="flex items-center gap-4">
                              <div className={cn(registryQueueStatIconBoxClass, 'bg-muted/60')}>
                                <Icon className={cn(registryQueueStatIconClass, 'text-muted-foreground')} />
                              </div>
                              <div>
                                <p className={registryQueueStatLabelClass}>{stat.title}</p>
                                <p className={registryQueueStatValueClass}>{stat.value}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  Recent correspondence
                </CardTitle>
                {pendingCorrespondence.length > 0 ? (
                  <Button variant="ghost" size="sm" className="text-primary" asChild>
                    <Link href="/inbox">View all ({pendingCorrespondence.length})</Link>
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                ) : pendingCorrespondence.length === 0 ? (
                  <EmptyState
                    icon="inbox"
                    title="No pending items"
                    message="You are caught up, or your inbox may be empty for this persona."
                    variant="dashed"
                  />
                ) : (
                  <div className={correspondenceQueueListStackClass}>
                    {pendingCorrespondence.slice(0, 5).map((corr) => {
                      const urgent = corr.priority === 'urgent';
                      const high = corr.priority === 'high';
                      return (
                        <ListRowCard
                          key={corr.id}
                          density="compact"
                          href={`/correspondence/${corr.id}`}
                          leading={
                            <div
                              className={cn(
                                correspondenceQueueLeadingBoxClass,
                                urgent ? 'bg-destructive/10' : high ? 'bg-amber-500/10' : 'bg-primary/10',
                              )}
                            >
                              <Mail
                                className={cn(
                                  correspondenceQueueLeadingIconClass,
                                  urgent ? 'text-destructive' : high ? 'text-amber-600' : 'text-primary',
                                )}
                              />
                            </div>
                          }
                        >
                          <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge
                                variant={urgent ? 'destructive' : 'secondary'}
                                className={correspondenceQueueBadgeClass}
                              >
                                {corr.priority}
                              </Badge>
                              <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                                {corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}
                              </Badge>
                            </div>
                            <span className={correspondenceQueueDateClass}>
                              {formatDateShort(corr.receivedDate)}
                            </span>
                          </div>
                          <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                            <span className={correspondenceQueueMetaItemClass}>
                              <Users className={correspondenceQueueMetaIconClass} />
                              <span className="truncate">From: {corr.senderName}</span>
                            </span>
                            <span className={correspondenceQueueMetaItemClass}>
                              <FileText className={correspondenceQueueMetaIconClass} />
                              <span className="truncate">Ref: {corr.referenceNumber}</span>
                            </span>
                          </div>
                        </ListRowCard>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {isExecutive ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Executive portfolio
                </p>

                <Card>
                  <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Layers className="h-5 w-5 text-primary" />
                        Executive overview
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Multi-office workload, SLA breaches, and completion for the selected range.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {portfolioLoading ? (
                        <Badge variant="outline" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Refreshing
                        </Badge>
                      ) : null}
                      <Select value={executiveRange} onValueChange={setExecutiveRange} disabled={portfolioLoading}>
                        <SelectTrigger className="w-[9.5rem]">
                          <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Last 7 days</SelectItem>
                          <SelectItem value="30">Last 30 days</SelectItem>
                          <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className={registryQueueSearchStatsShellContentClass}>
                    {portfolioError ? (
                      <p className="text-sm text-destructive">{portfolioError}</p>
                    ) : portfolioLoading && executiveStats.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading portfolio…
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {executiveStats.map((stat, index) => {
                          const Icon = stat.icon;
                          return (
                            <Card key={index}>
                              <CardContent className={registryQueueStatCardContentClass}>
                                <div className="flex items-center gap-4">
                                  <div className={cn(registryQueueStatIconBoxClass, 'bg-primary/10')}>
                                    <Icon className={cn(registryQueueStatIconClass, 'text-primary')} />
                                  </div>
                                  <div>
                                    <p className={registryQueueStatLabelClass}>{stat.title}</p>
                                    <p className={registryQueueStatValueClass}>{stat.value}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {!portfolioLoading && executiveStats.length === 0 ? (
                          <p className="col-span-full text-sm text-muted-foreground">
                            No executive data for this range.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Escalations & approvals
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Act on these before scanning the wider combined inbox.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Escalations
                        </p>
                        {escalationItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {portfolioLoading ? 'Loading…' : 'No escalations in your offices.'}
                          </p>
                        ) : (
                          <div className={correspondenceQueueListStackClass}>
                            {escalationItems.map((item) => (
                              <ListRowCard
                                key={item.id as string}
                                density="compact"
                                href={`/correspondence/${item.id as string}`}
                                leading={
                                  <div
                                    className={cn(correspondenceQueueLeadingBoxClass, 'bg-destructive/10')}
                                  >
                                    <AlertTriangle
                                      className={cn(
                                        correspondenceQueueLeadingIconClass,
                                        'text-destructive',
                                      )}
                                    />
                                  </div>
                                }
                              >
                                <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                  <Badge variant="destructive" className={correspondenceQueueBadgeClass}>
                                    {item.priority}
                                  </Badge>
                                  <span className={correspondenceQueueDateClass}>
                                    {item.receivedDate ? formatDateShort(item.receivedDate) : '—'}
                                  </span>
                                </div>
                                <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                                  <span className={correspondenceQueueMetaItemClass}>
                                    <Building2 className={correspondenceQueueMetaIconClass} />
                                    <span className="truncate">{item.officeName ?? 'Office'}</span>
                                  </span>
                                  <span className={correspondenceQueueMetaItemClass}>
                                    <FileText className={correspondenceQueueMetaIconClass} />
                                    <span className="truncate">Ref: {item.referenceNumber}</span>
                                  </span>
                                </div>
                              </ListRowCard>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 border-t border-border/60 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Awaiting executive approval
                        </p>
                        {approvalsList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nothing pending your seal or approval.
                          </p>
                        ) : (
                          <div className={correspondenceQueueListStackClass}>
                            {approvalsList.map((item) => (
                              <ListRowCard
                                key={item.id as string}
                                density="compact"
                                href={`/correspondence/${item.id as string}`}
                                leading={
                                  <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
                                    <CheckCircle
                                      className={cn(
                                        correspondenceQueueLeadingIconClass,
                                        'text-primary',
                                      )}
                                    />
                                  </div>
                                }
                              >
                                <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                  <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                                    {item.priority}
                                  </Badge>
                                  <span className={correspondenceQueueDateClass}>
                                    {item.agingDays != null ? `${item.agingDays}d aging` : '—'}
                                  </span>
                                </div>
                                <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                                  <span className={correspondenceQueueMetaItemClass}>
                                    <Building2 className={correspondenceQueueMetaIconClass} />
                                    <span className="truncate">{item.officeName ?? 'Office'}</span>
                                  </span>
                                  <span className={correspondenceQueueMetaItemClass}>
                                    <FileText className={correspondenceQueueMetaIconClass} />
                                    <span className="truncate">Ref: {item.referenceNumber}</span>
                                  </span>
                                </div>
                              </ListRowCard>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Combined office inbox
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Urgent and aging items across offices you oversee.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {inboxPreview.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {portfolioLoading ? 'Loading…' : 'No open correspondence in your offices.'}
                        </p>
                      ) : (
                        <div className={correspondenceQueueListStackClass}>
                          {inboxPreview.map((item) => (
                            <ListRowCard
                              key={item.id as string}
                              density="compact"
                              href={`/correspondence/${item.id as string}`}
                              leading={
                                <div
                                  className={cn(
                                    correspondenceQueueLeadingBoxClass,
                                    item.slaStatus === 'breach'
                                      ? 'bg-destructive/10'
                                      : item.slaStatus === 'approaching'
                                        ? 'bg-amber-500/10'
                                        : 'bg-muted/60',
                                  )}
                                >
                                  <Mail
                                    className={cn(
                                      correspondenceQueueLeadingIconClass,
                                      item.slaStatus === 'breach'
                                        ? 'text-destructive'
                                        : item.slaStatus === 'approaching'
                                          ? 'text-amber-600'
                                          : 'text-muted-foreground',
                                    )}
                                  />
                                </div>
                              }
                            >
                              <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                <Badge
                                  variant={
                                    item.slaStatus === 'breach'
                                      ? 'destructive'
                                      : item.slaStatus === 'approaching'
                                        ? 'secondary'
                                        : 'outline'
                                  }
                                  className={correspondenceQueueBadgeClass}
                                >
                                  {item.priority}
                                </Badge>
                                <span className={correspondenceQueueDateClass}>
                                  SLA {String(item.slaStatus).toUpperCase()}
                                </span>
                              </div>
                              <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                                <span className={correspondenceQueueMetaItemClass}>
                                  <Building2 className={correspondenceQueueMetaIconClass} />
                                  <span className="truncate">{item.officeName ?? '—'}</span>
                                </span>
                                <span className={correspondenceQueueMetaItemClass}>
                                  <FileText className={correspondenceQueueMetaIconClass} />
                                  <span className="truncate">Ref: {item.referenceNumber}</span>
                                </span>
                                <span className={correspondenceQueueMetaItemClass}>
                                  <Clock className={correspondenceQueueMetaIconClass} />
                                  <span className="truncate">{item.agingDays ?? '—'}d aging</span>
                                </span>
                              </div>
                            </ListRowCard>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Office queues
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Per-office depth, urgency, and SLA risk at a glance.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {officeWorkload.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {portfolioLoading ? 'Loading offices…' : 'No offices assigned.'}
                      </p>
                    ) : (
                      <div className={correspondenceQueueListStackClass}>
                        {officeWorkload.map((entry) => (
                          <ListRowCard
                            key={entry.id}
                            density="compact"
                            leading={
                              <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
                                <Building2
                                  className={cn(
                                    correspondenceQueueLeadingIconClass,
                                    'text-primary',
                                  )}
                                />
                              </div>
                            }
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h4 className="text-sm font-semibold leading-snug text-foreground">
                                  {entry.name}
                                </h4>
                                <p className="text-[11px] uppercase text-muted-foreground">
                                  {entry.officeType}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                <span>
                                  <span className="font-semibold text-foreground">{entry.total}</span> in queue
                                </span>
                                <span>
                                  <span className="font-semibold text-destructive">{entry.urgent}</span> urgent
                                </span>
                                <span>
                                  <span className="font-semibold text-amber-600">{entry.overdue}</span> SLA breach
                                </span>
                                <span>
                                  <span className="font-semibold text-foreground">{entry.approaching}</span>{' '}
                                  approaching
                                </span>
                              </div>
                            </div>
                          </ListRowCard>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Delegation
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Principals, secretariat, and acting assignments by office.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {delegationSnapshot.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No delegation snapshot for your offices.
                      </p>
                    ) : (
                      <div className={correspondenceQueueListStackClass}>
                        {delegationSnapshot.map((entry) => (
                          <div
                            key={entry.officeId}
                            className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40"
                          >
                            <p className="text-sm font-semibold">{entry.officeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.members.length} active assignment
                              {entry.members.length === 1 ? '' : 's'}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {entry.members.map((member) => (
                                <Badge
                                  key={member.userId + member.role}
                                  variant={member.isPrimary ? 'secondary' : 'outline'}
                                  className={correspondenceQueueBadgeClass}
                                >
                                  {member.name} · {member.role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}

          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
