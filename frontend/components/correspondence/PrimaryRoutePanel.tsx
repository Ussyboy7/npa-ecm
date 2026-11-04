"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoutingSection } from "@/components/correspondence/RoutingSection";
import { RouteRecipientPicker } from "@/components/correspondence/RouteRecipientPicker";
import type { BranchConfig } from "@/lib/parallel-routing";
import { syncBranchConfigs } from "@/lib/parallel-routing";
import type { User } from "@/lib/npa-structure";

export type RouteMode = "single" | "parallel";
export type MergeStrategy = "all" | "any" | "majority" | "independent";
export type RoutePurpose = "action" | "information" | "approval";

export interface OfficeOption {
  id: string;
  name: string;
  officeType?: string;
  directorateId?: string;
  divisionId?: string;
}

interface PrimaryRoutePanelProps {
  routeMode: RouteMode;
  onRouteModeChange: (mode: RouteMode) => void;
  showRouteModeToggle?: boolean;
  // Single route
  routeType: "person" | "office";
  onRouteTypeChange: (type: "person" | "office") => void;
  forwardTo: string;
  onForwardToChange: (userId: string) => void;
  forwardToError?: string;
  personSearchQuery: string;
  onPersonSearchQueryChange: (query: string) => void;
  targetOfficeId: string;
  onTargetOfficeIdChange: (officeId: string) => void;
  officeSearchQuery: string;
  onOfficeSearchQueryChange: (query: string) => void;
  officeFilterDirectorate: string;
  onOfficeFilterDirectorateChange: (directorateId: string) => void;
  officeFilterDivision: string;
  onOfficeFilterDivisionChange: (divisionId: string) => void;
  purpose: RoutePurpose;
  onPurposeChange: (purpose: RoutePurpose) => void;
  // Parallel route
  parallelUserIds: string[];
  onParallelUserIdsChange: (ids: string[]) => void;
  parallelOfficeIds: string[];
  onParallelOfficeIdsChange: (ids: string[]) => void;
  mergeStrategy: MergeStrategy;
  onMergeStrategyChange: (strategy: MergeStrategy) => void;
  branchConfigs?: Record<string, BranchConfig>;
  onBranchConfigsChange?: (configs: Record<string, BranchConfig>) => void;
  defaultBranchText?: string;
  // CC / distribution (informational copy — not work branches)
  distributionUserIds?: string[];
  onDistributionUserIdsChange?: (ids: string[]) => void;
  distributionOfficeIds?: string[];
  onDistributionOfficeIdsChange?: (ids: string[]) => void;
  showDistribution?: boolean;
  excludeUserId?: string;
  // Data
  offices: OfficeOption[];
  directorates: Array<{ id: string; name: string; shortName?: string }>;
  divisions: Array<{ id: string; name: string; shortName?: string; directorateId?: string }>;
  users: User[];
  assistantList: User[];
  approverList: User[];
  suggestedNext?: User;
  findUserById: (id: string) => User | undefined;
  getUserOfficeInfo: (userId: string) => { office?: { name: string }; division?: { name: string } } | null;
}

