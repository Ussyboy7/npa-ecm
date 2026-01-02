"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  CheckCircle,
  Clock,
  Archive,
  MessageSquare,
  ArrowUp,
  Info,
  Users,
  User as UserIcon,
  RotateCcw as RotateCcwIcon,
  FileText,
  FolderTree,
  Link as LinkIcon,
  Paperclip,
} from 'lucide-react';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
// import { WorkflowProgressIndicator } from '@/components/correspondence/WorkflowProgressIndicator'; // Removed - redundant with Minute Thread
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { apiFetch } from '@/lib/api-client';
import { revokeDelegation } from '@/lib/delegation-storage';

interface ActionsPanelProps {
  correspondence: Correspondence;
  minutes: Minute[];
  activeUser: {
    id: string;
    gradeLevel?: string;
  };
  isCompleted: boolean;
  isCurrentUserTurn: boolean;
  isForInformationOnly: boolean;
  isExecutive: boolean;
  turnRestrictedDisabled: boolean;
  completionPackageUrl: string | null;
  completionGeneratedAt: string | null | undefined;
  activeDelegation: {
    id: string;
    principalId: string | number;
    assistantId: string | number;
    delegatedAt?: string;
  } | null;
  organizationUsers: Array<{ id: string; name: string }>;
  offices: Array<{ id: string; name: string }>;
  officeMemberships: Array<{ userId: string; officeId: string }>;
  lookupUser: (userId?: string) => { name: string; systemRole?: string } | undefined;
  onOpenMinuteModal: () => void;
  onOpenTreatmentModal: () => void;
  onOpenCompletionModal: () => void;
  onOpenParallelRouteModal: () => void;
  onOpenDelegateModal: () => void;
  onOpenLinkCaseModal: () => void;
  onDownloadCompletionPackage: (url: string, filename: string) => void;
  onSyncFromApi: () => Promise<void>;
}

