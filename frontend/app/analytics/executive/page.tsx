"use client";

import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { AnalyticsTabList } from "@/components/analytics/AnalyticsTabList";
import { ExecutiveDashboardTab } from "@/components/analytics/ExecutiveDashboardTab";
import { Target } from "lucide-react";

export default function ExecutiveDashboardPage() {
  return (
    <PermissionGate
      permission="can_access_executive_dashboard"
      title="Executive Dashboard Access Required"
      loadingMessage="Loading executive dashboard…"
    >
      <ErrorBoundary>
        <ClientErrorBoundary>
          <AdminPageShell
            title="Analytics"
            subtitle="Real-time SLA compliance, division performance, and escalation monitoring"
            icon={Target}
            tabs={<AnalyticsTabList />}
            actions={
              <ContextualHelp
                title="How to use the Executive Dashboard"
                description="Monitor strategic performance, SLA risk, and escalations."
                steps={[
                  "Review SLA compliance by division and priority.",
                  "Watch escalations requiring executive action.",
                  "Check bottlenecks and delayed approvals.",
                ]}
              />
            }
          >
            <ExecutiveDashboardTab />
          </AdminPageShell>
        </ClientErrorBoundary>
      </ErrorBoundary>
    </PermissionGate>
  );
}
