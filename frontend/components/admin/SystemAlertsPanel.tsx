"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { DashboardAlerts, BackupStatus } from "@/lib/admin-dashboard-api";

interface SystemAlertsPanelProps {
  alerts: DashboardAlerts | null;
}

function BackupBadge({ backup }: { backup: BackupStatus }) {
  if (backup.status === "missing") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <XCircle className="h-4 w-4 text-destructive" />
        <span>No backup found</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      {backup.status === "healthy" ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      )}
      <span>Last backup {backup.age_hours}h ago ({backup.file_size_mb} MB)</span>
    </div>
  );
}

export function SystemAlertsPanel({ alerts }: SystemAlertsPanelProps) {
  if (!alerts) return null;

  const hasAlerts =
    alerts.backup.status !== "healthy" ||
    alerts.pending_escalations > 0 ||
    alerts.integration_failures_24h > 0 ||
    alerts.celery_beat_disabled > 0 ||
    alerts.degraded_services.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAlerts ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            No active incidents
          </div>
        ) : (
          <>
            {alerts.backup.status !== "healthy" && (
              <div className="flex items-center justify-between">
                <BackupBadge backup={alerts.backup} />
                <Badge variant={alerts.backup.status === "warning" ? "secondary" : "destructive"}>
                  {alerts.backup.status}
                </Badge>
              </div>
            )}
            {alerts.pending_escalations > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.pending_escalations} pending escalation(s)</span>
                <Badge variant="destructive">Escalations</Badge>
              </div>
            )}
            {alerts.integration_failures_24h > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.integration_failures_24h} integration failure(s) in 24h</span>
                <Badge variant="destructive">Integrations</Badge>
              </div>
            )}
            {alerts.celery_beat_disabled > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.celery_beat_disabled} disabled beat task(s)</span>
                <Badge variant="secondary">Celery</Badge>
              </div>
            )}
            {alerts.degraded_services.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{alerts.degraded_services.join(", ")} degraded</span>
                <Badge variant="destructive">Services</Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
