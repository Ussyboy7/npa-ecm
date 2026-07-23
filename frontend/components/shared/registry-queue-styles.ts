import { cn } from "@/lib/utils";

/**
 * Sizing scale for Office Inbox, Office Sent, and case list pages
 * (list rows, legacy stat cards, metadata lines). Prefer StatStrip for new stats.
 */
export const registryQueueRowShellClass =
  "rounded-xl border border-border/60 bg-card p-3.5 transition-colors hover:bg-muted/40";

export const registryQueueRowInnerGapClass = "gap-3";

export const registryQueueLeadingBoxClass = "rounded-lg p-2.5";

export const registryQueueLeadingIconClass = "h-4 w-4";

export const registryQueueTitleClass =
  "truncate text-sm font-semibold tracking-tight text-foreground";

export const registryQueueMetaTextClass = "space-y-1 text-xs text-muted-foreground";

export const registryQueueMetaIconClass = "h-3.5 w-3.5 shrink-0";

export const registryQueueStatCardContentClass = "p-3";

export const registryQueueStatIconBoxClass = "rounded-lg p-2";

export const registryQueueStatIconClass = "h-4 w-4";

export const registryQueueStatLabelClass = "text-[11px] text-muted-foreground";

export const registryQueueStatValueClass =
  "text-base font-semibold tabular-nums tracking-tight";

export const registryQueueBadgeRowClass = "flex flex-wrap items-center gap-2";

/** Vertical gap between list rows on queue pages */
export const registryQueueListStackClass = "space-y-2";

export const registryQueueDateTextClass = "whitespace-nowrap text-xs text-muted-foreground";

/** Title row: subject/title + date column */
export const registryQueueTitleRowClass =
  "mb-1.5 flex items-start justify-between gap-4";

/** Empty-state hero icon on queue list pages */
export const registryQueueEmptyIconClass = "h-10 w-10 opacity-50";

/** One card grouping search + summary stat grid */
export const registryQueueSearchStatsShellContentClass = "space-y-4 p-4";

export const registryQueueSearchInputWrapClass = "relative max-w-xl";

export function cnRegistryQueueTitle(className?: string) {
  return cn(registryQueueTitleClass, className);
}

/** Office correspondence list rows (inbox / sent): tighter padding and gaps */
export const correspondenceQueueShellClass =
  "rounded-xl border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40";

export const correspondenceQueueInnerGapClass = "gap-3";

export const correspondenceQueueLeadingBoxClass = "relative rounded-md p-2";

export const correspondenceQueueLeadingIconClass = "h-4 w-4";

/** Title: slightly smaller than registry queue default */
export const correspondenceQueueSubjectClass =
  "line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground";

/** Badges in correspondence rows */
export const correspondenceQueueBadgeClass =
  "h-5 gap-0.5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none";

/** Meta row: inline, wraps */
export const correspondenceQueueMetaRowClass =
  "flex flex-wrap gap-x-2.5 gap-y-0.5 border-t border-border/60 pt-1.5 text-[11px] leading-tight text-muted-foreground";

export const correspondenceQueueMetaItemClass = "inline-flex max-w-full items-center gap-1";

export const correspondenceQueueMetaIconClass = "h-3 w-3 shrink-0 opacity-80";

export const correspondenceQueueDateClass =
  "shrink-0 text-[11px] tabular-nums text-muted-foreground";

export const correspondenceQueueListStackClass = "space-y-2";
