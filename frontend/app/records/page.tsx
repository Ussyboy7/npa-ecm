"use client";

import { useState, useEffect } from 'react';
import { logError } from '@/lib/client-logger';
import { DashboardLayout } from '@/components/DashboardLayout';
import { RetentionPolicyManager } from '@/components/records/RetentionPolicyManager';
import { LegalHoldsManager } from '@/components/records/LegalHoldsManager';
import { DispositionsManager } from '@/components/records/DispositionsManager';
import { RetentionSchedulesManager } from '@/components/records/RetentionSchedulesManager';
import { FileClock, Shield, Archive, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { Card, CardContent } from '@/components/ui/card';
import { getRetentionPolicies, getLegalHolds, getDispositions, getRetentionSchedules } from '@/lib/records-storage';
import { Loader2 } from 'lucide-react';

export default function RecordsManagementPage() {
  const [summary, setSummary] = useState({
    policies: 0,
    activePolicies: 0,
    legalHolds: 0,
    activeLegalHolds: 0,
    dispositions: 0,
    pendingDispositions: 0,
    schedules: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [policies, legalHolds, dispositions, schedules] = await Promise.all([
          getRetentionPolicies(),
          getLegalHolds(),
          getDispositions(),
          getRetentionSchedules(),
        ]);

        setSummary({
          policies: policies.length,
          activePolicies: policies.filter(p => p.is_active).length,
          legalHolds: legalHolds.length,
          activeLegalHolds: legalHolds.filter(h => h.is_active).length,
          dispositions: dispositions.length,
          pendingDispositions: dispositions.filter(d => d.status === 'pending' || d.status === 'scheduled').length,
          schedules: schedules.length,
        });
      } catch (error: unknown) {
        logError('Failed to load summary:', error);
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, []);
  return (
    <ErrorBoundary>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Records Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage retention policies, legal holds, and disposition workflows for compliance
            </p>
          </div>

          <HelpGuideCard
            title="Records Management"
            description="Configure and manage retention policies, legal holds, dispositions, and retention schedules to ensure compliance with organizational and regulatory requirements."
            links={[
              { label: 'Help & Guides', href: '/help' },
            ]}
          />

          {/* Summary Cards */}
          {summaryLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FileClock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Retention Policies</p>
                      <p className="text-2xl font-semibold">{summary.policies}</p>
                      <p className="text-xs text-muted-foreground mt-1">{summary.activePolicies} active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-warning/10">
                      <Shield className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Legal Holds</p>
                      <p className="text-2xl font-semibold">{summary.legalHolds}</p>
                      <p className="text-xs text-muted-foreground mt-1">{summary.activeLegalHolds} active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-info/10">
                      <Archive className="h-6 w-6 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dispositions</p>
                      <p className="text-2xl font-semibold">{summary.dispositions}</p>
                      <p className="text-xs text-muted-foreground mt-1">{summary.pendingDispositions} pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-success/10">
                      <Calendar className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Retention Schedules</p>
                      <p className="text-2xl font-semibold">{summary.schedules}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="policies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="policies">
              <FileClock className="h-4 w-4 mr-2" />
              Retention Policies
            </TabsTrigger>
            <TabsTrigger value="legal-holds">
              <Shield className="h-4 w-4 mr-2" />
              Legal Holds
            </TabsTrigger>
            <TabsTrigger value="dispositions">
              <Archive className="h-4 w-4 mr-2" />
              Dispositions
            </TabsTrigger>
            <TabsTrigger value="schedules">
              <Calendar className="h-4 w-4 mr-2" />
              Retention Schedules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-4">
            <RetentionPolicyManager />
          </TabsContent>

          <TabsContent value="legal-holds" className="space-y-4">
            <LegalHoldsManager />
          </TabsContent>

          <TabsContent value="dispositions" className="space-y-4">
            <DispositionsManager />
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <RetentionSchedulesManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </ErrorBoundary>
  );
}

