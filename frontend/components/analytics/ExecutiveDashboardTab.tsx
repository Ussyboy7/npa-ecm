"use client";

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { StatStrip } from '@/components/shared/StatStrip';
import { AnalyticsPanel } from './AnalyticsPanel';
import {
  AnalyticsFilterBar,
  AnalyticsHeaderSlots,
  AnalyticsRefreshAction,
} from './AnalyticsHeaderSlots';
import { fetchExecutiveAnalytics, type ExecutiveAnalytics } from '@/lib/analytics-client';
import {
  fetchEnhancedSLAAnalytics,
  fetchEfficiencyAnalysis,
  fetchEscalations,
  type EnhancedSLAAnalytics,
  type EfficiencyAnalysis,
  type Escalation,
} from '@/lib/sla-client';
import { useThemeChartColors } from '@/hooks/use-theme-chart-colors';
import { appType } from '@/lib/app-type';
import { cn } from '@/lib/utils';

const DEFAULT_RANGE_DAYS = 30;
const RANGE_OPTIONS = [7, 30, 90] as const;
const TOP_DIVISIONS_LIMIT = 8;

const itemCountLabel = (count: number) => `${count} ${Number(count) === 1 ? 'item' : 'items'}`;

type AttentionRow = {
  key: string;
  reference: string;
  subject: string;
  meta: string;
  href: string;
  kind: 'Escalation' | 'Delayed' | 'Leadership';
};

type RecommendedAction = {
  key: string;
  title: string;
  detail: string;
  href: string;
  tone: 'danger' | 'warning' | 'info';
};

