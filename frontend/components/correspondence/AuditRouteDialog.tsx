"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrimaryRoutePanel } from "@/components/correspondence/PrimaryRoutePanel";
import type { BranchConfig } from "@/lib/parallel-routing";
import { buildParallelRecipients } from "@/lib/parallel-routing";
import { getDivisionById } from "@/lib/npa-structure";
import type { User } from "@/lib/npa-structure";
import type { Office, OfficeMembership } from "@/contexts/OrganizationContext";

export type AuditRouteSubmitPayload = {
  subject: string;
  bodyHtml: string;
  actionRequired: boolean;
  dueDate: string | null;
  requiredApprovalLevel: string;
  attentionUserId: string | null;
  /** Single-route target office id */
  targetOfficeId?: string;
  /** Parallel recipients for REFER */
  parallelRecipients?: Array<{ user_id?: string; office_id?: string; purpose: string; minute_text: string }>;
  mergeStrategy?: "all" | "any" | "majority" | "independent";
  ccUserIds: string[];
  ccOfficeIds: string[];
};

interface AuditRouteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AuditRouteSubmitPayload) => Promise<void>;
  submitting?: boolean;
  defaultSubject: string;
  defaultBodyHtml: string;
  auditState: string | null;
  directorates: Array<{ id: string; name: string; shortName?: string }>;
  divisions: Array<{ id: string; name: string; shortName?: string; directorateId?: string }>;
  offices: Office[];
  officeMemberships: OfficeMembership[];
  users: User[];
  currentUserId?: string;
}

