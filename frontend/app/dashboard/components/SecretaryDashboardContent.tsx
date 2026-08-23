"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  registryQueueSearchStatsShellContentClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
} from '@/components/shared/registry-queue-styles';
import { cn } from '@/lib/utils';
import {
  UserCheck,
  Mail,
  FileText,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Activity,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { getCases } from '@/lib/api/cases';
import { getFormDocuments } from '@/lib/api/dms-forms';
import { mapApiCorrespondence } from '@/lib/api/correspondence-mappers';
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
  const { currentUser } = useCurrentUser();
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

  // Fetch executives, metrics, and activities
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [execResponse, inboxResponse] = await Promise.all([
          apiFetch<Executive[]>('/correspondence/cases/secretary-executives/'),
          apiFetch<Record<string, unknown>>('/correspondence/items/secretary-inbox/'),
        ]);
        setExecutives(execResponse);
        const executivesCount = execResponse.length;
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
          (item: Correspondence) => item.priority === 'urgent' && item.status as string !== 'completed'
        ).length;

        const pendingActions = correspondence.filter(
          (item: Correspondence) => item.status as string === 'pending' || item.status as string === 'in-progress'
        ).length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = correspondence.filter((item: Correspondence) => {
          if (item.status as string !== 'completed') return false;
          const updatedDate = item.updatedAt ? new Date(item.updatedAt) : null;
          return updatedDate && updatedDate >= today;
        }).length;

        const inboxResponseObj = inboxResponse as Record<string, unknown>;
        setMetrics({
          totalCorrespondence: (inboxResponseObj && typeof inboxResponseObj.count === 'number') ? inboxResponseObj.count : correspondence.length,
          totalCases: (casesResponse && typeof casesResponse === 'object' && 'count' in casesResponse && typeof casesResponse.count === 'number') ? casesResponse.count : cases.length,
          totalForms: forms.length,
          urgentItems,
          pendingActions,
          completedToday,
          executivesSupported: executivesCount,
        });

        // Build recent activities
        const activities: RecentActivity[] = [];
        
        // Add recent correspondence
        correspondence.slice(0, 5).forEach((item: Correspondence) => {
          activities.push({
            id: item.id as string,
            type: 'correspondence',
            title: item.subject,
            timestamp: item.updatedAt || item.receivedDate,
            status: item.status as string,
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

      } catch (error: unknown) {
        logError('Failed to load secretary metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAll();
  }, [currentUser?.id]);

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

  if (loading) {
    return <LoadingState message="Loading your workload…" />;
  }

  const statsItems = [
    {
      label: 'Total items',
      value: metrics.totalCorrespondence,
      description: 'Correspondence handled',
      icon: FileText,
    },
    {
      label: 'Pending actions',
      value: metrics.pendingActions,
      description: 'Requires attention',
      icon: Clock,
    },
    {
      label: 'Urgent items',
      value: metrics.urgentItems,
      description: 'High priority',
      icon: AlertCircle,
    },
    {
      label: 'Completed today',
      value: metrics.completedToday,
      description: 'Items resolved today',
      icon: CheckCircle,
    },
  ];

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg">Secretary workload</CardTitle>
              <CardDescription>
                From your executive support inbox and today&apos;s completions.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/inbox?tab=executive-support')}>
                Executive inbox
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/cases')}>
                Manage cases
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/dms')}>
                Manage forms
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={registryQueueSearchStatsShellContentClass}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statsItems.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardContent className={registryQueueStatCardContentClass}>
                    <div className="flex items-center gap-4">
                      <div className={cn(registryQueueStatIconBoxClass, 'bg-muted/60')}>
                        <Icon className={cn(registryQueueStatIconClass, 'text-muted-foreground')} />
                      </div>
                      <div>
                        <p className={registryQueueStatLabelClass}>{stat.label}</p>
                        <p className={registryQueueStatValueClass}>{stat.value}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Executives supported
            </CardTitle>
            <CardDescription>
              Executives you have acted on behalf of.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {executives.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="No executives yet"
                message="Executives will appear here once you act on their behalf."
                variant="dashed"
              />
            ) : (
              <div className={correspondenceQueueListStackClass}>
                {executives.map((exec) => (
                  <ListRowCard
                    key={exec.id}
                    density="compact"
                    leading={
                      <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
                        <UserCheck
                          className={cn(correspondenceQueueLeadingIconClass, 'text-primary')}
                        />
                      </div>
                    }
                    actions={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/cases?executive=${exec.id}`)}
                      >
                        View cases
                      </Button>
                    }
                  >
                    <h4 className={correspondenceQueueSubjectClass}>{exec.name}</h4>
                    {exec.email ? (
                      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                        <span className={correspondenceQueueMetaItemClass}>
                          <Mail className={correspondenceQueueMetaIconClass} />
                          <span className="truncate">{exec.email}</span>
                        </span>
                      </div>
                    ) : null}
                  </ListRowCard>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent activities
            </CardTitle>
            <CardDescription>
              Your recent correspondence, cases, and form activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <EmptyState
                icon="file"
                title="No recent activity"
                message="Activity will appear here as you work on correspondence and cases."
                variant="dashed"
              />
            ) : (
              <div className={correspondenceQueueListStackClass}>
                {recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <ListRowCard
                      key={`${activity.type}-${activity.id}`}
                      density="compact"
                      href={getActivityLink(activity)}
                      leading={
                        <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-muted/60')}>
                          <Icon
                            className={cn(
                              correspondenceQueueLeadingIconClass,
                              'text-muted-foreground',
                            )}
                          />
                        </div>
                      }
                    >
                      <h4 className={correspondenceQueueSubjectClass}>{activity.title}</h4>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <Badge
                          variant={getStatusBadgeVariant(activity.status)}
                          className={correspondenceQueueBadgeClass}
                        >
                          {activity.status.replace(/_/g, ' ').replace(/-/g, ' ')}
                        </Badge>
                        <span className={correspondenceQueueDateClass}>
                          {formatDateShort(activity.timestamp)}
                        </span>
                      </div>
                      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                        <span className={correspondenceQueueMetaItemClass}>
                          <Icon className={correspondenceQueueMetaIconClass} />
                          <span className="capitalize">{activity.type}</span>
                        </span>
                      </div>
                    </ListRowCard>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecretaryDashboardContent;

