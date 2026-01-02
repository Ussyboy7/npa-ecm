"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Cell,
  Legend,
} from 'recharts';
import {
  FileDown,
  Download,
  Flame,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Award,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { downloadAnalyticsExport, fetchExecutiveAnalytics, type ExecutiveAnalytics } from '@/lib/analytics-client';
import {
  fetchEnhancedSLAAnalytics,
  fetchEnhancedDivisionPerformance,
  fetchEfficiencyAnalysis,
  fetchEscalations,
  type EnhancedSLAAnalytics,
  type EnhancedDivisionPerformance,
  type EfficiencyAnalysis,
  type Escalation,
} from '@/lib/sla-client';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export const ExecutiveDashboardTab = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [data, setData] = useState<ExecutiveAnalytics | null>(null);
  const [slaData, setSlaData] = useState<EnhancedSLAAnalytics | null>(null);
  const [divisionPerf, setDivisionPerf] = useState<EnhancedDivisionPerformance | null>(null);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyAnalysis | null>(null);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [execResponse, slaResponse, divResponse, effResponse, escResponse] = await Promise.all([
          fetchExecutiveAnalytics(selectedPeriod),
          fetchEnhancedSLAAnalytics({ range: parseInt(selectedPeriod) }),
          fetchEnhancedDivisionPerformance({ range: parseInt(selectedPeriod) }),
          fetchEfficiencyAnalysis({ range: parseInt(selectedPeriod) }),
          fetchEscalations({ status: 'pending' }),
        ]);
        
        if (!ignore) {
          setData(execResponse);
          setSlaData(slaResponse);
          setDivisionPerf(divResponse);
          setEfficiencyData(effResponse);
          setEscalations(escResponse);
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

  // Enhanced SLA data
  const slaSummary = slaData?.summary ?? { total: 0, compliant: 0, breached: 0, atRisk: 0, complianceRate: 0 };
  // Filter out "unassigned" division from display as it represents correspondence without a division assignment
  const slaByDivision = useMemo(() => {
    const allDivisions = divisionPerf?.divisions ?? [];
    return allDivisions.filter(div => 
      div.name.toLowerCase() !== 'unassigned' && 
      div.name.toLowerCase() !== 'unassigned division'
    );
  }, [divisionPerf?.divisions]);
  const bottlenecks = efficiencyData?.bottlenecks ?? [];
  const topPerformers = efficiencyData?.staffMetrics?.topPerformers ?? [];

  // Chart colors
  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return '#22c55e';
    if (rate >= 75) return '#eab308';
    if (rate >= 50) return '#f97316';
    return '#ef4444';
  };

  const heatmapColor = (slaCompliance: number) => {
    const complianceIntensity = Math.max(0, (100 - slaCompliance) / 100);
    const lightness = 95 - complianceIntensity * 40;
    const hue = slaCompliance >= 80 ? 142 : slaCompliance >= 60 ? 45 : 0;
    return `hsl(${hue} 70% ${lightness}%)`;
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
    <ClientErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div></div>
          <div className="flex gap-2 items-center">
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
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button size="sm" onClick={() => triggerDownload('pdf')} disabled={loading || exporting !== null}>
              <FileDown className="h-4 w-4 mr-2" /> PDF
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

        {/* SLA Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Correspondence</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slaSummary.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In the last {selectedPeriod} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{slaSummary.complianceRate}%</span>
                {slaSummary.complianceRate >= 85 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Progress value={slaSummary.complianceRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {slaSummary.compliant} of {slaSummary.total} within SLA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slaSummary.atRisk}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Approaching SLA deadline
              </p>
              {slaSummary.atRisk > 0 && (
                <Badge variant="secondary" className="mt-2">Needs attention</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Breached</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slaSummary.breached}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {slaSummary.total > 0 
                  ? `${((slaSummary.breached / slaSummary.total) * 100).toFixed(1)}% of total`
                  : 'Past deadline'}
              </p>
              {slaSummary.breached > 0 && (
                <Badge variant="destructive" className="mt-2">Action required</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="sla" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sla">SLA & Turnaround</TabsTrigger>
            <TabsTrigger value="divisions">Division Performance</TabsTrigger>
            <TabsTrigger value="escalations">
              Escalations
              {escalations.length > 0 && (
                <Badge variant="destructive" className="ml-2">{escalations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          </TabsList>

          {/* SLA & Turnaround Tab */}
          <TabsContent value="sla" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Division SLA Compliance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Division SLA Compliance</CardTitle>
                  <CardDescription>SLA compliance rate by division</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {slaByDivision.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={slaByDivision.slice(0, 8)}
                        layout="vertical"
                        margin={{ left: 20, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'SLA Compliance']} />
                        <Bar dataKey="slaComplianceRate" radius={[0, 4, 4, 0]}>
                          {slaByDivision.slice(0, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getComplianceColor(entry.slaComplianceRate)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* SLA by Priority */}
              <Card>
                <CardHeader>
                  <CardTitle>SLA by Priority</CardTitle>
                  <CardDescription>Compliance breakdown by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(slaData?.byPriority ?? []).map((item) => (
                      <div key={item.priority} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: PRIORITY_COLORS[item.priority] }}
                            />
                            <span className="font-medium capitalize">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">{item.total} items</span>
                            <Badge variant={item.complianceRate >= 80 ? 'default' : item.complianceRate >= 60 ? 'secondary' : 'destructive'}>
                              {item.complianceRate}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={item.complianceRate} className="h-2" />
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>✓ {item.compliant} compliant</span>
                          <span>⚠ {item.atRisk} at risk</span>
                          <span>✗ {item.breached} breached</span>
                        </div>
                      </div>
                    ))}
                    {(!slaData?.byPriority || slaData.byPriority.length === 0) && (
                      <p className="text-sm text-muted-foreground">No priority data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Throughput */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Throughput Trend</CardTitle>
                <CardDescription>Completed vs. pending correspondence over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {weeklyTrend.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No correspondence activity yet.
                    </div>
                  ) : (
                    <LineChart data={weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2} name="Completed" />
                      <Line type="monotone" dataKey="pending" stroke="#dc2626" strokeWidth={2} name="Pending" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Division Performance Tab */}
          <TabsContent value="divisions" className="space-y-4">
            {/* Enhanced Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Division Performance Heatmap</CardTitle>
                <CardDescription>SLA compliance and turnaround by division</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {slaByDivision.length === 0 ? (
                    <div className="col-span-full text-sm text-muted-foreground">No division data available.</div>
                  ) : (
                    slaByDivision.map((div) => (
                      <div
                        key={div.id ?? div.name}
                        className="rounded-lg border p-4 space-y-3"
                        style={{ backgroundColor: heatmapColor(div.slaComplianceRate) }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{div.name}</span>
                          <Badge variant={div.slaComplianceRate >= 80 ? 'default' : div.slaComplianceRate >= 60 ? 'secondary' : 'destructive'}>
                            {div.slaComplianceRate}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Workload: {div.workload} | Completed: {div.completed}</div>
                          <div>Avg Turnaround: {div.avgTurnaround} days</div>
                          <div>Backlog: {div.backlog}</div>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-green-700">✓ {div.slaCompliant}</span>
                          <span className="text-yellow-700">⚠ {div.slaAtRisk}</span>
                          <span className="text-red-700">✗ {div.slaBreached}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Department Activity & Sensitivity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Most Active Departments</CardTitle>
                  <CardDescription>Top departments by correspondence volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    {departmentActivity.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No department activity recorded.
                      </div>
                    ) : (
                      <BarChart data={departmentActivity}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="total" fill="hsl(var(--primary))" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Document Sensitivity Breakdown</CardTitle>
                  <CardDescription>Counts and average turnaround by sensitivity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sensitivityBreakdown.map((item) => (
                      <div key={item.sensitivity} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">Avg {item.avgTurnaround} days</p>
                        </div>
                        <Badge variant="outline">{item.count} docs</Badge>
                      </div>
                    ))}
                    {sensitivityBreakdown.length === 0 && (
                      <p className="text-sm text-muted-foreground">No documents processed.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Escalations Tab */}
          <TabsContent value="escalations" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Active Escalations</CardTitle>
                      <CardDescription>Items requiring immediate attention</CardDescription>
                    </div>
                    <Link href="/admin/workflow-sla">
                      <Button variant="outline" size="sm">
                        Manage <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    {escalations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                        <p className="font-medium">No Active Escalations</p>
                        <p className="text-sm text-muted-foreground">All items are within SLA</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {escalations.map((esc) => (
                          <Link
                            key={esc.id}
                            href={`/correspondence/${esc.correspondence}`}
                            className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">{esc.correspondenceReference}</Badge>
                              <Badge variant={esc.status === 'pending' ? 'destructive' : 'secondary'}>
                                {esc.statusDisplay}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-1">{esc.correspondenceSubject}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {esc.ruleName} • {new Date(esc.triggeredAt).toLocaleDateString()}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Delayed Approvals */}
              <Card>
                <CardHeader>
                  <CardTitle>Delayed Approvals</CardTitle>
                  <CardDescription>Items older than 7 days awaiting completion</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    {delayedApprovals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                        <p className="font-medium">No Delayed Approvals</p>
                        <p className="text-sm text-muted-foreground">All items are on track 🎉</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {delayedApprovals.map((item) => (
                          <Link
                            key={item.id}
                            href={`/correspondence/${item.id}`}
                            className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{item.referenceNumber}</span>
                              <Badge variant="destructive">
                                <Flame className="h-3 w-3 mr-1" /> {item.daysPending}d
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{item.subject}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.divisionName} • {item.currentApprover}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Pending Leadership */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Leadership Approvals</CardTitle>
                <CardDescription>Items awaiting MD/ED/GM attention</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingTopLevel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leadership backlog</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingTopLevel.slice(0, 6).map((item) => (
                      <Link
                        key={item.id}
                        href={`/correspondence/${item.id}`}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.referenceNumber}</span>
                          <Badge variant="secondary">{item.daysPending}d</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.approverName} • {item.divisionName}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bottlenecks Tab */}
          <TabsContent value="bottlenecks" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Efficiency Bottlenecks */}
              <Card>
                <CardHeader>
                  <CardTitle>Process Bottlenecks</CardTitle>
                  <CardDescription>Divisions with highest average pending time</CardDescription>
                </CardHeader>
                <CardContent>
                  {bottlenecks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                      <p className="font-medium">No Bottlenecks Detected</p>
                      <p className="text-sm text-muted-foreground">Workflow is running smoothly</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bottlenecks.map((item, index) => (
                        <div key={item.divisionId ?? index} className="flex items-center gap-4">
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.divisionName}</p>
                            <p className="text-sm text-muted-foreground">{item.pendingCount} pending items</p>
                          </div>
                          <Badge variant="outline">Avg {item.avgPendingDays} days</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Process Efficiency Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Process Efficiency</CardTitle>
                  <CardDescription>Key efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">First Touch Resolution</p>
                        <p className="text-xs text-muted-foreground">Items resolved without transfer</p>
                      </div>
                      <span className="text-2xl font-bold">{efficiencyData?.processEfficiency?.firstTouchResolutionRate ?? 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Average Handoffs</p>
                        <p className="text-xs text-muted-foreground">Transfers per item</p>
                      </div>
                      <span className="text-2xl font-bold">{efficiencyData?.processEfficiency?.avgHandoffs?.toFixed(1) ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Active Staff</p>
                        <p className="text-xs text-muted-foreground">Processing correspondence</p>
                      </div>
                      <span className="text-2xl font-bold">{efficiencyData?.staffMetrics?.activeStaff ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Staff Utilization</p>
                        <p className="text-xs text-muted-foreground">Capacity usage</p>
                      </div>
                      <span className="text-2xl font-bold">{efficiencyData?.staffMetrics?.utilizationRate?.toFixed(0) ?? 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Staff with highest completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                {topPerformers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No performance data available</p>
                ) : (
                  <div className="space-y-4">
                    {topPerformers.slice(0, 5).map((performer, index) => (
                      <div key={performer.userId} className="flex items-center gap-4">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{performer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {performer.itemsCompleted} completed • Avg {performer.avgResponseDays}d response
                          </p>
                        </div>
                        <Award className="h-5 w-5 text-yellow-500" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading && (
          <p className="text-xs text-muted-foreground">Refreshing analytics…</p>
        )}
      </div>
    </ClientErrorBoundary>
  );
};

