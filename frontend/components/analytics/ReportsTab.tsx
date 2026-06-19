"use client";

import { useEffect, useState } from 'react';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  downloadAnalyticsExport,
  fetchReportsAnalytics,
  type ReportsAnalytics,
} from '@/lib/analytics-client';
import {
  fetchEnhancedSLAAnalytics,
  type EnhancedSLAAnalytics,
} from '@/lib/sla-client';
import { FileText, CheckCircle, Target, Clock } from 'lucide-react';

export const ReportsTab = () => {
  const { divisions } = useOrganization();
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [data, setData] = useState<ReportsAnalytics | null>(null);
  const [slaData, setSlaData] = useState<EnhancedSLAAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportsResponse, slaResponse] = await Promise.all([
          fetchReportsAnalytics({
            range: selectedPeriod,
            divisionId: selectedDivision === 'all' ? undefined : selectedDivision,
          }),
          fetchEnhancedSLAAnalytics({
            range: parseInt(selectedPeriod),
            divisionId: selectedDivision === 'all' ? undefined : selectedDivision,
          }),
        ]);
        if (!ignore) {
          setData(reportsResponse);
          setSlaData(slaResponse);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load reports');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [selectedDivision, selectedPeriod]);

  const metrics = data?.metrics ?? {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    urgent: 0,
    avgProcessingTime: 0,
    completionRate: 0,
  };

  const slaSummary = slaData?.summary ?? { total: 0, compliant: 0, breached: 0, atRisk: 0, complianceRate: 0 };

  const triggerDownload = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(format);
      const blob = await downloadAnalyticsExport({ 
        type: 'reports', 
        format, 
        range: selectedPeriod,
        divisionId: selectedDivision === 'all' ? undefined : selectedDivision,
      });
      const filename = `reports-${selectedPeriod}d.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download export');
    } finally {
      setExporting(null);
    }
  };

  return (
    <ClientErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div></div>
          <div className="flex gap-2 items-center">
            <Select value={selectedDivision} onValueChange={setSelectedDivision} disabled={loading}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((div) => (
                  <SelectItem key={div.id} value={div.id}>
                    {div.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={loading}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => triggerDownload('csv')} disabled={loading || exporting !== null}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => triggerDownload('pdf')} disabled={loading || exporting !== null}>
              Export PDF
            </Button>
          </div>
        </div>

        {error && (
          <Card>
            <CardContent className="py-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completionRate}%</div>
              <Progress value={metrics.completionRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.completed} of {metrics.total} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slaSummary.complianceRate}%</div>
              <Progress value={slaSummary.complianceRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {slaSummary.compliant} of {slaSummary.total} within SLA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgProcessingTime.toFixed(1)} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                Average processing time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed</span>
                  <Badge variant="default">{metrics.completed}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">In Progress</span>
                  <Badge variant="secondary">{metrics.inProgress}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending</span>
                  <Badge variant="outline">{metrics.pending}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Urgent</span>
                  <Badge variant="destructive">{metrics.urgent}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">High</span>
                  <Badge variant="secondary">-</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium/Low</span>
                  <Badge variant="outline">-</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SLA Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compliant</span>
                  <Badge variant="default">{slaSummary.compliant}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">At Risk</span>
                  <Badge variant="secondary">{slaSummary.atRisk}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Breached</span>
                  <Badge variant="destructive">{slaSummary.breached}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {loading && (
          <p className="text-xs text-muted-foreground">Loading reports…</p>
        )}
      </div>
    </ClientErrorBoundary>
  );
};

