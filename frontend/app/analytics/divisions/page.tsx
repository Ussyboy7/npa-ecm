"use client";

import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { AnalyticsTabList } from "@/components/analytics/AnalyticsTabList";
import { DivisionAnalyticsTab } from "@/components/analytics/DivisionAnalyticsTab";
import { BarChart3 } from "lucide-react";

export default function DivisionAnalyticsPage() {
  return (
    <PermissionGate
      permission="can_access_analytics"
      title="Division Analytics Access Required"
      loadingMessage="Loading division analytics…"
    >
      <ErrorBoundary>
        <ClientErrorBoundary>
          <AdminPageShell
            title="Analytics"
            subtitle="SLA compliance, workload, and throughput by division and port"
            icon={BarChart3}
            tabs={<AnalyticsTabList />}
            actions={
              <ContextualHelp
                title="Division & Port Analytics"
                description="Monitor operational performance across NPA divisions and ports."
                steps={[
                  "Filter by directorate to focus on a business area.",
                  "Review SLA compliance and backlog by division.",
                  "Follow up on units flagged as needing attention.",
                ]}
              />
            }
          >
            <DivisionAnalyticsTab />
          </AdminPageShell>
        </ClientErrorBoundary>
      </ErrorBoundary>
    </PermissionGate>
  );
}
