"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, ArrowRight, Building2, Clock, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactStatusStripProps {
  status: string;
  receivedDate?: string;
  direction?: "upward" | "downward" | "lateral" | "internal";
  currentOffice?: string;
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
  upward: { icon: ArrowUp, label: "Upward" },
  downward: { icon: ArrowDown, label: "Downward" },
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
  // Fix "Office Office" duplication
  return name.replace(/Office\s+Office/gi, "Office").trim();
}

export function CompactStatusStrip({
  status,
  receivedDate,
  direction,
  currentOffice,
  daysPending,
  dispatchedCount,
  acknowledgedCount,
  className,
}: CompactStatusStripProps) {
  const cfg = statusConfig[status] || statusConfig.pending;
  const dir = direction ? directionConfig[direction] : null;
  const DirIcon = dir?.icon;
  const dateStr = formatDate(receivedDate);
  const officeName = cleanOfficeName(currentOffice);

  // Calculate dispatch progress
  const hasDispatchProgress = dispatchedCount !== undefined && acknowledgedCount !== undefined && dispatchedCount > 0;
  const allAcknowledged = hasDispatchProgress && acknowledgedCount === dispatchedCount;

  return (
    <div className={cn("w-full px-4 py-2 bg-muted/30 border-b border-border", className)}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Badge */}
        <Badge variant={cfg.variant} className={cn("text-[10px] h-5", cfg.className)}>
          {cfg.label}
        </Badge>

        {/* Dispatch Progress */}
        {hasDispatchProgress && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <div className={cn(
              "flex items-center gap-1 text-xs",
              allAcknowledged ? "text-success" : "text-info"
            )}>
              {allAcknowledged ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span>{acknowledgedCount}/{dispatchedCount} acknowledged</span>
            </div>
          </>
        )}

        {/* Separator */}
        {dateStr && <span className="text-muted-foreground/40">·</span>}

        {/* Date */}
        {dateStr && (
          <span className="text-xs text-muted-foreground">{dateStr}</span>
        )}

        {/* Direction */}
        {DirIcon && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DirIcon className="h-3 w-3" />
              <span>{dir!.label}</span>
            </div>
          </>
        )}

        {/* Current Office */}
        {officeName && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{officeName}</span>
            </div>
          </>
        )}

        {/* Days Pending - only show for non-terminal statuses */}
        {daysPending !== undefined && daysPending > 0 && !["completed", "dispatched", "acknowledged", "archived", "withdrawn"].includes(status) && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <div className={cn(
              "flex items-center gap-1 text-xs",
              daysPending >= 7 ? "text-destructive font-medium" :
              daysPending >= 5 ? "text-amber-600" :
              "text-muted-foreground"
            )}>
              <Clock className="h-3 w-3" />
              <span>{daysPending}d</span>
              {daysPending >= 7 && <span>⚠</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