const toneDot: Record<RecommendedAction['tone'], string> = {
  danger: 'bg-destructive',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

type AnalyticsSection = 'executive' | 'sla' | 'efficiency' | 'escalations';

const allSectionsLoading: Record<AnalyticsSection, boolean> = {
  executive: true,
  sla: true,
  efficiency: true,
  escalations: true,
};

export const ExecutiveDashboardTab = () => {
  const chartColors = useThemeChartColors();
  const [data, setData] = useState<ExecutiveAnalytics | null>(null);
  const [slaData, setSlaData] = useState<EnhancedSLAAnalytics | null>(null);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyAnalysis | null>(null);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loadingSections, setLoadingSections] = useState<Record<AnalyticsSection, boolean>>(allSectionsLoading);
  const [failedSections, setFailedSections] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(DEFAULT_RANGE_DAYS);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let ignore = false;
    setFailedSections([]);
    setLoadingSections({ ...allSectionsLoading });

    // Each endpoint updates its own section as soon as it settles. No
    // Promise.all gate means one slow or failed source cannot blank the page.
    const track = async <T,>(
      key: AnalyticsSection,
      label: string,
      request: Promise<T>,
      apply: (value: T) => void,
    ) => {
      try {
        const value = await request;
        if (ignore) return;
        apply(value);
        setLastUpdated(new Date());
      } catch {
        if (!ignore) {
          setFailedSections((previous) =>
            previous.includes(label) ? previous : [...previous, label],
          );
        }
      } finally {
        if (!ignore) {
          setLoadingSections((previous) => ({ ...previous, [key]: false }));
        }
      }
    };

    void track('executive', 'Executive overview', fetchExecutiveAnalytics(String(rangeDays)), setData);
    void track('sla', 'SLA summary', fetchEnhancedSLAAnalytics({ range: rangeDays }), setSlaData);
    void track('efficiency', 'Efficiency analysis', fetchEfficiencyAnalysis({ range: rangeDays }), setEfficiencyData);
    void track('escalations', 'Escalations', fetchEscalations({ status: 'pending' }), setEscalations);

    return () => {
      ignore = true;
    };
  }, [rangeDays, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  const delayedApprovals = useMemo(
    () => data?.delayedApprovals ?? [],
    [data?.delayedApprovals],
  );
  const pendingTopLevel = useMemo(
    () => data?.pendingLeadership ?? [],
    [data?.pendingLeadership],
  );
  const weeklyTrend = data?.weeklyTrend ?? [];
  const bottlenecks = useMemo(
    () => efficiencyData?.bottlenecks ?? [],
    [efficiencyData?.bottlenecks],
  );
  const slaSummary = slaData?.summary ?? {
    total: 0,
    compliant: 0,
    breached: 0,
    atRisk: 0,
    complianceRate: 0,
  };

  // Same /analytics/sla payload as the summary and priority rows: do not
  // substitute division-performance data here, since it applies its own
  // archived and threshold rules.
  const divisionSla = useMemo(() => {
    return (slaData?.byDivision ?? [])
      .filter((division) => division.total > 0 && !/^unassigned/i.test(division.name))
      .sort((a, b) => b.total - a.total);
  }, [slaData?.byDivision]);

  const chartDivisions = divisionSla.slice(0, TOP_DIVISIONS_LIMIT);
  const divisionAxisWidth = Math.min(
    150,
    Math.max(72, ...chartDivisions.map((division) => division.name.length * 7)),
  );
  const divisionChartHeight = Math.min(
    300,
    Math.max(160, chartDivisions.length * 34 + 44),
  );

  // Keep all priorities visible: a zero-volume priority is a neutral
  // "No items" row, not a 0% compliance failure.
  const priorityRows = slaData?.byPriority ?? [];

  const attentionRows = useMemo<AttentionRow[]>(() => {
    const rows: AttentionRow[] = [];

    escalations.forEach((escalation) => {
      rows.push({
        key: `escalation-${escalation.id}`,
        reference: escalation.correspondenceReference,
        subject: escalation.correspondenceSubject,
        meta: `Escalation · ${escalation.ruleName ?? 'SLA rule'}`,
        href: `/correspondence/${escalation.correspondence}`,
        kind: 'Escalation',
      });
    });

    delayedApprovals.forEach((item) => {
      rows.push({
        key: `delayed-${item.id}`,
        reference: item.referenceNumber,
        subject: item.subject,
        meta: `Delayed ${item.daysPending}d${item.divisionName ? ` · ${item.divisionName}` : ''}`,
        href: `/correspondence/${item.id}`,
        kind: 'Delayed',
      });
    });

    pendingTopLevel.forEach((item) => {
      rows.push({
        key: `leadership-${item.id}`,
        reference: item.referenceNumber,
        subject: item.subject,
        meta: `Leadership ${item.daysPending}d${item.divisionName ? ` · ${item.divisionName}` : ''}`,
        href: `/correspondence/${item.id}`,
        kind: 'Leadership',
      });
    });

    const seen = new Set<string>();
    return rows.filter((row) => {
      if (seen.has(row.href)) return false;
      seen.add(row.href);
      return true;
    });
  }, [delayedApprovals, pendingTopLevel, escalations]);

  const recommendedActions = useMemo<RecommendedAction[]>(() => {
    const actions: RecommendedAction[] = [];

    if (slaSummary.breached > 0) {
      actions.push({
        key: 'breaches',
        title: `Review ${itemCountLabel(slaSummary.breached)} past SLA`,
        detail: 'Open the queue and assign or escalate the oldest work.',
        href: '/inbox',
        tone: 'danger',
      });
    }

    if (slaSummary.atRisk > 0) {
      actions.push({
        key: 'at-risk',
        title: `${itemCountLabel(slaSummary.atRisk)} approaching deadline`,
        detail: 'Nudge owners before these become breaches.',
        href: '/inbox',
        tone: 'warning',
      });
    }

    if (escalations.length > 0) {
      actions.push({
        key: 'escalations',
        title: `${escalations.length} active escalation${escalations.length === 1 ? '' : 's'}`,
        detail: 'Confirm owners have acknowledged the escalation.',
        href: '/admin/workflow-sla',
        tone: 'danger',
      });
    }

    if (pendingTopLevel.length > 0) {
      actions.push({
        key: 'leadership',
        title: `${itemCountLabel(pendingTopLevel.length)} awaiting leadership`,
        detail: 'Clear the MD/ED/GM approval queue.',
        href: '/approvals',
        tone: 'info',
      });
    }

    if (delayedApprovals.length > 0) {
      actions.push({
        key: 'delayed',
        title: `${itemCountLabel(delayedApprovals.length)} delayed over 7 days`,
        detail: 'Chase approvals that are holding up correspondence.',
        href: '/approvals',
        tone: 'warning',
      });
    }

    if (bottlenecks[0]) {
      const top = bottlenecks[0];
      actions.push({
        key: 'bottleneck',
        title: `Bottleneck: ${top.divisionName}`,
        detail: `${itemCountLabel(top.pendingCount)} pending · avg ${top.avgPendingDays}d`,
        href: '/analytics/divisions',
        tone: 'info',
      });
    }

    return actions.slice(0, 4);
  }, [
    bottlenecks,
    delayedApprovals.length,
    escalations.length,
    pendingTopLevel.length,
    slaSummary.atRisk,
    slaSummary.breached,
  ]);

  const sectionFailed = {
    executive: failedSections.includes('Executive overview'),
    sla: failedSections.includes('SLA summary'),
    efficiency: failedSections.includes('Efficiency analysis'),
    escalations: failedSections.includes('Escalations'),
  };

  const isLoading = Object.values(loadingSections).some(Boolean);
  const recommendationSignalsLoading =
    loadingSections.sla ||
    loadingSections.executive ||
    loadingSections.efficiency ||
    loadingSections.escalations;
  const recommendationSignalsFailed =
    sectionFailed.sla ||
    sectionFailed.executive ||
    sectionFailed.efficiency ||
    sectionFailed.escalations;
  const attentionLoading = loadingSections.executive || loadingSections.escalations;
  const attentionFailed = sectionFailed.executive || sectionFailed.escalations;

  const headerStats =
    loadingSections.sla && !slaData ? (
      <Skeleton className="h-[68px] rounded-xl" />
    ) : slaData ? (
      <StatStrip
        items={[
          {
            key: 'total',
            label: 'Total items',
            value: slaSummary.total,
            hint: `In the last ${rangeDays} days`,
          },
          {
            key: 'compliance',
            label: 'SLA Compliance',
            value: `${slaSummary.complianceRate}%`,
            hint: `${slaSummary.compliant} of ${slaSummary.total} within SLA`,
          },
          {
            key: 'at-risk',
            label: 'At Risk',
            value: slaSummary.atRisk,
            hint: 'Approaching SLA deadline',
          },
          {
            key: 'breached',
            label: 'SLA Breached',
            value: slaSummary.breached,
            hint:
              slaSummary.total > 0
                ? `${((slaSummary.breached / slaSummary.total) * 100).toFixed(1)}% of total`
                : 'Past deadline',
          },
        ]}
      />
    ) : undefined;

  const headerActions = (
    <AnalyticsRefreshAction
      loading={isLoading}
      lastUpdated={lastUpdated}
      onRefresh={refresh}
    />
  );

  return (
    <ClientErrorBoundary>
      <div className="space-y-4">
        <AnalyticsHeaderSlots stats={headerStats} actions={headerActions} />

        <AnalyticsFilterBar>
          <span className={appType.caption}>Range</span>
          <div
            className="inline-flex rounded-lg border border-border/60 p-0.5"
            role="group"
            aria-label="Analytics date range"
          >
            {RANGE_OPTIONS.map((days) => (
              <Button
                key={days}
                type="button"
                size="sm"
                variant={rangeDays === days ? 'secondary' : 'ghost'}
                className="h-7 px-2.5 text-xs"
                aria-pressed={rangeDays === days}
                onClick={() => setRangeDays(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
        </AnalyticsFilterBar>

        {!loadingSections.sla && !slaData ? (
          <SectionError message="SLA summary unavailable." onRetry={refresh} />
        ) : null}

        {slaData && sectionFailed.sla ? (
          <SectionError message="Couldn’t refresh the SLA summary." onRetry={refresh} />
        ) : null}

        {slaData && slaSummary.total > 0 && slaSummary.total < 10 && (
          <p className={appType.caption}>
            Based on {itemCountLabel(slaSummary.total)} in the last {rangeDays} days — small
            samples can swing rates sharply.
          </p>
        )}
        {slaData && slaSummary.total === 0 && (
          <p className={appType.caption}>No correspondence in the last {rangeDays} days.</p>
        )}

        <AnalyticsPanel
          title="Recommended actions"
          description="The next things worth your attention"
        >
          {recommendationSignalsLoading && recommendedActions.length === 0 ? (
            <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
              {[0, 1].map((index) => (
                <Skeleton key={index} className="h-[68px] rounded-lg" />
              ))}
              <span className="sr-only">Loading recommendations…</span>
            </div>
          ) : recommendedActions.length === 0 ? (
            recommendationSignalsFailed ? (
              <SectionError
                message="Recommendations unavailable because some signals failed."
                onRetry={refresh}
              />
            ) : (
              <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background/40 px-3 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <div>
                  <p className="text-[13px] font-medium">Nothing needs escalation</p>
                  <p className={appType.caption}>
                    Correspondence is within SLA and approvals are moving.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {recommendationSignalsFailed ? (
                <SectionError
                  message="Some signals are unavailable; recommendations may be incomplete."
                  onRetry={refresh}
                />
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {recommendedActions.map((action) => (
                  <Link
                    key={action.key}
                    href={action.href}
                    className="group flex items-start gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 transition-colors hover:bg-background/70"
                  >
                    <span
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', toneDot[action.tone])}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug">{action.title}</p>
                      <p className={cn(appType.caption, 'mt-0.5')}>{action.detail}</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </AnalyticsPanel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <AnalyticsPanel
            title="Division SLA compliance"
            description={
              !slaData
                ? 'Compliance by division'
                : divisionSla.length > TOP_DIVISIONS_LIMIT
                  ? `Top ${TOP_DIVISIONS_LIMIT} of ${divisionSla.length} divisions by volume`
                  : `${divisionSla.length} ${divisionSla.length === 1 ? 'division' : 'divisions'} by volume`
            }
          >
            {loadingSections.sla && !slaData ? (
              <Skeleton className="h-[220px] rounded-lg" />
            ) : !slaData ? (
              <SectionError message="Division SLA data unavailable." onRetry={refresh} />
            ) : chartDivisions.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No division data in this range
              </div>
            ) : (
              <>
                <div
                  className="w-full"
                  style={{ height: divisionChartHeight }}
                  role="img"
                  aria-label="Bar chart of SLA compliance by division"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartDivisions}
                      layout="vertical"
                      margin={{ left: 4, right: 44, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal
                        stroke={chartColors.gridStroke}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 11, fill: chartColors.axisFill }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={divisionAxisWidth}
                        tick={{ fontSize: 11, fill: chartColors.axisFill }}
                      />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'SLA Compliance']} />
                      <Bar
                        dataKey="complianceRate"
                        radius={[0, 4, 4, 0]}
                        barSize={26}
                        isAnimationActive={false}
                      >
                        {chartDivisions.map((entry) => (
                          <Cell
                            key={entry.id ?? entry.name}
                            fill={chartColors.complianceColor(entry.complianceRate)}
                          />
                        ))}
                        <LabelList
                          dataKey="complianceRate"
                          position="right"
                          formatter={(value: number) => `${value}%`}
                          fill={chartColors.axisFill}
                          fontSize={11}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="sr-only">
                  {chartDivisions.map((division) => (
                    <li key={division.id ?? division.name}>
                      {division.name}: {division.complianceRate}% compliance,{' '}
                      {itemCountLabel(division.total)}.
                    </li>
                  ))}
                </ul>
              </>
            )}
          </AnalyticsPanel>

          <AnalyticsPanel title="SLA by priority" description="Where the risk sits">
            {loadingSections.sla && !slaData ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-7 rounded-md" />
                ))}
                <span className="sr-only">Loading SLA priorities…</span>
              </div>
            ) : !slaData ? (
              <SectionError message="SLA priority data unavailable." onRetry={refresh} />
            ) : priorityRows.length === 0 ? (
              <p className={appType.meta}>No priority data in this range.</p>
            ) : (
              <div className="space-y-3">
                {priorityRows.map((item) => {
                  const hasItems = item.total > 0;
                  return (
                    <div key={item.priority} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2.5 w-2.5 rounded-full',
                              !hasItems && 'bg-muted-foreground/30',
                            )}
                            style={
                              hasItems
                                ? { backgroundColor: chartColors.priorityColor(item.priority) }
                                : undefined
                            }
                          />
                          <span
                            className={cn(
                              'text-[13px] font-medium',
                              !hasItems && 'text-muted-foreground',
                            )}
                          >
                            {item.label}
                          </span>
                          {hasItems ? (
                            <span className={appType.caption}>
                              {itemCountLabel(item.total)}
                            </span>
                          ) : null}
                        </div>
                        {hasItems ? (
                          <Badge
                            variant={
                              item.complianceRate >= 80
                                ? 'default'
                                : item.complianceRate >= 60
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {item.complianceRate}%
                          </Badge>
                        ) : (
                          <span className={appType.caption}>No items</span>
                        )}
                      </div>
                      {hasItems ? (
                        <Progress
                          value={item.complianceRate}
                          className={cn(
                            'h-1.5 bg-muted/70',
                            item.complianceRate < 60 && '[&>div]:bg-destructive',
                            item.complianceRate >= 60 &&
                              item.complianceRate < 80 &&
                              '[&>div]:bg-amber-500',
                          )}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </AnalyticsPanel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnalyticsPanel
            title="Throughput"
            description={`Completed vs pending · last ${rangeDays} days`}
          >
            {loadingSections.executive && !data ? (
              <Skeleton className="h-[220px] rounded-lg" />
            ) : !data ? (
              <SectionError message="Throughput data unavailable." onRetry={refresh} />
            ) : weeklyTrend.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No correspondence activity in this range
              </div>
            ) : weeklyTrend.length === 1 ? (
              <div
                className="h-[220px]"
                role="img"
                aria-label={`Bar chart of completed and pending correspondence over the last ${rangeDays} days`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.gridStroke}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: chartColors.axisFill }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: chartColors.axisFill }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill={chartColors.lineCompleted}
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      fill={chartColors.linePending}
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                className="h-[220px]"
                role="img"
                aria-label={`Line chart of weekly completed and pending correspondence over the last ${rangeDays} days`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridStroke} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: chartColors.axisFill }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: chartColors.axisFill }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke={chartColors.lineCompleted}
                      strokeWidth={2}
                      name="Completed"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke={chartColors.linePending}
                      strokeWidth={2}
                      name="Pending"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {weeklyTrend.length > 0 && (
              <ul className="sr-only">
                {weeklyTrend.map((point) => (
                  <li key={point.week}>
                    Week of {point.week}: {point.completed} completed, {point.pending} pending.
                  </li>
                ))}
              </ul>
            )}
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Attention queue"
            description={
              attentionRows.length > 0
                ? `${itemCountLabel(attentionRows.length)} needing a decision`
                : 'Escalations, delayed approvals, and leadership backlog'
            }
            actions={
              attentionRows.length > 0 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/inbox">
                    Open inbox <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : undefined
            }
          >
            {attentionLoading && attentionRows.length === 0 ? (
              <div className="space-y-2" aria-busy="true">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-10 rounded-lg" />
                ))}
                <span className="sr-only">Loading attention queue…</span>
              </div>
            ) : attentionRows.length === 0 ? (
              attentionFailed ? (
                <SectionError message="Attention queue unavailable." onRetry={refresh} />
              ) : (
                <div className="flex h-[160px] flex-col items-center justify-center text-center">
                  <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-500" aria-hidden="true" />
                  <p className="text-[13px] font-medium">No active escalations</p>
                  <p className={appType.caption}>Every item is within SLA.</p>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {attentionFailed ? (
                  <SectionError
                    message="Some attention signals are unavailable."
                    onRetry={refresh}
                  />
                ) : null}
                <div className="space-y-1.5">
                  {attentionRows.slice(0, 6).map((row) => (
                    <Link
                      key={row.key}
                      href={row.href}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background/60"
                    >
                      <Badge
                        variant={row.kind === 'Escalation' ? 'destructive' : 'outline'}
                        className="shrink-0 text-[10px]"
                      >
                        {row.kind}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{row.reference}</p>
                        <p className={cn(appType.caption, 'truncate')}>
                          {row.subject} · {row.meta}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </AnalyticsPanel>
        </div>
      </div>
    </ClientErrorBoundary>
  );
};

const SectionError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div
    className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
    role="alert"
  >
    <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
    <span className="text-destructive">{message}</span>
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0 text-xs"
      onClick={onRetry}
    >
      Retry
    </Button>
  </div>
);

export default ExecutiveDashboardTab;
