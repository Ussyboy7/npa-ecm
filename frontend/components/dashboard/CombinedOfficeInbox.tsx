"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { Mail, Building2, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface InboxPreviewItem {
  id: string | number;
  subject: string;
  priority: string;
  slaStatus: string;
  officeName?: string | null;
  referenceNumber?: string;
  agingDays?: number;
}

interface CombinedOfficeInboxProps {
  inboxPreview: InboxPreviewItem[];
  portfolioLoading: boolean;
}

export const CombinedOfficeInbox = ({ inboxPreview, portfolioLoading }: CombinedOfficeInboxProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        Combined office inbox
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Urgent and aging items across offices you oversee.
      </p>
    </CardHeader>
    <CardContent>
      {inboxPreview.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {portfolioLoading ? 'Loading…' : 'No open correspondence in your offices.'}
        </p>
      ) : (
        <div className={correspondenceQueueListStackClass}>
          {inboxPreview.map((item) => (
            <ListRowCard
              key={String(item.id)}
              density="compact"
              href={`/correspondence/${item.id}`}
              leading={
                <div
                  className={cn(
                    correspondenceQueueLeadingBoxClass,
                    item.slaStatus === 'breach'
                      ? 'bg-destructive/10'
                      : item.slaStatus === 'approaching'
                        ? 'bg-amber-500/10'
                        : 'bg-muted/60',
                  )}
                >
                  <Mail
                    className={cn(
                      correspondenceQueueLeadingIconClass,
                      item.slaStatus === 'breach'
                        ? 'text-destructive'
                        : item.slaStatus === 'approaching'
                          ? 'text-amber-600'
                          : 'text-muted-foreground',
                    )}
                  />
                </div>
              }
            >
              <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <Badge
                  variant={
                    item.slaStatus === 'breach'
                      ? 'destructive'
                      : item.slaStatus === 'approaching'
                        ? 'secondary'
                        : 'outline'
                  }
                  className={correspondenceQueueBadgeClass}
                >
                  {item.priority}
                </Badge>
                <span className={correspondenceQueueDateClass}>
                  SLA {String(item.slaStatus).toUpperCase()}
                </span>
              </div>
              <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                <span className={correspondenceQueueMetaItemClass}>
                  <Building2 className={correspondenceQueueMetaIconClass} />
                  <span className="truncate">{item.officeName ?? '—'}</span>
                </span>
                <span className={correspondenceQueueMetaItemClass}>
                  <FileText className={correspondenceQueueMetaIconClass} />
                  <span className="truncate">Ref: {item.referenceNumber}</span>
                </span>
                <span className={correspondenceQueueMetaItemClass}>
                  <Clock className={correspondenceQueueMetaIconClass} />
                  <span className="truncate">{item.agingDays ?? '—'}d aging</span>
                </span>
              </div>
            </ListRowCard>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