export function AuditRouteDialog({
  open,
  onClose,
  onSubmit,
  submitting = false,
  defaultSubject,
  defaultBodyHtml,
  auditState,
  directorates,
  divisions,
  offices,
  officeMemberships,
  users,
  currentUserId,
}: AuditRouteDialogProps) {
  const [routeMode, setRouteMode] = useState<"single" | "parallel">("single");
  const [routeType, setRouteType] = useState<"person" | "office">("office");
  const [forwardTo, setForwardTo] = useState("");
  const [targetOfficeId, setTargetOfficeId] = useState("");
  const [purpose, setPurpose] = useState<"action" | "information" | "approval">("action");
  const [mergeStrategy, setMergeStrategy] = useState<"all" | "any" | "majority" | "independent">("all");
  const [parallelUserIds, setParallelUserIds] = useState<string[]>([]);
  const [parallelOfficeIds, setParallelOfficeIds] = useState<string[]>([]);
  const [branchConfigs, setBranchConfigs] = useState<Record<string, BranchConfig>>({});
  const [distributionUserIds, setDistributionUserIds] = useState<string[]>([]);
  const [distributionOfficeIds, setDistributionOfficeIds] = useState<string[]>([]);
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const [officeSearchQuery, setOfficeSearchQuery] = useState("");
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState("all");
  const [officeFilterDivision, setOfficeFilterDivision] = useState("all");
  const [forwardSubject, setForwardSubject] = useState(defaultSubject);
  const [forwardDueDate, setForwardDueDate] = useState("");
  const [forwardActionRequired, setForwardActionRequired] = useState(true);
  const [forwardRequiredApprovalLevel, setForwardRequiredApprovalLevel] = useState("departmental");
  const [forwardAttentionUser, setForwardAttentionUser] = useState("");

  const activeUsers = useMemo(
    () => users.filter((u) => u.active !== false && u.id !== currentUserId),
    [users, currentUserId],
  );

  const officeOptions = useMemo(
    () =>
      offices
        .filter((o) => o.isActive)
        .map((o) => ({
          id: o.id,
          name: o.name,
          officeType: o.officeType ?? "",
          directorateId: o.directorateId ?? undefined,
          divisionId: o.divisionId ?? undefined,
        })),
    [offices],
  );

  const findUserById = (id: string) => activeUsers.find((u) => u.id === id);

  const getUserOfficeInfo = (userId: string) => {
    const membership = officeMemberships.find((m) => m.userId === userId && m.isPrimary && m.isActive);
    if (!membership) return null;
    const office = offices.find((o) => o.id === membership.officeId);
    const user = findUserById(userId);
    const division = user?.division ? getDivisionById(user.division) : null;
    return {
      office: office ? { name: office.name } : undefined,
      division: division ? { name: division.name } : undefined,
    };
  };

  const resolvedSingleOfficeId = useMemo(() => {
    if (routeType === "office" && targetOfficeId) return targetOfficeId;
    if (routeType === "person" && forwardTo) {
      const membership = officeMemberships.find(
        (m) => m.userId === forwardTo && m.isPrimary && m.isActive,
      );
      return membership?.officeId ?? "";
    }
    return "";
  }, [routeType, targetOfficeId, forwardTo, officeMemberships]);

  const canSubmit =
    forwardSubject.trim() &&
    (routeMode === "parallel"
      ? parallelUserIds.length + parallelOfficeIds.length >= 2
      : Boolean(resolvedSingleOfficeId));

  const branchText =
    defaultBodyHtml.replace(/<[^>]+>/g, " ").trim() || "Audit query — please respond.";

  const handleSubmit = async () => {
    const payload: AuditRouteSubmitPayload = {
      subject: forwardSubject.trim(),
      bodyHtml: defaultBodyHtml,
      actionRequired: forwardActionRequired,
      dueDate: forwardDueDate.trim() || null,
      requiredApprovalLevel: forwardRequiredApprovalLevel,
      attentionUserId: forwardAttentionUser.trim() || null,
      ccUserIds: distributionUserIds,
      ccOfficeIds: distributionOfficeIds,
    };
    if (routeMode === "parallel") {
      payload.parallelRecipients = buildParallelRecipients(
        parallelUserIds,
        parallelOfficeIds,
        branchConfigs,
        { purpose, minuteText: branchText },
      );
      payload.mergeStrategy = mergeStrategy;
    } else {
      payload.targetOfficeId = resolvedSingleOfficeId;
    }
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) onClose(); }}>
      <DialogContent size="lg" height="scroll">
        <DialogHeader>
          <DialogTitle>Route Audit Query</DialogTitle>
          <DialogDescription>
            Uses the same Single / Parallel routing contract as correspondence. CC recipients are informational only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <PrimaryRoutePanel
            routeMode={routeMode}
            onRouteModeChange={setRouteMode}
            routeType={routeType}
            onRouteTypeChange={setRouteType}
            forwardTo={forwardTo}
            onForwardToChange={setForwardTo}
            personSearchQuery={personSearchQuery}
            onPersonSearchQueryChange={setPersonSearchQuery}
            targetOfficeId={targetOfficeId}
            onTargetOfficeIdChange={setTargetOfficeId}
            officeSearchQuery={officeSearchQuery}
            onOfficeSearchQueryChange={setOfficeSearchQuery}
            officeFilterDirectorate={officeFilterDirectorate}
            onOfficeFilterDirectorateChange={(v) => {
              setOfficeFilterDirectorate(v);
              setOfficeFilterDivision("all");
            }}
            officeFilterDivision={officeFilterDivision}
            onOfficeFilterDivisionChange={setOfficeFilterDivision}
            purpose={purpose}
            onPurposeChange={setPurpose}
            parallelUserIds={parallelUserIds}
            onParallelUserIdsChange={setParallelUserIds}
            parallelOfficeIds={parallelOfficeIds}
            onParallelOfficeIdsChange={setParallelOfficeIds}
            mergeStrategy={mergeStrategy}
            onMergeStrategyChange={setMergeStrategy}
            branchConfigs={branchConfigs}
            onBranchConfigsChange={setBranchConfigs}
            defaultBranchText={branchText}
            distributionUserIds={distributionUserIds}
            onDistributionUserIdsChange={setDistributionUserIds}
            distributionOfficeIds={distributionOfficeIds}
            onDistributionOfficeIdsChange={setDistributionOfficeIds}
            offices={officeOptions}
            directorates={directorates}
            divisions={divisions}
            users={activeUsers}
            assistantList={[]}
            approverList={activeUsers}
            findUserById={findUserById}
            getUserOfficeInfo={getUserOfficeInfo}
          />

          <div className="space-y-2">
            <Label>Attention — Optional</Label>
            <select
              value={forwardAttentionUser}
              onChange={(e) => setForwardAttentionUser(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">None — office queue</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={forwardDueDate} onChange={(e) => setForwardDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Action Required</Label>
              <select
                value={forwardActionRequired ? "explanation" : "information"}
                onChange={(e) => setForwardActionRequired(e.target.value === "explanation")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="explanation">Explanation / Response</option>
                <option value="information">For Information</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Correspondence Subject *</Label>
            <Input value={forwardSubject} onChange={(e) => setForwardSubject(e.target.value)} />
          </div>

          {auditState && !["CERTIFIED", "AUTHORIZED"].includes(auditState) && (
            <p className="text-xs text-amber-600">REFER requires CERTIFIED or AUTHORIZED — current: {auditState}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "Routing..." : "Route via Correspondence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
