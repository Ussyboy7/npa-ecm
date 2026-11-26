"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
  purposeControl?: "segmented" | "information-toggle";
  /** Pass false where formal approval has its own separate flow. */
  allowApproval?: boolean;
  /** What is being routed, used in the panel's own copy. */
  itemLabel?: string;
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
  purposeControl,
  allowApproval = true,
  itemLabel = "minute",
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
  // Optional information copy starts folded so the required primary route is
  // the only thing competing for attention. Existing recipients open it.
  const [distributionOpen, setDistributionOpen] = useState(distributionCount > 0);
  const isSeparate = routeMode === "parallel";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/10">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div>
            <Label className="text-sm font-semibold">Route this {itemLabel}</Label>
            <p className="text-[11px] text-muted-foreground">
              {isSeparate
                ? "Give each recipient their own instruction and expected outcome."
                : `One destination will receive this ${itemLabel}.`}
            </p>
          </div>
          {!isSeparate && (
            <Badge variant="outline" className="rounded-full text-[11px] font-normal">
              {routeType === "office"
                ? targetOfficeId
                  ? "1 office"
                  : "No recipient yet"
                : forwardTo
                  ? "1 person"
                  : "No recipient yet"}
            </Badge>
          )}
        </div>
        {showRouteModeToggle && (
          <SegmentedControl
            ariaLabel="Routing mode"
            value={routeMode}
            onValueChange={onRouteModeChange}
            size="sm"
            className="shrink-0 sm:min-w-[260px]"
            options={[
              { value: "single", label: "Single route" },
              { value: "parallel", label: "Assign separately" },
            ]}
          />
        )}
      </div>

      <div className="p-4">
        {routeMode === "single" && (
          <RoutingSection
            embedded
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
            purposeControl={purposeControl}
            allowApproval={allowApproval}
            offices={offices}
            directorates={directorates}
            divisions={divisions}
            assistantList={assistantList}
            approverList={approverList}
            suggestedNext={suggestedNext}
            findUserById={findUserById}
            getUserOfficeInfo={getUserOfficeInfo}
          />
        )}

        {routeMode === "parallel" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </span>
                <div>
                  <Label className="text-sm font-semibold">Recipients</Label>
                  <p className="text-[11px] text-muted-foreground">
                    They work independently, not in sequence.
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full text-[11px] font-normal">
                {parallelTargetCount} assignment{parallelTargetCount === 1 ? "" : "s"}
              </Badge>
            </div>

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
              <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">After the assignments</Label>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {mergeStrategy === "independent" ? "Independent" : "Consolidated"}
                  </Badge>
                </div>
                <Select
                  value={mergeStrategy}
                  onValueChange={(value) =>
                    onMergeStrategyChange(value as AssignmentMergeStrategy)
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl bg-background">
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
                <p className="text-[11px] text-muted-foreground">
                  {mergeStrategy === "independent"
                    ? "Each assignment returns or moves on as soon as its recipient completes it."
                    : "Use consolidation only when the responses genuinely need to be reviewed together. The item returns to the origin once this condition is met."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showDistribution && onDistributionUserIdsChange && onDistributionOfficeIdsChange && (
        <Collapsible open={distributionOpen} onOpenChange={setDistributionOpen}>
          <div className="border-t border-border/60">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 motion-reduce:transition-none"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">Distribution (CC)</span>
                  <Badge variant="outline" className="rounded-full text-[11px] font-normal">
                    {distributionCount} recipient{distributionCount === 1 ? "" : "s"}
                  </Badge>
                </span>
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  Optional
                  <ChevronDown
                    className={`h-4 w-4 transition-transform motion-reduce:transition-none ${distributionOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 border-t border-border/60 px-4 py-4">
              <p className="text-[11px] text-muted-foreground">
                Informational copy only — it does not create extra work.
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
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
