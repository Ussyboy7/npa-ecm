"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { logError } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Download,
  CheckCircle,
  Archive,
  UserIcon,
  ArrowUp,
  ArrowRight,
  Info,
  Share2,
  Undo2,
} from "lucide-react";
import { formatDateShort, canDispatchCorrespondence, canArchiveCorrespondence, isCorrespondenceOutward } from "@/lib/correspondence-helpers";
import { cn } from "@/lib/utils";
import { DispatchModal, AcknowledgeButton } from "@/components/correspondence/DispatchModal";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { returnCorrespondenceToPrincipal } from "@/lib/api/acting-appointments";
import type { Correspondence, Minute, User, Office, OfficeMembership } from "@/lib/npa-structure";
import { corrType } from "../correspondence-type";

interface ActionsPanelProps {
  correspondence?: Correspondence;
  minutes?: Minute[];
  activeUser?: User | null;
  onOpenLinkCaseModal?: () => void;
  isCompleted?: boolean;
  isCurrentUserTurn?: boolean;
  isForInformationOnly?: boolean;
  distributionPurpose?: 'information' | 'action' | null;
  distributionEntryId?: string | null;
  turnRestrictedDisabled?: boolean;
  completionPackageUrl?: string | null;
  completionGeneratedAt?: string | null;
  activeDelegation?: Record<string, unknown> | null;
  organizationUsers?: User[];
  offices?: Office[];
  officeMemberships?: OfficeMembership[];
  lookupUser?: (id: string) => User | undefined;
  onOpenMinuteModal?: () => void;
  onOpenTreatmentModal?: () => void;
  onOpenCompletionModal?: () => void;
  onOpenDelegateModal?: () => void;
  onDownloadCompletionPackage?: (url: string, filename: string) => Promise<void>;
  onSyncFromApi?: () => Promise<unknown>;
  compact?: boolean;
  /** Hide Minute/Endorse primary buttons when header/mobile already owns that CTA */
  hidePrimaryMinuteAction?: boolean;
  [key: string]: unknown;
}

