"use client";

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import { Inbox, AlertCircle, Clock } from 'lucide-react';

interface SummaryData {
  total: number;
  urgent: number;
  overdue: number;
  dueSoon: number;
}

interface InboxSummaryCardsProps {
  summary: SummaryData;
}

const cards = [
  { label: 'Total in Queue', key: 'total' as const, icon: Inbox, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
  { label: 'Urgent Items', key: 'urgent' as const, icon: AlertCircle, bgClass: 'bg-destructive/10', iconClass: 'text-destructive' },
  { label: 'SLA Breaches', key: 'overdue' as const, icon: Clock, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
  { label: 'Due Soon', key: 'dueSoon' as const, icon: AlertCircle, bgClass: 'bg-orange-500/10', iconClass: 'text-orange-600 dark:text-orange-400' },
];

export const InboxSummaryCards = ({ summary }: InboxSummaryCardsProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {cards.map(({ label, key, icon: Icon, bgClass, iconClass }) => (
      <Card key={key}>
        <CardContent className={registryQueueStatCardContentClass}>
          <div className="flex items-center gap-4">
            <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
              <Icon className={cn(registryQueueStatIconClass, iconClass)} />
            </div>
            <div>
              <p className={registryQueueStatLabelClass}>{label}</p>
              <p className={registryQueueStatValueClass}>{summary[key]}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);
