"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PermissionDeniedCard } from "@/components/shared/PermissionDeniedCard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { fetchSystemStatus, type SystemStatus } from "@/lib/system-status-api";
import { logError } from "@/lib/client-logger";
import { formatDateTime } from "@/lib/datetime";
import { StatStrip } from "@/components/shared/StatStrip";
import {
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";

function serviceBadge(status: string) {
  if (status === "healthy") {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Healthy
      </Badge>
    );
  }
  if (status === "skipped") return <Badge variant="secondary">Skipped</Badge>;
  return (
    <Badge variant="destructive">
      <XCircle className="h-3 w-3 mr-1" /> {status}
    </Badge>
  );
}

export default function SystemHealthPage() {
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess =
    permissions.canAccessSystemHealth ||
    currentUser?.isSuperuser;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemStatus();
      setStatus(data);
    } catch (err) {
      logError("Failed to load system status", err);
      setError(err instanceof Error ? err.message : "Failed to load system status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) void load();
  }, [canAccess, load]);

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

  return (
    <AdminPageShell
      title="System Health"
      subtitle="Platform health, user activity, integrations, and background jobs"
      icon={Activity}
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <ClientErrorBoundary>
        {loading && !status ? (
          <LoadingState message="Loading system health…" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : status ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={status.status === "healthy" ? "default" : "destructive"} className="text-sm px-3 py-1">
                {status.status === "healthy" ? "All systems operational" : "Degraded"}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Uptime {Math.floor(status.uptime_seconds / 3600)}h · Updated {formatDateTime(status.generated_at)}
              </span>
            </div>

            <StatStrip
              items={[
                ...Object.entries(status.services).map(([name, value]) => ({
                  key: `svc-${name}`,
                  label: name.replace(/_/g, " "),
                  value: serviceBadge(value),
                })),
                {
                  key: "users",
                  label: "Active Users",
                  value: status.users.active_total,
                  hint: `${status.users.logged_in_last_24h} logged in (24h)`,
                },
                {
                  key: "corr",
                  label: "Active Correspondence",
                  value: status.correspondence.active,
                  hint: `${status.correspondence.completed_last_24h} completed (24h)`,
                },
                {
                  key: "escalations",
                  label: "Pending Escalations",
                  value: status.escalations_pending,
                },
                {
                  key: "celery",
                  label: "Celery Beat Tasks",
                  value: `${status.celery_beat.enabled}/${status.celery_beat.total}`,
                  hint: "enabled schedules",
                },
              ]}
            />

            <Card>
              <CardHeader>
                <CardTitle>Integration Activity (24h)</CardTitle>
                <CardDescription>Success and failure counts by connector type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(status.integrations.last_24h).map(([type, counts]) => {
                    const total = counts.success + counts.failed + counts.pending;
                    if (total === 0) return null;
                    return (
                      <div key={type} className="rounded-lg border p-3">
                        <p className="font-medium capitalize">{type}</p>
                        <div className="mt-2 flex gap-2 text-xs">
                          <Badge variant="outline" className="text-green-700 dark:text-green-400">{counts.success} ok</Badge>
                          <Badge variant="outline" className="text-destructive">{counts.failed} failed</Badge>
                          {counts.pending > 0 && <Badge variant="secondary">{counts.pending} pending</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" /> Recent User Activity
                </CardTitle>
                <CardDescription>Latest audit log entries across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status.recent_activity.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateTime(entry.timestamp)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.user?.username ?? "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {entry.description || entry.object_repr}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </ClientErrorBoundary>
    </AdminPageShell>
  );
}
