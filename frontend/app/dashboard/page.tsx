"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleChecks } from '@/hooks/use-role-checks';
import { apiFetch } from '@/lib/api-client';
import { ExecutivePortfolio, fetchExecutivePortfolio } from '@/lib/analytics-client';
import { logError } from '@/lib/client-logger';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import { Layers, AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react';
import type { Correspondence } from '@/lib/npa-structure';
import dynamic from 'next/dynamic';
import { WorkloadStats } from '@/components/dashboard/WorkloadStats';
import { RecentCorrespondence } from '@/components/dashboard/RecentCorrespondence';
import { ExecutiveOverview } from '@/components/dashboard/ExecutiveOverview';
import { EscalationsApprovals } from '@/components/dashboard/EscalationsApprovals';
import { CombinedOfficeInbox } from '@/components/dashboard/CombinedOfficeInbox';
import { OfficeQueues } from '@/components/dashboard/OfficeQueues';
import { DelegationSnapshot } from '@/components/dashboard/DelegationSnapshot';

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
  
  const [pendingCorrespondence, setPendingCorrespondence] = useState<Correspondence[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completedToday: 0,
    urgent: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const { isSecretary } = useRoleChecks();

  useEffect(() => {
    if (!currentUser) {
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

  const userId = useMemo(() => {
    return currentUser?.id ? String(currentUser.id) : null;
  }, [currentUser?.id]);

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

    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {!currentUser ? (
          <HelpGuideCard
            title="Select a persona"
            description="Use the Role Switcher to choose a user context after signing in."
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        ) : (
          <>
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

            <WorkloadStats stats={stats} loading={dashboardLoading} isExecutive={isExecutive} />

            <RecentCorrespondence items={pendingCorrespondence} loading={dashboardLoading} />

            {isExecutive ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Executive portfolio
                </p>

                <ExecutiveOverview
                  executiveStats={executiveStats}
                  portfolioError={portfolioError}
                  portfolioLoading={portfolioLoading}
                  executiveRange={executiveRange}
                  onRangeChange={setExecutiveRange}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <EscalationsApprovals
                    escalations={escalationItems}
                    approvals={approvalsList}
                    portfolioLoading={portfolioLoading}
                  />

                  <CombinedOfficeInbox
                    inboxPreview={inboxPreview}
                    portfolioLoading={portfolioLoading}
                  />
                </div>

                <OfficeQueues
                  officeWorkload={officeWorkload}
                  portfolioLoading={portfolioLoading}
                />

                <DelegationSnapshot delegationSnapshot={delegationSnapshot} />
              </>
            ) : null}
          </>
        )}
        </>
      )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
