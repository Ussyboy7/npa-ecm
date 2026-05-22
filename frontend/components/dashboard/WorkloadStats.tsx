"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  registryQueueSearchStatsShellContentClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';

interface WorkloadStatsProps {
  stats: { pending: number; inProgress: number; completedToday: number; urgent: number };
  loading: boolean;
  isExecutive: boolean;
}

const statsConfig = [
  { key: 'pending' as const, title: 'Pending', icon: Clock, bgClass: 'bg-primary/10', iconClass: 'text-primary', description: 'Items awaiting your action' },
  { key: 'inProgress' as const, title: 'In Progress', icon: Send, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400', description: 'Items being processed' },
  { key: 'completedToday' as const, title: 'Completed Today', icon: CheckCircle, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-600 dark:text-emerald-400', description: 'Items resolved today' },
  { key: 'urgent' as const, title: 'Urgent Items', icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive', description: 'High priority items' },
];

export const WorkloadStats = ({ stats, loading, isExecutive }: WorkloadStatsProps) => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">My workload</CardTitle>
          <p className="text-sm text-muted-foreground">
            From your personal inbox and items completed today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/inbox">Open inbox</Link>
          </Button>
          {isExecutive ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/approvals">Executive approvals</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </CardHeader>
    <CardContent className={registryQueueSearchStatsShellContentClass}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your stats…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statsConfig.map(({ key, title, icon: Icon, bgClass, iconClass, description }) => (
            <Card key={key}>
              <CardContent className={registryQueueStatCardContentClass}>
                <div className="flex items-center gap-4">
                  <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                    <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                  </div>
                  <div>
                    <p className={registryQueueStatLabelClass}>{title}</p>
                    <p className={registryQueueStatValueClass}>{stats[key].toString()}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
