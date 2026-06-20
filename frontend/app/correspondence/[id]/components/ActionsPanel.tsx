"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Download,
  CheckCircle,
  Clock,
  Archive,
  Users,
  UserIcon,
  ArrowUp,
  ArrowRight,
  Info,
  Send,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { WorkflowProgressIndicator } from "@/components/correspondence/WorkflowProgressIndicator";
import { DispatchModal, AcknowledgeButton } from "@/components/correspondence/DispatchModal";
import type { Correspondence, Minute, User, Office, OfficeMembership } from "@/lib/npa-structure";

interface ActionsPanelProps {
  correspondence?: Correspondence;
  minutes?: Minute[];
  activeUser?: User | null;
  onOpenParallelRouteModal?: () => void;
  onOpenLinkCaseModal?: () => void;
  isCompleted?: boolean;
  isCurrentUserTurn?: boolean;
  isForInformationOnly?: boolean;
  isExecutive?: boolean;
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
  [key: string]: unknown;
}

export function ActionsPanel({
  correspondence,
  minutes = [],
  activeUser,
  isCompleted = false,
  isCurrentUserTurn = false,
  isForInformationOnly = false,
  isExecutive = false,
  turnRestrictedDisabled = false,
  completionPackageUrl,
  completionGeneratedAt,
  activeDelegation,
  organizationUsers = [],
  offices = [],
  officeMemberships = [],
  lookupUser = () => undefined,
  onOpenMinuteModal,
  onOpenTreatmentModal,
  onOpenParallelRouteModal,
  onOpenCompletionModal,
  onOpenDelegateModal,
  onDownloadCompletionPackage,
  onSyncFromApi: _onSyncFromApi,
}: ActionsPanelProps) {
  if (!correspondence) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Loading actions...</div>
        </CardContent>
      </Card>
    );
  }

  const daysPending = correspondence.receivedDate
    ? Math.floor((Date.now() - new Date(correspondence.receivedDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const lastMinute = minutes[minutes.length - 1];
  let currentApproverId = correspondence.currentApproverId;
  const routingActions = ["minute", "forward", "approve", "treat"];
  if (lastMinute?.isRecalled && routingActions.includes(lastMinute.actionType) && lastMinute.userId) {
    currentApproverId = lastMinute.userId;
  }
  const currentApprover = currentApproverId ? lookupUser(currentApproverId) : null;
  const slaWarning = daysPending >= 5;
  const slaBreach = daysPending >= 7;

  return (
    <div className="space-y-4">
      {/* Current Status Card */}
      <Card className={cn(slaBreach ? "border-destructive/50 bg-destructive/5" : slaWarning ? "border-warning/50 bg-warning/5" : "")}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
              isCompleted ? "bg-success/20" : isCurrentUserTurn ? "bg-primary animate-pulse" : "bg-muted"
            )}>
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : isCurrentUserTurn ? (
                <div className="h-3 w-3 rounded-full bg-primary-foreground" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {isCompleted ? "Completed" : currentApprover?.name ?? "Pending Assignment"}
                </p>
                {isCurrentUserTurn && !isCompleted && (
                  <Badge variant="default" className="text-[10px] h-5">Your Turn</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isCompleted
                  ? `Closed ${completionGeneratedAt ? formatDateShort(completionGeneratedAt) : ""}`
                  : currentApprover?.systemRole ?? "Awaiting action"
                }
              </p>
              {!isCompleted && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge
                    variant={slaBreach ? "destructive" : slaWarning ? "outline" : "secondary"}
                    className={cn("text-[10px] h-5", slaWarning && !slaBreach && "border-warning text-warning")}
                  >
                    {daysPending} {daysPending === 1 ? "day" : "days"} pending
                  </Badge>
                  {slaBreach && (
                    <Badge variant="destructive" className="text-[10px] h-5">SLA Breach</Badge>
                  )}
                  {slaWarning && !slaBreach && (
                    <Badge variant="outline" className="text-[10px] h-5 border-warning text-warning">SLA Warning</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Progress Indicator */}
      {!isCompleted && minutes.length > 0 && (
        <WorkflowProgressIndicator
          correspondence={correspondence}
          minutes={minutes}
          currentApprover={correspondence.currentApproverId ? lookupUser(correspondence.currentApproverId) : undefined}
          users={organizationUsers}
          offices={offices}
          officeMemberships={officeMemberships}
        />
      )}

      {isCompleted ? (
        <div className="space-y-3">
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm font-medium text-success">Correspondence Completed</p>
            <p className="text-xs text-muted-foreground mt-2">
              Closed{completionGeneratedAt ? ` on ${formatDateShort(completionGeneratedAt)}` : ""}. This item is now archived and read-only for audit purposes.
            </p>
          </div>
          {completionPackageUrl && onDownloadCompletionPackage && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => onDownloadCompletionPackage(completionPackageUrl, `completion-package-${correspondence.referenceNumber || correspondence.id}.pdf`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download completion package
            </Button>
          )}

          {correspondence.status !== "dispatched" && correspondence.status !== "acknowledged" && correspondence.status !== "archived" && (
            <DispatchModal
              correspondenceId={correspondence.id}
              onSuccess={() => _onSyncFromApi?.()}
            />
          )}

          {correspondence.status === "dispatched" && (
            <AcknowledgeButton
              correspondenceId={correspondence.id}
              onSuccess={() => _onSyncFromApi?.()}
            />
          )}
        </div>
      ) : (
        <>
          {isCurrentUserTurn && (
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-sm font-medium text-accent flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Your Turn to Act
              </p>
            </div>
          )}

          {activeUser?.gradeLevel === "MDCS" ? (
            <>
              {isForInformationOnly ? (
                <div className="w-full p-3 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>For Information Only – No action required</span>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    onClick={onOpenMinuteModal}
                    disabled={turnRestrictedDisabled}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Minute & Approve
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={onOpenTreatmentModal}
                    disabled={turnRestrictedDisabled}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Treat & Respond
                  </Button>
                </>
              )}
            </>
          ) : correspondence.direction === "downward" ? (
            <>
              {isForInformationOnly ? (
                <div className="w-full p-3 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>For Information Only – No action required</span>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    onClick={onOpenMinuteModal}
                    disabled={turnRestrictedDisabled}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Minute & Route
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={onOpenTreatmentModal}
                    disabled={turnRestrictedDisabled}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Treat & Respond
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {isForInformationOnly ? (
                <div className="w-full p-3 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>For Information Only – No action required</span>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full bg-gradient-success hover:opacity-90 transition-opacity"
                  onClick={onOpenMinuteModal}
                  disabled={turnRestrictedDisabled}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Endorse & Forward
                </Button>
              )}
            </>
          )}

          {!isForInformationOnly && (
            <Button
              className="w-full mt-3"
              variant="outline"
              onClick={onOpenCompletionModal}
              disabled={turnRestrictedDisabled}
            >
              <Archive className="h-4 w-4 mr-2" />
              Mark Complete & Archive
            </Button>
          )}

          <Separator />

          <div className="space-y-2">
            {isExecutive && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onOpenParallelRouteModal}
                disabled={turnRestrictedDisabled}
              >
                <Users className="h-4 w-4 mr-2" />
                Send to Multiple Recipients
              </Button>
            )}
            {activeDelegation ? (
              <div className="space-y-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                    <UserIcon className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {String(activeUser?.id) === String(activeDelegation.principalId)
                        ? "Active Delegation"
                        : "Acting on Behalf"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {String(activeUser?.id) === String(activeDelegation.principalId) ? (
                      <>
                        Delegated to {organizationUsers.find((u) => String(u.id) === String(activeDelegation.assistantId))?.name || "Assistant"}
                        {activeDelegation.delegatedAt && (
                          <> on {new Date(activeDelegation.delegatedAt as string).toLocaleDateString()}</>
                        )}
                      </>
                    ) : (
                      <>
                        Acting on behalf of {organizationUsers.find((u) => String(u.id) === String(activeDelegation.principalId))?.name || "Principal"}
                      </>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onOpenDelegateModal}
                disabled={turnRestrictedDisabled}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Delegate to TA/PA
              </Button>
            )}
          </div>

          <Separator />
        </>
      )}


    </div>
  );
}
