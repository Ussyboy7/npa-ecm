"use client";

import { useState, useEffect } from 'react';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatStrip } from '@/components/shared/StatStrip';
import { ErrorState } from '@/components/shared/ErrorState';
import { AnalyticsPanel } from './AnalyticsPanel';
import {
  AnalyticsFilterBar,
  AnalyticsHeaderSlots,
  AnalyticsRefreshAction,
} from './AnalyticsHeaderSlots';
import { appType } from '@/lib/app-type';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';
import { formatDate } from '@/lib/datetime';
import { useThemeChartColors } from '@/hooks/use-theme-chart-colors';
import { readThemeHsl, THEME_HSL } from '@/lib/theme-colors';

interface CaseStatistics {
  summary: {
    total_cases: number;
    open_cases: number;
    in_progress_cases: number;
    resolved_cases: number;
    closed_cases: number;
    archived_cases: number;
    cases_with_packages: number;
    avg_resolution_days: number | null;
  };
  breakdown: {
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  };
  trends: {
    cases_over_time: Array<{ date: string | null; count: number }>;
  };
  top_assignments: {
    by_division: Array<{ id: string; name: string; count: number }>;
    by_department: Array<{ id: string; name: string; count: number }>;
    by_user: Array<{ id: string; name: string; count: number }>;
  };
  range_days: number;
}

const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed', 'archived'];

