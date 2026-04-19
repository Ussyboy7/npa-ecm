"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { ReportsTab } from '@/components/analytics/ReportsTab';

export default function ReportsPage() {
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading reports…</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!permissions.canAccessReports) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-12 text-center"><p className="text-lg font-semibold">Access Denied</p><p className="text-sm text-muted-foreground mt-2">You don't have permission to access Reports.</p></CardContent></Card>
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
                <h1 className="text-3xl font-bold">Reports</h1>
                <p className="text-muted-foreground mt-1">Comprehensive reporting and analytics for correspondence management</p>
              </div>
              <div className="flex gap-2">
                <ContextualHelp
                  title="How to use Reports"
                  description="Generate comprehensive reports and analytics for correspondence management."
                  steps={[
                    'Select a division and time period for your report.',
                    'Review metrics and SLA compliance data.',
                    'Export reports in CSV or PDF format for sharing.',
                    'Use filters to focus on specific correspondence types or statuses.',
                  ]}
                />
              </div>
            </div>

            <HelpGuideCard
              title="Reports Overview"
              description="Generate comprehensive reports and analytics for correspondence management, SLA compliance, and organizational performance."
              links={[
                { label: 'Performance Analytics', href: '/analytics/performance' },
                { label: 'Executive Dashboard', href: '/analytics/executive' },
                { label: 'Help & Guides', href: '/help' }
              ]}
            />

            {/* Analytics Content */}
            <ReportsTab />
          </div>
        </DashboardLayout>
      </ClientErrorBoundary>
    </ErrorBoundary>
  );
}

