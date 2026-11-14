"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoutingSection } from "@/components/correspondence/RoutingSection";
import { RouteRecipientPicker } from "@/components/correspondence/RouteRecipientPicker";
import type {
  AssignmentMergeStrategy,
  BranchConfig,
} from "@/lib/parallel-routing";
import type { User } from "@/lib/npa-structure";

export type RouteMode = "single" | "parallel";
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
  // Separate assignments
  parallelUserIds: string[];
  onParallelUserIdsChange: (ids: string[]) => void;
  parallelOfficeIds: string[];
  onParallelOfficeIdsChange: (ids: string[]) => void;
  branchConfigs?: Record<string, BranchConfig>;
  onBranchConfigsChange?: (configs: Record<string, BranchConfig>) => void;
  defaultBranchText?: string;
  mergeStrategy?: AssignmentMergeStrategy;
  onMergeStrategyChange?: (strategy: AssignmentMergeStrategy) => void;
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
  branchConfigs = {},
  onBranchConfigsChange,
  defaultBranchText = "",
  mergeStrategy = "independent",
  onMergeStrategyChange,
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

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">
        {routeMode === "single"
          ? "Primary route — select one destination"
          : "Assign separately — each recipient handles their own instruction and outcome"}
      </p>

      {showRouteModeToggle && (
        <div className="space-y-2">
          <Label>Routing mode</Label>
          <Select value={routeMode} onValueChange={(value) => onRouteModeChange(value as RouteMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single recipient</SelectItem>
              <SelectItem value="parallel">Assign separately</SelectItem>
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
            <Label>Recipients</Label>
            <Badge variant="secondary">{parallelTargetCount} assignments</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Each recipient gets their own instruction and expected outcome. They do not wait for each other.
          </p>
          <RouteRecipientPicker
            userIds={parallelUserIds}
            officeIds={parallelOfficeIds}
            onUserIdsChange={onParallelUserIdsChange}
            onOfficeIdsChange={onParallelOfficeIdsChange}
            users={users}
            offices={offices}
            directorates={directorates}
            divisions={divisions}
            defaultPurpose="action"
            defaultOutcome="respond"
            branchConfigs={branchConfigs}
            onBranchConfigsChange={onBranchConfigsChange}
            defaultBranchText={defaultBranchText}
            showPerRecipientEditor={Boolean(onBranchConfigsChange)}
            excludeUserId={excludeUserId}
            emptyMessage="Add at least two people or offices to assign separately."
          />

          {onMergeStrategyChange && (
            <div className="space-y-2 rounded-md border border-border/70 bg-background/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label>After the assignments</Label>
                <Badge variant="outline">
                  {mergeStrategy === "independent" ? "Independent" : "Consolidated"}
                </Badge>
              </div>
              <Select
                value={mergeStrategy}
                onValueChange={(value) =>
                  onMergeStrategyChange(value as AssignmentMergeStrategy)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">
                    Keep independent — no consolidation (default)
                  </SelectItem>
                  <SelectItem value="all">
                    Consolidate — after every expected outcome
                  </SelectItem>
                  <SelectItem value="any">
                    Consolidate — after the first expected outcome
                  </SelectItem>
                  <SelectItem value="majority">
                    Consolidate — after a majority of expected outcomes
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {mergeStrategy === "independent"
                  ? "Each assignment returns or moves on as soon as its recipient completes it."
                  : "Use consolidation only when the responses genuinely need to be reviewed together. The item returns to the origin once this condition is met."}
              </p>
            </div>
          )}
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
            excludeUserId={excludeUserId}
            emptyMessage="No distribution recipients added yet."
          />
        </div>
      )}
    </div>
  );
}
