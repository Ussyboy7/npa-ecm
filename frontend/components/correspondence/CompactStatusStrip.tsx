"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, ArrowRight, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactStatusStripProps {
  status: string;
  receivedDate?: string;
  direction?: "upward" | "downward" | "lateral" | "internal";
  currentOffice?: string;
  daysPending?: number;
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

export function CompactStatusStrip({
  status,
  receivedDate,
  direction,
  currentOffice,
  daysPending,
  className,
}: CompactStatusStripProps) {
  const cfg = statusConfig[status] || statusConfig.pending;
  const dir = direction ? directionConfig[direction] : null;
  const DirIcon = dir?.icon;
  const dateStr = formatDate(receivedDate);

  return (
    <div className={cn("w-full px-4 py-2 bg-muted/30 border-b border-border", className)}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Badge */}
        <Badge variant={cfg.variant} className={cn("text-[10px] h-5", cfg.className)}>
          {cfg.label}
        </Badge>

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
        {currentOffice && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{currentOffice}</span>
            </div>
          </>
        )}

        {/* Days Pending */}
        {daysPending !== undefined && daysPending > 0 && (
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
