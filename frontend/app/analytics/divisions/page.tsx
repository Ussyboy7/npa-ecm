"use client";

import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { DivisionAnalyticsTab } from "@/components/analytics/DivisionAnalyticsTab";

export default function DivisionAnalyticsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PermissionGate
        permission="can_access_analytics"
        title="Division Analytics Access Required"
        loadingMessage="Loading division analytics…"
      >
        <ErrorBoundary>
          <ClientErrorBoundary>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">Division & Port Analytics</h1>
                  <p className="text-muted-foreground mt-1">
                    SLA compliance, workload, and throughput by division and port
                  </p>
                </div>
                <ContextualHelp
                  title="Division & Port Analytics"
                  description="Monitor operational performance across NPA divisions and ports."
                  steps={[
                    "Filter by directorate to focus on a business area.",
                    "Review SLA compliance and backlog by division.",
                    "Follow up on units flagged as needing attention.",
                  ]}
                />
              </div>
              <DivisionAnalyticsTab />
            </div>
          </ClientErrorBoundary>
        </ErrorBoundary>
      </PermissionGate>
    </div>
  );
}
