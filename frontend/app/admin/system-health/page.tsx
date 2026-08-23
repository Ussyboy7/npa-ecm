"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { fetchDashboardMetrics, downloadLatestBackup, type DashboardMetrics } from "@/lib/admin-dashboard-api";
import { apiFetch } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";
import {
  Activity,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Server,
  Database,
  HardDrive,
  Download,
  Loader2,
} from "lucide-react";

const POLL_INTERVAL_MS = 30_000;

type HealthStatus = "healthy" | "warning" | "error" | "unknown";

function statusColor(status: string) {
  switch (status) {
    case "healthy":
      return "text-green-500";
    case "warning":
      return "text-yellow-500";
    case "error":
    case "unhealthy":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

function statusSurfaceClass(status: string) {
  switch (status) {
    case "healthy":
      return "from-emerald-950/40 to-emerald-900/20 border-emerald-500/20";
    case "warning":
      return "from-amber-950/40 to-amber-900/20 border-amber-500/20";
    case "error":
      return "from-red-950/40 to-red-900/20 border-red-500/20";
    default:
      return "from-slate-900/50 to-slate-800/50 border-slate-700/50";
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

function componentIcon(name: string) {
  if (name === "Database") return Database;
  if (name === "File Storage") return HardDrive;
  if (name === "Cache") return Server;
  return Server;
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

function MetricTile({
  label,
  value,
  live,
  hint,
}: {
  label: string;
  value: string | null;
  live: boolean;
  hint: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-border/60 bg-muted/20 h-full">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium">{label}</span>
        {live ? (
          <UiBadge variant="outline" className="text-[10px]">
            Live
          </UiBadge>
        ) : (
          <UiBadge variant="secondary" className="text-[10px]">
            N/A
          </UiBadge>
        )}
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
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
  started_at?: string;
  engine?: string;
  path?: string;
  free_gb?: number;
  total_gb?: number;
  used_pct?: number;
}

export default function SystemHealthPage() {
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [readiness, setReadiness] = useState<Record<string, string>>({});
  const [readinessOverall, setReadinessOverall] = useState<HealthStatus>("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
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
        const [metricsResult, readinessResult] = await Promise.all([
          fetchDashboardMetrics(),
          apiFetch<{ status: string; services: Record<string, string> }>("/health/").catch(() => ({
            status: "unhealthy" as string,
            services: { api: "unhealthy: check failed" } as Record<string, string>,
          })),
        ]);
        if (!isMountedRef.current) return;
        setMetrics(metricsResult);
        const services = readinessResult.services || {};
        setReadiness(
          Object.fromEntries(
            Object.entries(services).filter((entry): entry is [string, string] => entry[1] != null),
          ),
        );
        const overall = readinessResult.status === "healthy" ? "healthy" : "error";
        setReadinessOverall(overall as HealthStatus);
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
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [loadData]);

  if (!currentUser) return null;

  if (!canAccess) {
    return (
      <AdminPageShell title="System Health" subtitle="ICT operations dashboard" icon={Activity}>
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
  // Add cache as a derived readiness badge
  const hasCacheHealthy = readiness["cache"] === "healthy";
  const cacheStatus: HealthStatus = hasCacheHealthy
    ? "healthy"
    : readiness["cache"]
      ? "error"
      : "unknown";

  const coreStatuses: HealthStatus[] = [
    ...systemHealthItems.map((s) => (s.status as HealthStatus) || "unknown"),
    cacheStatus,
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
      ? "All core services operational"
      : overallStatus === "warning"
        ? "One or more services need attention"
        : overallStatus === "error"
          ? "Service disruption detected"
          : "Status unavailable";

  const backupStatus = metrics?.backup;
  const backupDisplayStatus: HealthStatus = (() => {
    const raw = backupStatus?.status || "unknown";
    if (raw === "missing") return "warning";
    return raw as HealthStatus;
  })();
  const backupLabel =
    backupDisplayStatus === "healthy"
      ? "Healthy"
      : backupDisplayStatus === "warning"
        ? backupStatus?.last_backup
          ? "Stale"
          : "Not configured"
        : backupDisplayStatus === "error"
          ? "Error"
          : "Unknown";

  // File storage disk usage
  const fileStorageItem = systemHealthItems.find((s) => s.name === "File Storage");
  const diskUsage = fileStorageItem?.diskUsage;
  const mediaPath = "/app/media";

  return (
    <AdminPageShell
      title="System Health"
      subtitle="Live infrastructure monitoring — API process, database, disk volume, cache, backups, and API performance."
      icon={Activity}
    >
      <ClientErrorBoundary>
        {loading && !metrics ? (
          <LoadingState message="Loading system health…" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadData()} />
        ) : (
          <>
            {/* Summary strip */}
            <Card className={`bg-gradient-to-r border ${statusSurfaceClass(overallStatus)}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <CheckCircle2 className={`h-6 w-6 shrink-0 ${statusColor(overallStatus)}`} />
                    <div>
                      <p className="font-semibold text-foreground">{overallLabel}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Core infrastructure only. Backup advisories are listed separately.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {systemHealthItems.map((system) => (
                      <UiBadge
                        key={system.name}
                        variant="outline"
                        className="bg-background/40 text-xs font-normal"
                      >
                        <span
                          className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                            system.status === "healthy"
                              ? "bg-green-500"
                              : system.status === "warning"
                                ? "bg-yellow-500"
                                : system.status === "error"
                                  ? "bg-red-500"
                                  : "bg-muted-foreground"
                          }`}
                        />
                        {system.name}
                      </UiBadge>
                    ))}
                    <UiBadge variant="outline" className="bg-background/40 text-xs font-normal">
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                          cacheStatus === "healthy" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      Cache
                    </UiBadge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
              {/* Left column — infrastructure + performance */}
              <div className="xl:col-span-2 space-y-6">
                <section>
                  <SectionHeading
                    title="Infrastructure"
                    description="Process uptime, database, and disk volume on the API server"
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* API Server */}
                    <Card className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Server className={`h-5 w-5 shrink-0 ${statusColor(systemHealthItems.find((s) => s.name === "API Server")?.status || "unknown")}`} />
                            <CardTitle className="text-base truncate">API Server</CardTitle>
                          </div>
                          <StatusBadge status={systemHealthItems.find((s) => s.name === "API Server")?.status || "unknown"} />
                        </div>
                        <CardDescription className="mt-2">Process uptime since last restart.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-1">
                        {(() => {
                          const item = systemHealthItems.find((s) => s.name === "API Server");
                          if (!item) return <DetailRow label="Uptime" value="—" />;
                          return (
                            <>
                              <DetailRow label="Uptime" value={item.uptime ? `Up ${item.uptime}` : undefined} />
                              <DetailRow label="Process started" value={item.detail || undefined} />
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* Database */}
                    <Card className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Database className={`h-5 w-5 shrink-0 ${statusColor(systemHealthItems.find((s) => s.name === "Database")?.status || "unknown")}`} />
                            <CardTitle className="text-base truncate">Database</CardTitle>
                          </div>
                          <StatusBadge status={systemHealthItems.find((s) => s.name === "Database")?.status || "unknown"} />
                        </div>
                        <CardDescription className="mt-2">PostgreSQL uptime since postmaster start.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-1">
                        {(() => {
                          const item = systemHealthItems.find((s) => s.name === "Database");
                          if (!item) return <DetailRow label="Uptime" value="—" />;
                          return (
                            <>
                              <DetailRow label="Uptime" value={item.uptime ? `Up ${item.uptime}` : undefined} />
                              <DetailRow label="Engine" value="PostgreSQL" />
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* File Storage */}
                    <Card className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <HardDrive className={`h-5 w-5 shrink-0 ${statusColor(systemHealthItems.find((s) => s.name === "File Storage")?.status || "unknown")}`} />
                            <CardTitle className="text-base truncate">File Storage</CardTitle>
                          </div>
                          <StatusBadge status={systemHealthItems.find((s) => s.name === "File Storage")?.status || "unknown"} />
                        </div>
                        <CardDescription className="mt-2">
                          {diskUsage
                            ? `${diskUsage.free_gb} GB free of ${diskUsage.total_gb} GB (${diskUsage.used_pct}% used).`
                            : fileStorageItem?.detail || "Disk volume usage on the API server."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-1">
                        <DetailRow label="Media path" value={mediaPath} />
                        {diskUsage ? (
                          <div className="pt-2 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Disk volume</span>
                              <span>{diskUsage.used_pct}% used</span>
                            </div>
                            <Progress value={diskUsage.used_pct} className="h-2" />
                            <DetailRow
                              label="Capacity"
                              value={`${diskUsage.free_gb} GB free of ${diskUsage.total_gb} GB`}
                            />
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section>
                  <SectionHeading
                    title="Performance"
                    description="Rolling 5-minute API window and uploaded file footprint"
                  />
                  <Card>
                    <CardContent className="p-4 sm:p-6 grid gap-4 sm:grid-cols-3">
                      <MetricTile
                        label="Response time"
                        value={
                          metrics?.performance.responseTimeMs != null
                            ? `${metrics.performance.responseTimeMs} ms`
                            : null
                        }
                        live={metrics?.performance.responseTimeSample != null && metrics.performance.responseTimeSample > 0}
                        hint={
                          metrics?.performance.responseTimeSample
                            ? `Avg over ${metrics.performance.responseTimeSample} request(s)`
                            : "Waiting for API traffic"
                        }
                      />
                      <MetricTile
                        label="Error rate"
                        value={
                          metrics?.performance.errorRate != null
                            ? `${Number(metrics.performance.errorRate).toFixed(2)}%`
                            : null
                        }
                        live={metrics?.performance.responseTimeSample != null && metrics.performance.responseTimeSample > 0}
                        hint="5xx share (5 min window)"
                      />
                      <MetricTile
                        label="Uploaded media"
                        value={
                          metrics?.performance.mediaStorageGb != null
                            ? `${metrics.performance.mediaStorageGb.toFixed(2)} GB`
                            : null
                        }
                        live={true}
                        hint="Files in MEDIA_ROOT, not whole disk"
                      />
                    </CardContent>
                  </Card>
                </section>
              </div>

              {/* Right column — readiness + backups */}
              <div className="space-y-6">
                <section>
                  <SectionHeading title="Readiness" description="Deep connectivity checks via /health/" />
                  <Card id="readiness">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <span className="text-sm font-medium">Overall</span>
                        <StatusBadge status={readinessOverall} />
                      </div>
                      {Object.keys(readiness).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No readiness data available.</p>
                      ) : (
                        Object.entries(readiness).map(([service, state]) => {
                          const ok = state === "healthy";
                          return (
                            <div
                              key={service}
                              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                            >
                              <span className="text-sm capitalize">{service}</span>
                              <UiBadge
                                className={
                                  ok
                                    ? "bg-green-500/10 text-green-700 border-green-500/20 text-xs"
                                    : "bg-red-500/10 text-red-700 border-red-500/20 text-xs"
                                }
                              >
                                {state}
                              </UiBadge>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionHeading title="Backups" description="Latest snapshot found on disk" />
                  <Card id="backup">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Backup status</CardTitle>
                        <StatusBadge status={backupDisplayStatus} />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                      <DetailRow label="Status" value={backupLabel} />
                      {backupStatus?.last_backup ? (
                        <>
                          <DetailRow
                            label="Last backup"
                            value={new Date(backupStatus.last_backup).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          />
                          <DetailRow label="Age" value={`${backupStatus.age_hours} hours ago`} />
                          <DetailRow label="File" value={backupStatus.filename} />
                          <DetailRow label="Size" value={`${backupStatus.file_size_mb} MB`} />
                          <DetailRow label="Directory" value="/backups" />
                        </>
                      ) : (
                        <DetailRow label="Message" value="No backup files found. Run a backup job." />
                      )}
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
                    </CardContent>
                  </Card>
                </section>

                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
                    <p>
                      <strong className="text-foreground font-medium">Disk vs media:</strong> File Storage
                      reports the server partition (e.g. 70% used). Uploaded media reports actual files only (often
                      much smaller).
                    </p>
                    <p>
                      <strong className="text-foreground font-medium">Uptime:</strong> API uptime resets on backend
                      restart. Database uptime is since PostgreSQL postmaster start.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </ClientErrorBoundary>
    </AdminPageShell>
  );
}
