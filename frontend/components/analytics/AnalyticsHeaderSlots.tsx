"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appType } from "@/lib/app-type";
import { cn } from "@/lib/utils";

export const ANALYTICS_HEADER_SLOT_IDS = {
  stats: "analytics-header-stats-slot",
  actions: "analytics-header-actions-slot",
} as const;

export function AnalyticsHeaderSlots({
  stats,
  actions,
}: {
  stats?: ReactNode;
  actions?: ReactNode;
}) {
  const [targets, setTargets] = useState<{
    stats: HTMLElement | null;
    actions: HTMLElement | null;
  }>({ stats: null, actions: null });

  useEffect(() => {
    setTargets({
      stats: document.getElementById(ANALYTICS_HEADER_SLOT_IDS.stats),
      actions: document.getElementById(ANALYTICS_HEADER_SLOT_IDS.actions),
    });
  }, []);

  return (
    <>
      {targets.stats && stats ? createPortal(stats, targets.stats) : null}
      {targets.actions && actions ? createPortal(actions, targets.actions) : null}
    </>
  );
}

export function AnalyticsRefreshAction({
  loading,
  lastUpdated,
  onRefresh,
  idleLabel,
}: {
  loading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  idleLabel?: string;
}) {
  const status = loading
    ? "Updating…"
    : lastUpdated
      ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : idleLabel;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {status ? (
        <span className={cn(appType.caption, "sr-only sm:not-sr-only")} role="status">
          {status}
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="compact"
        className="shrink-0 whitespace-nowrap"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}

export function AnalyticsFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/30 p-2">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
