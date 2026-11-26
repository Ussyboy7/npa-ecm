"use client";

import { useState, useEffect, useMemo, useRef, useId } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Correspondence, Minute, OfficeMembership, User } from '@/lib/npa-structure';
import { ActionsPanel } from './ActionsPanel';
import { MinuteThreadPanel } from './MinuteThreadPanel';
import { CorrespondenceInfoPanel } from './CorrespondenceInfoPanel';
import { ParallelRoutingStatusPanel } from '@/components/correspondence/ParallelRoutingStatusPanel';
import { RelatedResponsesPanel } from '@/components/correspondence/RelatedResponsesPanel';
import { getDocumentAccessLogs } from '@/lib/dms-logs';
import { cn } from '@/lib/utils';
import type { DocumentAccessLog, DocumentRecord } from '@/lib/api/dms';

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
  linkedDocuments: DocumentRecord[];
  onOpenLinkDocument: () => void;
  activeDelegation: Record<string, unknown> | null;
  delegationPermissions?: string[];
  onRecallDelegation?: () => Promise<void>;
  officeMemberships: OfficeMembership[];
  getActionIcon: (actionType: string) => React.ComponentType<{ className?: string }> | null;
  onOpenLinkCaseModal: () => void;
  canReassign?: boolean;
  onReassign?: () => void;
  onOpenMinuteModal: () => void;
  onOpenTreatmentModal: () => void;
  onOpenCompletionModal: () => void;
  onOpenNoResponseCompletionModal: () => void;
  onOpenDelegateModal: () => void;
  onDownloadCompletionPackage: (filename: string) => Promise<void>;
  onSyncFromApi: () => Promise<unknown>;
  onMinuteClick: (minute: Minute) => void;
  onEditMinute: (minute: Minute) => void;
  onRecallMinute: (minute: Minute) => void;
  /** Archived record mode: no Action tab and no minute or branch mutations. */
  readOnly?: boolean;
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
  linkedDocuments,
  onOpenLinkDocument,
  activeDelegation,
  delegationPermissions,
  onRecallDelegation,
  officeMemberships,
  getActionIcon,
  onOpenLinkCaseModal,
  canReassign,
  onReassign,
  onOpenMinuteModal,
  onOpenTreatmentModal,
  onOpenCompletionModal,
  onOpenNoResponseCompletionModal,
  onOpenDelegateModal,
  onDownloadCompletionPackage,
  onSyncFromApi,
  onMinuteClick,
  onEditMinute,
  onRecallMinute,
  readOnly = false,
}: RoutingPanelProps) {
  const [activeTab, setActiveTab] = useState<'thread' | 'action' | 'info'>('thread');
  // The panel can be mounted twice (desktop + mobile layouts), so ids are
  // scoped per instance and focus moves via refs, not global id lookups.
  const tabIdPrefix = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabId = (id: string) => `${tabIdPrefix}-tab-${id}`;
  const panelId = (id: string) => `${tabIdPrefix}-panel-${id}`;
  const routingTabs = useMemo(
    () =>
      readOnly
        ? [
            { id: 'thread' as const, label: 'Thread' },
            { id: 'info' as const, label: 'Info' },
          ]
        : [
            { id: 'thread' as const, label: 'Thread' },
            { id: 'action' as const, label: 'Action' },
            { id: 'info' as const, label: 'Info' },
          ],
    [readOnly],
  );
  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = routingTabs.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = index === last ? 0 : index + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = index === 0 ? last : index - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = last;
    }
    if (next === null) return;
    event.preventDefault();
    setActiveTab(routingTabs[next].id);
    tabRefs.current[next]?.focus();
  };
  const primaryLinkedDocId = correspondence.linkedDocumentIds?.[0] ?? null;
  const hasParallelRouting =
    correspondence.workflowState === 'parallel' ||
    correspondence.workflowState === 'waiting_merge' ||
    correspondence.workflowState === 'merged' ||
    (correspondence.activeParallelBranches ?? 0) > 0 ||
    (correspondence.completedParallelBranches ?? 0) > 0;
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const refreshAccessLogs = async () => {
    if (!primaryLinkedDocId) return;
    setLogsLoading(true);
    try {
      const logs = await getDocumentAccessLogs(primaryLinkedDocId);
      setAccessLogs(logs);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  };
  useEffect(() => {
    if (activeTab !== 'info' || !primaryLinkedDocId) return;
    void refreshAccessLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, primaryLinkedDocId]);

  return (
    <aside className="flex flex-col flex-1 min-w-0 min-h-0 bg-transparent border-border/50 md:border-l">
      <div className="border-b border-border/40 p-2 bg-background/80 backdrop-blur-sm">
        <div
          role="tablist"
          aria-label="Correspondence views"
          className={cn(
            'grid gap-1 rounded-full bg-muted/50 p-1',
            readOnly ? 'grid-cols-2' : 'grid-cols-3',
          )}
        >
          {routingTabs.map((tab, index) => (
            <Button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={tabId(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={panelId(tab.id)}
              tabIndex={activeTab === tab.id ? 0 : -1}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              className="text-xs rounded-full h-7 px-1"
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === 'thread' && (
        <div
          id={panelId('thread')}
          role="tabpanel"
          aria-labelledby={tabId('thread')}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain animate-in fade-in duration-200 motion-reduce:animate-none"
        >
          <MinuteThreadPanel
            minutes={minutes}
            activeUserId={activeUser.id}
            getActionIcon={getActionIcon}
            embedded
            scrollable={false}
            onMinuteClick={onMinuteClick}
            onEditMinute={onEditMinute}
            onRecallMinute={onRecallMinute}
            readOnly={readOnly}
          />
          {readOnly && hasParallelRouting && (
            <div className="px-3 pb-4">
              <ParallelRoutingStatusPanel
                correspondenceId={correspondence.id}
                onRefresh={onSyncFromApi}
                readOnly
              />
            </div>
          )}
          {correspondence.relatedResponses && correspondence.relatedResponses.length > 0 && (
            <div className="px-3 pb-4">
              <RelatedResponsesPanel responses={correspondence.relatedResponses} />
            </div>
          )}
        </div>
      )}

      {!readOnly && activeTab === 'action' && (
        <div
          id={panelId('action')}
          role="tabpanel"
          aria-labelledby={tabId('action')}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain animate-in fade-in duration-200 motion-reduce:animate-none"
        >
          <div className="space-y-3 px-3 pt-3 pb-6">
            <ActionsPanel
              compact
              correspondence={correspondence}
              minutes={minutes}
              activeUser={activeUser}
              canReassign={canReassign}
              onReassign={onReassign}
              isCompleted={isCompleted}
              isCurrentUserTurn={isCurrentUserTurn}
              isForInformationOnly={isForInformationOnly}
              distributionPurpose={distributionPurpose}
              distributionEntryId={distributionEntryId}
              turnRestrictedDisabled={turnRestrictedDisabled}
              hasCompletionPackage={hasCompletionPackage}
              completionGeneratedAt={completionGeneratedAt}
              activeDelegation={activeDelegation}
              delegationPermissions={delegationPermissions}
              onRecallDelegation={onRecallDelegation}
              officeMemberships={officeMemberships}
              onOpenMinuteModal={onOpenMinuteModal}
              onOpenTreatmentModal={onOpenTreatmentModal}
              onOpenCompletionModal={onOpenCompletionModal}
              onOpenNoResponseCompletionModal={onOpenNoResponseCompletionModal}
              onOpenDelegateModal={onOpenDelegateModal}
              onDownloadCompletionPackage={onDownloadCompletionPackage}
              onSyncFromApi={onSyncFromApi}
            />
            {hasParallelRouting && (
              <ParallelRoutingStatusPanel
                correspondenceId={correspondence.id}
                onRefresh={onSyncFromApi}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'info' && (
        <ScrollArea
          id={panelId('info')}
          role="tabpanel"
          aria-labelledby={tabId('info')}
          className="flex-1 min-h-0 animate-in fade-in duration-200 motion-reduce:animate-none"
        >
          <div className="p-3 pb-8">
            <CorrespondenceInfoPanel
              correspondence={correspondence}
              minutes={minutes}
              linkedDocuments={linkedDocuments}
              primaryLinkedDocId={primaryLinkedDocId}
              accessLogs={accessLogs}
              logsLoading={logsLoading}
              onRefreshAccessLogs={refreshAccessLogs}
              onOpenLinkDocument={onOpenLinkDocument}
              onOpenLinkCase={readOnly ? undefined : onOpenLinkCaseModal}
              onViewThread={() => setActiveTab('thread')}
              isCompleted={isCompleted}
            />
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}