export function PrimaryRoutePanel({
  routeMode,
  onRouteModeChange,
  showRouteModeToggle = true,
  routeType,
  onRouteTypeChange,
  forwardTo,
  onForwardToChange,
  forwardToError,
  personSearchQuery,
  onPersonSearchQueryChange,
  targetOfficeId,
  onTargetOfficeIdChange,
  officeSearchQuery,
  onOfficeSearchQueryChange,
  officeFilterDirectorate,
  onOfficeFilterDirectorateChange,
  officeFilterDivision,
  onOfficeFilterDivisionChange,
  purpose,
  onPurposeChange,
  parallelUserIds,
  onParallelUserIdsChange,
  parallelOfficeIds,
  onParallelOfficeIdsChange,
  mergeStrategy,
  onMergeStrategyChange,
  branchConfigs = {},
  onBranchConfigsChange,
  defaultBranchText = "",
  distributionUserIds = [],
  onDistributionUserIdsChange,
  distributionOfficeIds = [],
  onDistributionOfficeIdsChange,
  showDistribution = true,
  excludeUserId,
  offices,
  directorates,
  divisions,
  users,
  assistantList,
  approverList,
  suggestedNext,
  findUserById,
  getUserOfficeInfo,
}: PrimaryRoutePanelProps) {
  const parallelTargetCount = parallelUserIds.length + parallelOfficeIds.length;
  const distributionCount = distributionUserIds.length + distributionOfficeIds.length;

  const handleParallelUserIdsChange = (ids: string[]) => {
    onParallelUserIdsChange(ids);
    if (onBranchConfigsChange) {
      onBranchConfigsChange(
        syncBranchConfigs(ids, parallelOfficeIds, branchConfigs, {
          purpose,
          minuteText: defaultBranchText || "Please review and respond.",
        }),
      );
    }
  };

  const handleParallelOfficeIdsChange = (ids: string[]) => {
    onParallelOfficeIdsChange(ids);
    if (onBranchConfigsChange) {
      onBranchConfigsChange(
        syncBranchConfigs(parallelUserIds, ids, branchConfigs, {
          purpose,
          minuteText: defaultBranchText || "Please review and respond.",
        }),
      );
    }
  };

  const distributionBranchConfigs = useMemo(() => {
    const configs: Record<string, BranchConfig> = {};
    for (const userId of distributionUserIds) {
      configs[`user:${userId}`] = { purpose: "information", minuteText: "" };
    }
    for (const officeId of distributionOfficeIds) {
      configs[`office:${officeId}`] = { purpose: "information", minuteText: "" };
    }
    return configs;
  }, [distributionUserIds, distributionOfficeIds]);

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">
        {routeMode === "single"
          ? "Primary route — select one destination"
          : "Parallel route — select two or more destinations"}
      </p>

      {showRouteModeToggle && (
        <div className="space-y-2">
          <Label>Routing mode</Label>
          <Select value={routeMode} onValueChange={(value) => onRouteModeChange(value as RouteMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single route</SelectItem>
              <SelectItem value="parallel">Parallel routing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {routeMode === "single" && (
        <RoutingSection
          routeType={routeType}
          onRouteTypeChange={onRouteTypeChange}
          forwardTo={forwardTo}
          onForwardToChange={onForwardToChange}
          forwardToError={forwardToError}
          personSearchQuery={personSearchQuery}
          onPersonSearchQueryChange={onPersonSearchQueryChange}
          targetOfficeId={targetOfficeId}
          onTargetOfficeIdChange={onTargetOfficeIdChange}
          officeSearchQuery={officeSearchQuery}
          onOfficeSearchQueryChange={onOfficeSearchQueryChange}
          officeFilterDirectorate={officeFilterDirectorate}
          onOfficeFilterDirectorateChange={onOfficeFilterDirectorateChange}
          officeFilterDivision={officeFilterDivision}
          onOfficeFilterDivisionChange={onOfficeFilterDivisionChange}
          purpose={purpose}
          onPurposeChange={onPurposeChange}
          offices={offices}
          directorates={directorates}
          divisions={divisions}
          users={users}
          assistantList={assistantList}
          approverList={approverList}
          suggestedNext={suggestedNext}
          findUserById={findUserById}
          getUserOfficeInfo={getUserOfficeInfo}
        />
      )}

      {routeMode === "parallel" && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <Label>Route To</Label>
            <Badge variant="secondary">{parallelTargetCount} branches</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Each person or office gets an independent work branch on the same correspondence.
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Completion rule</Label>
            <Select value={mergeStrategy} onValueChange={(value) => onMergeStrategyChange(value as MergeStrategy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wait for all branches</SelectItem>
                <SelectItem value="any">Any one completes</SelectItem>
                <SelectItem value="majority">Majority completes</SelectItem>
                <SelectItem value="independent">Independent branches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RouteRecipientPicker
            userIds={parallelUserIds}
            officeIds={parallelOfficeIds}
            onUserIdsChange={handleParallelUserIdsChange}
            onOfficeIdsChange={handleParallelOfficeIdsChange}
            users={users}
            offices={offices}
            directorates={directorates}
            divisions={divisions}
            defaultPurpose={purpose}
            branchConfigs={branchConfigs}
            onBranchConfigsChange={onBranchConfigsChange}
            defaultBranchText={defaultBranchText}
            showPerRecipientEditor={Boolean(onBranchConfigsChange)}
            excludeUserId={excludeUserId}
            emptyMessage="Add at least two people or offices for parallel routing."
          />
        </div>
      )}

      {showDistribution && onDistributionUserIdsChange && onDistributionOfficeIdsChange && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <Label>Distribution (CC)</Label>
            <span className="text-xs text-muted-foreground">{distributionCount} recipients</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Optional informational copy — does not create parallel work branches.
          </p>
          <RouteRecipientPicker
            userIds={distributionUserIds}
            officeIds={distributionOfficeIds}
            onUserIdsChange={onDistributionUserIdsChange}
            onOfficeIdsChange={onDistributionOfficeIdsChange}
            users={users}
            offices={offices}
            directorates={directorates}
            divisions={divisions}
            defaultPurpose="information"
            informationOnly
            branchConfigs={distributionBranchConfigs}
            excludeUserId={excludeUserId}
            emptyMessage="No distribution recipients added yet."
          />
        </div>
      )}
    </div>
  );
}
