"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusStripSep() {
  return (
    <span className="text-muted-foreground/40 shrink-0" aria-hidden>
      ·
    </span>
  );
}

interface DetailStatusStripProps {
  children: ReactNode;
  className?: string;
  /** Optional second row (avoid for org names — prefer inline scroll). */
  footer?: ReactNode;
}

/**
 * One-line horizontal status strip: badges + meta, scrolls when long.
 * Used under detail headers (correspondence, DMS, cases, FOIA).
 */
export function DetailStatusStrip({ children, className, footer }: DetailStatusStripProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 px-4 md:px-6 py-1.5 bg-muted/20 border-b border-border/50",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto scrollbar-none min-w-0">
        {children}
      </div>
      {footer}
    </div>
  );
}
