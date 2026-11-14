"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { logError } from "@/lib/client-logger";
import { getPermissionProfile, hasRolePermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  FolderTree,
  ArrowRightLeft,
} from "lucide-react";
import { formatDateShort, canDispatchCorrespondence, canArchiveCorrespondence, isCorrespondenceOutward } from "@/lib/correspondence-helpers";
import { cn } from "@/lib/utils";
import { DispatchModal, AcknowledgeButton } from "@/components/correspondence/DispatchModal";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/components/ui/sonner";
import { returnCorrespondenceToPrincipal } from "@/lib/api/acting-appointments";
import type { Correspondence, Minute, User, Office, OfficeMembership } from "@/lib/npa-structure";
import { corrType } from "../correspondence-type";

interface ActionsPanelProps {
  correspondence?: Correspondence;
  minutes?: Minute[];
  activeUser?: User | null;
  onOpenLinkCaseModal?: () => void;
  canReassign?: boolean;
  onReassign?: () => void;
  isCompleted?: boolean;
  isCurrentUserTurn?: boolean;
  isForInformationOnly?: boolean;
  distributionPurpose?: 'information' | 'action' | null;
  distributionEntryId?: string | null;
  turnRestrictedDisabled?: boolean;
  hasCompletionPackage?: boolean;
  completionGeneratedAt?: string | null;
  activeDelegation?: Record<string, unknown> | null;
  organizationUsers?: User[];
  offices?: Office[];
  officeMemberships?: OfficeMembership[];
  lookupUser?: (id: string) => User | undefined;
  onOpenMinuteModal?: () => void;
  onOpenTreatmentModal?: () => void;
  onOpenCompletionModal?: () => void;
  onOpenNoResponseCompletionModal?: () => void;
  onOpenDelegateModal?: () => void;
  onDownloadCompletionPackage?: (filename: string) => Promise<void>;
  onSyncFromApi?: () => Promise<unknown>;
  compact?: boolean;
  /** Hide Minute/Endorse primary buttons when header/mobile already owns that CTA */
  hidePrimaryMinuteAction?: boolean;
  isAuditCase?: boolean;
  caseAuditState?: string | null;
  onViewAuditCase?: () => void;
  [key: string]: unknown;
}

