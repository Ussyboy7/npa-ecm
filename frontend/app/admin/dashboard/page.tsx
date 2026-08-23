"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { SystemStatusBanner } from "@/components/admin/SystemStatusBanner";
import { UsersByRoleGrid } from "@/components/admin/UsersByRoleGrid";
import { RecentActivityTable } from "@/components/admin/RecentActivityTable";
import { SystemAlertsPanel } from "@/components/admin/SystemAlertsPanel";
import { QuickActionsGrid } from "@/components/admin/QuickActionsGrid";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  fetchDashboardOverview,
  fetchUsersByRole,
  fetchDashboardAlerts,
  type DashboardOverview,
  type UsersByRoleResponse,
  type DashboardAlerts,
} from "@/lib/admin-dashboard-api";
import { apiFetch, hasTokens } from "@/lib/api-client";
import { LayoutDashboard } from "lucide-react";

function AdminDashboardPage() {
  const { currentUser, hydrated } = useCurrentUser();
  const visibility = useSidebarVisibility();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [usersByRole, setUsersByRole] = useState<UsersByRoleResponse | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [recentActivity, setRecentActivity] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!hydrated || !currentUser) return;
    setLoading(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (visibility.showSystemHealth) {
        promises.push(fetchDashboardOverview(), fetchDashboardAlerts());
      } else {
        promises.push(Promise.resolve(null), Promise.resolve(null));
      }

      if (visibility.showUsersRoles) {
        promises.push(fetchUsersByRole());
      } else {
        promises.push(Promise.resolve(null));
      }

      if (visibility.showAuditCompliance && hasTokens()) {
        promises.push(
          apiFetch<{ results: unknown[] }>("/audit/logs/?page_size=10").then((r) => r.results)
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [ov, al, ur, act] = await Promise.all(promises);
      setOverview(ov as DashboardOverview | null);
      setAlerts(al as DashboardAlerts | null);
      setUsersByRole(ur as UsersByRoleResponse | null);
      setRecentActivity(act as unknown[]);
    } finally {
      setLoading(false);
    }
  }, [hydrated, currentUser, visibility]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!visibility.showSystemHealth) return;
    const interval = setInterval(() => {
      fetchDashboardOverview().then(setOverview).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [visibility.showSystemHealth]);

  return (
    <AdminPageShell
      title="Administration Dashboard"
      subtitle="Enterprise system monitoring and user management"
      icon={LayoutDashboard}
    >
      <div className="space-y-6">
        {(visibility.showSystemHealth || visibility.showAuditCompliance) && (
          <SystemStatusBanner overview={overview} onRefresh={loadData} loading={loading} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibility.showUsersRoles && <UsersByRoleGrid data={usersByRole} />}
          {visibility.showAuditCompliance && (
            <RecentActivityTable activities={recentActivity as any} loading={loading} />
          )}
        </div>

        {(visibility.showSystemHealth || visibility.showAuditCompliance) && (
          <SystemAlertsPanel alerts={alerts} />
        )}

        <QuickActionsGrid visibility={visibility} />
      </div>
    </AdminPageShell>
  );
}

export default AdminDashboardPage;
