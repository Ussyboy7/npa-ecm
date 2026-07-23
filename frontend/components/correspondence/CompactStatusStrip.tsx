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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { label: "Pending", variant: "secondary" },
  "in-progress": { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline", className: "border-green-500 text-green-600" },
  dispatched: { label: "Dispatched", variant: "outline", className: "border-blue-500 text-blue-600" },
  acknowledged: { label: "Acknowledged", variant: "outline", className: "border-green-500 text-green-600" },
  archived: { label: "Archived", variant: "secondary" },
  withdrawn: { label: "Withdrawn", variant: "destructive" },
};

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

function Sep() {
  return <span className="text-muted-foreground/40" aria-hidden>·</span>;
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
  const cfg = statusConfig[status] || statusConfig.pending;
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
    <div className={cn("w-full px-4 md:px-6 py-1.5 bg-muted/20 border-b border-border/50", className)}>
      <div className="flex items-center gap-2.5 flex-wrap text-xs text-muted-foreground">
        <Badge variant={cfg.variant} className={cn("text-[10px] h-5", cfg.className)}>
          {cfg.label}
        </Badge>

        {priorityLabel && (
          <>
            <Sep />
            <Badge
              variant={
                priority === "urgent"
                  ? "destructive"
                  : priority === "high"
                    ? "default"
                    : "secondary"
              }
              className="text-[10px] h-5"
            >
              {priorityLabel}
            </Badge>
          </>
        )}

        {hasDispatchProgress && (
          <>
            <Sep />
            <div
              className={cn(
                "flex items-center gap-1",
                allAcknowledged ? "text-success" : "text-info",
              )}
            >
              {allAcknowledged ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span>
                {acknowledgedCount}/{dispatchedCount} minutes acknowledged
              </span>
            </div>
          </>
        )}

        {dateStr && (
          <>
            <Sep />
            <span>{dateStr}</span>
          </>
        )}

        {DirIcon && dir && (
          <>
            <Sep />
            <div className="flex items-center gap-1">
              <DirIcon className="h-3 w-3" />
              <span>{dir.label}</span>
            </div>
          </>
        )}

        {(senderName || senderOrganization) && (
          <>
            <Sep />
            <div className="flex items-center gap-1 min-w-0 max-w-[240px]">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {[senderName, senderOrganization].filter(Boolean).join(" · ")}
              </span>
            </div>
          </>
        )}

        {officeName && (
          <>
            <Sep />
            <div className="flex items-center gap-1 min-w-0">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[220px]">
                <span className="text-muted-foreground/70">{closed ? "Last" : "Current"} · </span>
                {officeName}
              </span>
            </div>
          </>
        )}

        {attachmentCount > 0 && (
          <>
            <Sep />
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>
                {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"}
              </span>
            </div>
          </>
        )}

        {hasPhysicalCopy && (
          <>
            <Sep />
            <div className="flex items-center gap-1 text-orange-700 dark:text-orange-400">
              <FileText className="h-3 w-3" />
              <span>Physical</span>
            </div>
          </>
        )}

        {daysPending !== undefined &&
          daysPending > 0 &&
          !closed && (
            <>
              <Sep />
              <div
                className={cn(
                  "flex items-center gap-1",
                  daysPending >= 7
                    ? "text-destructive font-medium"
                    : daysPending >= 5
                      ? "text-amber-600"
                      : "text-muted-foreground",
                )}
              >
                <Clock className="h-3 w-3" />
                <span>{daysPending}d</span>
                {daysPending >= 7 && <span>⚠</span>}
              </div>
            </>
          )}
      </div>
    </div>
  );
};

export const CompactStatusStrip = React.memo(CompactStatusStripContent);
CompactStatusStrip.displayName = "CompactStatusStrip";
