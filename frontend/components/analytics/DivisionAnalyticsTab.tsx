"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatStrip } from "@/components/shared/StatStrip";
import { AnalyticsPanel } from "./AnalyticsPanel";
import {
  AnalyticsFilterBar,
  AnalyticsHeaderSlots,
  AnalyticsRefreshAction,
} from "./AnalyticsHeaderSlots";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  fetchEnhancedDivisionPerformance,
  fetchEnhancedSLAAnalytics,
  type EnhancedDivisionPerformance,
  type EnhancedSLAAnalytics,
} from "@/lib/sla-client";
import { useThemeChartColors } from "@/hooks/use-theme-chart-colors";
import { appType } from "@/lib/app-type";
import { cn } from "@/lib/utils";

const itemCountLabel = (count: number) => `${count} ${Number(count) === 1 ? "item" : "items"}`;

const divisionKey = (division: { id: string | null; name: string }) =>
  division.id
    ? `id:${division.id}`
    : `name:${division.name.trim().toLowerCase()}`;

export function DivisionAnalyticsTab() {
  const chartColors = useThemeChartColors();
  const { directorates } = useOrganization();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [directorateId, setDirectorateId] = useState("all");
  const [data, setData] = useState<EnhancedDivisionPerformance | null>(null);
  const [slaData, setSlaData] = useState<EnhancedSLAAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaError, setSlaError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setSlaError(null);

      // The SLA chart, summary, and priority breakdown must all come from the
      // same /analytics/sla payload. The division-performance endpoint is only
      // used here for workload, backlog, and throughput.
      const [divisionResult, slaResult] = await Promise.allSettled([
        fetchEnhancedDivisionPerformance({
          range: parseInt(selectedPeriod, 10),
          directorateId,
        }),
        fetchEnhancedSLAAnalytics({ range: parseInt(selectedPeriod, 10) }),
      ]);

      if (ignore) return;

      if (divisionResult.status === "fulfilled") {
        setData(divisionResult.value);
      } else {
        setError(
          divisionResult.reason instanceof Error
            ? divisionResult.reason.message
            : "Failed to load division analytics",
        );
      }

      if (slaResult.status === "fulfilled") {
        setSlaData(slaResult.value);
      } else {
        setSlaData(null);
        setSlaError(
          slaResult.reason instanceof Error
            ? slaResult.reason.message
            : "Failed to load SLA analytics",
        );
      }

      if (
        divisionResult.status === "fulfilled" ||
        slaResult.status === "fulfilled"
      ) {
        setLastUpdated(new Date());
      }

      setLoading(false);
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [selectedPeriod, directorateId, retryToken]);

  const divisions = useMemo(() => {
    return (data?.divisions ?? []).filter(
      (div) =>
        div.workload > 0 &&
        !/^unassigned(\s+division)?$/i.test(div.name.trim()),
    );
  }, [data?.divisions]);

  const detailRows = useMemo(
    () => divisions.slice().sort((a, b) => b.workload - a.workload).slice(0, 12),
    [divisions],
  );

  // Match SLA rows to the workload rows so the directorate filter still applies.
  const allowedDivisionKeys = useMemo(
    () => new Set(divisions.map((division) => divisionKey(division))),
    [divisions],
  );

  const slaByDivision = useMemo(() => {
    const map = new Map<string, EnhancedSLAAnalytics["byDivision"][number]>();
    (slaData?.byDivision ?? []).forEach((division) => {
      map.set(divisionKey(division), division);
    });
    return map;
  }, [slaData?.byDivision]);

  const slaScopeRows = useMemo(
    () =>
      (slaData?.byDivision ?? []).filter(
        (division) =>
          division.total > 0 &&
          !/^unassigned(\s+division)?$/i.test(division.name.trim()) &&
          allowedDivisionKeys.has(divisionKey(division)),
      ),
    [allowedDivisionKeys, slaData?.byDivision],
  );

  const slaChartRows = useMemo(
    () => slaScopeRows.slice().sort((a, b) => b.total - a.total).slice(0, 10),
    [slaScopeRows],
  );

  const avgSlaCompliance = useMemo(() => {
    const totals = slaScopeRows.reduce(
      (acc, division) => ({
        total: acc.total + division.total,
        compliant: acc.compliant + division.compliant,
      }),
      { total: 0, compliant: 0 },
    );
    return totals.total > 0
      ? Math.round((totals.compliant / totals.total) * 10000) / 100
      : null;
  }, [slaScopeRows]);

  const attentionRows = useMemo(() => {
    return divisions
      .map((division) => ({
        division,
        rate: slaByDivision.get(divisionKey(division))?.complianceRate ?? null,
      }))
      .filter(
        (row): row is { division: (typeof divisions)[number]; rate: number } =>
          row.rate !== null && row.rate < 80,
      )
      .sort((a, b) => a.rate - b.rate);
  }, [divisions, slaByDivision]);

  const slaRateFor = (division: (typeof divisions)[number]) =>
    slaByDivision.get(divisionKey(division))?.complianceRate ?? null;

  const axisWidth = Math.min(
    150,
    Math.max(76, ...slaChartRows.map((division) => division.name.length * 7)),
  );
  const chartHeight = Math.min(320, Math.max(160, slaChartRows.length * 32 + 40));

  const retry = () => setRetryToken((token) => token + 1);
  const isLoadingFirst = loading && !data;

  const headerStats = data ? (
    <StatStrip
      items={[
        {
          key: "divisions",
          label: "Active Divisions",
          value: divisions.length,
          hint: "With workload in this period",
        },
        {
          key: "workload",
          label: "Total Workload",
          value: data.summary.totalWorkload,
          hint: "Items handled",
        },
        {
          key: "completion",
          label: "Avg Completion",
          value: `${data.summary.avgCompletionRate}%`,
          hint: "Across active units",
        },
        {
          key: "sla",
          label: "Avg SLA Compliance",
          value: avgSlaCompliance !== null ? `${avgSlaCompliance}%` : "—",
          hint: slaError ? "SLA data unavailable" : "Across active units",
        },
      ]}
    />
  ) : isLoadingFirst ? (
    <Skeleton className="h-[68px] rounded-xl" />
  ) : undefined;

  const headerActions = (
    <AnalyticsRefreshAction
      loading={loading}
      lastUpdated={lastUpdated}
      onRefresh={retry}
      idleLabel="Division and port metrics"
    />
  );

  return (
    <div className="space-y-4">
      <AnalyticsHeaderSlots stats={headerStats} actions={headerActions} />

      <AnalyticsFilterBar>
        <div className="flex items-center gap-2">
          <span className={appType.caption}>Period</span>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="h-8 w-40 text-xs" aria-label="Division period">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className={appType.caption}>Directorate</span>
          <Select value={directorateId} onValueChange={setDirectorateId}>
            <SelectTrigger className="h-8 w-56 text-xs" aria-label="Filter by directorate">
              <SelectValue placeholder="Directorate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directorates</SelectItem>
              {directorates.map((d) => (
                <SelectItem key={d.id as string} value={d.id as string}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AnalyticsFilterBar>

      {error && !data ? (
        <ErrorState
          title="Couldn’t load division analytics"
          message={error}
          onRetry={retry}
          retryLabel="Retry"
        />
      ) : isLoadingFirst ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
          <Skeleton className="h-[240px] rounded-xl" />
          <span className="sr-only">Loading division and port analytics…</span>
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

          {slaError && (
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm"
              role="alert"
            >
              <span className="text-destructive">
                SLA breakdown unavailable. Workload data is still shown.
              </span>
              <button type="button" className="font-medium underline" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <AnalyticsPanel
              title="SLA compliance by division"
              description={
                slaScopeRows.length > slaChartRows.length
                  ? `Top ${slaChartRows.length} of ${slaScopeRows.length} active units by correspondence volume`
                  : "Compliance across active units"
              }
            >
              {slaChartRows.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  {slaError ? "SLA data unavailable" : "No division SLA data for this filter."}
                </div>
              ) : (
                <>
                  <div
                    className="w-full"
                    style={{ height: chartHeight }}
                    role="img"
                    aria-label="Bar chart of SLA compliance by division"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={slaChartRows}
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
                          width={axisWidth}
                          tick={{ fontSize: 11, fill: chartColors.axisFill }}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, "SLA Compliance"]}
                        />
                        <Bar
                          dataKey="complianceRate"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                          isAnimationActive={false}
                        >
                          {slaChartRows.map((entry) => (
                            <Cell
                              key={entry.id ?? entry.name}
                              fill={chartColors.divisionComplianceColor(entry.complianceRate)}
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
                    {slaChartRows.map((division) => (
                      <li key={division.id ?? division.name}>
                        {division.name}: {division.complianceRate}% SLA,{" "}
                        {itemCountLabel(division.total)}.
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              title="Needs attention"
              description="Divisions below 80% SLA compliance"
            >
              {slaError ? (
                <div className="flex h-[200px] flex-col items-center justify-center text-center">
                  <p className="text-[13px] font-medium">SLA data unavailable</p>
                  <p className={appType.caption}>Retry to load division compliance.</p>
                </div>
              ) : attentionRows.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center text-center">
                  <p className="text-[13px] font-medium">All active divisions are on target</p>
                  <p className={appType.caption}>No unit is below 80% SLA compliance.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attentionRows.slice(0, 6).map(({ division, rate }) => (
                    <div
                      key={division.id ?? division.name}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{division.name}</p>
                        <p className={cn(appType.caption, "truncate")}>
                          {division.fullName}
                        </p>
                      </div>
                      <Badge
                        variant={rate < 60 ? "destructive" : "secondary"}
                        className="shrink-0"
                      >
                        {rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </AnalyticsPanel>
          </div>

          <AnalyticsPanel
            title="Division detail"
            description={
              divisions.length > detailRows.length
                ? `Top ${detailRows.length} of ${divisions.length} active units by workload`
                : "Workload, backlog, and throughput by active unit"
            }
          >
            {detailRows.length === 0 ? (
              <p className={cn(appType.meta, "py-6 text-center")}>
                No division workload for this filter.
              </p>
            ) : (
              <div className="space-y-2">
                {detailRows.map((division) => (
                  <div
                    key={division.id ?? division.name}
                    className="rounded-lg border border-border/50 bg-background/30 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{division.name}</p>
                        <p className={cn(appType.caption, "truncate")}>
                          {division.fullName}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{division.workload} workload</Badge>
                        <Badge variant="outline">{division.backlog} backlog</Badge>
                        <Badge variant="outline">{division.throughput}/day</Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={slaRateFor(division) ?? 0} className="h-1.5" />
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {slaRateFor(division) !== null ? `${slaRateFor(division)}%` : "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {division.completed} completed · {division.pending} pending
                      </span>
                      <span>
                        {slaRateFor(division) !== null
                          ? `${slaRateFor(division)}% SLA`
                          : "SLA —"}{" "}
                        · {division.completionRate}% completion
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnalyticsPanel>
        </>
      ) : null}
    </div>
  );
}
