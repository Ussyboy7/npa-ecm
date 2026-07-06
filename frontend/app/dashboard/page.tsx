"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { LoadingState } from '@/components/shared/LoadingState';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleChecks } from '@/hooks/use-role-checks';
import { apiFetch } from '@/lib/api-client';
import { PREVIEW_PAGE_SIZE } from '@/lib/pagination-constants';
import { ExecutivePortfolio, fetchExecutivePortfolio } from '@/lib/analytics-client';
import { logError } from '@/lib/client-logger';
import { shouldUseWorkspaceHomeForUser } from '@/lib/home-route';
import { WorkspaceCountsPanel } from '@/components/dashboard/WorkspaceCountsPanel';
import { ExecutiveWorkspace } from '@/components/dashboard/ExecutiveWorkspace';
import { WorkspaceQuickLinks } from '@/components/dashboard/WorkspaceQuickLinks';
import SecretaryDashboardContent from './components/SecretaryDashboardContent';

const Dashboard = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, officeMemberships, offices } = useOrganization();
  const [executiveRange] = useState<string>('30');
  const [executivePortfolio, setExecutivePortfolio] = useState<ExecutivePortfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const hasLoadedCountsRef = useRef(false);
  const hasLoadedPortfolioRef = useRef(false);

  const [inboxTotal, setInboxTotal] = useState(0);
  const [stats, setStats] = useState({
    needsAction: 0,
    inProgress: 0,
    overdue: 0,
    urgent: 0,
    sentToday: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const { isSecretary } = useRoleChecks();

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

  const officeTypes = useMemo(
    () => officeAssignments.map((a) => a.office.officeType),
    [officeAssignments],
  );

  const canUseWorkspace = useMemo(
    () => shouldUseWorkspaceHomeForUser(currentUser, officeTypes),
    [currentUser, officeTypes],
  );

  useLayoutEffect(() => {
    if (!hydrated || !currentUser) return;
    if (!canUseWorkspace) {
      router.replace('/inbox');
    }
  }, [hydrated, currentUser, canUseWorkspace, router]);

  const fetchDashboardData = useCallback(async (options?: { showLoading?: boolean }) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const showLoading = options?.showLoading ?? !hasLoadedCountsRef.current;
    if (showLoading) {
      setDashboardLoading(true);
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [inboxResponse, sentTodayResponse] = await Promise.all([
        apiFetch<{
          count?: number;
          summary?: {
            total?: number;
            pending?: number;
            in_progress?: number;
            urgent?: number;
            overdue?: number;
          };
        }>(`/correspondence/items/my-inbox/?page_size=${PREVIEW_PAGE_SIZE}&sort_by=priority&sort_order=desc`),
        apiFetch<{ count?: number }>(
          `/correspondence/items/my-sent/?date_from=${today}&date_to=${today}&date_field=dispatch_date&page_size=1`,
        ).catch(() => ({ count: 0 })),
      ]);

      const summary = inboxResponse.summary ?? {};
      setInboxTotal(inboxResponse.count ?? summary.total ?? 0);
      setStats({
        needsAction: summary.total ?? inboxResponse.count ?? 0,
        inProgress: summary.in_progress ?? 0,
        overdue: summary.overdue ?? 0,
        urgent: summary.urgent ?? 0,
        sentToday: sentTodayResponse.count ?? 0,
      });
      hasLoadedCountsRef.current = true;
    } catch (error: unknown) {
      logError('Failed to load dashboard data:', error);
      if (!hasLoadedCountsRef.current) {
        setInboxTotal(0);
        setStats({ needsAction: 0, inProgress: 0, overdue: 0, urgent: 0, sentToday: 0 });
      }
    } finally {
      isFetchingRef.current = false;
      if (showLoading) {
        setDashboardLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId || !canUseWorkspace || isSecretary) {
      if (!isSecretary) {
        setDashboardLoading(false);
      }
      return;
    }

    void fetchDashboardData({ showLoading: true });
    const interval = setInterval(() => {
      void fetchDashboardData({ showLoading: false });
    }, 30000);
    return () => clearInterval(interval);
  }, [userId, canUseWorkspace, isSecretary, fetchDashboardData]);

  useEffect(() => {
    if (!isExecutive) {
      setExecutivePortfolio(null);
      setPortfolioError(null);
      hasLoadedPortfolioRef.current = false;
      return;
    }

    let ignore = false;
    const showLoading = !hasLoadedPortfolioRef.current;
    if (showLoading) {
      setPortfolioLoading(true);
    }
    setPortfolioError(null);

    fetchExecutivePortfolio({ range: executiveRange, records: 5 })
      .then((data) => {
        if (ignore) return;
        setExecutivePortfolio(data);
        hasLoadedPortfolioRef.current = true;
      })
      .catch((error) => {
        if (ignore) return;
        setPortfolioError(error instanceof Error ? error.message : 'Unable to load executive overview');
      })
      .finally(() => {
        if (!ignore && showLoading) {
          setPortfolioLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isExecutive, executiveRange]);

  const workspaceSubtitle = useMemo(() => {
    const parts = [roleDisplay, division?.name].filter(Boolean);
    return `Welcome back, ${currentUser?.name ?? 'User'}${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
  }, [currentUser?.name, roleDisplay, division?.name]);

  if (!hydrated) {
    return <LoadingState message="Loading workspace…" />;
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-sm text-muted-foreground">
          Use the Role Switcher in Settings to choose a user context after signing in.
        </p>
      </div>
    );
  }

  if (!canUseWorkspace) {
    return null;
  }

  return (
    <QueuePageShell
      title="My Workspace"
      subtitle={workspaceSubtitle}
      actions={(
        <Badge variant="secondary" className="px-3 py-1.5 font-mono text-xs">
          {currentUser.employeeId}
        </Badge>
      )}
    >
      <WorkspaceQuickLinks showOfficeInbox={isExecutive || isSecretary} />

      {isSecretary ? (
        <SecretaryDashboardContent />
      ) : (
        <>
          <WorkspaceCountsPanel
            inboxTotal={inboxTotal}
            overdue={stats.overdue}
            urgent={stats.urgent}
            sentToday={stats.sentToday}
            loading={dashboardLoading}
          />

          {isExecutive ? (
            <ExecutiveWorkspace
              portfolio={executivePortfolio}
              loading={portfolioLoading}
              error={portfolioError}
            />
          ) : null}
        </>
      )}
    </QueuePageShell>
  );
};

export default Dashboard;
