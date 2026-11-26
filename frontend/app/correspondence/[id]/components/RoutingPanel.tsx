"use client";

import { useState, useEffect, useMemo, useRef, useId } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Route } from 'lucide-react';
import type { Correspondence, Minute, OfficeMembership, User } from '@/lib/npa-structure';
import { ActionsPanel } from './ActionsPanel';
import { MinuteThreadPanel } from './MinuteThreadPanel';
import { CorrespondenceInfoPanel } from './CorrespondenceInfoPanel';
import { ParallelRoutingStatusPanel } from '@/components/correspondence/ParallelRoutingStatusPanel';
import { RelatedResponsesPanel } from '@/components/correspondence/RelatedResponsesPanel';
import { getDocumentAccessLogs } from '@/lib/dms-logs';
import { cn } from '@/lib/utils';
import type { DocumentAccessLog, DocumentRecord } from '@/lib/api/dms';

function routeActionLabel(actionType: Minute['actionType']): string {
  switch (actionType) {
    case 'approve':
      return 'Approved';
    case 'reject':
      return 'Rejected';
    case 'treat':
      return 'Treated';
    case 'forward':
      return 'Forwarded';
    default:
      return 'Minuted';
  }
}

function formatRouteTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

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
  onAddNote: (minute: Minute) => void;
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
  onAddNote,
  readOnly = false,
}: RoutingPanelProps) {
  const [activeTab, setActiveTab] = useState<'thread' | 'routing' | 'action' | 'info'>('thread');
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
            { id: 'routing' as const, label: 'Routing' },
            { id: 'info' as const, label: 'Info' },
          ]
        : [
            { id: 'thread' as const, label: 'Thread' },
            { id: 'routing' as const, label: 'Routing' },
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
  const recordedMinutes = useMemo(
    () => minutes
      .filter((minute) =>
        !minute.isRecalled && (
          Boolean(minute.toOfficeId || minute.toUserId || minute.toOfficeName || minute.toUserName) ||
          minute.actionType === 'approve' ||
          minute.actionType === 'reject' ||
          minute.actionType === 'treat'
        ),
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [minutes],
  );
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  // null until the branch fetch resolves, so the empty state never flashes.
  const [parallelBranchCount, setParallelBranchCount] = useState<number | null>(null);
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
          aria-label="Routing views"
          className={cn(
            'grid gap-1 rounded-full bg-muted/50 p-1',
            readOnly ? 'grid-cols-3' : 'grid-cols-4',
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
            isCompleted={isCompleted}
            isCurrentUserTurn={isCurrentUserTurn}
            getActionIcon={getActionIcon}
            embedded
            scrollable={false}
            onMinuteClick={onMinuteClick}
            onEditMinute={onEditMinute}
            onRecallMinute={onRecallMinute}
            onAddNote={onAddNote}
            readOnly={readOnly}
          />
        </div>
      )}

      {activeTab === 'routing' && (
        <ScrollArea
          id={panelId('routing')}
          role="tabpanel"
          aria-labelledby={tabId('routing')}
          className="flex-1 min-h-0 animate-in fade-in duration-200 motion-reduce:animate-none"
        >
          <div className="p-4 space-y-3">
            {recordedMinutes.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 flex-shrink-0 text-primary" />
                    <h3 className="text-[13px] font-semibold">Recorded route</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {recordedMinutes.length} handoff{recordedMinutes.length === 1 ? '' : 's'}
                  </span>
                </div>
                <ol className="mt-3 space-y-1">
                  {recordedMinutes.map((minute, index) => {
                    const fromLabel = minute.fromOfficeName
                      ?? minute.userName
                      ?? 'Unknown office';
                    const toLabel = minute.toOfficeName
                      ?? minute.toUserName
                      ?? (minute.actionType === 'approve' || minute.actionType === 'reject' || minute.actionType === 'treat'
                        ? 'Completed'
                        : 'No onward recipient');
                    return (
                      <li key={minute.id}>
                        <button
                          type="button"
                          onClick={() => onMinuteClick(minute)}
                          className="group flex w-full gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="relative mt-1 flex w-3 flex-shrink-0 justify-center self-stretch" aria-hidden="true">
                            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                            {index < recordedMinutes.length - 1 && (
                              <span className="absolute top-3 -bottom-1 w-px bg-border" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="text-[12px] font-medium">{routeActionLabel(minute.actionType)}</span>
                              <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                                {formatRouteTimestamp(minute.timestamp)}
                              </span>
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                              <span className="truncate">{fromLabel}</span>
                              <span className="flex-shrink-0" aria-hidden="true">→</span>
                              <span className="truncate">{toLabel}</span>
                            </span>
                            {minute.minuteText ? (
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
                                {minute.minuteText}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {!isCompleted && (correspondence.currentOfficeName || correspondence.currentApproverName) ? (
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current holder</p>
                    <p className="mt-0.5 text-[12px] font-medium">
                      {[correspondence.currentOfficeName, correspondence.currentApproverName].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                ) : null}
              </section>
            )}
            <ParallelRoutingStatusPanel
              correspondenceId={correspondence.id}
              onRefresh={onSyncFromApi}
              onBranchCountChange={setParallelBranchCount}
              readOnly={readOnly}
            />
            {correspondence.relatedResponses && correspondence.relatedResponses.length > 0 && (
              <RelatedResponsesPanel responses={correspondence.relatedResponses} />
            )}
            {recordedMinutes.length === 0 &&
              parallelBranchCount === 0 &&
              (correspondence.relatedResponses?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
                  <Route className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
                  <p className="text-[13px] font-medium">
                    No routing recorded yet
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    No routing minutes, separate assignments, or related responses are recorded for this item. Circulation recipients appear in Info.
                  </p>
                </div>
              )}
          </div>
        </ScrollArea>
      )}

      {!readOnly && activeTab === 'action' && (
        <div
          id={panelId('action')}
          role="tabpanel"
          aria-labelledby={tabId('action')}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain animate-in fade-in duration-200 motion-reduce:animate-none"
        >
          <div className="px-3 pt-3 pb-6">
            <ActionsPanel
              compact
              correspondence={correspondence}
              minutes={minutes}
              activeUser={activeUser}
              onOpenLinkCaseModal={onOpenLinkCaseModal}
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
              onViewThread={() => setActiveTab('thread')}
              isCompleted={isCompleted}
            />
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}
