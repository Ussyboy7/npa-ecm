"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { AlertTriangle, CheckCircle, Building2, FileText } from 'lucide-react';
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

interface EscalationItem {
  id: string | number;
  subject: string;
  priority: string;
  receivedDate?: string | null;
  officeName?: string | null;
  referenceNumber?: string;
}

interface ApprovalItem {
  id: string | number;
  subject: string;
  priority: string;
  agingDays?: number;
  officeName?: string | null;
  referenceNumber?: string;
}

interface EscalationsApprovalsProps {
  escalations: EscalationItem[];
  approvals: ApprovalItem[];
  portfolioLoading: boolean;
}

export const EscalationsApprovals = ({ escalations, approvals, portfolioLoading }: EscalationsApprovalsProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Escalations & approvals
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Act on these before scanning the wider combined inbox.
      </p>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Escalations
        </p>
        {escalations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {portfolioLoading ? 'Loading…' : 'No escalations in your offices.'}
          </p>
        ) : (
          <div className={correspondenceQueueListStackClass}>
            {escalations.map((item) => (
              <ListRowCard
                key={String(item.id)}
                density="compact"
                href={`/correspondence/${item.id}`}
                leading={
                  <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-destructive/10')}>
                    <AlertTriangle className={cn(correspondenceQueueLeadingIconClass, 'text-destructive')} />
                  </div>
                }
              >
                <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <Badge variant="destructive" className={correspondenceQueueBadgeClass}>
                    {item.priority}
                  </Badge>
                  <span className={correspondenceQueueDateClass}>
                    {item.receivedDate ? formatDateShort(item.receivedDate) : '—'}
                  </span>
                </div>
                <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                  <span className={correspondenceQueueMetaItemClass}>
                    <Building2 className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">{item.officeName ?? 'Office'}</span>
                  </span>
                  <span className={correspondenceQueueMetaItemClass}>
                    <FileText className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">Ref: {item.referenceNumber}</span>
                  </span>
                </div>
              </ListRowCard>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2 border-t border-border/60 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Awaiting executive approval
        </p>
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing pending your seal or approval.
          </p>
        ) : (
          <div className={correspondenceQueueListStackClass}>
            {approvals.map((item) => (
              <ListRowCard
                key={String(item.id)}
                density="compact"
                href={`/correspondence/${item.id}`}
                leading={
                  <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
                    <CheckCircle className={cn(correspondenceQueueLeadingIconClass, 'text-primary')} />
                  </div>
                }
              >
                <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <Badge variant="outline" className={correspondenceQueueBadgeClass}>
                    {item.priority}
                  </Badge>
                  <span className={correspondenceQueueDateClass}>
                    {item.agingDays != null ? `${item.agingDays}d aging` : '—'}
                  </span>
                </div>
                <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
                  <span className={correspondenceQueueMetaItemClass}>
                    <Building2 className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">{item.officeName ?? 'Office'}</span>
                  </span>
                  <span className={correspondenceQueueMetaItemClass}>
                    <FileText className={correspondenceQueueMetaIconClass} />
                    <span className="truncate">Ref: {item.referenceNumber}</span>
                  </span>
                </div>
              </ListRowCard>
            ))}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);
