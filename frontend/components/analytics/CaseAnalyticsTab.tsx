"use client";

import { useState, useEffect } from 'react';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatStrip } from '@/components/shared/StatStrip';
import { appType } from '@/lib/app-type';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';
import { toast } from 'sonner';

interface CaseStatistics {
  summary: {
    total_cases: number;
    open_cases: number;
    in_progress_cases: number;
    resolved_cases: number;
    closed_cases: number;
    archived_cases: number;
    cases_with_packages: number;
    avg_resolution_days: number | null;
  };
  breakdown: {
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  };
  trends: {
    cases_over_time: Array<{ date: string | null; count: number }>;
  };
  top_assignments: {
    by_division: Array<{ id: string; name: string; count: number }>;
    by_department: Array<{ id: string; name: string; count: number }>;
    by_user: Array<{ id: string; name: string; count: number }>;
  };
  range_days: number;
}

export const CaseAnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CaseStatistics | null>(null);
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    void loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const response = await apiFetch<CaseStatistics>(`/analytics/cases/?range=${rangeDays}`);
      setStats(response);
    } catch (error: unknown) {
      logError('Failed to load case statistics', error);
      toast.error('Failed to load case statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No case statistics available</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      case 'archived':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <ClientErrorBoundary>
      <div className="space-y-6">
        {/* Header with Range Selector */}
        <div className="flex items-center justify-between">
          <div></div>
          <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <StatStrip
          items={[
            {
              key: "total",
              label: "Total Cases",
              value: stats.summary.total_cases,
              hint: `Cases opened in the last ${rangeDays} days`,
            },
            {
              key: "resolution",
              label: "Resolution Rate",
              value:
                stats.summary.total_cases > 0
                  ? `${((stats.summary.resolved_cases / stats.summary.total_cases) * 100).toFixed(1)}%`
                  : "0%",
              hint: `${stats.summary.resolved_cases} of ${stats.summary.total_cases} resolved`,
            },
            {
              key: "open",
              label: "Open Cases",
              value: stats.summary.open_cases,
              hint:
                stats.summary.total_cases > 0
                  ? `${((stats.summary.open_cases / stats.summary.total_cases) * 100).toFixed(1)}% of total`
                  : "Currently open",
            },
            {
              key: "avg",
              label: "Avg Resolution",
              value: stats.summary.avg_resolution_days
                ? `${stats.summary.avg_resolution_days.toFixed(1)} days`
                : "N/A",
              hint: "Average time to resolve",
            },
          ]}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="breakdown" className="space-y-4">
          <TabsList>
            <TabsTrigger value="breakdown">Case Breakdown</TabsTrigger>
            <TabsTrigger value="assignments">Top Assignments</TabsTrigger>
            <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>By Status</CardTitle>
                  <CardDescription>Case distribution by status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.breakdown.by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${getStatusColor(status)}`} />
                        <span className="text-sm">{getStatusLabel(status)}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>By Type</CardTitle>
                  <CardDescription>Case distribution by type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.breakdown.by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Priority Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>By Priority</CardTitle>
                  <CardDescription>Case distribution by priority</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.breakdown.by_priority).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{priority}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Top Divisions */}
              {stats.top_assignments.by_division.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Top Divisions
                    </CardTitle>
                    <CardDescription>Divisions with most case assignments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.top_assignments.by_division.map((item) => (
                      <div key={item.id as string} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        <Badge variant="secondary" className="ml-2">{item.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Top Departments */}
              {stats.top_assignments.by_department.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Top Departments
                    </CardTitle>
                    <CardDescription>Departments with most case assignments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.top_assignments.by_department.map((item) => (
                      <div key={item.id as string} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        <Badge variant="secondary" className="ml-2">{item.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Top Users */}
              {stats.top_assignments.by_user.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Top Assigned Users
                    </CardTitle>
                    <CardDescription>Users with most case assignments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.top_assignments.by_user.map((item) => (
                      <div key={item.id as string} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        <Badge variant="secondary" className="ml-2">{item.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Completion Packages</CardTitle>
                  <CardDescription>Cases with generated completion packages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={cn(appType.statValue, "text-xl")}>{stats.summary.cases_with_packages}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.summary.total_cases > 0
                      ? `${((stats.summary.cases_with_packages / stats.summary.total_cases) * 100).toFixed(1)}% of total cases`
                      : 'No cases'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cases Over Time</CardTitle>
                  <CardDescription>Daily case creation trend (last 7 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {stats.trends.cases_over_time.slice(-7).map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.date ? new Date(item.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : 'N/A'}
                        </span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ClientErrorBoundary>
  );
};

