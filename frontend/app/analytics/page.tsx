"use client";

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Users, Target, Award } from 'lucide-react';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useOrganization } from '@/contexts/OrganizationContext';

const Performance = () => {
  const { correspondence, minutes } = useCorrespondence();
  const { divisions } = useOrganization();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');

  // Filter correspondence based on selected period
  const filteredCorrespondence = useMemo(() => {
    const periodDays = parseInt(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    return correspondence.filter(item => new Date(item.receivedDate) >= cutoffDate);
  }, [correspondence, selectedPeriod]);

  // SLA Compliance Metrics (assuming 5 days standard, 2 days urgent)
  const slaMetrics = useMemo(() => {
    const completed = filteredCorrespondence.filter(c => c.status === 'completed');
    
    const slaCompliant = completed.filter(c => {
      const daysTaken = Math.floor(
        (new Date().getTime() - new Date(c.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const slaTarget = c.priority === 'urgent' ? 2 : c.priority === 'high' ? 3 : 5;
      return daysTaken <= slaTarget;
    });

    const complianceRate = completed.length > 0 
      ? Math.round((slaCompliant.length / completed.length) * 100)
      : 0;

    return {
      total: completed.length,
      compliant: slaCompliant.length,
      breached: completed.length - slaCompliant.length,
      complianceRate,
    };
  }, [filteredCorrespondence]);

  // Turnaround Time Analytics
  const turnaroundMetrics = useMemo(() => {
    const completed = filteredCorrespondence.filter(c => c.status === 'completed');
    
    const times = completed.map(c => {
      return Math.floor(
        (new Date().getTime() - new Date(c.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    });

    const avgTurnaround = times.length > 0 
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

    const fastestTurnaround = times.length > 0 ? Math.min(...times) : 0;
    const slowestTurnaround = times.length > 0 ? Math.max(...times) : 0;

    return {
      average: avgTurnaround,
      fastest: fastestTurnaround,
      slowest: slowestTurnaround,
    };
  }, [filteredCorrespondence]);

  // Division Performance Comparison
  const divisionPerformance = useMemo(() => {
    return divisions.map(division => {
      const divisionCorr = filteredCorrespondence.filter(c => c.divisionId === division.id);
      const completed = divisionCorr.filter(c => c.status === 'completed');
      
      const avgTurnaround = completed.length > 0
        ? Math.round(
            completed.reduce((acc, c) => {
              const days = Math.floor(
                (new Date().getTime() - new Date(c.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
              );
              return acc + days;
            }, 0) / completed.length
          )
        : 0;

      const workload = divisionCorr.length;
      const completionRate = divisionCorr.length > 0 
        ? Math.round((completed.length / divisionCorr.length) * 100)
        : 0;

      return {
        name: division.code ?? division.name,
        fullName: division.name,
        workload,
        completed: completed.length,
        completionRate,
        avgTurnaround,
        efficiency: completionRate > 0 ? Math.round((completionRate / (avgTurnaround || 1)) * 10) : 0,
      };
    }).filter(d => d.workload > 0);
  }, [filteredCorrespondence, divisions]);

  // Response Time Distribution
  const responseDistribution = useMemo(() => {
    const completed = filteredCorrespondence.filter(c => c.status === 'completed');
    
    const ranges = [
      { name: '0-2 days', min: 0, max: 2, count: 0 },
      { name: '3-5 days', min: 3, max: 5, count: 0 },
      { name: '6-10 days', min: 6, max: 10, count: 0 },
      { name: '11-15 days', min: 11, max: 15, count: 0 },
      { name: '15+ days', min: 16, max: Infinity, count: 0 },
    ];

    completed.forEach(c => {
      const days = Math.floor(
        (new Date().getTime() - new Date(c.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      for (const range of ranges) {
        if (days >= range.min && days <= range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges;
  }, [filteredCorrespondence]);

  // User/Role Performance
  const rolePerformance = useMemo(() => {
    const secretaryActions = minutes.filter(m => m.actedBySecretary).length;
    const assistantActions = minutes.filter(m => m.actedByAssistant).length;
    const totalActions = minutes.length;
    const executiveActions = totalActions - secretaryActions - assistantActions;
    
    return [
      {
        role: 'Secretary',
        actions: secretaryActions,
        avgResponseTime: 2.5,
      },
      {
        role: 'Assistant',
        actions: assistantActions,
        avgResponseTime: 3.0,
      },
      {
        role: 'Executive',
        actions: executiveActions,
        avgResponseTime: 4.0,
      },
    ];
  }, [minutes]);

  // Radar chart data for division comparison
  const radarData = useMemo(() => {
    return divisionPerformance.slice(0, 6).map(div => ({
      division: div.name,
      completionRate: div.completionRate,
      efficiency: div.efficiency,
      workload: Math.min(div.workload * 10, 100), // Normalize to 100
    }));
  }, [divisionPerformance]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Performance Analytics</h1>
            <p className="text-muted-foreground mt-1">
              SLA compliance, turnaround times, and efficiency metrics
            </p>
          </div>
          <div className="w-48">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
          description="Adjust the reporting window to monitor SLA compliance, turnaround time, and divisional efficiency. Explore the tabs below to switch between KPIs, response time distribution, and division leaderboards."
          links={[
            { label: "Executive Dashboard", href: "/analytics/executive" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* SLA Metrics */}
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
                <p className="text-xs text-muted-foreground">
                  Target: 5 days
                </p>
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
              <div className="text-2xl font-bold">{rolePerformance.reduce((a, b) => a + b.actions, 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Total actions taken
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
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
                    <Progress 
                      value={(slaMetrics.breached / (slaMetrics.total || 1)) * 100} 
                      className="h-2"
                    />
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
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .map((division, index) => (
                      <div key={division.name} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              #{index + 1}
                            </Badge>
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
                        fillOpacity={0.6} 
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Role Performance</CardTitle>
                  <CardDescription>Activity and response time by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {rolePerformance.map(role => (
                      <div key={role.role} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{role.role}</span>
                          <Badge variant="outline">{role.actions} actions</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Avg Response: {role.avgResponseTime} days
                        </div>
                        <Progress 
                          value={Math.min((role.actions / 10) * 100, 100)} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
