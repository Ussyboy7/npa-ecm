"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import type { Correspondence, Minute, Office, OfficeMembership, User } from '@/lib/npa-structure';
import { ActionsPanel } from './ActionsPanel';
import { MinuteThreadPanel } from './MinuteThreadPanel';
import { WorkflowProgressIndicator } from '@/components/correspondence/WorkflowProgressIndicator';
import { SealTrackingPanel } from '@/components/seals/SealTrackingPanel';

interface RoutingPanelProps {
  correspondence: Correspondence;
  minutes: Minute[];
  activeUser: User;
  isCompleted: boolean;
  isCurrentUserTurn: boolean;
  isForInformationOnly: boolean;
  isExecutive: boolean;
  turnRestrictedDisabled: boolean;
  completionPackageUrl: string | null;
  completionGeneratedAt?: string | null;
  activeDelegation: Record<string, unknown> | null;
  organizationUsers: User[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  lookupUser: (userId?: string) => User | undefined;
  getActionIcon: (actionType: string) => React.ComponentType<{ className?: string }> | null;
  onOpenParallelRouteModal: () => void;
  onOpenLinkCaseModal: () => void;
  onOpenMinuteModal: () => void;
  onOpenTreatmentModal: () => void;
  onOpenCompletionModal: () => void;
  onOpenDelegateModal: () => void;
  onDownloadCompletionPackage: (url: string, filename: string) => Promise<void>;
  onSyncFromApi: () => Promise<unknown>;
  onMinuteClick: (minute: Minute) => void;
  onEditMinute: (minute: Minute) => void;
  onRecallMinute: (minute: Minute) => void;
  onAddNote: (minute: Minute) => void;
}

export function RoutingPanel({
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
  getActionIcon,
  onOpenParallelRouteModal,
  onOpenLinkCaseModal,
  onOpenMinuteModal,
  onOpenTreatmentModal,
  onOpenCompletionModal,
  onOpenDelegateModal,
  onDownloadCompletionPackage,
  onSyncFromApi,
  onMinuteClick,
  onEditMinute,
  onRecallMinute,
  onAddNote,
}: RoutingPanelProps) {
  const hasSeals = minutes.some((m) => m.sealData || m.signature);

  return (
    <aside className="flex flex-col flex-1 min-w-0 min-h-0 bg-background border-border md:border-l">
      <ScrollArea className="flex-shrink-0 max-h-[min(42vh,320px)] border-b border-border">
        <div className="p-4 space-y-3">
          <ActionsPanel
            correspondence={correspondence}
            minutes={minutes}
            activeUser={activeUser}
            onOpenParallelRouteModal={onOpenParallelRouteModal}
            onOpenLinkCaseModal={onOpenLinkCaseModal}
            isCompleted={isCompleted}
            isCurrentUserTurn={isCurrentUserTurn}
            isForInformationOnly={isForInformationOnly}
            isExecutive={isExecutive}
            turnRestrictedDisabled={turnRestrictedDisabled}
            completionPackageUrl={completionPackageUrl}
            completionGeneratedAt={completionGeneratedAt}
            activeDelegation={activeDelegation}
            organizationUsers={organizationUsers}
            offices={offices}
            officeMemberships={officeMemberships}
            lookupUser={lookupUser}
            onOpenMinuteModal={onOpenMinuteModal}
            onOpenTreatmentModal={onOpenTreatmentModal}
            onOpenCompletionModal={onOpenCompletionModal}
            onOpenDelegateModal={onOpenDelegateModal}
            onDownloadCompletionPackage={onDownloadCompletionPackage}
            onSyncFromApi={onSyncFromApi}
          />

          {minutes.length > 0 && (
            <WorkflowProgressIndicator
              correspondence={correspondence}
              minutes={minutes}
              currentApprover={
                correspondence.currentApproverId
                  ? lookupUser(correspondence.currentApproverId)
                  : undefined
              }
              users={organizationUsers}
              offices={offices}
              officeMemberships={officeMemberships}
            />
          )}

          {hasSeals && <SealTrackingPanel minutes={minutes} />}
        </div>
      </ScrollArea>

      <MinuteThreadPanel
        minutes={minutes}
        activeUserId={activeUser.id}
        isCompleted={isCompleted}
        isCurrentUserTurn={isCurrentUserTurn}
        lookupUser={lookupUser}
        getActionIcon={getActionIcon}
        embedded
        onMinuteClick={onMinuteClick}
        onEditMinute={onEditMinute}
        onRecallMinute={onRecallMinute}
        onAddNote={onAddNote}
      />
    </aside>
  );
}
