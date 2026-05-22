"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { Shield, AlertCircle, Clock, Mail, ChevronRight } from 'lucide-react';
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
import { useRouter } from 'next/navigation';

interface PendingApproval {
  id: string;
  correspondenceId?: string;
  correspondence?: {
    id: string;
    subject: string;
    reference_number: string;
  };
  due_date?: string;
  created_at: string;
}

interface ApprovalTaskStatus {
  status: 'overdue' | 'due-soon' | 'pending';
  daysOverdue?: number;
  daysUntilDue?: number;
}

interface InboxApprovalCardProps {
  approval: PendingApproval;
  taskStatus: ApprovalTaskStatus;
}

export const InboxApprovalCard = ({ approval, taskStatus }: InboxApprovalCardProps) => {
  const router = useRouter();
  const cid = approval.correspondenceId || approval.correspondence?.id || '';

  return (
    <ListRowCard
      density="compact"
      href={`/correspondence/${cid}`}
      className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
      leading={
        <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-amber-100/90 dark:bg-amber-950/50')}>
          <Shield className={cn(correspondenceQueueLeadingIconClass, 'text-amber-700 dark:text-amber-400')} />
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
                router.push(`/correspondence/${cid}`);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open correspondence</TooltipContent>
        </Tooltip>
      }
    >
      <h4 className={correspondenceQueueSubjectClass}>
        {approval.correspondence?.subject || 'Pending Approval'}
      </h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className={cn(
              correspondenceQueueBadgeClass,
              'gap-0.5 border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
            )}
          >
            <Shield className="h-2.5 w-2.5" />
            Pending Approval
          </Badge>
          {taskStatus.status === 'overdue' && (
            <Badge variant="destructive" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
              <AlertCircle className="h-2.5 w-2.5" />
              Overdue {taskStatus.daysOverdue} day{taskStatus.daysOverdue !== 1 ? 's' : ''}
            </Badge>
          )}
          {taskStatus.status === 'due-soon' && (
            <Badge
              variant="default"
              className={cn(correspondenceQueueBadgeClass, 'gap-0.5 bg-orange-500 hover:bg-orange-600')}
            >
              <Clock className="h-2.5 w-2.5" />
              Due in {taskStatus.daysUntilDue} day{taskStatus.daysUntilDue !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <span className={correspondenceQueueDateClass}>
          {formatDateShort(approval.created_at)}
        </span>
      </div>
      {approval.correspondence?.reference_number ? (
        <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
          <span className={correspondenceQueueMetaItemClass}>
            <Mail className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Ref: {approval.correspondence.reference_number}</span>
          </span>
        </div>
      ) : null}
    </ListRowCard>
  );
};
