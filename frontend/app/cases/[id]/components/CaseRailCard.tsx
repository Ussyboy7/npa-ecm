"use client";

import type { ReactNode } from "react";
import { detailType } from "@/lib/detail-type";
import { cn } from "@/lib/utils";

interface CaseRailCardProps {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Extra quiet strip without border (nested inside a section). */
  flush?: boolean;
}

/** Shared quiet chrome for case detail rail panels. */
export function CaseRailCard({
  title,
  icon,
  action,
  children,
  className,
  flush = false,
}: CaseRailCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden space-y-2",
        flush
          ? "px-0 py-0"
          : "rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 min-w-0">
          {title ? (
            <p
              className={cn(
                detailType.panelTitle,
                "flex items-center gap-1.5 min-w-0 truncate",
              )}
            >
              {icon}
              <span className="truncate">{title}</span>
            </p>
          ) : (
            <span />
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className="min-w-0 max-w-full overflow-hidden">{children}</div>
    </div>
  );
}

export function CaseRailEmpty({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-2.5 py-3 text-center space-y-1.5">
      <p className="text-[12px] text-muted-foreground leading-snug">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="text-[12px] font-medium text-primary hover:underline"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
