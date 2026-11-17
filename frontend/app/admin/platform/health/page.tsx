"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { AdminHubTabList } from "@/components/admin/AdminHubTabList";
import { PlatformTabList } from "@/components/admin/PlatformTabList";
import { StatStrip } from "@/components/shared/StatStrip";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import {
  fetchDashboardMetrics,
  fetchDashboardAlerts,
  downloadLatestBackup,
  type DashboardMetrics,
  type DashboardAlerts,
} from "@/lib/admin-dashboard-api";
import { apiFetch } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Server,
  Database,
  HardDrive,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";

const POLL_INTERVAL_MS = 30_000;

type HealthStatus = "healthy" | "warning" | "error" | "unknown" | "missing";

function statusColor(status: string) {
  switch (status) {
    case "healthy":
      return "text-green-500";
    case "warning":
      return "text-yellow-500";
    case "error":
    case "missing":
    case "unhealthy":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

function statusBorderClass(status: string) {
  switch (status) {
    case "healthy":
      return "border-green-500/30";
    case "warning":
      return "border-amber-500/30";
    case "error":
    case "missing":
      return "border-red-500/30";
    default:
      return "border-border/60";
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "healthy") {
    return (
      <UiBadge className="bg-green-500/10 text-green-700 border-green-500/20 text-xs dark:text-green-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Healthy
      </UiBadge>
    );
  }
  if (status === "warning") {
    return (
      <UiBadge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 text-xs dark:text-yellow-300">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Warning
      </UiBadge>
    );
  }
  if (status === "error") {
    return (
      <UiBadge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs dark:text-red-300">
        <AlertCircle className="h-3 w-3 mr-1" />
        Error
      </UiBadge>
    );
  }
  if (status === "missing") {
    return (
      <UiBadge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs dark:text-red-300">
        <AlertCircle className="h-3 w-3 mr-1" />
        Missing
      </UiBadge>
    );
  }
  return (
    <UiBadge variant="outline" className="text-xs">
      Unknown
    </UiBadge>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground sm:text-right break-all">{value}</span>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

function ServiceRow({
  label,
  icon,
  status,
  detail,
}: {
  label: string;
  icon: React.ReactNode;
  status: HealthStatus;
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-3 last:border-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${statusColor(status)}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {detail && <p className="text-xs text-muted-foreground break-words">{detail}</p>}
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

interface SystemHealthItem {
  name: string;
  status: string;
  icon?: string;
  uptime?: string | null;
  detail?: string;
  diskUsage?: { total_gb: number; free_gb: number; used_pct: number };
}

export default function SystemHealthPage() {
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [readiness, setReadiness] = useState<Record<string, string>>({});
  const [readinessOverall, setReadinessOverall] = useState<HealthStatus>("unknown");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const isMountedRef = useRef(true);

  const canAccess = permissions.canAccessSystemHealth || currentUser?.isSuperuser;
  const canDownloadBackup = Boolean(currentUser?.isSuperuser);

  const loadData = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!canAccess) return;
      if (!opts.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const [metricsResult, readinessResult, alertsResult] = await Promise.all([
          fetchDashboardMetrics(),
          apiFetch<{ status: string; services: Record<string, string> }>("/health/").catch(() => ({
            status: "unhealthy" as string,
            services: { api: "unhealthy: check failed" } as Record<string, string>,
          })),
          fetchDashboardAlerts().catch(() => null),
        ]);
        if (!isMountedRef.current) return;
        setMetrics(metricsResult);
        setAlerts(alertsResult);
        const services = readinessResult.services || {};
        setReadiness(
          Object.fromEntries(
            Object.entries(services).filter((entry): entry is [string, string] => entry[1] != null),
          ),
        );
        const overall = readinessResult.status === "healthy" ? "healthy" : "error";
        setReadinessOverall(overall as HealthStatus);
        setLastUpdated(Date.now());
      } catch (err) {
        logError("Failed to load system health", err);
        if (!opts.silent && isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load system health");
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [canAccess],
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadData({ silent: true });
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, [loadData, refreshing]);

  const handleDownloadBackup = useCallback(async () => {
    if (!canDownloadBackup || downloadingBackup) return;
    setDownloadingBackup(true);
    try {
      const blob = await downloadLatestBackup();
      const filename = metrics?.backup?.filename || "npa-backup.dump";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      logError("Failed to download backup", err);
    } finally {
      if (isMountedRef.current) setDownloadingBackup(false);
    }
  }, [canDownloadBackup, downloadingBackup, metrics?.backup?.filename]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadData();
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadData({ silent: true });
    }, POLL_INTERVAL_MS);
    const tickId = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      clearInterval(tickId);
    };
  }, [loadData]);

  if (!currentUser) return null;

  if (!canAccess) {
    return (
      <AdminPageShell title="Platform" subtitle="ICT operations dashboard" icon={Activity}>
        <div className="mt-4 space-y-3">
          <AdminHubTabList />
          <PlatformTabList />
        </div>
        <PermissionDeniedCard
          title="ICT Admin Access Required"
          check={null}
          fallbackMessage="System health monitoring is restricted to ICT administrators."
        />
      </AdminPageShell>
    );
  }

  // Derived statuses
  const systemHealthItems: SystemHealthItem[] = metrics?.systemHealth || [];
  const apiItem = systemHealthItems.find((s) => s.name === "API Server");
  const dbItem = systemHealthItems.find((s) => s.name === "Database");
  const storageItem = systemHealthItems.find((s) => s.name === "File Storage");
  const diskUsage = storageItem?.diskUsage;

  const cacheState = readiness["cache"];
  const cacheStatus: HealthStatus = cacheState === "healthy" ? "healthy" : cacheState ? "error" : "unknown";
  const brokerState = readiness["celery_broker"];
  const brokerStatus: HealthStatus =
    brokerState === "healthy" ? "healthy" : brokerState ? "error" : "unknown";

  const coreStatuses: HealthStatus[] = [
    ...systemHealthItems.map((s) => (s.status as HealthStatus) || "unknown"),
    readinessOverall,
  ];
  const overallStatus: HealthStatus = (() => {
    if (coreStatuses.includes("error")) return "error";
    if (coreStatuses.includes("warning")) return "warning";
    if (coreStatuses.length > 0 && coreStatuses.every((s) => s === "healthy")) return "healthy";
    return "unknown";
  })();

  const overallLabel =
    overallStatus === "healthy"
      ? "Runtime services operational"
      : overallStatus === "warning"
        ? "One or more services need attention"
        : overallStatus === "error"
          ? "Service disruption detected"
          : "Status unavailable";

  const backupStatus = metrics?.backup;
  const backupDisplayStatus: HealthStatus = (backupStatus?.status || "unknown") as HealthStatus;
  const backupSchedule = alerts?.backup_schedule;
  const backupScheduleLabel = backupSchedule
    ? backupSchedule.scheduled
      ? backupSchedule.task
      : "None configured"
    : "—";

  const updatedLabel = (() => {
    if (!lastUpdated) return "—";
    const seconds = Math.max(0, Math.round((nowTick - lastUpdated) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
  })();

  return (
    <AdminPageShell
      title="Platform"
      subtitle="Live infrastructure monitoring — API process, database, disk volume, cache, backups, and API performance."
      icon={Activity}
    >
      <div className="mt-4 space-y-3">
        <AdminHubTabList />
        <PlatformTabList />
      </div>
      <ClientErrorBoundary>
        {loading && !metrics ? (
          <DetailSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadData()} />
        ) : (
          <div className="space-y-6">
            {/* Overall status + freshness */}
            <div className={`flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between ${statusBorderClass(overallStatus)}`}>
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-5 w-5 shrink-0 ${statusColor(overallStatus)}`} />
                <div>
                  <p className="font-semibold text-foreground">{overallLabel}</p>
                  <p className="text-xs text-muted-foreground">Auto-refreshed every 30 seconds</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Updated {updatedLabel}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={refreshing}
                  onClick={() => void handleRefresh()}
                >
                  {refreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              {/* Services + performance */}
              <div className="space-y-6 xl:col-span-2">
                <section>
                  <SectionHeading
                    title="Services"
                    description="Runtime components and their latest probe result"
                  />
                  <div className="rounded-xl border border-border/60 p-4">
                    <ServiceRow
                      label="API Server"
                      icon={<Server className="h-4 w-4" />}
                      status={(apiItem?.status as HealthStatus) || "unknown"}
                      detail={[apiItem?.uptime ? `Up ${apiItem.uptime}` : null, apiItem?.detail]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                    <ServiceRow
                      label="Database"
                      icon={<Database className="h-4 w-4" />}
                      status={(dbItem?.status as HealthStatus) || "unknown"}
                      detail={[dbItem?.uptime ? `Up ${dbItem.uptime}` : null, "PostgreSQL"]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                    <ServiceRow
                      label="File Storage"
                      icon={<HardDrive className="h-4 w-4" />}
                      status={(storageItem?.status as HealthStatus) || "unknown"}
                      detail={
                        diskUsage
                          ? `${diskUsage.free_gb} GB free of ${diskUsage.total_gb} GB · media ${metrics?.performance.mediaStorageGb ?? 0} GB`
                          : storageItem?.detail
                      }
                    />
                    <ServiceRow
                      label="Cache"
                      icon={<Activity className="h-4 w-4" />}
                      status={cacheStatus}
                      detail="Redis"
                    />
                    <ServiceRow
                      label="Celery broker"
                      icon={<Activity className="h-4 w-4" />}
                      status={brokerStatus}
                    />
                    <div className="mt-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                      Deep check /health/ ·{" "}
                      {readinessOverall === "healthy" ? "all probes passed" : "probe failed"}
                    </div>
                  </div>
                </section>

                <section>
                  <SectionHeading
                    title="Performance"
                    description="Rolling 5-minute API window"
                  />
                  <StatStrip
                    compact
                    items={[
                      {
                        key: "response",
                        label: "Response time",
                        value:
                          metrics?.performance.responseTimeMs != null
                            ? `${metrics.performance.responseTimeMs} ms`
                            : "—",
                        hint: "Average",
                      },
                      {
                        key: "errors",
                        label: "Error rate",
                        value:
                          metrics?.performance.errorRate != null
                            ? `${Number(metrics.performance.errorRate).toFixed(2)}%`
                            : "—",
                        hint: "5xx share",
                      },
                      {
                        key: "requests",
                        label: "Requests",
                        value:
                          metrics?.performance.responseTimeSample != null
                            ? String(metrics.performance.responseTimeSample)
                            : "—",
                        hint: "Sampled",
                      },
                    ]}
                  />
                </section>
              </div>

              {/* Backup & recovery */}
              <section>
                <SectionHeading
                  title="Backup & recovery"
                  description="Snapshot health, age, and download"
                />
                <div id="backup" className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-base font-semibold">Backup status</h3>
                      <StatusBadge status={backupDisplayStatus} />
                    </div>
                    <div className="space-y-1">
                      {backupStatus?.last_backup ? (
                        <>
                          <DetailRow
                            label="Last backup"
                            value={new Date(backupStatus.last_backup).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          />
                          <DetailRow label="Age" value={`${backupStatus.age_hours} hours ago`} />
                          <DetailRow label="File" value={backupStatus.filename} />
                          <DetailRow label="Size" value={`${backupStatus.file_size_mb} MB`} />
                        </>
                      ) : (
                        <DetailRow
                          label="Message"
                          value="No backup files found. Run a backup job."
                        />
                      )}
                      <DetailRow label="Scheduled job" value={backupScheduleLabel} />
                    </div>
                    {canDownloadBackup && backupStatus?.filename && (
                      <div className="pt-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={downloadingBackup}
                          onClick={() => void handleDownloadBackup()}
                        >
                          {downloadingBackup ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {backupStatus.file_size_mb
                            ? `Download latest (${backupStatus.file_size_mb} MB)`
                            : "Download latest"}
                        </Button>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Super admin only. Dump files contain full production data.
                        </p>
                      </div>
                    )}
                </div>
              </section>
            </div>
          </div>
        )}
      </ClientErrorBoundary>
    </AdminPageShell>
  );
}
