"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { appType } from "@/lib/app-type";

export interface StatStripItem {
  key: string;
  label: string;
  value: ReactNode;
  hint?: string;
  onClick?: () => void;
}

interface StatStripProps {
  items: StatStripItem[];
  className?: string;
  /** denser padding for nested panels */
  compact?: boolean;
}

/**
 * Quiet metric row — replaces four heavy icon Card grids on queue pages.
 */
export function StatStrip({ items, className, compact = false }: StatStripProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-stretch gap-0 min-w-0 overflow-x-auto scrollbar-none rounded-xl bg-muted/30 border border-border/40",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        className,
      )}
      role="group"
      aria-label="Summary statistics"
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          disabled={!item.onClick}
          onClick={item.onClick}
          title={item.hint}
          className={cn(
            "flex-1 min-w-[4.5rem] px-2 text-left",
            index > 0 && "border-l border-border/50",
            item.onClick
              ? "cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
              : "cursor-default",
          )}
        >
          <p className={cn(appType.statLabel, "truncate")}>{item.label}</p>
          <p className={cn(appType.statValue, "mt-0.5")}>{item.value}</p>
        </button>
      ))}
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function StatPill({ label, value, className }: StatPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-full bg-muted/40 px-2.5 py-1",
        className,
      )}
    >
      <span className={appType.statLabel}>{label}</span>
      <span className={cn(appType.statValue, "text-sm")}>{value}</span>
    </div>
  );
}
