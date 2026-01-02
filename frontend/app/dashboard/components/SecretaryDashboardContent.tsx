"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, Mail, FileText, CheckCircle, CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Activity } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { formatDateShort } from '@/lib/correspondence-helpers';
import Link from 'next/link';
import { getCases } from '@/lib/api/cases';
import { getFormDocuments } from '@/lib/api/dms-forms';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import type { Correspondence } from '@/lib/npa-structure';

interface Executive {
  id: string;
  name: string;
  email?: string;
}

interface SecretaryMetrics {
  totalCorrespondence: number;
  totalCases: number;
  totalForms: number;
  urgentItems: number;
  pendingActions: number;
  completedToday: number;
  executivesSupported: number;
}

interface RecentActivity {
  id: string;
  type: 'correspondence' | 'case' | 'form';
  title: string;
  executive?: string;
  timestamp: string;
  status: string;
}

const SecretaryDashboardContent = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [metrics, setMetrics] = useState<SecretaryMetrics>({
    totalCorrespondence: 0,
    totalCases: 0,
    totalForms: 0,
    urgentItems: 0,
    pendingActions: 0,
    completedToday: 0,
    executivesSupported: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Fetch executives
  useEffect(() => {
    if (!hydrated || !currentUser) return;

    const fetchExecutives = async () => {
      try {
        const response = await apiFetch<Executive[]>('/correspondence/cases/secretary-executives/');
        setExecutives(response);
      } catch (error) {
        logError('Failed to load executives:', error);
      }
    };

    void fetchExecutives();
  }, [hydrated, currentUser]);

  // Fetch metrics and activities
  useEffect(() => {
    if (!hydrated || !currentUser) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // Fetch secretary inbox summary
        const inboxResponse = await apiFetch<Record<string, unknown>>('/correspondence/items/secretary-inbox/');
        const correspondence = Array.isArray(inboxResponse.results) 
          ? inboxResponse.results.map(mapApiCorrespondence)
          : [];

        // Fetch cases (with executive filter if needed)
        const casesResponse = await getCases({ page: 1, pageSize: 100 });
        const cases = casesResponse.results || [];

        // Fetch forms
        const formsResponse = await getFormDocuments();
        const forms = Array.isArray(formsResponse) ? formsResponse : [];

        // Calculate metrics
        const urgentItems = correspondence.filter(
          (item: Correspondence) => item.priority === 'urgent' && item.status !== 'completed'
        ).length;

        const pendingActions = correspondence.filter(
          (item: Correspondence) => item.status === 'pending' || item.status === 'in-progress'
        ).length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = correspondence.filter((item: Correspondence) => {
          if (item.status !== 'completed') return false;
          const updatedDate = item.updatedAt ? new Date(item.updatedAt) : null;
          return updatedDate && updatedDate >= today;
        }).length;

        setMetrics({
          totalCorrespondence: inboxResponse.count || correspondence.length,
          totalCases: casesResponse.count || cases.length,
          totalForms: forms.length,
          urgentItems,
          pendingActions,
          completedToday,
          executivesSupported: executives.length,
        });

        // Build recent activities
        const activities: RecentActivity[] = [];
        
        // Add recent correspondence
        correspondence.slice(0, 5).forEach((item: Correspondence) => {
          activities.push({
            id: item.id,
            type: 'correspondence',
            title: item.subject,
            timestamp: item.updatedAt || item.receivedDate,
            status: item.status,
          });
        });

        // Add recent cases
        cases.slice(0, 3).forEach((caseItem) => {
          activities.push({
            id: caseItem.id,
            type: 'case',
            title: caseItem.title,
            timestamp: caseItem.updatedAt || caseItem.openedAt,
            status: caseItem.status,
          });
        });

        // Sort by timestamp and take top 8
        activities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setRecentActivities(activities.slice(0, 8));

      } catch (error) {
        logError('Failed to load secretary metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, [hydrated, currentUser, executives.length]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'correspondence':
        return Mail;
      case 'case':
        return FileText;
      case 'form':
        return CheckCircle2;
      default:
        return Activity;
    }
  };

  const getActivityLink = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'correspondence':
        return `/correspondence/${activity.id}`;
      case 'case':
        return `/cases/${activity.id}`;
      case 'form':
        return `/dms/${activity.id}`;
      default:
        return '#';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
      case 'closed':
        return 'default';
      case 'in-progress':
      case 'in_progress':
        return 'secondary';
      case 'pending':
      case 'open':
        return 'outline';
      case 'urgent':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!hydrated || !currentUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Secretary Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your executive support activities and workload
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCorrespondence}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Correspondence handled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingActions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.urgentItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              High priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items resolved today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Executives Supported */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Executives Supported
            </CardTitle>
            <CardDescription>
              Executives you have acted on behalf of
            </CardDescription>
          </CardHeader>
          <CardContent>
            {executives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No executives found</p>
                <p className="text-sm mt-1">
                  Executives will appear here once you act on their behalf
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {executives.map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{exec.name}</p>
                        {exec.email && (
                          <p className="text-xs text-muted-foreground">{exec.email}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/cases?executive=${exec.id}`)}
                    >
                      View Cases
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>
              Your recent executive support activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <Link
                      key={`${activity.type}-${activity.id}`}
                      href={getActivityLink(activity)}
                      className="block"
                    >
                      <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="mt-0.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">{activity.title}</p>
                            <Badge variant={getStatusBadgeVariant(activity.status)} className="text-xs">
                              {activity.status.replace('_', ' ').replace('-', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{activity.type}</span>
                            <span>•</span>
                            <span>{formatDateShort(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for executive support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/inbox?tab=executive-support')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Executive Support Inbox
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/cases')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Cases
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => router.push('/forms')}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Manage Forms
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecretaryDashboardContent;

