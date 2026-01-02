"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { PerformanceAnalyticsTab } from '@/components/analytics/PerformanceAnalyticsTab';

export default function PerformanceAnalyticsPage() {
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);

  if (!hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading performance analytics…</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!permissions.canAccessAnalytics) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-12 text-center"><p className="text-lg font-semibold">Access Denied</p><p className="text-sm text-muted-foreground mt-2">You don't have permission to access Performance Analytics.</p></CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ErrorBoundary>
      <ClientErrorBoundary>
        <DashboardLayout>
          <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">Performance Analytics</h1>
                <p className="text-muted-foreground mt-1">SLA compliance, turnaround times, and efficiency metrics powered by real-time backend analytics</p>
              </div>
              <div className="flex gap-2">
                <ContextualHelp
                  title="How to use Performance Analytics"
                  description="Monitor operational performance with SLA compliance, turnaround times, and efficiency metrics."
                  steps={[
                    'Select a time period to view metrics for that range.',
                    'Review SLA compliance rates and identify areas needing attention.',
                    'Analyze division performance to see which teams are most efficient.',
                    'Use role performance metrics to understand workload distribution.',
                  ]}
                />
              </div>
            </div>

            <HelpGuideCard
              title="Performance Analytics Overview"
              description="Track SLA compliance, turnaround times, and operational efficiency across divisions and roles."
              links={[
                { label: 'Executive Dashboard', href: '/analytics/executive' },
                { label: 'Reports', href: '/analytics/reports' },
                { label: 'Help & Guides', href: '/help' }
              ]}
            />

            {/* Analytics Content */}
            <PerformanceAnalyticsTab />
          </div>
        </DashboardLayout>
      </ClientErrorBoundary>
    </ErrorBoundary>
  );
}

