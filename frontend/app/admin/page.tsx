"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
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
  Activity,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  HardDrive,
  Settings,
  Shield,
  FolderTree,
  LifeBuoy,
  LayoutDashboard,
  Loader2,
  Download,
  UserCog,
  Webhook,
  Zap,
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
      return "text-gray-500";
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

export default function AdminPage() {
  const { currentUser, hydrated } = useCurrentUser();
  const visibility = useSidebarVisibility();

  const [loading, setLoading] = useState(true);
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

  const loadData = useCallback(async () => {
    if (!hydrated || !currentUser) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
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
      if (isMountedRef.current) setLoading(false);
      inFlightRef.current = false;
    }
  }, [hydrated, currentUser, visibility]);

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

  if (!hydrated || !currentUser) return null;

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
    >
      <div className="space-y-6">
        {/* System Summary Bar */}
        <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-400">System Status: Operational</span>
              </div>
              <div className="hidden h-4 w-px bg-slate-600 sm:block" />
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <button
                  onClick={() => void openOnlineModal()}
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  {onlineNow} online now
                  <span className="text-slate-500"> ({presenceWindowLabel})</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Users by Role */}
            {visibility.showUsersRoles && usersByRole && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Users by Role</CardTitle>
                    <Link href="/admin/users-roles">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {usersByRole.roles
                      .filter((r) => r.name !== "Unassigned")
                      .sort((a, b) => b.count - a.count)
                      .map((role) => {
                        const pct =
                          usersByRole.total_users > 0
                            ? (role.count / usersByRole.total_users) * 100
                            : 0;
                        return (
                          <div key={role.id ?? "unassigned"} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm truncate">{role.name}</span>
                                <span className="text-sm font-medium">{role.count}</span>
                              </div>
                              <Progress value={pct} className="h-1.5 mt-1" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Total: {usersByRole.total_users} users
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Alerts */}
            {visibility.showSystemHealth && alerts && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">System Alerts</CardTitle>
                  <CardDescription>Backups, escalations, and items needing attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        No active incidents
                      </p>
                    </div>
                  </div>

                  {backupStatus && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <Activity
                        className={`h-5 w-5 flex-shrink-0 ${getStatusColor(backupStatus.status)}`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Backup status</p>
                        <p className="text-xs text-muted-foreground">
                          {backupStatus.last_backup
                            ? `Last backup ${backupStatus.age_hours}h ago (${backupStatus.filename})`
                            : "No backup files found"}
                        </p>
                      </div>
                      <Badge
                        variant={backupHealthy ? "default" : backupWarning ? "secondary" : "destructive"}
                      >
                        {backupStatus.status}
                      </Badge>
                    </div>
                  )}

                  {alerts.pending_escalations > 0 && (
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border">
                      <span>{alerts.pending_escalations} pending escalation(s)</span>
                      <Badge variant="destructive">Escalations</Badge>
                    </div>
                  )}

                  {alerts.integration_failures_24h > 0 && (
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border">
                      <span>{alerts.integration_failures_24h} integration failure(s) in 24h</span>
                      <Badge variant="destructive">Integrations</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Infrastructure */}
            {visibility.showSystemHealth && metrics && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Infrastructure</CardTitle>
                    <Link href="/admin/system-health">
                      <Button variant="ghost" size="sm">
                        Details
                      </Button>
                    </Link>
                  </div>
                  <CardDescription>Process uptime, database, and disk volume</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Backups */}
            {visibility.showSystemHealth && backupStatus && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Backups</CardTitle>
                  <CardDescription>Latest snapshot found on disk</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>
            )}

            {/* Performance */}
            {visibility.showSystemHealth && metrics && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Performance</CardTitle>
                  <CardDescription>Rolling 5-minute API window and uploaded file footprint</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <PerfRow
                    label="Uploaded media"
                    value={`${metrics.performance.mediaStorageGb} GB`}
                    hint="Files in MEDIA_ROOT"
                  />
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {visibility.showUsersRoles && (
                    <Link href="/admin/users-roles">
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex flex-col items-center gap-1"
                      >
                        <UserCog className="h-5 w-5 text-blue-500" />
                        <span className="text-xs">Users &amp; Roles</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showOrganizationOffices && (
                    <Link href="/admin/organization">
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex flex-col items-center gap-1"
                      >
                        <FolderTree className="h-5 w-5 text-amber-500" />
                        <span className="text-xs">Organization</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showSystemHealth && (
                    <Link href="/admin/system-health">
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex flex-col items-center gap-1"
                      >
                        <Activity className="h-5 w-5 text-green-500" />
                        <span className="text-xs">System Health</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showAuditCompliance && (
                    <Link href="/audit">
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex flex-col items-center gap-1"
                      >
                        <Shield className="h-5 w-5 text-rose-500" />
                        <span className="text-xs">Audit &amp; Compliance</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showIntegrationHub && (
                    <Link href="/integrations">
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex flex-col items-center gap-1"
                      >
                        <Webhook className="h-5 w-5 text-violet-500" />
                        <span className="text-xs">Integrations</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showTemplates && (
                    <Link href="/admin/templates-hub">
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex flex-col items-center gap-1"
                      >
                        <Zap className="h-5 w-5 text-cyan-500" />
                        <span className="text-xs">Templates</span>
                      </Button>
                    </Link>
                  )}
                  {visibility.showHelpdeskQueue && (
                    <Link href="/helpdesk">
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex flex-col items-center gap-1"
                      >
                        <LifeBuoy className="h-5 w-5 text-orange-500" />
                        <span className="text-xs">Helpdesk</span>
                      </Button>
                    </Link>
                  )}
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      className="w-full h-auto py-3 flex flex-col items-center gap-1"
                    >
                      <Settings className="h-5 w-5 text-slate-500" />
                      <span className="text-xs">Settings</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
