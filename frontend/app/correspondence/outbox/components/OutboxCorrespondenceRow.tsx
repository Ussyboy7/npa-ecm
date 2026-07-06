"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { FlowTypeBadge } from '@/components/correspondence/FlowTypeBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Mail,
  Pencil,
  Undo2,
  Trash2,
  RotateCcw,
  Clock,
  User as UserIcon,
  Building2,
  Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/correspondence-helpers';
import type { Correspondence, Division, User } from '@/lib/npa-structure';
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
} from '@/components/shared/registry-queue-styles';

interface OutboxCorrespondenceRowProps {
  item: Correspondence;
  division?: Division;
  currentApprover?: User;
  daysPending: number;
  showActions: boolean;
  showDispatchDate: boolean;
  isProcessing: boolean;
  recallLoading: boolean;
  onWithdraw: (item: Correspondence) => void;
  onRecall: (item: Correspondence) => void;
  onDelete: (item: Correspondence) => void;
}

const getStatusBadgeVariant = (status: string): 'destructive' | 'secondary' | 'default' | 'outline' => {
  if (status === 'pending') return 'destructive';
  if (status === 'in-progress') return 'secondary';
  if (status === 'completed') return 'default';
  return 'outline';
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'secondary';
  }
};

export function OutboxCorrespondenceRow({
  item,
  division,
  currentApprover,
  daysPending,
  showActions,
  showDispatchDate,
  isProcessing,
  recallLoading,
  onWithdraw,
  onRecall,
  onDelete,
}: OutboxCorrespondenceRowProps) {
  const router = useRouter();
  const status = item.status as string;

  return (
    <ListRowCard
      density="compact"
      href={`/correspondence/${item.id as string}`}
      leading={(
        <div
          className={cn(
            correspondenceQueueLeadingBoxClass,
            item.priority === 'urgent'
              ? 'bg-destructive/10'
              : item.priority === 'high'
                ? 'bg-warning/10'
                : 'bg-primary/10',
          )}
        >
          <Mail
            className={cn(
              correspondenceQueueLeadingIconClass,
              item.priority === 'urgent'
                ? 'text-destructive'
                : item.priority === 'high'
                  ? 'text-warning'
                  : 'text-primary',
            )}
          />
        </div>
      )}
      actions={showActions ? (
        <>
          {status === 'pending' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Edit draft"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/correspondence/register?edit=${item.id as string}`);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Edit draft</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Cancel draft"
                  disabled={status !== 'pending' && status !== 'in-progress' || isProcessing}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onWithdraw(item);
                  }}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              {status === 'pending' || status === 'in-progress' ? 'Cancel draft' : 'Only pending drafts can be cancelled'}
            </TooltipContent>
          </Tooltip>
          {status !== 'pending' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Recall minute"
                    disabled={recallLoading || isProcessing}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void onRecall(item);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="left">Recall minute</TooltipContent>
            </Tooltip>
          )}
          {status === 'pending' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete draft"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(item);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Delete draft</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : undefined}
    >
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.subject}</h3>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge variant={getPriorityColor(item.priority)} className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
            {item.priority.toUpperCase()}
          </Badge>
          <FlowTypeBadge
            flowType={item.flowType}
            isInward={item.isInward}
            isOutward={item.isOutward}
            isInternal={item.isInternal}
            isExternal={item.isExternal}
            compact
            className="h-5 gap-0.5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none"
          />
          <Badge
            variant={getStatusBadgeVariant(status)}
            className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none"
          >
            {status.replace('-', ' ')}
          </Badge>
          {daysPending > 0 && (
            <Badge variant="outline" className="h-5 gap-0.5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
              <Clock className="h-2.5 w-2.5" />
              {daysPending} day{daysPending === 1 ? '' : 's'} pending
            </Badge>
          )}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {item.updatedAt ? formatDateShort(item.updatedAt) : '—'}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 border-t border-border/60 pt-1.5 text-[11px] leading-tight text-muted-foreground">
        <span className="inline-flex max-w-full items-center gap-1">
          <Mail className="h-3 w-3 shrink-0 opacity-80" />
          <span className="truncate">Ref: {item.referenceNumber}</span>
        </span>
        {item.senderName && (
          <span className="inline-flex max-w-full items-center gap-1">
            <UserIcon className="h-3 w-3 shrink-0 opacity-80" />
            <span className="truncate">From: {item.senderName}</span>
          </span>
        )}
        {division && (
          <span className="inline-flex max-w-full items-center gap-1">
            <Building2 className="h-3 w-3 shrink-0 opacity-80" />
            <span className="truncate">Division: {division.name}</span>
          </span>
        )}
        {currentApprover && (
          <span className="inline-flex max-w-full items-center gap-1">
            <Clock className="h-3 w-3 shrink-0 opacity-80" />
            <span className="truncate">Current Approver: {currentApprover.name}</span>
          </span>
        )}
        {showDispatchDate && item.dispatchDate && (
          <span className="inline-flex max-w-full items-center gap-1">
            <Send className="h-3 w-3 shrink-0 opacity-80" />
            <span className="truncate">Dispatched: {formatDateShort(item.dispatchDate)}</span>
          </span>
        )}
      </div>
    </ListRowCard>
  );
}
