"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListRowCard } from "@/components/shared/ListRowCard";
import {
  Mail,
  Pencil,
  Undo2,
  Trash2,
  RotateCcw,
  Clock,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { cn } from "@/lib/utils";
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
} from "@/components/shared/registry-queue-styles";
import { FlowTypeBadge } from "@/components/correspondence/FlowTypeBadge";
import type { Correspondence } from "@/lib/npa-structure";
import type { Division } from "@/lib/organization-types";

function getStatusBadgeVariant(status: string): "secondary" | "default" | "outline" {
  if (status === "in-progress") return "secondary";
  if (status === "completed") return "default";
  return "outline";
}

/** Awaiting action is a normal draft state: amber, never red. */
function getStatusBadgeClass(status: string): string | undefined {
  return status === "pending" ? correspondenceQueueWarningBadgeClass : undefined;
}

function getPriorityColor(priority: string): "destructive" | "default" | "secondary" | "outline" {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "default";
    case "medium": return "secondary";
    case "low": return "outline";
    default: return "secondary";
  }
}

function calculateDaysPending(item: Correspondence): number {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
}

type SentCorrespondenceCardProps = {
  item: Correspondence;
  divisions: Division[];
  isProcessing: boolean;
  recallLoading: boolean;
  onEdit: (item: Correspondence) => void;
  onResend: (item: Correspondence) => void;
  onWithdraw: (item: Correspondence) => void;
  onRecall: (item: Correspondence) => void;
  onDelete: (item: Correspondence) => void;
};

function SentCorrespondenceCardContent({
  item,
  divisions,
  isProcessing,
  recallLoading,
  onEdit,
  onResend,
  onWithdraw,
  onRecall,
  onDelete,
}: SentCorrespondenceCardProps) {
  const division = item.divisionId
    ? divisions.find((div) => div.id === item.divisionId)
    : undefined;
  const daysPending = calculateDaysPending(item);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(item);
  };

  const handleResend = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onResend(item);
  };

  const handleWithdraw = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWithdraw(item);
  };

  const handleRecall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRecall(item);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(item);
  };

  return (
    <ListRowCard
      density="compact"
      href={`/correspondence/${item.id}`}
      leading={(
        <div
          className={cn(
            correspondenceQueueLeadingBoxClass,
            item.priority === "urgent"
              ? "bg-destructive/10"
              : item.priority === "high"
                ? "bg-warning/10"
                : "bg-primary/10",
          )}
        >
          <Mail
            className={cn(
              correspondenceQueueLeadingIconClass,
              item.priority === "urgent"
                ? "text-destructive"
                : item.priority === "high"
                  ? "text-warning"
                  : "text-primary",
            )}
          />
        </div>
      )}
      actions={(
        <>
          {item.status === "pending" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Edit draft"
                  onClick={handleEdit}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Edit draft</TooltipContent>
            </Tooltip>
          )}
          {item.status === "withdrawn" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Resend draft"
                  disabled={isProcessing}
                  onClick={handleResend}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Restore and resend draft</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Cancel draft"
                disabled={item.status !== "pending" && item.status !== "in-progress"}
                onClick={handleWithdraw}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {item.status === "pending" || item.status === "in-progress"
                ? "Cancel draft"
                : "Only pending drafts can be cancelled"}
            </TooltipContent>
          </Tooltip>
          {item.status !== "pending" && (
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
                    onClick={handleRecall}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="left">Recall minute</TooltipContent>
            </Tooltip>
          )}
          {item.status === "pending" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete draft"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Delete draft</TooltipContent>
            </Tooltip>
          )}
        </>
      )}
    >
      <h4 className={correspondenceQueueSubjectClass}>{item.subject}</h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {/* Three chips at most: priority, flow, state. */}
          <Badge variant={getPriorityColor(item.priority)} className={correspondenceQueueBadgeClass}>
            {item.priority.toUpperCase()}
          </Badge>
          <FlowTypeBadge
            flowType={item.flowType}
            isInward={item.isInward}
            isOutward={item.isOutward}
            isInternal={item.isInternal}
            isExternal={item.isExternal}
            compact
            className={cn(correspondenceQueueBadgeClass, "gap-0.5")}
          />
          <Badge
            variant={getStatusBadgeVariant(item.status)}
            className={cn(correspondenceQueueBadgeClass, getStatusBadgeClass(item.status))}
          >
            {item.status.replace("-", " ")}
          </Badge>
        </div>
        <span className={correspondenceQueueDateClass}>
          {item.updatedAt ? formatDateShort(item.updatedAt) : "\u2014"}
        </span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
        <span className={correspondenceQueueMetaItemClass}>
          <Mail className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Ref: {item.referenceNumber}</span>
        </span>
        {item.senderName && (
          <span className={correspondenceQueueMetaItemClass}>
            <UserIcon className={correspondenceQueueMetaIconClass} />
            <span className="truncate">From: {item.senderName}</span>
          </span>
        )}
        {division && (
          <span className={correspondenceQueueMetaItemClass}>
            <Building2 className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Division: {division.name}</span>
          </span>
        )}
        {item.currentApproverName && (
          <span className={correspondenceQueueMetaItemClass}>
            <Clock className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Current Approver: {item.currentApproverName}</span>
          </span>
        )}
        {daysPending > 0 && (
          <span className={correspondenceQueueMetaItemClass}>
            <Clock className={correspondenceQueueMetaIconClass} />
            <span className="truncate">
              {daysPending} day{daysPending === 1 ? "" : "s"} pending
            </span>
          </span>
        )}
      </div>
    </ListRowCard>
  );
}

export const SentCorrespondenceCard = React.memo(SentCorrespondenceCardContent);
