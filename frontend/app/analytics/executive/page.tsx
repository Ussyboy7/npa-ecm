"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import {
  getDivisionName,
  getDepartmentName,
  initializeDmsDocuments,
  loadDocuments,
  type DocumentRecord,
} from '@/lib/dms-storage';
import { MOCK_USERS } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { FileDown, Download, Activity, AlertTriangle, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DivisionMetric {
  id: string;
  name: string;
  total: number;
  avgDays: number;
  highPriority: number;
  backlog: number;
}

interface DepartmentActivity {
  id: string;
  name: string;
  total: number;
}

const ExecutiveAnalyticsPage = () => {
  const { correspondence, minutes } = useCorrespondence();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  useEffect(() => {
    initializeDmsDocuments();
    setDocuments(loadDocuments());
  }, []);

  const divisionMetrics: DivisionMetric[] = useMemo(() => {
    const map = new Map<string, { total: number; sumDays: number; highPriority: number; backlog: number }>();
    const now = Date.now();

    correspondence.forEach((item) => {
      const divisionId = item.divisionId ?? 'unassigned';
      const existing = map.get(divisionId) ?? { total: 0, sumDays: 0, highPriority: 0, backlog: 0 };
      const relatedMinutes = minutes.filter((minute) => minute.correspondenceId === item.id);
      const lastAction = relatedMinutes.length
        ? Math.max(...relatedMinutes.map((minute) => new Date(minute.timestamp).getTime()))
        : now;
      const start = new Date(item.receivedDate).getTime();
      const turnaroundDays = Math.max(0, (lastAction - start) / (1000 * 60 * 60 * 24));
      existing.total += 1;
      existing.sumDays += turnaroundDays;
      if (item.priority === 'high' || item.priority === 'urgent') {
        existing.highPriority += 1;
      }
      if (item.status !== 'completed' && turnaroundDays > 5) {
        existing.backlog += 1;
      }
      map.set(divisionId, existing);
    });

    return Array.from(map.entries()).map(([divisionId, data]) => ({
      id: divisionId,
      name: getDivisionName(divisionId === 'unassigned' ? undefined : divisionId),
      total: data.total,
      avgDays: data.total === 0 ? 0 : Number((data.sumDays / data.total).toFixed(1)),
      highPriority: data.highPriority,
      backlog: data.backlog,
    }));
  }, [correspondence, minutes]);

  const departmentActivity: DepartmentActivity[] = useMemo(() => {
    const counts = new Map<string, number>();
    correspondence.forEach((item) => {
      const departmentId = item.departmentId ?? 'unassigned';
      counts.set(departmentId, (counts.get(departmentId) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([departmentId, total]) => ({
        id: departmentId,
        name: getDepartmentName(departmentId === 'unassigned' ? undefined : departmentId),
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [correspondence]);

  const delayedApprovals = useMemo(() => {
    const now = Date.now();
    return correspondence
      .filter((item) => {
        const relatedMinutes = minutes.filter((minute) => minute.correspondenceId === item.id);
        const lastAction = relatedMinutes.length
          ? Math.max(...relatedMinutes.map((minute) => new Date(minute.timestamp).getTime()))
          : now;
        const start = new Date(item.receivedDate).getTime();
        const turnaroundDays = Math.max(0, (lastAction - start) / (1000 * 60 * 60 * 24));
        return item.status !== 'completed' && turnaroundDays > 7;
      })
      .map((item) => ({
        ...item,
        turnaround: Math.max(0, (Date.now() - new Date(item.receivedDate).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.turnaround - a.turnaround)
      .slice(0, 6);
  }, [correspondence, minutes]);

  const pendingTopLevel = useMemo(() => {
    const leadershipIds = new Set(
      MOCK_USERS.filter((user) => ['MDCS', 'EDCS', 'MSS1', 'MSS2'].includes(user.gradeLevel)).map((user) => user.id),
    );
    return correspondence
      .filter((item) => item.currentApproverId && leadershipIds.has(item.currentApproverId))
      .map((item) => {
        const approver = MOCK_USERS.find((user) => user.id === item.currentApproverId);
        return {
          ...item,
          approverName: approver?.name ?? 'Unassigned',
        };
      });
  }, [correspondence]);

  const weeklyTrend = useMemo(() => {
    const map = new Map<string, { completed: number; pending: number; date: Date }>();
    const getWeekStart = (dateStr: string) => {
      const date = new Date(dateStr);
      const weekStart = new Date(date);
      weekStart.setHours(0, 0, 0, 0);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - day);
      return weekStart;
    };

    correspondence.forEach((item) => {
      const weekStart = getWeekStart(item.receivedDate);
      const key = weekStart.toISOString();
      const entry = map.get(key) ?? { completed: 0, pending: 0, date: weekStart };
      if (item.status === 'completed') {
        entry.completed += 1;
      } else {
        entry.pending += 1;
      }
      map.set(key, entry);
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((entry) => ({
        week: entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: entry.completed,
        pending: entry.pending,
      }));
  }, [correspondence]);

  const sensitivityBreakdown = useMemo(() => {
    const result = [
      { sensitivity: 'public' as const, label: 'Public', count: 0, avgTurnaround: 0 },
      { sensitivity: 'internal' as const, label: 'Internal', count: 0, avgTurnaround: 0 },
      { sensitivity: 'confidential' as const, label: 'Confidential', count: 0, avgTurnaround: 0 },
      { sensitivity: 'restricted' as const, label: 'Restricted', count: 0, avgTurnaround: 0 },
    ];

    const totals = new Map<DocumentSensitivity, { count: number; sum: number }>();

    documents.forEach((doc) => {
      const bucket = result.find((item) => item.sensitivity === doc.sensitivity);
      if (!bucket) return;
      bucket.count += 1;

      const turnaround = Math.max(
        0,
        (new Date(doc.updatedAt).getTime() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      const entry = totals.get(doc.sensitivity) ?? { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += turnaround;
      totals.set(doc.sensitivity, entry);
    });

    return result.map((bucket) => {
      const entry = totals.get(bucket.sensitivity);
      return {
        ...bucket,
        avgTurnaround: entry && entry.count > 0 ? Number((entry.sum / entry.count).toFixed(1)) : 0,
      };
    });
  }, [documents]);

  const heatmapScale = (value: number, maxValue: number) => {
    if (maxValue === 0) return 'hsl(210 40% 96%)';
    const intensity = Math.min(1, value / maxValue);
    const lightness = 96 - intensity * 35;
    return `hsl(217 91% ${lightness}%)`;
  };

  const maxAvg = divisionMetrics.reduce((acc, item) => Math.max(acc, item.avgDays), 0);

  const handleExportCsv = () => {
    const headers = ['Division', 'Documents', 'Avg Turnaround (days)', 'High Priority', 'Backlog'];
    const rows = divisionMetrics.map((metric) => [metric.name, metric.total, metric.avgDays, metric.highPriority, metric.backlog]);
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'executive-dashboard.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPdf = () => {
    const printable = window.open('', '_blank');
    if (!printable) {
      return;
    }
    printable.document.write(`
      <html>
        <head>
          <title>Executive Dashboard Snapshot</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 24px; margin-bottom: 16px; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Executive Dashboard Snapshot</h1>
          <table>
            <thead>
              <tr>
                <th>Division</th>
                <th>Documents</th>
                <th>Avg Turnaround (days)</th>
                <th>High Priority</th>
                <th>Backlog</th>
              </tr>
            </thead>
            <tbody>
              ${divisionMetrics
                .map(
                  (metric) => `
                    <tr>
                      <td>${metric.name}</td>
                      <td>${metric.total}</td>
                      <td>${metric.avgDays}</td>
                      <td>${metric.highPriority}</td>
                      <td>${metric.backlog}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printable.document.close();
    printable.focus();
    printable.print();
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
              Real-time insights for MD, Executive Directors, and General Managers. Monitor document throughput, highlight
              bottlenecks, and act on pending escalations.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button className="gap-2" onClick={handleExportPdf}>
              <FileDown className="h-4 w-4" /> Export PDF Snapshot
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Executive Insights"
          description="Scan division heatmaps, weekly throughput trends, delayed approvals, and top-level pending memos. Export CSV or PDF snapshots to share with leadership teams."
          links={[
            { label: "Performance Analytics", href: "/analytics" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

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
                  <div
                    key={metric.id}
                    className="rounded-lg border border-border p-4 space-y-2"
                    style={{ backgroundColor: heatmapScale(metric.avgDays, maxAvg) }}
                  >
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentActivity}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} height={60} tickMargin={10} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(59,130,246,0.1)' }} />
                  <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delayed Approvals &gt; 7 Days</CardTitle>
              <CardDescription>Correspondence requiring follow-up due to extended turnaround.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[260px]">
                <div className="space-y-3">
                  {delayedApprovals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No delayed approvals at the moment.</p>
                  ) : (
                    delayedApprovals.map((item) => (
                      <div key={item.id} className="border border-border rounded-lg p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{item.referenceNumber}</span>
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" /> {item.turnaround.toFixed(1)} days
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{item.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Received {formatDateShort(item.receivedDate)} · Division {getDivisionName(item.divisionId)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Memos Requiring Top-Level Review</CardTitle>
            <CardDescription>Items currently assigned to MD/ED/GM leadership.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[260px]">
              <div className="space-y-3">
                {pendingTopLevel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outstanding memos awaiting top-level action.</p>
                ) : (
                  pendingTopLevel.map((item) => (
                    <div key={item.id} className="border border-border rounded-lg p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Flame className="h-3 w-3" /> {item.priority.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-foreground">{item.referenceNumber}</span>
                      </div>
                      <p className="text-muted-foreground">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Division {getDivisionName(item.divisionId)} · Current approver: {item.approverName}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensitivity Breakdown</CardTitle>
            <CardDescription>Document counts and average turnaround by classification.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sensitivityBreakdown.map((item) => (
                <div key={item.sensitivity} className="border border-border rounded-lg p-4 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.count} docs
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average turnaround <strong>{item.avgTurnaround}</strong> days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Classification adherence{' '}
                    <strong>{item.count === 0 ? 'N/A' : item.avgTurnaround > 5 ? 'Attention' : 'On Track'}</strong>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveAnalyticsPage;
