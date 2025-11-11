"use client";

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDate } from '@/lib/correspondence-helpers';

const Reports = () => {
  const { correspondence } = useCorrespondence();
  const { divisions } = useOrganization();
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');

  const availableDivisions = useMemo(() => divisions ?? [], [divisions]);

  // Filter correspondence based on selected filters
  const filteredCorrespondence = useMemo(() => {
    const periodDays = parseInt(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    return correspondence.filter(item => {
      const matchesDivision = selectedDivision === 'all' || item.divisionId === selectedDivision;
      const matchesPeriod = new Date(item.receivedDate) >= cutoffDate;
      return matchesDivision && matchesPeriod;
    });
  }, [correspondence, selectedDivision, selectedPeriod]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const total = filteredCorrespondence.length;
    const completed = filteredCorrespondence.filter(c => c.status === 'completed').length;
    const inProgress = filteredCorrespondence.filter(c => c.status === 'in-progress').length;
    const pending = filteredCorrespondence.filter(c => c.status === 'pending').length;
    const urgent = filteredCorrespondence.filter(c => c.priority === 'urgent').length;

    const avgProcessingTime = filteredCorrespondence
      .filter(c => c.status === 'completed')
      .reduce((acc, c) => {
        const days = Math.floor((new Date().getTime() - new Date(c.receivedDate).getTime()) / (1000 * 60 * 60 * 24));
        return acc + days;
      }, 0) / (completed || 1);

    return {
      total,
      completed,
      inProgress,
      pending,
      urgent,
      avgProcessingTime: Math.round(avgProcessingTime),
      completionRate: Math.round((completed / total) * 100) || 0,
    };
  }, [filteredCorrespondence]);

  // Status distribution data
  const statusData = [
    { name: 'Completed', value: metrics.completed, color: 'hsl(var(--chart-1))' },
    { name: 'In Progress', value: metrics.inProgress, color: 'hsl(var(--chart-2))' },
    { name: 'Pending', value: metrics.pending, color: 'hsl(var(--chart-3))' },
  ];

  // Priority distribution data
  const priorityData = useMemo(() => {
    const urgent = filteredCorrespondence.filter(c => c.priority === 'urgent').length;
    const high = filteredCorrespondence.filter(c => c.priority === 'high').length;
    const medium = filteredCorrespondence.filter(c => c.priority === 'medium').length;
    const low = filteredCorrespondence.filter(c => c.priority === 'low').length;

    return [
      { name: 'Urgent', value: urgent, color: 'hsl(var(--destructive))' },
      { name: 'High', value: high, color: 'hsl(var(--chart-2))' },
      { name: 'Medium', value: medium, color: 'hsl(var(--chart-3))' },
      { name: 'Low', value: low, color: 'hsl(var(--chart-4))' },
    ];
  }, [filteredCorrespondence]);

  // Division performance data
  const divisionData = useMemo(() => {
    return availableDivisions.map(division => {
      const divisionCorrespondence = filteredCorrespondence.filter(c => c.divisionId === division.id);
      const completed = divisionCorrespondence.filter(c => c.status === 'completed').length;
      const total = divisionCorrespondence.length;

      return {
        name: division.code ?? division.name,
        total,
        completed,
        pending: total - completed,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }).filter(d => d.total > 0);
  }, [filteredCorrespondence, availableDivisions]);

  // Trend data (last 7 days)
  const trendData = useMemo(() => {
    const days = 7;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayCorrespondence = filteredCorrespondence.filter(c => {
        const cDate = new Date(c.receivedDate).toISOString().split('T')[0];
        return cDate === dateStr;
      });

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        received: dayCorrespondence.length,
        completed: dayCorrespondence.filter(c => c.status === 'completed').length,
      });
    }

    return data;
  }, [filteredCorrespondence]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive correspondence management insights
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        <HelpGuideCard
          title="Generate Insights"
          description="Adjust division and time period filters to tailor key metrics, throughput trends, and priority breakdowns. Use the export controls to share actionable reports with stakeholders."
          links={[
            { label: "Performance Analytics", href: "/analytics" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Division</label>
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {availableDivisions.map(division => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name} {division.code ? `(${division.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Time Period</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Correspondence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.urgent} urgent items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.completed} of {metrics.total} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgProcessingTime} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                For completed items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Action</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.inProgress} in progress
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="divisions">Division Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Breakdown by correspondence status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Breakdown by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="divisions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Division Performance</CardTitle>
                <CardDescription>Correspondence handling by division</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={divisionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="hsl(var(--chart-1))" name="Completed" />
                    <Bar dataKey="pending" fill="hsl(var(--chart-3))" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rates by Division</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {divisionData.map(division => (
                    <div key={division.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{division.name}</span>
                        <span className="text-muted-foreground">
                          {division.completed}/{division.total} ({division.rate}%)
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${division.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>7-Day Trend</CardTitle>
                <CardDescription>Daily correspondence received and completed</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="received"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      name="Received"
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name="Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
