"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { EmptyState } from '@/components/shared/EmptyState';
import Link from 'next/link';
import { Mail, FileText, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/correspondence-helpers';
import {
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
import type { Correspondence } from '@/lib/npa-structure';

interface RecentCorrespondenceProps {
  items: Correspondence[];
  loading: boolean;
}

export const RecentCorrespondence = ({ items, loading }: RecentCorrespondenceProps) => (
  <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Mail className="h-5 w-5 text-primary" />
        Recent correspondence
      </CardTitle>
      {items.length > 0 ? (
        <Button variant="ghost" size="sm" className="text-primary" asChild>
          <Link href="/inbox">View all ({items.length})</Link>
        </Button>
      ) : null}
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No pending items"
          message="You are caught up, or your inbox may be empty for this persona."
          variant="dashed"
        />
      ) : (
        <div className={correspondenceQueueListStackClass}>
          {items.slice(0, 5).map((corr) => {
            const urgent = corr.priority === 'urgent';
            const high = corr.priority === 'high';
            return (
              <ListRowCard
                key={corr.id}
                density="compact"
                href={`/correspondence/${corr.id}`}
                leading={
                  <div
                    className={cn(
                      correspondenceQueueLeadingBoxClass,
                      urgent ? 'bg-destructive/10' : high ? 'bg-amber-500/10' : 'bg-primary/10',
                    )}
                  >
                    <Mail
                      className={cn(
                        correspondenceQueueLeadingIconClass,
                        urgent ? 'text-destructive' : high ? 'text-amber-600' : 'text-primary',
                      )}
                    />
                  </div>
                }
              >
                <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge
                      variant={urgent ? 'destructive' : 'secondary'}
                      className={correspondenceQueueBadgeClass}
                    >
                      {corr.priority}
                    </Badge>
                    <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                      {corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}
                    </Badge>
                  </div>
                  <span className={correspondenceQueueDateClass}>
                    {formatDateShort(corr.receivedDate)}
                  </span>
                </div>
                <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                  <span className={correspondenceQueueMetaItemClass}>
                    <Users className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">From: {corr.senderName}</span>
                  </span>
                  <span className={correspondenceQueueMetaItemClass}>
                    <FileText className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">Ref: {corr.referenceNumber}</span>
                  </span>
                </div>
              </ListRowCard>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);
