"use client";

import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { ReportsTab } from '@/components/analytics/ReportsTab';

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PermissionGate
        permission="can_access_reports"
        title="Reports Access Required"
        loadingMessage="Loading reports…"
      >
        <ErrorBoundary>
          <ClientErrorBoundary>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">Reports</h1>
                  <p className="text-muted-foreground mt-1">
                    Comprehensive reporting and analytics for correspondence management
                  </p>
                </div>
                <ContextualHelp
                  title="How to use Reports"
                  description="Generate export-ready reports for correspondence operations."
                  steps={[
                    'Choose division and reporting period.',
                    'Apply filters for type or status.',
                    'Export the report for sharing.',
                  ]}
                />
              </div>
              <ReportsTab />
            </div>
          </ClientErrorBoundary>
        </ErrorBoundary>
      </PermissionGate>
    </div>
  );
}
