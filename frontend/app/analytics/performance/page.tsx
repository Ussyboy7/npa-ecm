"use client";

import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { PerformanceAnalyticsTab } from '@/components/analytics/PerformanceAnalyticsTab';
import { cn } from '@/lib/utils';
import { appType } from '@/lib/app-type';

export default function PerformanceAnalyticsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PermissionGate
        permission="can_access_analytics"
        title="Performance Analytics Access Required"
        loadingMessage="Loading performance analytics…"
      >
        <ErrorBoundary>
          <ClientErrorBoundary>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className={appType.pageTitleList}>Performance Analytics</h1>
                  <p className={cn(appType.pageSubtitle)}>
                    SLA compliance, turnaround times, and efficiency metrics powered by real-time backend analytics
                  </p>
                </div>
                <ContextualHelp
                  title="How to use Performance Analytics"
                  description="Monitor SLA compliance and operational efficiency."
                  steps={[
                    'Select the reporting period.',
                    'Review SLA compliance and turnaround metrics.',
                    'Compare division and role-level performance.',
                  ]}
                />
              </div>
              <PerformanceAnalyticsTab />
            </div>
          </ClientErrorBoundary>
        </ErrorBoundary>
      </PermissionGate>
    </div>
  );
}
