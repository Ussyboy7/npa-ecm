"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  registryQueueSearchStatsShellContentClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';

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
  <Card>
    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Executive overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Multi-office workload, SLA breaches, and completion for the selected range.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {portfolioLoading ? (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Refreshing
          </Badge>
        ) : null}
        <Select value={executiveRange} onValueChange={onRangeChange} disabled={portfolioLoading}>
          <SelectTrigger className="w-[9.5rem]">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent className={registryQueueSearchStatsShellContentClass}>
      {portfolioError ? (
        <p className="text-sm text-destructive">{portfolioError}</p>
      ) : portfolioLoading && executiveStats.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading portfolio…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {executiveStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className={registryQueueStatCardContentClass}>
                  <div className="flex items-center gap-4">
                    <div className={cn(registryQueueStatIconBoxClass, 'bg-primary/10')}>
                      <Icon className={cn(registryQueueStatIconClass, 'text-primary')} />
                    </div>
                    <div>
                      <p className={registryQueueStatLabelClass}>{stat.title}</p>
                      <p className={registryQueueStatValueClass}>{stat.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!portfolioLoading && executiveStats.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              No executive data for this range.
            </p>
          ) : null}
        </div>
      )}
    </CardContent>
  </Card>
);
