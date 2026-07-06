"use client";

import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CaseAnalyticsTab } from '@/components/analytics/CaseAnalyticsTab';

export default function CaseAnalyticsPage() {
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  return (
    <>
      {!currentUser ? (
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading case analytics…</CardContent></Card>
        </div>
      ) : (
        <ErrorBoundary>
          <ClientErrorBoundary>
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
                  description="Track case volume, resolution speed, and trend patterns."
                  steps={[
                    'Review volume, resolution, and aging metrics.',
                    'Analyze case type, priority, and status mix.',
                    'Export views for reporting.',
                  ]}
                />
              </div>
            </div>

            {/* Analytics Content */}
            <CaseAnalyticsTab />
          </div>
        </ClientErrorBoundary>
      </ErrorBoundary>
    )}
  </>
  );
}

