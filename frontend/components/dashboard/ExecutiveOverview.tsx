"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Loader2 } from "lucide-react";
import { StatStrip } from "@/components/shared/StatStrip";
import { appType } from "@/lib/app-type";

interface ExecutiveStatsItem {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface ExecutiveOverviewProps {
  executiveStats: ExecutiveStatsItem[];
  portfolioError: string | null;
  portfolioLoading: boolean;
  executiveRange: string;
  onRangeChange: (value: string) => void;
}

export const ExecutiveOverview = ({
  executiveStats,
  portfolioError,
  portfolioLoading,
  executiveRange,
  onRangeChange,
}: ExecutiveOverviewProps) => (
  <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className={`${appType.panelTitle} flex items-center gap-2`}>
          <Layers className="h-4 w-4 text-primary" />
          Executive overview
        </p>
        <p className={appType.caption}>
          Multi-office workload, SLA breaches, and completion for the selected range.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {portfolioLoading ? (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Refreshing
          </Badge>
        ) : null}
        <Select value={executiveRange} onValueChange={onRangeChange} disabled={portfolioLoading}>
          <SelectTrigger className="w-[9.5rem] h-8">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {portfolioError ? (
      <p className="text-sm text-destructive">{portfolioError}</p>
    ) : portfolioLoading && executiveStats.length === 0 ? (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading portfolio…
      </div>
    ) : executiveStats.length === 0 ? (
      <p className="text-sm text-muted-foreground">No executive data for this range.</p>
    ) : (
      <StatStrip
        items={executiveStats.map((stat) => ({
          key: stat.title,
          label: stat.title,
          value: stat.value,
          hint: stat.description,
        }))}
      />
    )}
  </div>
);
