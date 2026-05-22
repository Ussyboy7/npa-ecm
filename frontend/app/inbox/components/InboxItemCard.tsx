"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { Mail, Clock, AlertCircle, User as UserIcon, ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/correspondence-helpers';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
} from '@/components/shared/registry-queue-styles';
import type { Correspondence } from '@/lib/npa-structure';
import { useRouter } from 'next/navigation';

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    default: return 'secondary';
  }
};

const getStatusBadge = (status: string) => {
  if (status === 'pending') return { label: 'Awaiting action', variant: 'destructive' as const };
  if (status === 'in-progress') return { label: 'In progress', variant: 'secondary' as const };
  return { label: status, variant: 'outline' as const };
};

const getStatusBadgeVariant = (status: string): 'destructive' | 'secondary' | 'default' | 'outline' => {
  if (status === 'pending') return 'destructive';
  if (status === 'in-progress') return 'secondary';
  return 'outline';
};

interface SLAStatus {
  status: 'overdue' | 'due-soon' | 'pending';
  daysOverdue?: number;
  daysUntilDue?: number;
}

interface InboxItemCardProps {
  corr: Correspondence;
  slaStatus: SLAStatus | null;
  daysPending?: number;
}

export const InboxItemCard = ({ corr, slaStatus, daysPending = 0 }: InboxItemCardProps) => {
  const router = useRouter();
  const statusBadge = getStatusBadge(corr.status);
  const statusBadgeVariant = getStatusBadgeVariant(corr.status);

  return (
    <ListRowCard
      density="compact"
      href={`/correspondence/${corr.id}`}
      leading={
        <div
          className={cn(
            correspondenceQueueLeadingBoxClass,
            corr.priority === 'urgent'
              ? 'bg-destructive/10'
              : corr.priority === 'high'
                ? 'bg-warning/10'
                : 'bg-primary/10',
          )}
        >
          <Mail
            className={cn(
              correspondenceQueueLeadingIconClass,
              corr.priority === 'urgent'
                ? 'text-destructive'
                : corr.priority === 'high'
                  ? 'text-warning'
                  : 'text-primary',
            )}
          />
        </div>
      }
      actions={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Open correspondence"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/correspondence/${corr.id}`);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open correspondence</TooltipContent>
        </Tooltip>
      }
    >
      <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
            <Mail className="h-2.5 w-2.5" />
            Correspondence
          </Badge>
          <Badge variant={getPriorityColor(corr.priority)} className={correspondenceQueueBadgeClass}>
            {corr.priority.toUpperCase()}
          </Badge>
          <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
            {corr.direction === 'downward' ? (
              <><ArrowDown className="h-2.5 w-2.5 text-info" />Downward</>
            ) : (
              <><ArrowUp className="h-2.5 w-2.5 text-success" />Upward</>
            )}
          </Badge>
          <Badge variant={statusBadgeVariant} className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
            <Clock className="h-2.5 w-2.5" />
            {statusBadge.label}
          </Badge>
          {slaStatus && slaStatus.status === 'overdue' && (
            <Badge variant="destructive" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              <AlertCircle className="h-2.5 w-2.5" />
              Overdue {slaStatus.daysOverdue} day{slaStatus.daysOverdue !== 1 ? 's' : ''}
            </Badge>
          )}
          {slaStatus && slaStatus.status === 'due-soon' && (
            <Badge
              variant="default"
              className={cn(correspondenceQueueBadgeClass, 'gap-0.5 bg-orange-500 hover:bg-orange-600')}
            >
              <Clock className="h-2.5 w-2.5" />
              Due in {slaStatus.daysUntilDue} day{slaStatus.daysUntilDue !== 1 ? 's' : ''}
            </Badge>
          )}
          {!slaStatus && daysPending > 0 && (
            <Badge variant="secondary" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              <Clock className="h-2.5 w-2.5" />
              {daysPending} day{daysPending !== 1 ? 's' : ''} pending
            </Badge>
          )}
        </div>
        <span className={correspondenceQueueDateClass}>{formatDateShort(corr.receivedDate)}</span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
        <span className={correspondenceQueueMetaItemClass}>
          <Mail className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Ref: {corr.referenceNumber}</span>
        </span>
        <span className={correspondenceQueueMetaItemClass}>
          <UserIcon className={correspondenceQueueMetaIconClass} />
          <span className="truncate">From: {corr.senderName}</span>
        </span>
        {corr.currentOfficeName && (
          <span className={correspondenceQueueMetaItemClass}>
            <AlertCircle className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Office: {corr.currentOfficeName}</span>
          </span>
        )}
      </div>
    </ListRowCard>
  );
};
