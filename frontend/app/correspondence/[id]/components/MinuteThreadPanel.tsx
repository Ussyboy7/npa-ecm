"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  ArrowDown,
  ArrowUp,
  Users,
  ChevronRight,
  X,
  RefreshCw,
  Plus,
  Image as ImageIcon,
  Shield,
  CheckCircle2,
  Send,
} from 'lucide-react';
import type { Minute } from '@/lib/npa-structure';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { SealBadge } from '@/components/seals/SealBadge';
import { logWarn } from '@/lib/client-logger';
import { cn } from '@/lib/utils';
import { corrType } from '../correspondence-type';

interface MinuteThreadPanelProps {
  minutes: Minute[];
  activeUserId: string;
  isCompleted: boolean;
  isCurrentUserTurn: boolean;
  lookupUser: (userId?: string) => { name: string; systemRole?: string } | undefined;
  getActionIcon: (actionType: string) => React.ComponentType<{ className?: string }> | null;
  onMinuteClick: (minute: Minute) => void;
  onEditMinute: (minute: Minute) => void;
  onRecallMinute: (minute: Minute) => void;
  onAddNote: (minute: Minute) => void;
  fullWidth?: boolean;
  /** Right-column layout: fills parent, no fixed widths */
  embedded?: boolean;
  scrollable?: boolean;
}

