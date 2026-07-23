"use client";

import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { ExecutiveDashboardTab } from '@/components/analytics/ExecutiveDashboardTab';
import { cn } from '@/lib/utils';
import { appType } from '@/lib/app-type';

export default function ExecutiveDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PermissionGate
        permission="can_access_executive_dashboard"
        title="Executive Dashboard Access Required"
        loadingMessage="Loading executive dashboard…"
      >
        <ErrorBoundary>
          <ClientErrorBoundary>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className={appType.pageTitleList}>Executive Dashboard</h1>
                  <p className={cn(appType.pageSubtitle)}>
                    Real-time SLA compliance, division performance, and escalation monitoring
                  </p>
                </div>
                <ContextualHelp
                  title="How to use the Executive Dashboard"
                  description="Monitor strategic performance, SLA risk, and escalations."
                  steps={[
                    'Review SLA compliance by division and priority.',
                    'Watch escalations requiring executive action.',
                    'Export snapshots for briefings and meetings.',
                  ]}
                />
              </div>
              <ExecutiveDashboardTab />
            </div>
          </ClientErrorBoundary>
        </ErrorBoundary>
      </PermissionGate>
    </div>
  );
}
