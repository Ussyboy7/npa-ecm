"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { CaseAnalyticsTab } from '@/components/analytics/CaseAnalyticsTab';

export default function CaseAnalyticsPage() {
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);

  if (!hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading case analytics…</CardContent></Card>
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
                <h1 className="text-3xl font-bold">Case Analytics</h1>
                <p className="text-muted-foreground mt-1">Analytics and insights for case management</p>
              </div>
              <div className="flex gap-2">
                <ContextualHelp
                  title="How to use Case Analytics"
                  description="Monitor case management performance, track case resolution times, and analyze case trends."
                  steps={[
                    'Review case metrics and resolution statistics.',
                    'Analyze case types and priority distribution.',
                    'Track case lifecycle and status trends.',
                    'Export case analytics for reporting and analysis.',
                  ]}
                />
              </div>
            </div>

            <HelpGuideCard
              title="Case Analytics Overview"
              description="Comprehensive analytics and insights for case management, including resolution times, case types, and performance metrics."
              links={[
                { label: 'My Cases', href: '/cases/my' },
                { label: 'All Cases', href: '/cases/all' },
                { label: 'Help & Guides', href: '/help' }
              ]}
            />

            {/* Analytics Content */}
            <CaseAnalyticsTab />
          </div>
        </DashboardLayout>
      </ClientErrorBoundary>
    </ErrorBoundary>
  );
}