export function ActionsPanel({
  correspondence,
  minutes = [],
  activeUser,
  isCompleted = false,
  isCurrentUserTurn = false,
  isForInformationOnly = false,
  distributionPurpose = 'action',
  turnRestrictedDisabled = false,
  completionPackageUrl,
  completionGeneratedAt,
  activeDelegation,
  organizationUsers = [],
  offices: _offices = [],
  officeMemberships: _officeMemberships = [],
  lookupUser: _lookupUser = () => undefined,
  onOpenMinuteModal,
  onOpenTreatmentModal,
  onOpenCompletionModal,
  onOpenDelegateModal,
  onDownloadCompletionPackage,
  onSyncFromApi: _onSyncFromApi,
  distributionEntryId: distributionEntryIdProp,
  compact = false,
  hidePrimaryMinuteAction = false,
}: ActionsPanelProps) {
  // Find the user's distribution entry ID for this correspondence (user-type or
  // office-type where the user is a member of that office). Prefer the value
  // computed in page.tsx (which fetches the user's own office memberships) and
  // fall back to the global paginated list if not provided.
  const computedDistributionEntryId = useMemo(() => {
    if (!activeUser?.id || !correspondence?.distribution) return null;
    const userOfficeIds = _officeMemberships
      .filter((m) => m.userId === activeUser.id && m.isActive)
      .map((m) => m.officeId);
    const entry = correspondence.distribution.find(
      (d) =>
        (d.type === 'user' && d.userId === activeUser.id) ||
        (d.type === 'office' && d.officeId != null && userOfficeIds.includes(d.officeId))
    );
    return entry?.id ?? null;
  }, [correspondence?.distribution, activeUser?.id, _officeMemberships]);

  const distributionEntryId = distributionEntryIdProp ?? computedDistributionEntryId;

  // Initialize markedAsRead from distribution data (persists across refreshes)
  const initialMarkedAsRead = useMemo(() => {
    if (!distributionEntryId || !correspondence?.distribution) return false;
    const entry = correspondence.distribution.find((d) => d.id === distributionEntryId);
    return !!entry?.readAt;
  }, [distributionEntryId, correspondence?.distribution]);

  const [markedAsRead, setMarkedAsRead] = useState(initialMarkedAsRead);
  const [returning, setReturning] = useState(false);

  // Sync markedAsRead when initialMarkedAsRead changes (e.g., after refreshDetail)
  useEffect(() => {
    setMarkedAsRead(initialMarkedAsRead);
  }, [initialMarkedAsRead]);

  const canReturnToPrincipal = Boolean(
    correspondence?.isActingSeat &&
      !isCompleted &&
      activeUser &&
      (
        activeUser.isSuperuser ||
        activeUser.rolePermissions?.can_manage_org_structure ||
        activeUser.rolePermissions?.can_manage_users ||
        String(activeUser.id) === String(correspondence.currentApproverId) ||
        String(activeUser.id) === String(correspondence.actingOriginalApproverId)
      )
  );

  const handleReturnToPrincipal = useCallback(async () => {
    if (!correspondence?.id) return;
    setReturning(true);
    try {
      await returnCorrespondenceToPrincipal(correspondence.id, "Manual return to principal");
      toast({ title: "Returned to principal" });
      await _onSyncFromApi?.();
    } catch (err) {
      logError("Failed to return to principal", err);
      toast({
        title: "Could not return item",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setReturning(false);
    }
  }, [correspondence?.id, _onSyncFromApi]);

  const handleMarkRead = useCallback(async () => {
    if (!distributionEntryId) return;
    try {
      await apiFetch(
        `/correspondence/distribution/${distributionEntryId}/mark_read/`,
        { method: 'POST' }
      );
      setMarkedAsRead(true);
      _onSyncFromApi?.();
    } catch (err) {
      logError('Failed to mark as read', err);
    }
  }, [distributionEntryId, _onSyncFromApi]);

  if (!correspondence) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Loading actions...</div>
        </CardContent>
      </Card>
    );
  }

  // Check if all non-recalled minutes have been acknowledged
  const nonRecalledMinutes = minutes.filter(m => !m.isRecalled);
  const allMinutesAcknowledged = nonRecalledMinutes.length > 0 && 
    nonRecalledMinutes.every(m => m.acknowledgedAt);
  const panelSpacing = compact ? "space-y-5" : "space-y-4";
  const mutedNoticeClass = compact
    ? "px-3 py-2.5 bg-muted/30 rounded-xl"
    : "p-3 bg-muted/50 border border-border rounded-lg";
  const primaryButtonClass = compact ? "w-full h-9 text-[13px] font-medium rounded-xl" : "w-full";
  const quietRowClass = cn(
    "w-full h-9 justify-start rounded-lg px-2.5 font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50",
    compact ? "text-[13px]" : "text-sm",
  );
  const pairedActionsClass = compact ? "grid grid-cols-1 gap-2" : "space-y-2";

  // Determine CC recipient status
  const isCCInfo = distributionPurpose === 'information';
  const isCCAction = distributionPurpose === 'action';
  const isCCRecipient = isCCInfo || isCCAction;
  const isRoutedUser = !isCCRecipient;

  // Compute main action buttons based on user role and distribution purpose
  let mainActions: React.ReactNode = null;
  
  if (isCCInfo) {
    // CC for Information: Forward + Mark as Read
    mainActions = (
      <div className={pairedActionsClass}>
        <Button
          className={primaryButtonClass}
          variant="outline"
          onClick={onOpenMinuteModal}
          disabled={turnRestrictedDisabled}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Forward / Circulate
        </Button>
        <Button
          className={primaryButtonClass}
          variant={markedAsRead ? "ghost" : "secondary"}
          onClick={handleMarkRead}
          disabled={turnRestrictedDisabled || markedAsRead}
        >
          <CheckCircle className={`h-4 w-4 mr-2 ${markedAsRead ? "text-green-500" : ""}`} />
          {markedAsRead ? "Read" : "Mark as Read"}
        </Button>
      </div>
    );
  } else if (isCCAction) {
    // CC for Action: Forward + Treat & Respond
    mainActions = (
      <div className={pairedActionsClass}>
        <Button
          className={primaryButtonClass}
          variant="outline"
          onClick={onOpenMinuteModal}
          disabled={turnRestrictedDisabled}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Forward / Circulate
        </Button>
        <Button
          className={primaryButtonClass}
          variant="secondary"
          onClick={onOpenTreatmentModal}
          disabled={turnRestrictedDisabled}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Treat & Respond
        </Button>
      </div>
    );
  } else if (isRoutedUser && activeUser?.gradeLevel === "MDCS") {
    // MDCS: Minute & Approve / Treat & Respond
    if (isForInformationOnly) {
      mainActions = (
        <div className={`w-full ${mutedNoticeClass}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>For Information Only – No action required</span>
          </div>
        </div>
      );
    } else if (hidePrimaryMinuteAction) {
      mainActions = (
        <Button
          className={primaryButtonClass}
          variant="secondary"
          onClick={onOpenTreatmentModal}
          disabled={turnRestrictedDisabled}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Treat & Respond
        </Button>
      );
    } else {
      mainActions = (
        <div className={pairedActionsClass}>
          <Button
            className={primaryButtonClass}
            variant="outline"
            onClick={onOpenMinuteModal}
            disabled={turnRestrictedDisabled}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Minute & Approve
          </Button>
          <Button
            className={primaryButtonClass}
            variant="secondary"
            onClick={onOpenTreatmentModal}
            disabled={turnRestrictedDisabled}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Treat & Respond
          </Button>
        </div>
      );
    }
  } else if (isRoutedUser && correspondence.direction === "downward") {
    // Downward direction: Minute & Route / Treat & Respond
    if (isForInformationOnly) {
      mainActions = (
        <div className={`w-full ${mutedNoticeClass}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>For Information Only – No action required</span>
          </div>
        </div>
      );
    } else if (hidePrimaryMinuteAction) {
      mainActions = (
        <Button
          className={primaryButtonClass}
          variant="secondary"
          onClick={onOpenTreatmentModal}
          disabled={turnRestrictedDisabled}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Treat & Respond
        </Button>
      );
    } else {
      mainActions = (
        <div className={pairedActionsClass}>
          <Button
            className={primaryButtonClass}
            variant="outline"
            onClick={onOpenMinuteModal}
            disabled={turnRestrictedDisabled}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Minute & Route
          </Button>
          <Button
            className={primaryButtonClass}
            variant="secondary"
            onClick={onOpenTreatmentModal}
            disabled={turnRestrictedDisabled}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Treat & Respond
          </Button>
        </div>
      );
    }
  } else if (isRoutedUser) {
    // Upward/Lateral: Endorse & Forward
    if (isForInformationOnly) {
      mainActions = (
        <div className={`w-full ${mutedNoticeClass}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>For Information Only – No action required</span>
          </div>
        </div>
      );
    } else if (hidePrimaryMinuteAction) {
      mainActions = (
        <Button
          className={primaryButtonClass}
          variant="secondary"
          onClick={onOpenTreatmentModal}
          disabled={turnRestrictedDisabled}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Treat & Respond
        </Button>
      );
    } else {
      mainActions = (
        <Button
          className={primaryButtonClass}
          variant="outline"
          onClick={onOpenMinuteModal}
          disabled={turnRestrictedDisabled}
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          Endorse & Forward
        </Button>
      );
    }
  }

  const showComplete =
    isRoutedUser && !isForInformationOnly && allMinutesAcknowledged;
  const showCompleteHint =
    isRoutedUser &&
    !isForInformationOnly &&
    !allMinutesAcknowledged &&
    nonRecalledMinutes.length > 0;
  const acknowledgedCount = nonRecalledMinutes.filter((m) => m.acknowledgedAt).length;

  const delegationNotice = activeDelegation ? (
    <div
      className={cn(
        compact ? "px-3 py-2.5 rounded-xl bg-amber-500/8" : "p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg",
      )}
    >
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-0.5">
        <UserIcon className="h-3.5 w-3.5" />
        <span className={cn(corrType.caption, "font-medium text-inherit")}>
          {String(activeUser?.id) === String(activeDelegation.principalId)
            ? "Active Delegation"
            : "Acting on Behalf"}
        </span>
      </div>
      <p className={corrType.caption}>
        {String(activeUser?.id) === String(activeDelegation.principalId) ? (
          <>
            Delegated to{" "}
            {organizationUsers.find((u) => String(u.id) === String(activeDelegation.assistantId))?.name ||
              "Assistant"}
            {activeDelegation.delegatedAt && (
              <> on {new Date(activeDelegation.delegatedAt as string).toLocaleDateString()}</>
            )}
          </>
        ) : (
          <>
            Acting on behalf of{" "}
            {organizationUsers.find((u) => String(u.id) === String(activeDelegation.principalId))?.name ||
              "Principal"}
          </>
        )}
      </p>
    </div>
  ) : null;

  const secondaryMore = (
    <div className={cn(compact ? "space-y-1" : "space-y-2")}>
      {compact && (
        <p className={cn(corrType.sectionLabel, "px-2.5 pb-1")}>More</p>
      )}
      {canReturnToPrincipal && (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={compact ? quietRowClass : "w-full"}
          onClick={() => void handleReturnToPrincipal()}
          disabled={returning || turnRestrictedDisabled}
        >
          <Undo2 className="h-4 w-4 mr-2 opacity-70" />
          {returning
            ? "Returning…"
            : correspondence?.actingPrincipalName
              ? `Return to ${correspondence.actingPrincipalName}`
              : "Return to principal"}
        </Button>
      )}
      {showComplete && (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={compact ? quietRowClass : "w-full mt-3"}
          onClick={onOpenCompletionModal}
          disabled={turnRestrictedDisabled}
        >
          <Archive className="h-4 w-4 mr-2 opacity-70" />
          Complete & Archive
        </Button>
      )}
      {showCompleteHint && (
        <div className={cn(compact ? "px-2.5 py-1.5" : mutedNoticeClass)}>
          <p className={corrType.caption}>
            {acknowledgedCount}/{nonRecalledMinutes.length} minutes acknowledged — Complete unlocks when all are acknowledged.
          </p>
        </div>
      )}
      {delegationNotice}
      {!activeDelegation && (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={compact ? quietRowClass : "w-full justify-start"}
          onClick={onOpenDelegateModal}
          disabled={turnRestrictedDisabled}
        >
          <UserIcon className="h-4 w-4 mr-2 opacity-70" />
          Delegate to TA/PA
        </Button>
      )}
    </div>
  );

  return (
    <div className={panelSpacing}>
      {isCompleted ? (
        <div className="space-y-3">
          <div
            className={
              compact
                ? "px-3 py-2.5 bg-success/10 rounded-xl"
                : "p-3 bg-success/10 border border-success/20 rounded-lg"
            }
          >
            <p className={cn(compact ? corrType.itemTitle : "text-sm font-medium", "text-success")}>
              {correspondence.status === "withdrawn"
                ? "Correspondence Withdrawn"
                : correspondence.status === "archived"
                  ? "Correspondence Archived"
                  : correspondence.status === "dispatched" || correspondence.status === "acknowledged"
                    ? "Correspondence Dispatched"
                    : "Correspondence Completed"}
            </p>
            <p className={cn(corrType.caption, "mt-1")}>
              {correspondence.status === "withdrawn"
                ? "This item was withdrawn and is no longer in active routing."
                : correspondence.status === "archived"
                  ? "Filed in records."
                  : correspondence.status === "dispatched" || correspondence.status === "acknowledged"
                    ? `Sent${correspondence.dispatchDate ? ` on ${formatDateShort(correspondence.dispatchDate)}` : ""}${
                        correspondence.acknowledgedDate
                          ? ` · Acknowledged ${formatDateShort(correspondence.acknowledgedDate)}`
                          : ""
                      }.`
                    : `Closed${completionGeneratedAt ? ` on ${formatDateShort(completionGeneratedAt)}` : ""}.`}
            </p>
          </div>
          {completionPackageUrl && onDownloadCompletionPackage && (
            <Button
              variant="secondary"
              className={primaryButtonClass}
              onClick={() =>
                onDownloadCompletionPackage(
                  completionPackageUrl,
                  `completion-package-${correspondence.referenceNumber || correspondence.id}.pdf`,
                )
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Download completion package
            </Button>
          )}

          {canDispatchCorrespondence(correspondence) && (
            <div className={mutedNoticeClass}>
              <p className={cn(corrType.caption, "mb-2")}>Ready to dispatch (outward)</p>
              <DispatchModal
                correspondenceId={correspondence.id}
                onSuccess={() => _onSyncFromApi?.()}
              />
            </div>
          )}

          {correspondence.status === "dispatched" && isCorrespondenceOutward(correspondence) && (
            <AcknowledgeButton
              correspondenceId={correspondence.id}
              onSuccess={() => _onSyncFromApi?.()}
            />
          )}

          {canArchiveCorrespondence(correspondence) && (
            <Button
              className={primaryButtonClass}
              variant="outline"
              onClick={async () => {
                try {
                  await apiFetch(`/correspondence/items/${correspondence.id}/archive/`, {
                    method: "POST",
                  });
                  _onSyncFromApi?.();
                } catch (error) {
                  logError("Failed to archive", error);
                }
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      ) : (
        <>
          {isCurrentUserTurn ? (
            <div
              className={cn(
                compact
                  ? "px-3 py-2.5 rounded-xl bg-primary/[0.06]"
                  : "p-3 rounded-xl bg-primary/8 border border-primary/15",
              )}
            >
              <p
                className={cn(
                  compact ? corrType.itemTitle : "text-sm font-medium",
                  "text-primary flex items-center gap-2",
                )}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Your turn
              </p>
              <p className={cn(corrType.caption, "mt-0.5")}>
                Document first — then Treat, Complete, or Delegate below.
              </p>
            </div>
          ) : !isForInformationOnly ? (
            <div className={mutedNoticeClass}>
              <div className={cn("flex items-start gap-2", corrType.meta)}>
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>Waiting on another office. You can still review the document and thread.</span>
              </div>
            </div>
          ) : null}

          {/* Focus action — calm secondary, not a stacked form */}
          <div className="space-y-2">{mainActions}</div>

          {compact ? (
            secondaryMore
          ) : (
            <>
              <Separator />
              {secondaryMore}
            </>
          )}
        </>
      )}
    </div>
  );
}
