"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Clock, GitBranch, ArrowUp, ArrowDown, Users, Mail } from 'lucide-react';
import type { Correspondence, Minute, Office, OfficeMembership, User } from '@/lib/npa-structure';
import { ActionsPanel } from './ActionsPanel';
import { MinuteThreadPanel } from './MinuteThreadPanel';
import { ParallelRoutingStatusPanel } from '@/components/correspondence/ParallelRoutingStatusPanel';
import { corrType } from '../correspondence-type';
import { cn } from '@/lib/utils';
import { formatDate as formatDateValue } from '@/lib/datetime';

interface RoutingPanelProps {
  correspondence: Correspondence;
  minutes: Minute[];
  activeUser: User;
  isCompleted: boolean;
  isCurrentUserTurn: boolean;
  isForInformationOnly: boolean;
  distributionPurpose?: 'action' | 'information' | null;
  distributionEntryId?: string | null;
  turnRestrictedDisabled: boolean;
  hasCompletionPackage: boolean;
  completionGeneratedAt?: string | null;
  activeDelegation: Record<string, unknown> | null;
  organizationUsers: User[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  lookupUser: (userId?: string) => User | undefined;
  getActionIcon: (actionType: string) => React.ComponentType<{ className?: string }> | null;
  onOpenLinkCaseModal: () => void;
  onOpenMinuteModal: () => void;
  onOpenTreatmentModal: () => void;
  onOpenCompletionModal: () => void;
  onOpenDelegateModal: () => void;
  onDownloadCompletionPackage: (filename: string) => Promise<void>;
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
  distributionPurpose,
  distributionEntryId,
  turnRestrictedDisabled,
  hasCompletionPackage,
  completionGeneratedAt,
  activeDelegation,
  organizationUsers,
  offices,
  officeMemberships,
  lookupUser,
  getActionIcon,
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
  const [activeTab, setActiveTab] = useState<'thread' | 'workflow' | 'action'>('thread');

  return (
    <aside className="flex flex-col flex-1 min-w-0 min-h-0 bg-transparent border-border/50 md:border-l">
      <div className="border-b border-border/40 p-2 bg-background/80 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-muted/50 p-1">
          <Button
            variant={activeTab === 'thread' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs rounded-full h-7"
            onClick={() => setActiveTab('thread')}
          >
            Thread
          </Button>
          <Button
            variant={activeTab === 'workflow' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs rounded-full h-7"
            onClick={() => setActiveTab('workflow')}
          >
            Workflow
          </Button>
          <Button
            variant={activeTab === 'action' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs rounded-full h-7"
            onClick={() => setActiveTab('action')}
          >
            Action
          </Button>
        </div>
      </div>

      {activeTab === 'thread' && (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain animate-in fade-in duration-200 motion-reduce:animate-none">
          <MinuteThreadPanel
            minutes={minutes}
            activeUserId={activeUser.id}
            isCompleted={isCompleted}
            isCurrentUserTurn={isCurrentUserTurn}
            lookupUser={lookupUser}
            getActionIcon={getActionIcon}
            embedded
            scrollable={false}
            onMinuteClick={onMinuteClick}
            onEditMinute={onEditMinute}
            onRecallMinute={onRecallMinute}
            onAddNote={onAddNote}
          />
        </div>
      )}

      {activeTab === 'workflow' && (
        <ScrollArea className="flex-1 min-h-0 animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="p-4 space-y-3">
            <RoutingHistoryCard
              correspondence={correspondence}
              minutes={minutes}
              lookupUser={lookupUser}
            />
            <ParallelRoutingStatusPanel
              correspondenceId={correspondence.id}
              onRefresh={onSyncFromApi}
            />
            {correspondence.distribution && correspondence.distribution.length > 0 && (
              <div className="rounded-xl border border-border/60">
                <div className="border-b border-border/60 p-3 pb-0">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    Distribution (CC)
                  </p>
                </div>
                <div className="space-y-1.5 p-3">
                  {correspondence.distribution
                    .filter((d) => d.is_active !== false)
                    .map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30 text-sm">
                        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate">{recipient.name || 'Unknown'}</span>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
                              {recipient.type}
                            </Badge>
                            {recipient.purpose && (
                              <Badge
                                variant={recipient.purpose === 'action' ? 'default' : 'secondary'}
                                className="text-[10px] px-1 py-0 h-4"
                              >
                                {recipient.purpose === 'action' ? 'For Action' : 'For Info'}
                              </Badge>
                            )}
                            {recipient.addedByName && (
                              <span className="text-muted-foreground/60">
                                by {recipient.addedByName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {activeTab === 'action' && (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="px-3 pt-3 pb-2">
            <p className={corrType.panelTitle}>Action</p>
            <p className={cn(corrType.caption, 'mt-0.5')}>
              Secondary routing — Minute stays in the header.
            </p>
          </div>
          <div className="px-3 pb-6">
            <ActionsPanel
              compact
              hidePrimaryMinuteAction
              correspondence={correspondence}
              minutes={minutes}
              activeUser={activeUser}
              onOpenLinkCaseModal={onOpenLinkCaseModal}
              isCompleted={isCompleted}
              isCurrentUserTurn={isCurrentUserTurn}
              isForInformationOnly={isForInformationOnly}
              distributionPurpose={distributionPurpose}
              distributionEntryId={distributionEntryId}
              turnRestrictedDisabled={turnRestrictedDisabled}
              hasCompletionPackage={hasCompletionPackage}
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
          </div>
        </div>
      )}
    </aside>
  );
}

const GRADE_NAMES: Record<string, string> = {
  'MDCS': 'Managing Director',
  'EDCS': 'Executive Director',
  'MSS1': 'General Manager',
  'MSS2': 'Assistant General Manager',
  'MSS3': 'Principal Manager',
  'MSS4': 'Senior Manager',
  'MSS5': 'Manager',
  'SSS1': 'Assistant Manager',
  'SSS2': 'Senior Officer',
  'SSS3': 'Officer I',
  'SSS4': 'Officer II',
  'JSS1': 'Staff I',
  'JSS2': 'Staff II',
  'JSS3': 'Staff III',
};

const formatDate = (dateStr: string) => {
  return formatDateValue(dateStr, 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function RoutingHistoryCard({
  correspondence,
  minutes,
  lookupUser,
}: {
  correspondence: Correspondence;
  minutes: Minute[];
  lookupUser: (userId?: string) => User | undefined;
}) {
  const createdByUser = lookupUser(correspondence.createdById);

  const originRole = createdByUser?.systemRole || (createdByUser?.gradeLevel ? GRADE_NAMES[createdByUser.gradeLevel] : undefined);

  const DirectionIcon = correspondence.direction === 'upward' ? ArrowUp : ArrowDown;
  const directionLabel = correspondence.direction === 'upward' ? 'Upward' : 'Downward';

  const sortedMinutes = [...minutes]
    .filter((m) => !m.isRecalled)
    .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));

  const actionLabel: Record<string, string> = {
    approve: 'Approved',
    minute: 'Minute',
    forward: 'Forwarded',
    treat: 'Treated',
    reject: 'Rejected',
  };

  return (
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border/60 px-3 py-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            Routing History
          </p>
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <DirectionIcon className="h-3 w-3" />
            {directionLabel}
          </Badge>
        </div>
      </div>
      <div className="px-3 pb-3 pt-0">
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[15px] top-[20px] bottom-[20px] w-0.5 bg-muted" />

          {/* Origin step */}
          <div className="flex items-start gap-3 pb-5 relative">
            <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-green-500 border-green-500 text-white flex-shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs text-muted-foreground">Created by</p>
              <p className="text-sm font-medium text-foreground">
                {originRole || 'Unknown'}
              </p>
              {correspondence.createdByName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {correspondence.createdByName}
                </p>
              )}
              {correspondence.receivedDate && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(correspondence.receivedDate)}
                </p>
              )}
            </div>
          </div>

          {/* Intermediate steps from minutes */}
          {sortedMinutes.map((m) => {
            const mUser = lookupUser(m.userId);
            const mRole = mUser?.systemRole || (m.gradeLevel ? GRADE_NAMES[m.gradeLevel] : undefined);
            const label = actionLabel[m.actionType] || m.actionType;

            // Show the sender's context: office name if available, otherwise sender's designation
            const headerText = m.fromOfficeName || mRole || 'Unknown';

            return (
              <div key={m.id} className="flex items-start gap-3 pb-5 relative">
                <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-green-500 border-green-500 text-white flex-shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {headerText}
                    </p>
                    <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0 capitalize">
                      {label}
                    </Badge>
                  </div>
                  {m.userName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.userName}
                      {mRole ? ` (${mRole})` : ''}
                    </p>
                  )}
                  {m.minuteText && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {m.minuteText}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(m.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Current step */}
          <div className="flex items-start gap-3 relative">
            <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-primary border-primary text-primary-foreground animate-pulse flex-shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium text-primary">
                  With {correspondence.currentOfficeName || 'Unknown office'}
                </p>
                <Badge variant="default" className="text-[10px] h-5 flex-shrink-0">Current</Badge>
              </div>
              <p className="text-sm text-foreground">
                {correspondence.currentApproverName || 'Unknown'}
              </p>
              {correspondence.receivedDate && (
                <p className="text-xs text-muted-foreground">
                  Since {formatDate(correspondence.receivedDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
