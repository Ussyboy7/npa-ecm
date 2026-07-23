"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Building2,
  Clock,
  Send,
  CheckCircle2,
  Paperclip,
  User,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isCorrespondenceClosed } from "@/lib/correspondence-helpers";
import {
  DetailStatusStrip,
  StatusStripSep,
} from "@/components/shared/DetailStatusStrip";
import {
  getCorrespondenceStatusBadge,
  getPriorityBadgeVariant,
} from "@/lib/status-badge";

interface CompactStatusStripProps {
  status: string;
  receivedDate?: string;
  direction?: "upward" | "downward" | "lateral" | "internal";
  priority?: string;
  currentOffice?: string;
  senderName?: string;
  senderOrganization?: string;
  attachmentCount?: number;
  hasPhysicalCopy?: boolean;
  daysPending?: number;
  dispatchedCount?: number;
  acknowledgedCount?: number;
  className?: string;
}

const directionConfig: Record<string, { icon: typeof ArrowDown; label: string }> = {
  upward: { icon: ArrowUp, label: "Inward" },
  downward: { icon: ArrowDown, label: "Outward" },
  lateral: { icon: ArrowRight, label: "Lateral" },
  internal: { icon: ArrowRight, label: "Internal" },
};

function formatDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

function cleanOfficeName(name: string | undefined): string | null {
  if (!name) return null;
  return name.replace(/Office\s+Office/gi, "Office").trim();
}

const CompactStatusStripContent = ({
  status,
  receivedDate,
  direction,
  priority,
  currentOffice,
  senderName,
  senderOrganization,
  attachmentCount = 0,
  hasPhysicalCopy = false,
  daysPending,
  dispatchedCount,
  acknowledgedCount,
  className,
}: CompactStatusStripProps) => {
  const cfg = getCorrespondenceStatusBadge(status);
  const dir = direction ? directionConfig[direction] : null;
  const DirIcon = dir?.icon;
  const dateStr = formatDate(receivedDate);
  const officeName = cleanOfficeName(currentOffice);
  const closed = isCorrespondenceClosed(status);
  const priorityLabel = priority?.trim().toUpperCase();

  const hasDispatchProgress =
    dispatchedCount !== undefined && acknowledgedCount !== undefined && dispatchedCount > 0;
  const allAcknowledged = hasDispatchProgress && acknowledgedCount === dispatchedCount;

  return (
    <DetailStatusStrip className={className}>
      <Badge variant={cfg.variant} className={cn("text-[10px] h-5 shrink-0", cfg.className)}>
        {cfg.label}
      </Badge>

      {priorityLabel ? (
        <>
          <StatusStripSep />
          <Badge
            variant={getPriorityBadgeVariant(priority)}
            className="text-[10px] h-5 shrink-0"
          >
            {priorityLabel}
          </Badge>
        </>
      ) : null}

      {hasDispatchProgress ? (
        <>
          <StatusStripSep />
          <div
            className={cn(
              "flex items-center gap-1 shrink-0 whitespace-nowrap",
              allAcknowledged ? "text-success" : "text-info",
            )}
            title={`${acknowledgedCount}/${dispatchedCount} minutes acknowledged`}
          >
            {allAcknowledged ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            <span>
              {acknowledgedCount}/{dispatchedCount} ack
            </span>
          </div>
        </>
      ) : null}

      {dateStr ? (
        <>
          <StatusStripSep />
          <span className="shrink-0 whitespace-nowrap">{dateStr}</span>
        </>
      ) : null}

      {DirIcon && dir ? (
        <>
          <StatusStripSep />
          <div className="flex items-center gap-1 shrink-0">
            <DirIcon className="h-3 w-3" />
            <span>{dir.label}</span>
          </div>
        </>
      ) : null}

      {senderName || senderOrganization ? (
        <>
          <StatusStripSep />
          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <User className="h-3 w-3 flex-shrink-0" />
            <span>{[senderName, senderOrganization].filter(Boolean).join(" · ")}</span>
          </div>
        </>
      ) : null}

      {officeName ? (
        <>
          <StatusStripSep />
          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span>
              <span className="text-muted-foreground/70">{closed ? "Last" : "Now"} · </span>
              {officeName}
            </span>
          </div>
        </>
      ) : null}

      {attachmentCount > 0 ? (
        <>
          <StatusStripSep />
          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Paperclip className="h-3 w-3" />
            <span>{attachmentCount}</span>
          </div>
        </>
      ) : null}

      {hasPhysicalCopy ? (
        <>
          <StatusStripSep />
          <div className="flex items-center gap-1 shrink-0 text-orange-700 dark:text-orange-400">
            <FileText className="h-3 w-3" />
            <span>Physical</span>
          </div>
        </>
      ) : null}

      {daysPending !== undefined && daysPending > 0 && !closed ? (
        <>
          <StatusStripSep />
          <div
            className={cn(
              "flex items-center gap-1 shrink-0",
              daysPending >= 7
                ? "text-destructive font-medium"
                : daysPending >= 5
                  ? "text-amber-600"
                  : "text-muted-foreground",
            )}
          >
            <Clock className="h-3 w-3" />
            <span>{daysPending}d</span>
          </div>
        </>
      ) : null}
    </DetailStatusStrip>
  );
};

export const CompactStatusStrip = React.memo(CompactStatusStripContent);
CompactStatusStrip.displayName = "CompactStatusStrip";
