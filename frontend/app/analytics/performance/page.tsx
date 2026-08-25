"use client";

import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { AnalyticsTabList } from "@/components/analytics/AnalyticsTabList";
import { PerformanceAnalyticsTab } from "@/components/analytics/PerformanceAnalyticsTab";
import { BarChart3 } from "lucide-react";

export default function PerformanceAnalyticsPage() {
  return (
    <PermissionGate
      permission="can_access_analytics"
      title="Performance Analytics Access Required"
      loadingMessage="Loading performance analytics…"
    >
      <ErrorBoundary>
        <ClientErrorBoundary>
          <AdminPageShell
            title="Analytics"
            subtitle="SLA compliance, turnaround times, and efficiency metrics"
            icon={BarChart3}
            tabs={<AnalyticsTabList />}
            actions={
              <ContextualHelp
                title="How to use Performance Analytics"
                description="Monitor SLA compliance and operational efficiency."
                steps={[
                  "Select the reporting period.",
                  "Review SLA compliance and turnaround metrics.",
                  "Compare division and role-level performance.",
                ]}
              />
            }
          >
            <PerformanceAnalyticsTab />
          </AdminPageShell>
        </ClientErrorBoundary>
      </ErrorBoundary>
    </PermissionGate>
  );
}
