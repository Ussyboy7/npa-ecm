"use client";

import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CaseAnalyticsTab } from '@/components/analytics/CaseAnalyticsTab';
import { cn } from '@/lib/utils';
import { appType } from '@/lib/app-type';

export default function CaseAnalyticsPage() {
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  return (
    <>
      {!currentUser ? null : (
        <ErrorBoundary>
          <ClientErrorBoundary>
            <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className={appType.pageTitleList}>Case Analytics</h1>
                <p className={cn(appType.pageSubtitle)}>Analytics and insights for case management</p>
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
