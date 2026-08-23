"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardOverview } from "@/lib/admin-dashboard-api";

interface SystemStatusBannerProps {
  overview: DashboardOverview | null;
  onRefresh?: () => void;
  loading?: boolean;
}

export function SystemStatusBanner({ overview, onRefresh, loading }: SystemStatusBannerProps) {
  const isHealthy = overview?.status === "healthy";

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Badge variant={isHealthy ? "default" : "destructive"} className="text-sm">
            {isHealthy ? "All systems operational" : "Degraded"}
          </Badge>
          {overview?.services_degraded && overview.services_degraded.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {overview.services_degraded.join(", ")} degraded
            </span>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {overview?.online_users ?? 0} online now
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overview?.last_updated && (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(overview.last_updated).toLocaleTimeString()}
            </span>
          )}
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
