"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { AdminHubTabList } from "@/components/admin/AdminHubTabList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { getPlatformHomePath } from "@/lib/platform-navigation";
import {
  fetchDashboardMetrics,
  fetchOnlineUsers,
  fetchDashboardLive,
  fetchUsersByRole,
  fetchDashboardAlerts,
  downloadLatestBackup,
  type DashboardMetrics,
  type OnlineUser,
  type UsersByRoleResponse,
  type DashboardAlerts,
} from "@/lib/admin-dashboard-api";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  HardDrive,
  Shield,
  FolderTree,
  LayoutDashboard,
  Loader2,
  Download,
} from "lucide-react";
import Link from "next/link";

function getStatusColor(status: string) {
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

function PerfRow({
  label,
  value,
  sample,
  hint,
}: {
  label: string;
  value: string | null;
  sample?: number | null;
  hint?: string;
}) {
  const isLive = value !== null && sample !== undefined && sample !== null && sample > 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-muted-foreground truncate">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground/70 truncate">{hint}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isLive && <span className="text-sm font-medium tabular-nums">{value}</span>}
        {isLive && (
          <span className="text-[10px] uppercase tracking-wide text-green-700 dark:text-green-300 border border-green-500/40 bg-green-500/10 rounded px-1 py-0.5">
            Live
          </span>
        )}
        {value === null && (
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground border border-border bg-muted/40 rounded px-1.5 py-0.5">
            Not connected
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
        ? "text-yellow-600 dark:text-yellow-400"
        : tone === "success"
          ? "text-green-600 dark:text-green-400"
          : "";
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground/80">{hint}</div>}
    </div>
  );
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function AdminPage() {
  const { currentUser } = useCurrentUser();
  const visibility = useSidebarVisibility();
  const router = useRouter();
  const platformHome = getPlatformHomePath(visibility);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [usersByRole, setUsersByRole] = useState<UsersByRoleResponse | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [onlineNow, setOnlineNow] = useState(0);
  const [presenceWindow, setPresenceWindow] = useState(120);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(false);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    // Platform-only administrators land directly on their first Platform section.
    if (!visibility.showAdminDashboard && platformHome) {
      router.replace(platformHome);
    }
  }, [visibility.showAdminDashboard, platformHome, router]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const [m, ur, al] = await Promise.all([
        visibility.showSystemHealth ? fetchDashboardMetrics() : Promise.resolve(null),
        visibility.showUsersRoles ? fetchUsersByRole() : Promise.resolve(null),
        visibility.showSystemHealth ? fetchDashboardAlerts() : Promise.resolve(null),
      ]);
      if (!isMountedRef.current) return;
      setMetrics(m as DashboardMetrics | null);
      setUsersByRole(ur as UsersByRoleResponse | null);
      setAlerts(al as DashboardAlerts | null);
      if (m) {
        setOnlineNow((m as DashboardMetrics).onlineNow ?? 0);
        setPresenceWindow((m as DashboardMetrics).presenceWindowSeconds ?? 120);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [currentUser, visibility]);

  const loadLive = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const live = await fetchDashboardLive();
      if (!isMountedRef.current) return;
      setOnlineNow(live.onlineNow);
      setPresenceWindow(live.presenceWindowSeconds);
    } catch {
      // silent
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadData();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) void loadLive();
    }, 30000);
    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) void loadLive();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadData, loadLive]);

  const openOnlineModal = async () => {
    setShowOnlineModal(true);
    setOnlineUsersLoading(true);
    try {
      const res = await fetchOnlineUsers();
      setOnlineUsers(res.users);
    } catch {
      setOnlineUsers([]);
    }
    setOnlineUsersLoading(false);
  };

  const handleDownloadBackup = async () => {
    try {
      const blob = await downloadLatestBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metrics?.backup?.filename || "backup.dump";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const presenceWindowLabel =
    presenceWindow < 60
      ? `last ${presenceWindow}s`
      : `last ${Math.round(presenceWindow / 60)} min`;

  const backupStatus = metrics?.backup;
  const degradedServices = (metrics?.systemHealth ?? []).filter((service) => service.status !== "healthy");
  // Only incidents without a dedicated card of their own belong in the alert banner:
  // services are in Infrastructure, backups in Backups, escalations in Workload.
  const openAlerts = Array.from(
    new Set([
      ...(alerts?.integration_failures_24h
        ? [`${alerts.integration_failures_24h} integration failure(s) in 24h`]
        : []),
      ...(alerts?.celery_beat_disabled ? ["Scheduled tasks disabled"] : []),
    ]),
  );
  const systemDegraded = degradedServices.some(
    (service) => service.status === "unhealthy" || service.status === "error",
  );
  const backupNeedsAttention =
    backupStatus?.status === "missing" || backupStatus?.status === "warning";
  const systemState = systemDegraded
    ? "Degraded"
    : openAlerts.length > 0 || backupNeedsAttention
      ? "Attention required"
      : "Operational";

  const security = alerts?.security;
  const organization = alerts?.organization;
  const workload = alerts?.workload;
  const recentActivity = alerts?.recent_activity;
  const backupSchedule = alerts?.backup_schedule;

  const backupHealthy = backupStatus?.status === "healthy";
  const backupWarning = backupStatus?.status === "warning";

  const responseTimeValue =
    metrics?.performance.responseTimeMs != null
      ? `${metrics.performance.responseTimeMs} ms`
      : null;
  const errorRateValue =
    metrics?.performance.errorRate != null
      ? `${Number(metrics.performance.errorRate).toFixed(2)}%`
      : null;

  return (
    <AdminPageShell
      title="Administration Dashboard"
      subtitle="Enterprise system monitoring and user management"
      icon={LayoutDashboard}
      tabs={<AdminHubTabList />}
    >
      <div className="space-y-6">
        {/* System Summary Bar */}
        <div className="rounded-xl bg-muted/30 border border-border/40 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              {systemState === "Operational" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle
                  className={`h-5 w-5 ${systemDegraded ? "text-red-500" : "text-yellow-500"}`}
                />
              )}
              <span
                className={`text-sm font-medium ${
                  systemState === "Operational"
                    ? "text-green-700 dark:text-green-400"
                    : systemDegraded
                      ? "text-red-600 dark:text-red-400"
                      : "text-yellow-700 dark:text-yellow-400"
                }`}
              >
                System Status: {systemState}
              </span>
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <button
                onClick={() => void openOnlineModal()}
                className="text-sm text-foreground transition-colors hover:text-foreground/80"
              >
                {onlineNow} online now
                <span className="text-muted-foreground"> ({presenceWindowLabel})</span>
              </button>
            </div>

          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* System Alerts */}
            {visibility.showSystemHealth && alerts && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="pb-3">
                  <h2 className="text-lg font-semibold">System Alerts</h2>
                  <p className="text-sm text-muted-foreground">Integration delivery and scheduled jobs</p>
                </div>
                <div className="space-y-3">
                  {openAlerts.length === 0 ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          No integration or scheduler issues
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                          {openAlerts.length} item(s) need attention
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {openAlerts.slice(0, 3).join(" · ")}
                          {openAlerts.length > 3 ? ` · +${openAlerts.length - 3} more` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security & Access */}
            {visibility.showSystemHealth && security && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="flex items-start justify-between pb-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Security &amp; Access
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Privileged accounts and second-factor coverage
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/organization?tab=people">Manage</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    label="Superusers"
                    value={security.superusers}
                    hint="break-glass accounts"
                    tone={security.superusers > 1 ? "warning" : "default"}
                  />
                  <Stat
                    label="MFA coverage"
                    value={`${security.mfa_coverage_pct}%`}
                    hint={`${security.mfa_enabled} account(s) enrolled`}
                    tone={security.mfa_coverage_pct < 50 ? "warning" : "success"}
                  />
                  <Stat
                    label="MFA forced, not enrolled"
                    value={security.mfa_required_missing}
                    tone={security.mfa_required_missing > 0 ? "danger" : "default"}
                  />
                  <Stat
                    label="Impersonations (24h)"
                    value={security.impersonations_24h}
                    hint={
                      security.last_superuser_login
                        ? `Superuser last login ${timeAgo(security.last_superuser_login)}`
                        : "Superuser has never logged in"
                    }
                  />
                </div>
              </div>
            )}

            {/* Organization Health */}
            {visibility.showOrganizationOffices && organization && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="flex items-start justify-between pb-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      Organization Health
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Data gaps that block routing and approvals
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/organization">Manage</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    label="Offices without principal"
                    value={organization.offices_without_principal}
                    hint="no approving principal"
                    tone={organization.offices_without_principal > 0 ? "warning" : "success"}
                  />
                  <Stat
                    label="Users without role"
                    value={organization.users_without_role}
                    tone={organization.users_without_role > 0 ? "warning" : "default"}
                  />
                  <Stat
                    label="Users without office"
                    value={organization.users_without_office}
                    tone={organization.users_without_office > 0 ? "warning" : "default"}
                  />
                  <Stat
                    label="Open items, deactivated author"
                    value={organization.open_items_owned_by_inactive}
                    hint="raised by inactive accounts"
                    tone={organization.open_items_owned_by_inactive > 0 ? "danger" : "success"}
                  />
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {visibility.showSystemHealth && recentActivity && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="flex items-start justify-between pb-3">
                  <div>
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                    <p className="text-sm text-muted-foreground">Last 10 audited actions</p>
                  </div>
                  <Link href="/audit">
                    <Button variant="ghost" size="sm">
                      Audit log
                    </Button>
                  </Link>
                </div>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {recentActivity.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{entry.description}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {entry.user} · {entry.action} · {timeAgo(entry.timestamp)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Infrastructure */}
            {visibility.showSystemHealth && metrics && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="flex items-center justify-between pb-3">
                  <div>
                    <h2 className="text-lg font-semibold">Infrastructure</h2>
                    <p className="text-sm text-muted-foreground">Process uptime, database, and disk volume</p>
                  </div>
                  <Link href="/admin/platform/health">
                    <Button variant="ghost" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
                <div>
                  <div className="space-y-3">
                    {metrics.systemHealth.map((system) => {
                      const IconComp =
                        system.icon === "Database"
                          ? Database
                          : system.icon === "HardDrive"
                            ? HardDrive
                            : Server;
                      return (
                        <div
                          key={system.name}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <IconComp className={`h-5 w-5 ${getStatusColor(system.status)}`} />
                            <div className="min-w-0">
                              <span className="text-sm font-medium">{system.name}</span>
                              {system.uptime && (
                                <div className="text-xs text-muted-foreground">Up {system.uptime}</div>
                              )}
                              {system.detail && (
                                <div className="text-[11px] text-muted-foreground/80 truncate">
                                  {system.detail}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              system.status === "healthy"
                                ? "default"
                                : system.status === "warning"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {system.status === "healthy"
                              ? "Healthy"
                              : system.status === "warning"
                                ? "Warning"
                                : system.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uploaded media</span>
                    <span>{metrics.performance.mediaStorageGb} GB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Backups */}
            {visibility.showSystemHealth && backupStatus && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="pb-3">
                  <h2 className="text-lg font-semibold">Backups</h2>
                  <p className="text-sm text-muted-foreground">
                    {backupStatus.last_backup
                      ? "Latest snapshot found on disk"
                      : "No backup snapshot found on disk"}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge
                      variant={backupHealthy ? "default" : backupWarning ? "secondary" : "destructive"}
                    >
                      {backupStatus.status === "healthy"
                        ? "Healthy"
                        : backupStatus.status === "warning"
                          ? "Stale"
                          : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Scheduled job</span>
                    <span className="truncate text-right">
                      {backupSchedule?.scheduled ? backupSchedule.task : "None configured"}
                    </span>
                  </div>
                  {backupStatus.last_backup && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last backup</span>
                        <span>{new Date(backupStatus.last_backup).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Age</span>
                        <span>{backupStatus.age_hours} hours ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">File</span>
                        <span className="truncate max-w-[180px]">{backupStatus.filename}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Size</span>
                        <span>{backupStatus.file_size_mb} MB</span>
                      </div>
                    </>
                  )}
                  {currentUser?.isSuperuser && backupStatus.filename && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => void handleDownloadBackup()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download latest ({backupStatus.file_size_mb} MB)
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Workload */}
            {visibility.showSystemHealth && workload && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="pb-3">
                  <h2 className="text-lg font-semibold">Workload</h2>
                  <p className="text-sm text-muted-foreground">Approvals and open correspondence</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat
                    label="Pending approvals"
                    value={workload.pending_approvals}
                    hint={
                      workload.overdue_approvals > 0
                        ? `${workload.overdue_approvals} overdue`
                        : "none overdue"
                    }
                    tone={workload.overdue_approvals > 0 ? "danger" : "default"}
                  />
                  <Stat
                    label="Open correspondence"
                    value={workload.open_correspondence}
                  />
                  <Stat
                    label="Pending escalations"
                    value={workload.pending_escalations}
                    hint={
                      workload.oldest_escalation_hours != null
                        ? `oldest ${workload.oldest_escalation_hours}h`
                        : "none waiting"
                    }
                    tone={workload.pending_escalations > 0 ? "warning" : "default"}
                  />
                </div>
              </div>
            )}

            {/* Performance */}
            {visibility.showSystemHealth && metrics && (
              <div className="rounded-xl border border-border/60 bg-card/30 p-4">
                <div className="pb-3">
                  <h2 className="text-lg font-semibold">Performance</h2>
                  <p className="text-sm text-muted-foreground">Rolling 5-minute API window and uploaded file footprint</p>
                </div>
                <div className="space-y-4">
                  <PerfRow
                    label="Response time"
                    value={responseTimeValue}
                    sample={metrics.performance.responseTimeSample}
                    hint={
                      metrics.performance.responseTimeSample
                        ? `Avg over ${metrics.performance.responseTimeSample} request(s)`
                        : "Waiting for API traffic"
                    }
                  />
                  <PerfRow
                    label="Error rate"
                    value={errorRateValue}
                    sample={metrics.performance.responseTimeSample}
                    hint="5xx share (5 min window)"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Users by Role */}
        {visibility.showUsersRoles && usersByRole && (
          <div className="rounded-xl border border-border/60 bg-card/30 p-4">
            <div className="flex items-start justify-between pb-3">
              <div>
                <h2 className="text-lg font-semibold">Users by Role</h2>
                <p className="text-sm text-muted-foreground">
                  Top roles of {usersByRole.total_users.toLocaleString()} active users
                </p>
              </div>
              <Link href="/admin/organization?tab=people">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-5">
              {usersByRole.roles
                .filter((r) => r.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((role) => {
                  const pct =
                    usersByRole.total_users > 0
                      ? (role.count / usersByRole.total_users) * 100
                      : 0;
                  return (
                    <div key={role.id ?? "unassigned"}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm">{role.name}</span>
                        <span className="text-sm font-medium">{role.count}</span>
                      </div>
                      <Progress value={pct} className="mt-1 h-1.5" />
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Online Users Modal */}
      <Dialog open={showOnlineModal} onOpenChange={setShowOnlineModal}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Online Users ({onlineUsers.length})
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>Users currently signed in to the system.</DialogDescription>
          <div className="overflow-y-auto space-y-2 flex-1">
            {onlineUsersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : onlineUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users currently online</p>
            ) : (
              onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium">{u.role || "Staff"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
