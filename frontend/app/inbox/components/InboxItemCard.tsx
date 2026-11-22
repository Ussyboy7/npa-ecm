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
  correspondenceQueueWarningBadgeClass,
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

/** Awaiting action is a normal queue state: amber, never red. */
const getStatusBadge = (status: string) => {
  if (status === 'pending') {
    return { label: 'Awaiting action', variant: 'outline' as const, className: correspondenceQueueWarningBadgeClass };
  }
  if (status === 'in-progress') return { label: 'In progress', variant: 'secondary' as const, className: undefined };
  return { label: status, variant: 'outline' as const, className: undefined };
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
          {/* Three chips at most: priority, state, deadline. */}
          <Badge variant={getPriorityColor(corr.priority)} className={correspondenceQueueBadgeClass}>
            {corr.priority.toUpperCase()}
          </Badge>
          <Badge
            variant={statusBadge.variant}
            className={cn(correspondenceQueueBadgeClass, statusBadge.className)}
          >
            <Clock className="h-2.5 w-2.5" />
            {statusBadge.label}
          </Badge>
          {slaStatus?.status === 'overdue' && (
            <Badge variant="destructive" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              <AlertCircle className="h-2.5 w-2.5" />
              Overdue {slaStatus.daysOverdue} day{slaStatus.daysOverdue !== 1 ? 's' : ''}
            </Badge>
          )}
          {slaStatus?.status === 'due-soon' && (
            <Badge
              variant="outline"
              className={cn(correspondenceQueueBadgeClass, 'gap-0.5', correspondenceQueueWarningBadgeClass)}
            >
              <Clock className="h-2.5 w-2.5" />
              Due in {slaStatus.daysUntilDue} day{slaStatus.daysUntilDue !== 1 ? 's' : ''}
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
        <span className={correspondenceQueueMetaItemClass}>
          {corr.direction === 'downward' ? (
            <ArrowDown className={cn(correspondenceQueueMetaIconClass, 'text-info')} />
          ) : (
            <ArrowUp className={cn(correspondenceQueueMetaIconClass, 'text-success')} />
          )}
          <span className="truncate">{corr.direction === 'downward' ? 'Downward' : 'Upward'}</span>
        </span>
        {corr.isActingSeat && (
          <span className={correspondenceQueueMetaItemClass}>
            <UserIcon className={correspondenceQueueMetaIconClass} />
            <span className="truncate">
              {corr.actingPrincipalName ? `Acting for ${corr.actingPrincipalName}` : 'Acting seat'}
            </span>
          </span>
        )}
        {!slaStatus && daysPending > 0 && (
          <span className={correspondenceQueueMetaItemClass}>
            <Clock className={correspondenceQueueMetaIconClass} />
            <span className="truncate">
              {daysPending} day{daysPending !== 1 ? 's' : ''} pending
            </span>
          </span>
        )}
      </div>
    </ListRowCard>
  );
};
