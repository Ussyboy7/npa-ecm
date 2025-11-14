"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, Users, Target, Award } from 'lucide-react';
import { fetchPerformanceAnalytics, type PerformanceAnalytics } from '@/lib/analytics-client';

const Performance = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [data, setData] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchPerformanceAnalytics(selectedPeriod);
        if (!ignore) {
          setData(response);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
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

  const slaMetrics = data?.sla ?? { total: 0, compliant: 0, breached: 0, complianceRate: 0 };
  const turnaroundMetrics = data?.turnaround ?? { average: 0, fastest: 0, slowest: 0 };
  const divisionPerformance = data?.divisionPerformance ?? [];
  const responseDistribution = data?.responseDistribution ?? [];
  const rolePerformance = data?.rolePerformance ?? [];

  const radarData = useMemo(() => {
    return divisionPerformance.slice(0, 6).map((division) => ({
      division: division.name,
      completionRate: division.completionRate,
      efficiency: division.efficiency,
      workload: Math.min(division.workload * 10, 100),
    }));
  }, [divisionPerformance]);

  const totalActions = rolePerformance.reduce((sum, role) => sum + role.actions, 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Performance Analytics</h1>
            <p className="text-muted-foreground mt-1">
              SLA compliance, turnaround times, and efficiency metrics powered by real-time backend analytics
            </p>
          </div>
          <div className="w-48">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <HelpGuideCard
          title="Understand Performance Trends"
          description="Adjust the reporting window to monitor SLA compliance, turnaround time, and divisional efficiency."
          links={[
            { label: 'Executive Dashboard', href: '/analytics/executive' },
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slaMetrics.complianceRate}%</div>
              <Progress value={slaMetrics.complianceRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {slaMetrics.compliant} of {slaMetrics.total} within SLA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Turnaround</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turnaroundMetrics.average} days</div>
              <div className="flex items-center gap-2 mt-2">
                {turnaroundMetrics.average <= 5 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <p className="text-xs text-muted-foreground">Target: 5 days</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fastest Response</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turnaroundMetrics.fastest} days</div>
              <Badge variant="secondary" className="mt-2">
                Best Performance
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActions}</div>
              <p className="text-xs text-muted-foreground mt-2">Total actions recorded</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sla" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sla">SLA & Turnaround</TabsTrigger>
            <TabsTrigger value="divisions">Division Performance</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="sla" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>SLA Breach Analysis</CardTitle>
                  <CardDescription>Items within and outside SLA targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Within SLA</span>
                      <span className="text-sm text-muted-foreground">{slaMetrics.compliant}</span>
                    </div>
                    <Progress value={(slaMetrics.compliant / (slaMetrics.total || 1)) * 100} className="h-2" />

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm font-medium">SLA Breached</span>
                      <span className="text-sm text-muted-foreground">{slaMetrics.breached}</span>
                    </div>
                    <Progress value={(slaMetrics.breached / (slaMetrics.total || 1)) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Time Distribution</CardTitle>
                  <CardDescription>Completion time breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={responseDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="divisions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Division Performance Metrics</CardTitle>
                <CardDescription>Comparative performance across divisions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={divisionPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completionRate" fill="hsl(var(--chart-1))" name="Completion Rate %" />
                    <Bar dataKey="avgTurnaround" fill="hsl(var(--chart-2))" name="Avg Days" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Division Rankings</CardTitle>
                <CardDescription>Sorted by completion rate and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {divisionPerformance
                    .slice()
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .map((division, index) => (
                      <div key={division.name} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <Badge variant={index === 0 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                            <span className="font-medium">{division.fullName}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {division.completionRate}% • {division.avgTurnaround}d avg
                          </div>
                        </div>
                        <Progress value={division.completionRate} className="h-2" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Division Efficiency Radar</CardTitle>
                  <CardDescription>Multi-dimensional performance view</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="division" />
                      <PolarRadiusAxis />
                      <Radar
                        name="Completion Rate"
                        dataKey="completionRate"
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="Efficiency Score"
                        dataKey="efficiency"
                        stroke="hsl(var(--chart-2))"
                        fill="hsl(var(--chart-2))"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Role Performance</CardTitle>
                  <CardDescription>Breakdown of recorded actions per role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rolePerformance.map((role) => (
                      <div key={role.role} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{role.role}</p>
                          <p className="text-xs text-muted-foreground">Avg response {role.avgResponseTime} days</p>
                        </div>
                        <Badge variant="outline">{role.actions} actions</Badge>
                      </div>
                    ))}
                    {rolePerformance.length === 0 && (
                      <p className="text-sm text-muted-foreground">No role activity recorded for this window.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {loading && (
          <p className="text-xs text-muted-foreground">Refreshing analytics…</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Performance;
