"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { Mail, User as UserIcon, ArrowDown, ArrowUp, Clock, AlertCircle, Building2, Copy } from "lucide-react";
import { getCorrespondenceStatusBadge, getPriorityBadgeVariant } from "@/lib/status-badge";
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
} from "@/components/shared/registry-queue-styles";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import type { Correspondence } from "@/lib/npa-structure";

export type UserOrgIds = {
  officeIds: Set<string>;
  divisionIds: Set<string>;
  departmentIds: Set<string>;
  directorateIds: Set<string>;
};

const SLA_THRESHOLDS: Record<string, number> = {
  urgent: 2,
  high: 5,
  medium: 10,
  low: 14,
  default: 10,
};

function isOverdue(item: Correspondence): boolean {
  if (!item.receivedDate) return false;
  const priority = item.priority ?? "default";
  const threshold = SLA_THRESHOLDS[priority] ?? SLA_THRESHOLDS.default;
  const received = new Date(item.receivedDate).getTime();
  const daysOpen = (Date.now() - received) / (1000 * 60 * 60 * 24);
  return daysOpen > threshold && item.status !== "completed";
}

function calculateDaysPending(item: Correspondence): number {
  if (!item.receivedDate) return 0;
  const received = new Date(item.receivedDate).getTime();
  return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
}

function getCCInfo(
  corr: Correspondence,
  userOrgIds: UserOrgIds,
): { isCC: boolean; purpose?: string } {
  if (!corr.distribution || corr.distribution.length === 0) {
    return { isCC: false };
  }
  for (const recipient of corr.distribution) {
    if (recipient.type === "office" && recipient.officeId && userOrgIds.officeIds.has(recipient.officeId)) {
      return { isCC: true, purpose: recipient.purpose };
    }
    if (recipient.type === "division" && recipient.divisionId && userOrgIds.divisionIds.has(recipient.divisionId)) {
      return { isCC: true, purpose: recipient.purpose };
    }
    if (recipient.type === "department" && recipient.departmentId && userOrgIds.departmentIds.has(recipient.departmentId)) {
      return { isCC: true, purpose: recipient.purpose };
    }
    if (recipient.type === "directorate" && recipient.directorateId && userOrgIds.directorateIds.has(recipient.directorateId)) {
      return { isCC: true, purpose: recipient.purpose };
    }
  }
  return { isCC: false };
}

function getPurposeLabel(purpose?: string): string {
  switch (purpose) {
    case "action": return "For Action";
    case "information": return "For Info";
    case "comment": return "For Comment";
    default: return "CC";
  }
}

function getPurposeColor(purpose?: string): string {
  switch (purpose) {
    case "action": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "information": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "comment": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

type InboxCorrespondenceCardProps = {
  corr: Correspondence;
  userOrgIds: UserOrgIds;
};

function InboxCorrespondenceCardContent({ corr, userOrgIds }: InboxCorrespondenceCardProps) {
  const { divisions } = useOrganization();
  const { users: organizationUsers } = useOrgUsers();

  const division = useMemo(
    () => corr.divisionId ? divisions.find((div) => div.id === corr.divisionId) : undefined,
    [corr.divisionId, divisions],
  );
  const currentApprover = useMemo(
    () => corr.currentApproverId ? organizationUsers.find((user) => user.id === corr.currentApproverId) : undefined,
    [corr.currentApproverId, organizationUsers],
  );
  const overdue = useMemo(() => isOverdue(corr), [corr]);
  const daysPending = useMemo(() => calculateDaysPending(corr), [corr]);
  const daysPendingColor = daysPending > 5 ? "destructive" : daysPending > 2 ? "default" : "secondary";
  const ccInfo = useMemo(() => getCCInfo(corr, userOrgIds), [corr, userOrgIds]);
  const statusBadge = getCorrespondenceStatusBadge(corr.status);

  const cardClassName = !corr.isRead ? "bg-blue-50/50 dark:bg-blue-950/10" : undefined;

  return (
    <ListRowCard
      density="compact"
      href={`/correspondence/${corr.id}`}
      className={cardClassName}
      leading={(
        <div
          className={cn(
            correspondenceQueueLeadingBoxClass,
            corr.priority === "urgent"
              ? "bg-destructive/10"
              : corr.priority === "high"
                ? "bg-warning/10"
                : "bg-primary/10",
          )}
        >
          <Mail
            className={cn(
              correspondenceQueueLeadingIconClass,
              corr.priority === "urgent"
                ? "text-destructive"
                : corr.priority === "high"
                  ? "text-warning"
                  : "text-primary",
            )}
          />
          {ccInfo.isCC && (
            <div className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500">
              <Copy className="h-2 w-2 text-white" />
            </div>
          )}
          {!corr.isRead && (
            <div className="absolute -left-0.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
          )}
        </div>
      )}
    >
      <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {ccInfo.isCC && (
            <Badge
              variant="outline"
              className={cn(correspondenceQueueBadgeClass, getPurposeColor(ccInfo.purpose))}
            >
              <Copy className="h-2.5 w-2.5" />
              {getPurposeLabel(ccInfo.purpose)}
            </Badge>
          )}
          <Badge variant={getPriorityBadgeVariant(corr.priority)} className={correspondenceQueueBadgeClass}>
            {corr.priority.toUpperCase()}
          </Badge>
          <Badge variant="secondary" className={cn(correspondenceQueueBadgeClass, "gap-0.5")}>
            {corr.direction === "downward" ? (
              <><ArrowDown className="h-2.5 w-2.5 text-info" />Downward</>
            ) : (
              <><ArrowUp className="h-2.5 w-2.5 text-success" />Upward</>
            )}
          </Badge>
          <Badge variant={statusBadge.variant} className={cn(correspondenceQueueBadgeClass, statusBadge.className)}>
            {statusBadge.label}
          </Badge>
          {overdue && (
            <Badge variant="destructive" className={correspondenceQueueBadgeClass}>
              SLA Breach
            </Badge>
          )}
          {daysPending > 0 && (
            <Badge variant={daysPendingColor as "destructive" | "default" | "secondary"} className={cn(correspondenceQueueBadgeClass, "gap-0.5")}>
              <Clock className="h-2.5 w-2.5" />
              {daysPending} day{daysPending !== 1 ? "s" : ""} pending
            </Badge>
          )}
        </div>
        <span className={correspondenceQueueDateClass}>{formatDateShort(corr.receivedDate)}</span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
        <span className={correspondenceQueueMetaItemClass}>
          <UserIcon className={correspondenceQueueMetaIconClass} />
          <span className="truncate">From: {corr.senderName || "\u2014"}</span>
        </span>
        <span className={correspondenceQueueMetaItemClass}>
          <Mail className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Ref: {corr.referenceNumber}</span>
        </span>
        {division && (
          <span className={correspondenceQueueMetaItemClass}>
            <AlertCircle className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Division: {division.name}</span>
          </span>
        )}
        {currentApprover && (
          <span className={correspondenceQueueMetaItemClass}>
            <Clock className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Current: {currentApprover.name}</span>
          </span>
        )}
        {corr.currentOfficeName && (
          <span className={correspondenceQueueMetaItemClass}>
            <Building2 className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Office: {corr.currentOfficeName}</span>
          </span>
        )}
      </div>
    </ListRowCard>
  );
}

export const InboxCorrespondenceCard = React.memo(InboxCorrespondenceCardContent);