export function ActionsPanel({
  correspondence,
  minutes = [],
  activeUser,
  isCompleted = false,
  isCurrentUserTurn = false,
  isForInformationOnly = false,
  distributionPurpose = null,
  turnRestrictedDisabled = false,
  hasCompletionPackage,
  completionGeneratedAt,
  activeDelegation,
  organizationUsers = [],
  offices: _offices = [],
  officeMemberships: _officeMemberships = [],
  lookupUser: _lookupUser = () => undefined,
  onOpenMinuteModal,
  onOpenTreatmentModal,
  onOpenCompletionModal,
  onOpenNoResponseCompletionModal,
  onOpenDelegateModal,
  onDownloadCompletionPackage,
  onOpenLinkCaseModal,
  canReassign = false,
  onReassign,
  onSyncFromApi: _onSyncFromApi,
  distributionEntryId: distributionEntryIdProp,
  compact = false,
  hidePrimaryMinuteAction = false,
  isAuditCase = false,
  caseAuditState = null,
  onViewAuditCase,
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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLevel, setArchiveLevel] = useState<string>("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [refileOpen, setRefileOpen] = useState(false);
  const [refileLevel, setRefileLevel] = useState<string>("");
  const [refileReason, setRefileReason] = useState("");
  const [isRefiling, setIsRefiling] = useState(false);
  const [unarchiveOpen, setUnarchiveOpen] = useState(false);
  const [unarchiveReason, setUnarchiveReason] = useState("");
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  // Filing authority is per level; the general archive permission alone is not
  // enough, and the server also checks the memo against the user's org scope.
  const archiveLevels = useMemo(
    () => getPermissionProfile(activeUser).allowedArchiveLevels,
    [activeUser],
  );

  const openArchiveDialog = useCallback(() => {
    const existingLevel = correspondence?.archiveLevel;
    const preferred =
      existingLevel && archiveLevels.includes(existingLevel) ? existingLevel : archiveLevels[0] ?? "";
    setArchiveLevel(preferred);
    setArchiveOpen(true);
  }, [archiveLevels, correspondence?.archiveLevel]);

  // Re-filing moves the same record; only levels other than the current one.
  const refileLevels = useMemo(
    () => archiveLevels.filter((level) => level !== correspondence?.archiveLevel),
    [archiveLevels, correspondence?.archiveLevel],
  );

  const openRefileDialog = useCallback(() => {
    setRefileLevel(refileLevels[0] ?? "");
    setRefileReason("");
    setRefileOpen(true);
  }, [refileLevels]);

  const handleRefile = useCallback(async () => {
    if (!correspondence || !refileLevel || !refileReason.trim()) return;
    setIsRefiling(true);
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/refile/`, {
        method: "POST",
        body: JSON.stringify({ archive_level: refileLevel, reason: refileReason.trim() }),
      });
      setRefileOpen(false);
      toast.success(`Re-filed at ${refileLevel} level`);
      _onSyncFromApi?.();
    } catch (error) {
      logError("Failed to re-file correspondence", error);
      toast.error(
        error instanceof Error ? error.message : "Could not re-file this correspondence",
      );
    } finally {
      setIsRefiling(false);
    }
  }, [correspondence, refileLevel, refileReason, _onSyncFromApi]);

  const handleUnarchive = useCallback(async () => {
    if (!correspondence || !unarchiveReason.trim()) return;
    setIsUnarchiving(true);
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/unarchive/`, {
        method: "POST",
        body: JSON.stringify({ reason: unarchiveReason.trim() }),
      });
      setUnarchiveOpen(false);
      setUnarchiveReason("");
      toast.success("Returned to records");
      _onSyncFromApi?.();
    } catch (error) {
      logError("Failed to return correspondence to records", error);
      toast.error(error instanceof Error ? error.message : "Could not return this record to records");
    } finally {
      setIsUnarchiving(false);
    }
  }, [correspondence, unarchiveReason, _onSyncFromApi]);

  const handleArchive = useCallback(async () => {
    if (!correspondence || !archiveLevel) return;
    setIsArchiving(true);
    try {
      await apiFetch(`/correspondence/items/${correspondence.id}/archive/`, {
        method: "POST",
        body: JSON.stringify({ archive_level: archiveLevel }),
      });
      setArchiveOpen(false);
      toast.success(`Archived at ${archiveLevel} level`);
      _onSyncFromApi?.();
    } catch (error) {
      logError("Failed to archive", error);
      toast.error(
        error instanceof Error ? error.message : "Could not archive this correspondence",
      );
    } finally {
      setIsArchiving(false);
    }
  }, [archiveLevel, correspondence, _onSyncFromApi]);

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
        hasRolePermission(activeUser, "can_manage_org_structure") ||
        hasRolePermission(activeUser, "can_manage_users") ||
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
      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-center text-muted-foreground">Loading actions...</div>
      </div>
    );
  }

  // Check if all non-recalled minutes have been acknowledged
  const nonRecalledMinutes = minutes.filter(m => !m.isRecalled);
  const allMinutesAcknowledged = nonRecalledMinutes.length > 0 && 
    nonRecalledMinutes.every(m => m.acknowledgedAt);
  const allRoutedMinutesAcknowledged = nonRecalledMinutes
    .filter((minute) => minute.toOfficeId || minute.toUserId)
    .every((minute) => minute.acknowledgedAt);
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

  // Audit Case: hard product rule — Case owns work, not Minute/Forward. Hide Forward/Circulate for audit.
  let mainActions: React.ReactNode = null;

  if (isAuditCase) {
    if (caseAuditState === 'RESPONSE_RECEIVED' || caseAuditState === 'AUDIT_REVIEW' || caseAuditState === 'CLOSED') {
      mainActions = (
        <div className={pairedActionsClass}>
          <Button className={primaryButtonClass} variant="outline" onClick={onViewAuditCase}>
            <FolderTree className="h-4 w-4 mr-2" />
            View Audit Case
          </Button>
          {!isCompleted && caseAuditState !== 'CLOSED' && !isForInformationOnly && (
            <Button
              className={primaryButtonClass}
              variant="secondary"
              onClick={onOpenTreatmentModal}
              disabled={turnRestrictedDisabled}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Audit Review
            </Button>
          )}
        </div>
      );
    } else if (isCurrentUserTurn && !isForInformationOnly) {
      // AWAITING_RESPONSE at Finance — Minute for internal note + Respond to reply
      mainActions = (
        <div className={pairedActionsClass}>
          <Button
            className={primaryButtonClass}
            variant="outline"
            onClick={onOpenMinuteModal}
            disabled={turnRestrictedDisabled}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Minute
          </Button>
          <Button
            className={primaryButtonClass}
            variant="secondary"
            onClick={onOpenTreatmentModal}
            disabled={turnRestrictedDisabled}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Respond
          </Button>
        </div>
      );
    } else {
      mainActions = null;
    }
  } else if (isCCInfo) {
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
          Minute / Route
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
          Minute / Route
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
    // Upward/Lateral: Endorse & Forward, or record a treatment response
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
            <ArrowUp className="h-4 w-4 mr-2" />
            Endorse & Forward
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
  }

  const canComplete =
    isRoutedUser &&
    !isForInformationOnly &&
    hasRolePermission(activeUser, "can_minute_correspondence");
  const showComplete = canComplete && allMinutesAcknowledged;
  const showNoResponseComplete =
    canComplete && nonRecalledMinutes.length > 0 && allRoutedMinutesAcknowledged;
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
              <> on {formatDateShort(activeDelegation.delegatedAt as string)}</>
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
          <CheckCircle className="h-4 w-4 mr-2 opacity-70" />
          Complete correspondence
        </Button>
      )}
      {showNoResponseComplete && (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={compact ? quietRowClass : "w-full"}
          onClick={onOpenNoResponseCompletionModal}
          disabled={turnRestrictedDisabled}
        >
          <CheckCircle className="h-4 w-4 mr-2 opacity-70" />
          Finish — no reply required
        </Button>
      )}
      {showCompleteHint && (
        <div className={cn(compact ? "px-2.5 py-1.5" : mutedNoticeClass)}>
          <p className={corrType.caption}>
            {acknowledgedCount}/{nonRecalledMinutes.length} minutes acknowledged. Complete requires all handoffs acknowledged; finish without a reply records the final action and closes this memo.
          </p>
        </div>
      )}
      {delegationNotice}
      {canReassign && onReassign && (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={compact ? quietRowClass : "w-full justify-start"}
          onClick={onReassign}
          disabled={turnRestrictedDisabled}
        >
          <ArrowRightLeft className="h-4 w-4 mr-2 opacity-70" />
          Reassign
        </Button>
      )}
      {!correspondence.caseId && onOpenLinkCaseModal && (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={compact ? quietRowClass : "w-full justify-start"}
          onClick={onOpenLinkCaseModal}
          disabled={turnRestrictedDisabled}
        >
          <FolderTree className="h-4 w-4 mr-2 opacity-70" />
          Link to case
        </Button>
      )}
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
          {hasCompletionPackage && onDownloadCompletionPackage && (
            <Button
              variant="secondary"
              className={primaryButtonClass}
              onClick={() =>
                onDownloadCompletionPackage(
                  `completion-package-${correspondence.referenceNumber || correspondence.id}.pdf`,
                )
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Download completion package
            </Button>
          )}

          {correspondence.status === "dispatched" && isCorrespondenceOutward(correspondence) && (
            <AcknowledgeButton
              correspondenceId={correspondence.id}
              onSuccess={() => _onSyncFromApi?.()}
            />
          )}

          {canArchiveCorrespondence(correspondence) && (
            <>
              <Button
                className={primaryButtonClass}
                variant="outline"
                onClick={openArchiveDialog}
                disabled={archiveLevels.length === 0}
                title={
                  archiveLevels.length === 0
                    ? "You do not have permission to archive at any level"
                    : undefined
                }
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <AlertDialog open={archiveOpen} onOpenChange={(open) => !isArchiving && setArchiveOpen(open)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>File this correspondence</AlertDialogTitle>
                    <AlertDialogDescription>
                      Choose the level this record belongs to. You can only file at a level you are
                      authorised for and within your organisation scope.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`archive-level-${correspondence.id}`}>
                      Archive level
                    </label>
                    <Select value={archiveLevel} onValueChange={setArchiveLevel} disabled={isArchiving}>
                      <SelectTrigger id={`archive-level-${correspondence.id}`}>
                        <SelectValue placeholder="Select a level" />
                      </SelectTrigger>
                      <SelectContent>
                        {archiveLevels.map((level) => (
                          <SelectItem key={level} value={level} className="capitalize">
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isArchiving || !archiveLevel}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleArchive();
                      }}
                    >
                      {isArchiving ? "Archiving…" : "Archive"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {correspondence.status === "archived" && archiveLevels.length > 0 && (
            <>
              <Button className={primaryButtonClass} variant="outline" onClick={() => { setUnarchiveReason(""); setUnarchiveOpen(true); }}>
                <Undo2 className="h-4 w-4 mr-2" />
                Return to records
              </Button>
              <AlertDialog open={unarchiveOpen} onOpenChange={(open) => !isUnarchiving && setUnarchiveOpen(open)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Return this record to records?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This restores the status the record had before archiving, clears its active filing level, and records your reason in the audit trail.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`unarchive-reason-${correspondence.id}`}>Reason *</label>
                    <Textarea
                      id={`unarchive-reason-${correspondence.id}`}
                      value={unarchiveReason}
                      onChange={(event) => setUnarchiveReason(event.target.value)}
                      placeholder="Why should this record return to records?"
                      rows={3}
                      maxLength={2000}
                      disabled={isUnarchiving}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isUnarchiving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={isUnarchiving || !unarchiveReason.trim()} onClick={(event) => { event.preventDefault(); void handleUnarchive(); }}>
                      {isUnarchiving ? "Returning…" : "Return to records"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {correspondence.status === "archived" && refileLevels.length > 0 && (
            <>
              <Button className={primaryButtonClass} variant="outline" onClick={openRefileDialog}>
                <FolderTree className="h-4 w-4 mr-2" />
                Change filing level
              </Button>
              <AlertDialog
                open={refileOpen}
                onOpenChange={(open) => !isRefiling && setRefileOpen(open)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Re-file this record</AlertDialogTitle>
                    <AlertDialogDescription>
                      Move this same record to another filing level. The change is recorded in the
                      audit trail with your reason; no duplicate record is created.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor={`refile-level-${correspondence.id}`}
                      >
                        New archive level
                      </label>
                      <Select
                        value={refileLevel}
                        onValueChange={setRefileLevel}
                        disabled={isRefiling}
                      >
                        <SelectTrigger id={`refile-level-${correspondence.id}`}>
                          <SelectValue placeholder="Select a level" />
                        </SelectTrigger>
                        <SelectContent>
                          {refileLevels.map((level) => (
                            <SelectItem key={level} value={level} className="capitalize">
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor={`refile-reason-${correspondence.id}`}
                      >
                        Reason *
                      </label>
                      <Textarea
                        id={`refile-reason-${correspondence.id}`}
                        value={refileReason}
                        onChange={(event) => setRefileReason(event.target.value)}
                        placeholder="Why does this record belong at a different level?"
                        rows={3}
                        maxLength={2000}
                        disabled={isRefiling}
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isRefiling}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isRefiling || !refileLevel || !refileReason.trim()}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleRefile();
                      }}
                    >
                      {isRefiling ? "Re-filing…" : "Re-file"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
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
                Choose an action below, or hand this on.
              </p>
            </div>
          ) : !isForInformationOnly ? (
            <div className={mutedNoticeClass}>
              <div className={cn("flex items-start gap-2", corrType.meta)}>
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  {correspondence.currentOfficeName
                    ? `With ${correspondence.currentOfficeName} — actions unlock when it reaches you. You can still review the document and thread.`
                    : "Waiting on the current office — actions unlock when it reaches you. You can still review the document and thread."}
                </span>
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
