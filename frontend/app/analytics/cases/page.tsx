"use client";

import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { AnalyticsTabList } from "@/components/analytics/AnalyticsTabList";
import { ANALYTICS_HEADER_SLOT_IDS } from "@/components/analytics/AnalyticsHeaderSlots";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CaseAnalyticsTab } from "@/components/analytics/CaseAnalyticsTab";
import { BarChart3 } from "lucide-react";

export default function CaseAnalyticsPage() {
  const { currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return (
    <ErrorBoundary>
      <ClientErrorBoundary>
        <AdminPageShell
          title="Analytics"
          subtitle="Case volume, resolution speed, and trend patterns"
          icon={BarChart3}
          tabs={<AnalyticsTabList />}
          stats={<div id={ANALYTICS_HEADER_SLOT_IDS.stats} />}
          actions={
            <>
              <div id={ANALYTICS_HEADER_SLOT_IDS.actions} />
              <ContextualHelp
                title="How to use Case Analytics"
                description="Track case volume, resolution speed, and trend patterns."
                steps={[
                  "Review volume, resolution, and aging metrics.",
                  "Analyze case type, priority, and status mix.",
                  "Export views for reporting.",
                ]}
              />
            </>
          }
        >
          <CaseAnalyticsTab />
        </AdminPageShell>
      </ClientErrorBoundary>
    </ErrorBoundary>
  );
}
