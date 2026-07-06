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
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Mail,
  RefreshCw,
  Server,
  Users,
  XCircle,
} from "lucide-react";
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from "@/components/shared/registry-queue-styles";

function serviceBadge(status: string) {
  if (status === "healthy") {
    return (
      <Badge className="bg-green-100 text-green-800">
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

  if (!currentUser) {
    return <LoadingState message="Loading system health…" />;
  }

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
                Uptime {Math.floor(status.uptime_seconds / 3600)}h · Updated {new Date(status.generated_at).toLocaleString()}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(status.services).map(([name, value]) => (
                <Card key={name}>
                  <CardContent className={registryQueueStatCardContentClass}>
                    <div className="flex items-center gap-4">
                      <div className={`${registryQueueStatIconBoxClass} bg-primary/10`}>
                        <Server className={`${registryQueueStatIconClass} text-primary`} />
                      </div>
                      <div>
                        <p className={registryQueueStatLabelClass}>{name.replace(/_/g, " ")}</p>
                        <div className="mt-1">{serviceBadge(value)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className={registryQueueStatCardContentClass}>
                  <div className="flex items-center gap-4">
                    <div className={`${registryQueueStatIconBoxClass} bg-blue-500/10`}>
                      <Users className={`${registryQueueStatIconClass} text-blue-600`} />
                    </div>
                    <div>
                      <p className={registryQueueStatLabelClass}>Active Users</p>
                      <p className={registryQueueStatValueClass}>{status.users.active_total}</p>
                      <p className="text-xs text-muted-foreground">{status.users.logged_in_last_24h} logged in (24h)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className={registryQueueStatCardContentClass}>
                  <div className="flex items-center gap-4">
                    <div className={`${registryQueueStatIconBoxClass} bg-amber-500/10`}>
                      <Mail className={`${registryQueueStatIconClass} text-amber-600`} />
                    </div>
                    <div>
                      <p className={registryQueueStatLabelClass}>Active Correspondence</p>
                      <p className={registryQueueStatValueClass}>{status.correspondence.active}</p>
                      <p className="text-xs text-muted-foreground">{status.correspondence.completed_last_24h} completed (24h)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className={registryQueueStatCardContentClass}>
                  <div className="flex items-center gap-4">
                    <div className={`${registryQueueStatIconBoxClass} bg-destructive/10`}>
                      <AlertTriangle className={`${registryQueueStatIconClass} text-destructive`} />
                    </div>
                    <div>
                      <p className={registryQueueStatLabelClass}>Pending Escalations</p>
                      <p className={registryQueueStatValueClass}>{status.escalations_pending}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className={registryQueueStatCardContentClass}>
                  <div className="flex items-center gap-4">
                    <div className={`${registryQueueStatIconBoxClass} bg-green-500/10`}>
                      <Database className={`${registryQueueStatIconClass} text-green-600`} />
                    </div>
                    <div>
                      <p className={registryQueueStatLabelClass}>Celery Beat Tasks</p>
                      <p className={registryQueueStatValueClass}>
                        {status.celery_beat.enabled}/{status.celery_beat.total}
                      </p>
                      <p className="text-xs text-muted-foreground">enabled schedules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                          <Badge variant="outline" className="text-green-700">{counts.success} ok</Badge>
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
                          {new Date(entry.timestamp).toLocaleString()}
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
