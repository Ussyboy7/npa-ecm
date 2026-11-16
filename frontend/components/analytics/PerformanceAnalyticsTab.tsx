"use client";

import { useEffect, useMemo, useState } from 'react';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatStrip } from '@/components/shared/StatStrip';
import { ErrorState } from '@/components/shared/ErrorState';
import { AnalyticsPanel } from './AnalyticsPanel';
import {
  AnalyticsFilterBar,
  AnalyticsHeaderSlots,
  AnalyticsRefreshAction,
} from './AnalyticsHeaderSlots';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchPerformanceAnalytics, type PerformanceAnalytics } from '@/lib/analytics-client';
import { useThemeChartColors } from '@/hooks/use-theme-chart-colors';
import { appType } from '@/lib/app-type';
import { cn } from '@/lib/utils';

const itemCountLabel = (count: number) => `${count} ${Number(count) === 1 ? 'item' : 'items'}`;
const TOP_DIVISIONS_LIMIT = 8;

export const PerformanceAnalyticsTab = () => {
  const chartColors = useThemeChartColors();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [data, setData] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchPerformanceAnalytics(selectedPeriod);
        if (!ignore) {
          setData(response);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [selectedPeriod, retryToken]);

  const slaMetrics = data?.sla ?? { total: 0, compliant: 0, breached: 0, complianceRate: 0 };
  const turnaroundMetrics = data?.turnaround ?? { average: 0, fastest: 0, slowest: 0 };
  const divisionPerformance = useMemo(
    () => (data?.divisionPerformance ?? []).filter((division) => division.completed > 0),
    [data],
  );
  const responseDistribution = useMemo(() => data?.responseDistribution ?? [], [data]);
  const rolePerformance = useMemo(() => data?.rolePerformance ?? [], [data]);

  const topDivisions = useMemo(
    () =>
      divisionPerformance
        .slice()
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, TOP_DIVISIONS_LIMIT),
    [divisionPerformance],
  );

  const divisionChartDescription =
    divisionPerformance.length > topDivisions.length
      ? `Top ${topDivisions.length} of ${divisionPerformance.length} divisions by completion`
      : divisionPerformance.length === 1
        ? '1 division by completion'
        : divisionPerformance.length > 1
          ? `All ${divisionPerformance.length} divisions by completion`
          : 'Completion by division';

  const divisionAxisWidth = Math.min(
    160,
    Math.max(80, ...topDivisions.map((division) => division.name.length * 7)),
  );
  const completionChartHeight = Math.min(
    300,
    Math.max(170, topDivisions.length * 30 + 40),
  );

  const hasResponseData = responseDistribution.some((entry) => entry.count > 0);

  const retry = () => setRetryToken((token) => token + 1);

  const headerStats = data ? (
    <StatStrip
      wrap
      items={[
        {
          key: 'compliance',
          label: 'SLA Compliance',
          value: slaMetrics.total > 0 ? `${slaMetrics.complianceRate}%` : '—',
          hint:
            slaMetrics.total > 0
              ? `${slaMetrics.compliant} of ${slaMetrics.total} within SLA`
              : 'No items in this period',
        },
        {
          key: 'turnaround',
          label: 'Avg Turnaround',
          value:
            slaMetrics.total > 0 ? `${turnaroundMetrics.average.toFixed(1)} days` : '—',
          hint: 'From request to completion',
        },
        {
          key: 'breached',
          label: 'SLA Breached',
          value: slaMetrics.breached,
          hint:
            slaMetrics.total > 0
              ? `${((slaMetrics.breached / slaMetrics.total) * 100).toFixed(1)}% of total`
              : 'No items',
        },
        {
          key: 'total',
          label: 'Total Items',
          value: slaMetrics.total,
          hint: 'Correspondence processed',
        },
      ]}
    />
  ) : loading ? (
    <Skeleton className="h-[68px] rounded-xl" />
  ) : undefined;

  const headerActions = (
    <AnalyticsRefreshAction
      loading={loading}
      lastUpdated={lastUpdated}
      onRefresh={retry}
      idleLabel="Completed correspondence in this period"
    />
  );

  return (
    <ClientErrorBoundary>
      <div className="space-y-4">
        <AnalyticsHeaderSlots stats={headerStats} actions={headerActions} />

        <AnalyticsFilterBar>
          <span className={appType.caption}>Period</span>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="h-8 w-44 text-xs" aria-label="Performance period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </AnalyticsFilterBar>

        {error && !data ? (
          <ErrorState
            title="Couldn’t load performance analytics"
            message={error}
            onRetry={retry}
            retryLabel="Retry"
          />
        ) : loading && !data ? (
          <div className="space-y-4" aria-busy="true" aria-live="polite">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[260px] rounded-xl" />
            <span className="sr-only">Loading performance analytics…</span>
          </div>
        ) : data ? (
          <>
            {error && (
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm"
                role="alert"
              >
                <span className="text-destructive">{error}</span>
                <button type="button" className="font-medium underline" onClick={retry}>
                  Retry
                </button>
              </div>
            )}

            <AnalyticsPanel
              title="SLA & turnaround"
              description={`Items within and outside SLA targets · last ${selectedPeriod} days`}
            >
              {slaMetrics.total === 0 ? (
                <div className="flex h-[160px] flex-col items-center justify-center text-center">
                  <p className="text-[13px] font-medium">Nothing was completed in this period</p>
                  <p className={appType.caption}>
                    Change the period or check back once work is completed.
                  </p>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-baseline justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-medium">Compliance split</p>
                      <p className={appType.caption}>
                        {slaMetrics.total > 0
                          ? `${itemCountLabel(slaMetrics.total)} measured`
                          : 'No items in this period'}
                      </p>
                    </div>
                    <Badge variant={slaMetrics.breached > 0 ? 'destructive' : 'secondary'}>
                      {slaMetrics.total > 0 ? `${slaMetrics.complianceRate}%` : 'No data'}
                    </Badge>
                  </div>

                  {slaMetrics.total === 0 ? (
                    <p className={cn(appType.meta, 'py-6 text-center')}>
                      Nothing was completed in this period.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="font-medium">Within SLA</span>
                          <span className="text-muted-foreground">
                            {slaMetrics.compliant}
                          </span>
                        </div>
                        <Progress
                          value={(slaMetrics.compliant / slaMetrics.total) * 100}
                          className="h-1.5"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="font-medium">SLA breached</span>
                          <span className="text-muted-foreground">{slaMetrics.breached}</span>
                        </div>
                        <Progress
                          value={(slaMetrics.breached / slaMetrics.total) * 100}
                          className="h-1.5 [&>div]:bg-destructive"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
                        <div>
                          <p className={appType.caption}>Fastest</p>
                          <p className="text-[13px] font-medium">
                            {turnaroundMetrics.fastest.toFixed(1)} days
                          </p>
                        </div>
                        <div>
                          <p className={appType.caption}>Slowest</p>
                          <p className="text-[13px] font-medium">
                            {turnaroundMetrics.slowest.toFixed(1)} days
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[13px] font-medium">Response time distribution</p>
                  <p className={cn(appType.caption, 'mb-2')}>Completed items by time bucket</p>
                  {!hasResponseData ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                      No completed items in this period
                    </div>
                  ) : (
                    <div
                      className="h-[220px]"
                      role="img"
                      aria-label="Bar chart of response time distribution"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={responseDistribution} margin={{ top: 8, right: 8 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={chartColors.gridStroke}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: chartColors.axisFill }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: chartColors.axisFill }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name="Items"
                            fill={chartColors.lineCompleted}
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                          >
                            <LabelList
                              dataKey="count"
                              position="top"
                              fill={chartColors.axisFill}
                              fontSize={11}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Division performance"
              description="Completion rate and average turnaround by division"
            >
              {divisionPerformance.length === 0 ? (
                <p className={cn(appType.meta, 'py-8 text-center')}>
                  No division activity in this period.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div>
                    <p className="text-[13px] font-medium">Completion rate</p>
                    <p className={cn(appType.caption, 'mb-2')}>{divisionChartDescription}</p>
                    <div
                      className="w-full"
                      style={{ height: completionChartHeight }}
                      role="img"
                      aria-label="Bar chart of division completion rates"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topDivisions}
                          layout="vertical"
                          margin={{ left: 4, right: 38, top: 4, bottom: 4 }}
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
                          <Tooltip
                            formatter={(value: number) => [`${value}%`, 'Completion']}
                          />
                          <Bar
                            dataKey="completionRate"
                            fill={chartColors.lineCompleted}
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                          >
                            <LabelList
                              dataKey="completionRate"
                              position="right"
                              formatter={(value: number) => `${value}%`}
                              fill={chartColors.axisFill}
                              fontSize={11}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <p className="text-[13px] font-medium">Division rankings</p>
                    <p className={cn(appType.caption, 'mb-3')}>
                      Sorted by completion rate
                      {divisionPerformance.length > topDivisions.length
                        ? ` · top ${topDivisions.length} of ${divisionPerformance.length}`
                        : ''}
                    </p>
                    <div className="space-y-3">
                      {topDivisions.map((division, index) => (
                        <div key={division.name} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[13px]">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="w-4 shrink-0 text-[11px] text-muted-foreground">
                                {index + 1}
                              </span>
                              <span className="truncate font-medium">{division.fullName}</span>
                            </div>
                            <span className="shrink-0 text-muted-foreground">
                              {division.completionRate}% · {division.avgTurnaround}d avg
                            </span>
                          </div>
                          <Progress value={division.completionRate} className="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Role activity"
              description="Recorded actions and average response by role"
            >
              {rolePerformance.length === 0 ? (
                <p className={cn(appType.meta, 'py-6 text-center')}>
                  No role activity recorded for this window.
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {rolePerformance.map((role) => (
                    <div
                      key={role.role}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{role.role}</p>
                        <p className={appType.caption}>
                          Avg response {role.avgResponseTime} days
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {itemCountLabel(role.actions)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </AnalyticsPanel>
          </>
        ) : null}
      </div>
    </ClientErrorBoundary>
  );
};