export const ActionsPanel = ({
  correspondence,
  minutes,
  activeUser,
  isCompleted,
  isCurrentUserTurn,
  isForInformationOnly,
  isExecutive,
  turnRestrictedDisabled,
  completionPackageUrl,
  completionGeneratedAt,
  activeDelegation,
  organizationUsers,
  offices,
  officeMemberships,
  lookupUser,
  onOpenMinuteModal,
  onOpenTreatmentModal,
  onOpenCompletionModal,
  // onOpenParallelRouteModal, // Removed
  onOpenDelegateModal,
  // onOpenLinkCaseModal, // Moved to CorrespondenceHeader
  onDownloadCompletionPackage,
  onSyncFromApi,
}: ActionsPanelProps) => {
  const daysPending = correspondence.receivedDate 
    ? Math.floor((Date.now() - new Date(correspondence.receivedDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const lastMinute = minutes[minutes.length - 1];
  let currentApproverId = correspondence.currentApproverId;
  const routingActions = ['minute', 'forward', 'approve', 'treat'];
  
  if (lastMinute?.isRecalled && 
      routingActions.includes(lastMinute.actionType) && 
      lastMinute.userId) {
    currentApproverId = lastMinute.userId;
  }
  
  const currentApprover = currentApproverId ? lookupUser(currentApproverId) : null;
  const slaWarning = daysPending >= 5;
  const slaBreach = daysPending >= 7;

  const handleRecallDelegation = async () => {
    if (!activeDelegation?.id) return;
    
    try {
      await apiFetch(`/correspondence/correspondence-delegations/${activeDelegation.id}/revoke/`, {
        method: 'POST',
      });
      
      revokeDelegation(activeDelegation.id);
      
      toast.success('Delegation recalled', {
        description: 'The assistant has been notified. You can now take action on this correspondence directly.'
      });
      
      await onSyncFromApi();
    } catch (error) {
      logError('Failed to recall delegation', error);
      revokeDelegation(activeDelegation.id);
      toast.success('Delegation recalled locally', {
        description: 'You can now take action on this correspondence directly.'
      });
      window.location.reload();
    }
  };

  return (
    <aside className="w-full md:w-[40%] md:max-w-[500px] md:min-w-[320px] max-w-full border-b md:border-b-0 border-border bg-background flex flex-col rounded-lg">
      <div className="p-4 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Send className="h-4 w-4 text-accent" />
          Actions
        </h3>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full max-h-[calc(200vh-600px)]">
        <div className="p-4 space-y-4 overflow-x-hidden min-w-0 max-w-full">
          {/* Current Status Card */}
          <Card className={`overflow-hidden min-w-0 max-w-full ${slaBreach ? 'border-destructive/50 bg-destructive/5' : slaWarning ? 'border-warning/50 bg-warning/5' : ''}`}>
            <CardContent className="p-3 overflow-hidden min-w-0 max-w-full">
              <div className="flex items-start gap-3 min-w-0 max-w-full">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? 'bg-success/20' : isCurrentUserTurn ? 'bg-primary animate-pulse' : 'bg-muted'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : isCurrentUserTurn ? (
                    <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 max-w-full">
                    <p className="text-sm font-medium truncate min-w-0 flex-1">
                      {isCompleted ? 'Completed' : currentApprover?.name ?? 'Pending Assignment'}
                    </p>
                    {isCurrentUserTurn && !isCompleted && (
                      <Badge variant="default" className="text-[10px] h-5 flex-shrink-0">Your Turn</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate min-w-0">
                    {isCompleted 
                      ? `Closed ${completionGeneratedAt ? formatDateShort(completionGeneratedAt) : ''}`
                      : currentApprover?.systemRole ?? 'Awaiting action'
                    }
                  </p>
                  {!isCompleted && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge 
                        variant={slaBreach ? 'destructive' : slaWarning ? 'outline' : 'secondary'} 
                        className={`text-[10px] h-5 flex-shrink-0 ${slaWarning && !slaBreach ? 'border-warning text-warning' : ''}`}
                      >
                        {daysPending} {daysPending === 1 ? 'day' : 'days'} pending
                      </Badge>
                      {slaBreach && (
                        <Badge variant="destructive" className="text-[10px] h-5 flex-shrink-0">
                          SLA Breach
                        </Badge>
                      )}
                      {slaWarning && !slaBreach && (
                        <Badge variant="outline" className="text-[10px] h-5 border-warning text-warning flex-shrink-0">
                          SLA Warning
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Progress Indicator - Removed as redundant with Minute Thread and Routing Chain */}
          {/* {!isCompleted && minutes.length > 0 && (
            <WorkflowProgressIndicator
              correspondence={correspondence}
              minutes={minutes}
              currentApprover={lookupUser(correspondence.currentApproverId)}
              users={organizationUsers}
              offices={offices}
              officeMemberships={officeMemberships}
            />
          )} */}

          {isCompleted ? (
            <div className="space-y-3">
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg min-w-0 max-w-full overflow-hidden">
                <p className="text-sm font-medium text-success break-words">
                  Correspondence Completed
                </p>
                <p className="text-xs text-muted-foreground mt-2 break-words">
                  Closed{completionGeneratedAt ? ` on ${formatDateShort(completionGeneratedAt)}` : ''}. This item is now archived and read-only for audit purposes.
                </p>
              </div>
              {completionPackageUrl && (
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => {
                    const filename = `completion-package-${correspondence.referenceNumber || correspondence.id}.pdf`;
                    onDownloadCompletionPackage(completionPackageUrl, filename);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download completion package
                </Button>
              )}
            </div>
          ) : (
            <>
              {isCurrentUserTurn && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg min-w-0 max-w-full overflow-hidden">
                  <p className="text-sm font-medium text-accent flex items-center gap-2 break-words">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    Your Turn to Act
                  </p>
                </div>
              )}

              {activeUser.gradeLevel === 'MDCS' ? (
                <>
                  {isForInformationOnly ? (
                    <div className="w-full p-3 bg-muted/50 border border-border rounded-lg min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span className="break-words min-w-0">For Information Only – No action required</span>
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
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Treat & Respond
                      </Button>
                    </>
                  )}
                </>
              ) : correspondence.direction === 'downward' ? (
                <>
                  {isForInformationOnly ? (
                    <div className="w-full p-3 bg-muted/50 border border-border rounded-lg min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span className="break-words min-w-0">For Information Only – No action required</span>
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
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Treat & Respond
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {isForInformationOnly ? (
                    <div className="w-full p-3 bg-muted/50 border border-border rounded-lg min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span className="break-words min-w-0">For Information Only – No action required</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Check if last minute was a treatment response - show both options */}
                      {lastMinute?.actionType === 'treat' ? (
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
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Treat & Respond
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                          onClick={onOpenMinuteModal}
                          disabled={turnRestrictedDisabled}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Minute & Route
                        </Button>
                      )}
                    </>
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
                {/* Send to Multiple Recipients - Removed: Use Distribution (CC) in MinuteModal instead */}
                {activeDelegation ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1 min-w-0">
                        <UserIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs font-medium break-words min-w-0">
                          {String(activeUser.id) === String(activeDelegation.principalId) 
                            ? 'Active Delegation' 
                            : 'Acting on Behalf'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words min-w-0">
                        {String(activeUser.id) === String(activeDelegation.principalId) ? (
                          <>
                            Delegated to {organizationUsers.find(u => String(u.id) === String(activeDelegation.assistantId))?.name || 'Assistant'}
                            {activeDelegation.delegatedAt && (
                              <> on {new Date(activeDelegation.delegatedAt).toLocaleDateString()}</>
                            )}
                          </>
                        ) : (
                          <>
                            Acting on behalf of {organizationUsers.find(u => String(u.id) === String(activeDelegation.principalId))?.name || 'Principal'}
                          </>
                        )}
                      </p>
                    </div>
                    {String(activeUser.id) === String(activeDelegation.principalId) && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                        onClick={handleRecallDelegation}
                      >
                        <RotateCcwIcon className="h-4 w-4 mr-2" />
                        Recall Delegation
                      </Button>
                    )}
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

              {/* Link to Case - Moved to CorrespondenceHeader */}
            </>
          )}
        </div>
        </ScrollArea>
      </div>
    </aside>
  );
};

