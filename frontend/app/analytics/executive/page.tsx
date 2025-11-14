"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';
import { FileDown, Download, Activity, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { downloadAnalyticsExport, fetchExecutiveAnalytics, type ExecutiveAnalytics } from '@/lib/analytics-client';

const ExecutiveAnalyticsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [data, setData] = useState<ExecutiveAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchExecutiveAnalytics(selectedPeriod);
        if (!ignore) {
          setData(response);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load executive analytics');
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
  }, [selectedPeriod]);

  const divisionMetrics = data?.divisionMetrics ?? [];
  const departmentActivity = data?.departmentActivity ?? [];
  const delayedApprovals = data?.delayedApprovals ?? [];
  const pendingTopLevel = data?.pendingLeadership ?? [];
  const weeklyTrend = data?.weeklyTrend ?? [];
  const sensitivityBreakdown = data?.sensitivityBreakdown ?? [];
  const maxAvg = divisionMetrics.reduce((acc, item) => Math.max(acc, item.avgDays), 0);

  const heatmapColor = (value: number) => {
    if (maxAvg === 0) return 'hsl(210 40% 96%)';
    const intensity = Math.min(1, value / maxAvg);
    const lightness = 96 - intensity * 35;
    return `hsl(217 91% ${lightness}%)`;
  };

  const triggerDownload = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(format);
      const blob = await downloadAnalyticsExport({ type: 'executive', format, range: selectedPeriod });
      const filename = `executive-analytics-${selectedPeriod}d.${format}`;
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
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Activity className="h-7 w-7 text-primary" /> Executive Performance Dashboard
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Real-time insights for MD, Executive Directors, and General Managers. Monitor document throughput, highlight bottlenecks, and act on pending escalations.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={loading}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => triggerDownload('csv')} disabled={!divisionMetrics.length || exporting !== null}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button className="gap-2" onClick={() => triggerDownload('pdf')} disabled={!divisionMetrics.length || exporting !== null}>
              <FileDown className="h-4 w-4" /> Export PDF Snapshot
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Executive Insights"
          description="Scan division heatmaps, weekly throughput trends, delayed approvals, and top-level pending memos."
          links={[
            { label: 'Performance Analytics', href: '/analytics' },
            { label: 'Help & Guides', href: '/help' },
          ]}
        />

        {error && (
          <Card>
            <CardContent className="py-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Division Turnaround Heatmap</CardTitle>
            <CardDescription>Average turnaround (days) per division. Darker tiles indicate slower turnaround.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {divisionMetrics.length === 0 ? (
                <div className="text-sm text-muted-foreground">No correspondence data available.</div>
              ) : (
                divisionMetrics.map((metric) => (
                  <div key={metric.id ?? metric.name} className="rounded-lg border border-border p-4 space-y-2" style={{ backgroundColor: heatmapColor(metric.avgDays) }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{metric.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {metric.avgDays} days
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Total documents: {metric.total}</div>
                      <div>High priority: {metric.highPriority}</div>
                      <div>Backlog &gt; 5 days: {metric.backlog}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Throughput Trend</CardTitle>
            <CardDescription>Completed vs. pending correspondence across the last weeks.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {weeklyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No correspondence activity yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="pending" stroke="#dc2626" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Most Active Departments</CardTitle>
              <CardDescription>Top departments by correspondence volume.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {departmentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No department activity recorded.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentActivity}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Sensitivity Breakdown</CardTitle>
              <CardDescription>Counts and average turnaround per sensitivity level.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sensitivityBreakdown.map((item) => (
                  <div key={item.sensitivity} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">Avg turnaround {item.avgTurnaround} days</p>
                    </div>
                    <Badge variant="outline">{item.count} docs</Badge>
                  </div>
                ))}
                {sensitivityBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground">No documents processed during this window.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Delayed Approvals</CardTitle>
              <CardDescription>Items older than 7 days awaiting completion.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80 pr-4">
                {delayedApprovals.length === 0 && (
                  <p className="text-sm text-muted-foreground">No delayed approvals 🎉</p>
                )}
                <div className="space-y-4">
                  {delayedApprovals.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{item.referenceNumber}</div>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Flame className="h-3 w-3" /> {item.daysPending} days
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.divisionName} • {item.currentApprover}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Leadership Approvals</CardTitle>
              <CardDescription>Items currently awaiting MD/ED/GM attention.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80 pr-4">
                {pendingTopLevel.length === 0 && (
                  <p className="text-sm text-muted-foreground">No leadership backlog.</p>
                )}
                <div className="space-y-4">
                  {pendingTopLevel.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{item.referenceNumber}</div>
                        <Badge variant="secondary">{item.daysPending} days</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.approverName} • {item.divisionName}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {loading && <p className="text-xs text-muted-foreground">Refreshing analytics…</p>}
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveAnalyticsPage;
