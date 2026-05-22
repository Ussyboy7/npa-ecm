"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
} from '@/components/shared/registry-queue-styles';

interface OfficeWorkloadEntry {
  id: string;
  name: string;
  officeType: string;
  total: number;
  urgent: number;
  overdue: number;
  approaching: number;
}

interface OfficeQueuesProps {
  officeWorkload: OfficeWorkloadEntry[];
  portfolioLoading: boolean;
}

export const OfficeQueues = ({ officeWorkload, portfolioLoading }: OfficeQueuesProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        Office queues
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Per-office depth, urgency, and SLA risk at a glance.
      </p>
    </CardHeader>
    <CardContent>
      {officeWorkload.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {portfolioLoading ? 'Loading offices…' : 'No offices assigned.'}
        </p>
      ) : (
        <div className={correspondenceQueueListStackClass}>
          {officeWorkload.map((entry) => (
            <ListRowCard
              key={entry.id}
              density="compact"
              leading={
                <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
                  <Building2 className={cn(correspondenceQueueLeadingIconClass, 'text-primary')} />
                </div>
              }
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold leading-snug text-foreground">
                    {entry.name}
                  </h4>
                  <p className="text-[11px] uppercase text-muted-foreground">
                    {entry.officeType}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{entry.total}</span> in queue
                  </span>
                  <span>
                    <span className="font-semibold text-destructive">{entry.urgent}</span> urgent
                  </span>
                  <span>
                    <span className="font-semibold text-amber-600">{entry.overdue}</span> SLA breach
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">{entry.approaching}</span> approaching
                  </span>
                </div>
              </div>
            </ListRowCard>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