export const MinuteThreadPanel = ({
  minutes,
  activeUserId,
  isCompleted,
  isCurrentUserTurn,
  lookupUser,
  getActionIcon,
  onMinuteClick,
  onEditMinute,
  onRecallMinute,
  onAddNote,
  fullWidth,
  embedded,
  scrollable = true,
}: MinuteThreadPanelProps) => {
  const isMinuteRecalled = (minute: Minute): boolean => {
    return Boolean(minute.isRecalled || minute.recalledAt);
  };

  const panelClass = embedded
    ? scrollable
      ? 'flex flex-col flex-1 min-h-0 w-full border-0 bg-transparent'
      : 'flex flex-col w-full border-0 bg-transparent'
    : fullWidth
      ? 'w-full border-b md:border-b-0 flex flex-col border-border/60 bg-background'
      : 'w-full md:w-[60%] md:max-w-[750px] md:min-w-[450px] border-b md:border-b-0 md:border-r rounded-2xl flex flex-col border-border/60 bg-background';
  const contentClass = scrollable
    ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain'
    : 'min-h-0';

  return (
    <main className={panelClass}>
      <div className="px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h3 className={cn(corrType.panelTitle, 'flex items-center gap-2 min-w-0')}>
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">Minute Thread</span>
          </h3>
          <span className={cn(corrType.caption, 'tabular-nums flex-shrink-0')}>
            {minutes.length}
          </span>
        </div>
      </div>
      <div className={contentClass}>
        <div className={cn('overflow-x-hidden min-w-0', embedded ? 'p-3 pb-8' : 'p-4 pb-8')}>
          {minutes.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                <MessageSquare className="h-5 w-5 opacity-70" />
              </div>
              <p className={corrType.itemTitle}>No minutes yet</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                Review the document, then use Minute to route this correspondence.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {minutes.map((minuteItem, idx) => {
                const user = lookupUser(minuteItem.userId);
                const ActionIcon = getActionIcon(minuteItem.actionType);
                const isDownward = minuteItem.direction === 'downward';
                const isOwn = String(minuteItem.userId) === String(activeUserId);
                const displayName = user?.name ?? minuteItem.userName ?? 'Unknown user';
                let systemRole = user?.systemRole ?? minuteItem.userSystemRole ?? 'Team Member';
                if (systemRole && systemRole.includes('-') && systemRole.length > 30) {
                  systemRole = user?.systemRole ?? 'Team Member';
                }
                const shouldShowRole = systemRole && systemRole !== displayName;
                const routeLabel = minuteItem.fromOfficeName && minuteItem.toOfficeName
                  ? `${minuteItem.fromOfficeName} → ${minuteItem.toOfficeName}`
                  : minuteItem.fromOfficeName && minuteItem.toUserName
                    ? `${minuteItem.fromOfficeName} → ${minuteItem.toUserName}`
                    : minuteItem.toOfficeName || (shouldShowRole ? systemRole : '');
                const hasActions =
                  (minuteItem.canBeEdited && isOwn) ||
                  (minuteItem.canBeRecalled && !isMinuteRecalled(minuteItem) && isOwn) ||
                  (!minuteItem.isAdditional &&
                    !isCompleted &&
                    !isMinuteRecalled(minuteItem) &&
                    (isOwn || isCurrentUserTurn));

                return (
                  <li key={minuteItem.id} className="relative flex gap-3">
                    {/* Timeline rail */}
                    <div className="relative flex w-8 flex-shrink-0 flex-col items-center">
                      {idx < minutes.length - 1 && (
                        <div
                          className={cn(
                            'absolute top-8 bottom-0 w-px',
                            minuteItem.isRecalled
                              ? 'bg-destructive/25'
                              : 'bg-border/80',
                          )}
                        />
                      )}
                      <Avatar
                        className={cn(
                          'relative z-10 h-8 w-8 border border-background shadow-sm',
                          minuteItem.isRecalled && 'opacity-70',
                        )}
                      >
                        <AvatarFallback
                          className={cn(
                            'text-[10px] font-semibold',
                            minuteItem.isRecalled
                              ? 'bg-destructive/10 text-destructive'
                              : isOwn
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {minuteItem.isRecalled ? (
                            <X className="h-3.5 w-3.5" />
                          ) : (
                            displayName
                              .split(' ')
                              .map((namePart) => namePart[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Content — div (not button) so Edit/Recall/Add Note buttons are not nested */}
                    <div
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'group mb-4 flex-1 min-w-0 rounded-2xl border px-3.5 py-3 text-left transition-colors cursor-pointer',
                        'border-transparent bg-transparent hover:bg-muted/40',
                        isOwn && 'bg-muted/25 hover:bg-muted/45',
                        minuteItem.isRecalled && 'opacity-70',
                      )}
                      onClick={() => onMinuteClick(minuteItem)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onMinuteClick(minuteItem);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={cn(
                                corrType.itemTitle,
                                'truncate',
                                minuteItem.isRecalled && 'line-through text-muted-foreground',
                              )}
                            >
                              {displayName}
                            </p>
                            {minuteItem.isRecalled && (
                              <span className="text-[10px] font-medium uppercase tracking-wide text-destructive">
                                Recalled
                              </span>
                            )}
                            {minuteItem.isParallelBranch && (
                              <Users className="h-3 w-3 text-muted-foreground" aria-label="Parallel" />
                            )}
                          </div>
                          {(routeLabel ||
                            (minuteItem.actedByAssistant &&
                              minuteItem.performedByName &&
                              isOwn)) && (
                            <p className={cn('mt-0.5 break-words', corrType.caption)}>
                              {routeLabel && <span>{routeLabel}</span>}
                              {minuteItem.actedByAssistant &&
                                minuteItem.performedByName &&
                                isOwn && (
                                  <span className="text-primary/70">
                                    {' '}
                                    (via {minuteItem.performedByName})
                                  </span>
                                )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
                          {ActionIcon && <ActionIcon className="h-3.5 w-3.5 opacity-70" />}
                          {isDownward ? (
                            <ArrowDown className="h-3 w-3 opacity-50" />
                          ) : (
                            <ArrowUp className="h-3 w-3 opacity-50" />
                          )}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                        </div>
                      </div>

                      <p
                        className={cn(
                          'mt-2 line-clamp-3 break-words',
                          corrType.body,
                          minuteItem.isRecalled
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground/90',
                        )}
                      >
                        {minuteItem.minuteText}
                      </p>

                      <div className={cn('mt-2 flex items-center gap-x-2 gap-y-1 flex-wrap', corrType.caption)}>
                        <span>{formatDateTime(minuteItem.timestamp)}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>Step {minuteItem.stepNumber}</span>
                        {minuteItem.dispatchedAt && !minuteItem.isRecalled && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              Dispatched
                            </span>
                          </>
                        )}
                        {minuteItem.acknowledgedAt && !minuteItem.isRecalled && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="inline-flex items-center gap-1 text-success">
                              <CheckCircle2 className="h-3 w-3" />
                              Acknowledged
                            </span>
                          </>
                        )}
                        {(minuteItem.actedBySecretary || minuteItem.actedByAssistant) && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span>
                              {minuteItem.actedBySecretary ? 'Secretary' : minuteItem.assistantType}
                            </span>
                          </>
                        )}
                      </div>

                      {minuteItem.signature && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          <span>Signed {formatDateTime(minuteItem.signature.appliedAt)}</span>
                        </div>
                      )}
                      {minuteItem.sealData ? (
                        <div className="mt-2 flex items-center gap-2">
                          <SealBadge sealData={minuteItem.sealData} showDetails />
                        </div>
                      ) : minuteItem.sealApplied ? (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Shield className="h-3 w-3" />
                          <span>Seal applied</span>
                        </div>
                      ) : null}

                      {minuteItem.isAdditional && minuteItem.minuteType && (
                        <div className="mt-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 border-border/60 text-muted-foreground"
                          >
                            {minuteItem.minuteType === 'instruction'
                              ? 'Additional Instruction'
                              : minuteItem.minuteType === 'clarification'
                                ? 'Clarification'
                                : 'Addendum'}
                          </Badge>
                        </div>
                      )}

                      {hasActions && (
                        <div
                          className="mt-3 flex items-center gap-1.5 flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {minuteItem.canBeEdited && isOwn && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMinute(minuteItem);
                                }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              {minuteItem.editWindowExpiresAt && (
                                <span className="text-[11px] text-muted-foreground">
                                  {(() => {
                                    const expiresAt = new Date(minuteItem.editWindowExpiresAt);
                                    const diffMs = expiresAt.getTime() - Date.now();
                                    if (diffMs <= 0) return 'Edit window expired';
                                    return `${Math.floor(diffMs / 60000)} min left`;
                                  })()}
                                </span>
                              )}
                            </>
                          )}
                          {minuteItem.canBeRecalled &&
                            !isMinuteRecalled(minuteItem) &&
                            isOwn && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-destructive/80 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMinuteRecalled(minuteItem)) {
                                    logWarn(
                                      '[MinuteThreadPanel] Attempted to recall already recalled minute:',
                                      minuteItem.id,
                                    );
                                    return;
                                  }
                                  onRecallMinute(minuteItem);
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Recall
                              </Button>
                            )}
                          {!minuteItem.isAdditional &&
                            !isCompleted &&
                            !isMinuteRecalled(minuteItem) &&
                            (isOwn || isCurrentUserTurn) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddNote(minuteItem);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Note
                              </Button>
                            )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
};