const statusLabel = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const CaseAnalyticsTab = () => {
  const chartColors = useThemeChartColors();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CaseStatistics | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadStatistics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<CaseStatistics>(`/analytics/cases/?range=${rangeDays}`);
        if (!ignore) {
          setStats(response);
          setLastUpdated(new Date());
        }
      } catch (err: unknown) {
        logError('Failed to load case statistics', err);
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load case statistics');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadStatistics();
    return () => {
      ignore = true;
    };
  }, [rangeDays, retryToken]);

  const retry = () => setRetryToken((token) => token + 1);

  const statusColor = (status: string) => {
    switch (status) {
      case 'open':
        return chartColors.lineInfo;
      case 'in_progress':
        return readThemeHsl('--warning', THEME_HSL.warning);
      case 'resolved':
        return chartColors.lineCompleted;
      case 'closed':
        return readThemeHsl('--muted-foreground', THEME_HSL.mutedForeground);
      case 'archived':
        return readThemeHsl('--accent', THEME_HSL.accent);
      default:
        return chartColors.axisFill;
    }
  };

  const statusData = (() => {
    if (!stats) return [];
    const known = STATUS_ORDER.map((status) => ({
      status,
      label: statusLabel(status),
      count: stats.breakdown.by_status[status] ?? 0,
    }));
    const extra = Object.entries(stats.breakdown.by_status)
      .filter(([status]) => !STATUS_ORDER.includes(status))
      .map(([status, count]) => ({ status, label: statusLabel(status), count }));
    return [...known, ...extra].filter((entry) => entry.count > 0);
  })();

  const trendData = (stats?.trends.cases_over_time ?? [])
    .filter((point) => point.date)
    .map((point) => ({
      date: point.date as string,
      label: formatDate(point.date as string, 'en-GB', { month: 'short', day: 'numeric' }),
      count: point.count,
    }));

  const hasAssignments =
    (stats?.top_assignments.by_division.length ?? 0) +
      (stats?.top_assignments.by_department.length ?? 0) +
      (stats?.top_assignments.by_user.length ?? 0) >
    0;

  const headerStats = stats ? (
    <StatStrip
      items={[
        {
          key: 'total',
          label: 'Total Cases',
          value: stats.summary.total_cases,
          hint: `Cases opened in the last ${rangeDays} days`,
        },
        {
          key: 'resolution',
          label: 'Resolution Rate',
          value:
            stats.summary.total_cases > 0
              ? `${((stats.summary.resolved_cases / stats.summary.total_cases) * 100).toFixed(1)}%`
              : '—',
          hint: `${stats.summary.resolved_cases} of ${stats.summary.total_cases} resolved`,
        },
        {
          key: 'open',
          label: 'Open Cases',
          value: stats.summary.open_cases,
          hint:
            stats.summary.total_cases > 0
              ? `${((stats.summary.open_cases / stats.summary.total_cases) * 100).toFixed(1)}% of total`
              : 'Currently open',
        },
        {
          key: 'avg',
          label: 'Avg Resolution',
          value: stats.summary.avg_resolution_days
            ? `${stats.summary.avg_resolution_days.toFixed(1)} days`
            : '—',
          hint: 'Average time to resolve',
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
      idleLabel="Cases opened in this range"
    />
  );

  return (
    <ClientErrorBoundary>
      <div className="space-y-4">
        <AnalyticsHeaderSlots stats={headerStats} actions={headerActions} />

        <AnalyticsFilterBar>
          <span className={appType.caption}>Period</span>
          <Select value={String(rangeDays)} onValueChange={(value) => setRangeDays(Number(value))}>
            <SelectTrigger className="h-8 w-40 text-xs" aria-label="Case analytics period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </AnalyticsFilterBar>

        {error && !stats ? (
          <ErrorState
            title="Couldn’t load case analytics"
            message={error}
            onRetry={retry}
            retryLabel="Retry"
          />
        ) : loading && !stats ? (
          <div className="space-y-4" aria-busy="true" aria-live="polite">
            <Skeleton className="h-[280px] rounded-xl" />
            <Skeleton className="h-[220px] rounded-xl" />
            <Skeleton className="h-[280px] rounded-xl" />
            <span className="sr-only">Loading case analytics…</span>
          </div>
        ) : stats ? (
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

            <AnalyticsPanel title="Case mix" description="Status, type, and priority distribution">
              {stats.summary.total_cases === 0 ? (
                <p className={cn(appType.meta, 'py-8 text-center')}>
                  No cases opened in this period.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-medium">By status</p>
                        <p className={appType.caption}>
                          {stats.summary.open_cases} open · {stats.summary.in_progress_cases} in
                          progress
                        </p>
                      </div>
                    </div>
                    <div
                      className="h-[200px]"
                      role="img"
                      aria-label="Donut chart of cases by status"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            dataKey="count"
                            nameKey="label"
                            innerRadius={52}
                            outerRadius={78}
                            paddingAngle={statusData.length > 1 ? 2 : 0}
                            strokeWidth={0}
                          >
                            {statusData.map((entry) => (
                              <Cell key={entry.status} fill={statusColor(entry.status)} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value}`, 'Cases']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {statusData.map((entry) => (
                        <div
                          key={entry.status}
                          className="flex items-center justify-between gap-2 text-[12px]"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: statusColor(entry.status) }}
                            />
                            <span className="truncate text-muted-foreground">{entry.label}</span>
                          </span>
                          <span className="tabular-nums font-medium">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <p className="text-[13px] font-medium">By type</p>
                      <p className={cn(appType.caption, 'mb-2')}>Case category</p>
                      {Object.keys(stats.breakdown.by_type).length === 0 ? (
                        <p className={appType.meta}>No type data.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(stats.breakdown.by_type)
                            .sort(([, a], [, b]) => b - a)
                            .map(([type, count]) => (
                              <div
                                key={type}
                                className="flex items-center justify-between gap-2 text-[13px]"
                              >
                                <span className="truncate capitalize">
                                  {type.replace(/_/g, ' ')}
                                </span>
                                <Badge variant="secondary" className="shrink-0 tabular-nums">
                                  {count}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[13px] font-medium">By priority</p>
                      <p className={cn(appType.caption, 'mb-2')}>Urgency mix</p>
                      {Object.keys(stats.breakdown.by_priority).length === 0 ? (
                        <p className={appType.meta}>No priority data.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(stats.breakdown.by_priority)
                            .sort(([, a], [, b]) => b - a)
                            .map(([priority, count]) => (
                              <div
                                key={priority}
                                className="flex items-center justify-between gap-2 text-[13px]"
                              >
                                <span className="flex items-center gap-1.5 capitalize">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: chartColors.priorityColor(priority) }}
                                  />
                                  {priority}
                                </span>
                                <Badge variant="secondary" className="shrink-0 tabular-nums">
                                  {count}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel title="Assignments" description="Where cases are concentrated">
              {!hasAssignments ? (
                <p className={cn(appType.meta, 'py-6 text-center')}>
                  No case assignments in this period.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {(
                    [
                      { key: 'division', title: 'Divisions', rows: stats.top_assignments.by_division },
                      {
                        key: 'department',
                        title: 'Departments',
                        rows: stats.top_assignments.by_department,
                      },
                      { key: 'user', title: 'People', rows: stats.top_assignments.by_user },
                    ] as const
                  ).map((group) => (
                    <div key={group.key}>
                      <p className="text-[13px] font-medium">{group.title}</p>
                      <div className="mt-2 space-y-1.5">
                        {group.rows.length === 0 ? (
                          <p className={appType.meta}>No assignments.</p>
                        ) : (
                          group.rows.slice(0, 5).map((item) => (
                            <div
                              key={item.id as string}
                              className="flex items-center justify-between gap-2 text-[13px]"
                            >
                              <span className="truncate">{item.name}</span>
                              <Badge variant="secondary" className="shrink-0 tabular-nums">
                                {item.count}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Case volume"
              description={`Daily case creation · last ${rangeDays} days`}
            >
              {trendData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  No daily trend data for this period
                </div>
              ) : (
                <>
                  <div
                    className="h-[220px]"
                    role="img"
                    aria-label="Area chart of daily case creation"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="caseVolumeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColors.lineInfo} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={chartColors.lineInfo} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={chartColors.gridStroke}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: chartColors.axisFill }}
                          minTickGap={24}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: chartColors.axisFill }}
                        />
                        <Tooltip formatter={(value: number) => [`${value}`, 'Cases']} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke={chartColors.lineInfo}
                          strokeWidth={2}
                          fill="url(#caseVolumeFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="sr-only">
                    {trendData.map((point) => (
                      <li key={point.date}>
                        {point.label}: {point.count} cases.
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AnalyticsPanel>
          </>
        ) : null}
      </div>
    </ClientErrorBoundary>
  );
};
