"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { ExecutiveDashboardTab } from '@/components/analytics/ExecutiveDashboardTab';

export default function ExecutiveDashboardPage() {
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);

  return (
    <DashboardLayout>
      {!currentUser ? (
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading executive dashboard…</CardContent></Card>
        </div>
      ) : !permissions.canAccessExecutiveDashboard ? (
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-12 text-center"><p className="text-lg font-semibold">Access Denied</p><p className="text-sm text-muted-foreground mt-2">You don't have permission to access the Executive Dashboard.</p></CardContent></Card>
        </div>
      ) : (
        <ErrorBoundary>
          <ClientErrorBoundary>
            <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">Executive Dashboard</h1>
                <p className="text-muted-foreground mt-1">Real-time SLA compliance, division performance, and escalation monitoring</p>
              </div>
              <div className="flex gap-2">
                <ContextualHelp
                  title="How to use the Executive Dashboard"
                  description="Monitor organizational performance at a strategic level with real-time metrics and escalations."
                  steps={[
                    'Review SLA compliance across all divisions and priorities.',
                    'Monitor escalations that require executive attention.',
                    'Analyze division performance and efficiency trends.',
                    'Export reports for executive briefings and meetings.',
                  ]}
                />
              </div>
            </div>

            <HelpGuideCard
              title="Executive Dashboard Overview"
              description="Strategic monitoring of organizational performance, SLA compliance, and escalations requiring executive attention."
              links={[
                { label: 'Performance Analytics', href: '/analytics/performance' },
                { label: 'Reports', href: '/analytics/reports' },
                { label: 'Help & Guides', href: '/help' }
              ]}
            />

            {/* Analytics Content */}
            <ExecutiveDashboardTab />
          </div>
        </ClientErrorBoundary>
      </ErrorBoundary>
    )}
  </DashboardLayout>
  );
}

