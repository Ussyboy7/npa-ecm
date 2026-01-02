"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import type { Minute } from '@/lib/npa-structure';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { SealBadge } from '@/components/seals/SealBadge';

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
}: MinuteThreadPanelProps) => {
  // Helper to check if minute is recalled (defensive check)
  const isMinuteRecalled = (minute: Minute): boolean => {
    return Boolean(minute.isRecalled || minute.recalledAt);
  };

  return (
    <main className="w-full md:w-[60%] md:max-w-[750px] md:min-w-[450px] max-w-full flex flex-col border-b md:border-b-0 md:border-r border-border bg-background rounded-lg">
      <div className="p-4 border-b border-border bg-background flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-secondary" />
          Minute Thread
        </h3>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
        <div className="p-4 space-y-4 overflow-x-hidden min-w-0">
          {minutes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No minutes yet</p>
              <p className="text-sm">Use the Actions panel to minute and route this correspondence</p>
            </div>
          ) : (
            minutes.map((minuteItem, idx) => {
              // Debug: Log recall status for each minute
              if (minuteItem.stepNumber === 3) {
                logInfo('[MinuteThreadPanel] Step 3 minute data:', {
                  id: minuteItem.id,
                  stepNumber: minuteItem.stepNumber,
                  isRecalled: minuteItem.isRecalled,
                  recalledAt: minuteItem.recalledAt,
                  canBeRecalled: minuteItem.canBeRecalled,
                  userId: minuteItem.userId,
                  activeUserId,
                  shouldShowRecall: minuteItem.canBeRecalled && !minuteItem.isRecalled && !minuteItem.recalledAt && minuteItem.userId === activeUserId,
                });
              }
              
              const user = lookupUser(minuteItem.userId);
              const ActionIcon = getActionIcon(minuteItem.actionType);
              const isDownward = minuteItem.direction === 'downward';
              const displayName = user?.name ?? minuteItem.userName ?? 'Unknown user';
              let systemRole = user?.systemRole ?? minuteItem.userSystemRole ?? 'Team Member';
              if (systemRole && systemRole.includes('-') && systemRole.length > 30) {
                systemRole = user?.systemRole ?? 'Team Member';
              }

              return (
                <div key={minuteItem.id} className="relative">
                  {idx < minutes.length - 1 && (
                    <div
                      className={`absolute left-8 top-16 w-0.5 h-8 ${
                        minuteItem.isRecalled 
                          ? 'bg-destructive/30' 
                          : isDownward 
                          ? 'bg-info' 
                          : 'bg-success'
                      }`}
                    />
                  )}
                  <Card
                    className={`overflow-hidden ${minuteItem.userId === activeUserId ? 'border-primary shadow-glow' : ''} ${minuteItem.isRecalled ? 'opacity-75 border-destructive/30' : ''} cursor-pointer hover:shadow-md transition-all`}
                    onClick={() => onMinuteClick(minuteItem)}
                  >
                    <CardContent className="p-3 md:p-4 overflow-hidden min-w-0">
                      <div className="flex gap-2 min-w-0">
                        <Avatar className={`h-9 w-9 flex-shrink-0 ${minuteItem.isRecalled ? 'ring-2 ring-destructive/50' : isDownward ? 'ring-2 ring-info' : 'ring-2 ring-success'}`}>
                          <AvatarFallback className={`text-xs font-semibold ${minuteItem.isRecalled ? 'bg-destructive/10 text-destructive' : ''}`}>
                            {minuteItem.isRecalled ? (
                              <X className="h-5 w-5" />
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
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2 min-w-0">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <p className={`font-semibold text-sm truncate min-w-0 ${minuteItem.isRecalled ? 'line-through text-muted-foreground' : ''}`}>
                                  {displayName}
                                </p>
                                {minuteItem.isRecalled && (
                                  <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 flex-shrink-0">
                                    Recalled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground break-words min-w-0 mt-1">
                                {minuteItem.fromOfficeName && minuteItem.toOfficeName ? (
                                  <span className="break-words">{minuteItem.fromOfficeName} → {minuteItem.toOfficeName}</span>
                                ) : minuteItem.fromOfficeName && minuteItem.toUserName ? (
                                  <span className="break-words">{minuteItem.fromOfficeName} → {minuteItem.toUserName}</span>
                                ) : minuteItem.toOfficeName ? (
                                  <span className="break-words">{minuteItem.toOfficeName}</span>
                                ) : (
                                  <span>{systemRole}</span>
                                )}
                                {minuteItem.actedByAssistant && minuteItem.performedByName && 
                                 String(minuteItem.userId) === String(activeUserId) && (
                                  <span className="break-words text-primary/70">
                                    {' '}(via {minuteItem.performedByName})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                              <Badge variant="outline" className={`text-[10px] h-5 gap-0.5 ${minuteItem.isRecalled ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}`}>
                                {ActionIcon && <ActionIcon className="h-3 w-3" />}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-5 gap-0.5 ${
                                  minuteItem.isRecalled 
                                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                                    : isDownward 
                                    ? 'bg-info/10 text-info border-info/20' 
                                    : 'bg-success/10 text-success border-success/20'
                                }`}
                              >
                                {isDownward ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                              </Badge>
                              {minuteItem.isParallelBranch && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                                  <Users className="h-3 w-3" />
                                </Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </div>
                          <p className={`text-sm mb-2 line-clamp-3 break-words ${minuteItem.isRecalled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {minuteItem.minuteText}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="truncate">{formatDateTime(minuteItem.timestamp)}</span>
                            <span className="text-muted-foreground/50 flex-shrink-0">•</span>
                            <span className="flex-shrink-0">Step {minuteItem.stepNumber}</span>
                            {minuteItem.isRecalled && minuteItem.recalledAt && (
                              <>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="text-destructive">Recalled</span>
                              </>
                            )}
                            {(minuteItem.actedBySecretary || minuteItem.actedByAssistant) && (
                              <>
                                <span className="text-muted-foreground/50">•</span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {minuteItem.actedBySecretary ? 'Secretary' : minuteItem.assistantType}
                                </Badge>
                              </>
                            )}
                          </div>
                          {minuteItem.signature && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <ImageIcon className="h-3 w-3 text-primary" />
                              <span>Signed {formatDateTime(minuteItem.signature.appliedAt)}</span>
                            </div>
                          )}
                          {minuteItem.sealData ? (
                            <div className="mt-2 flex items-center gap-2">
                              <SealBadge sealData={minuteItem.sealData} showDetails />
                              <span className="text-xs text-muted-foreground">
                                {minuteItem.sealData.serialNumber}
                              </span>
                            </div>
                          ) : minuteItem.sealApplied ? (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Shield className="h-3 w-3 text-emerald-600" />
                              <span>Seal applied (loading details...)</span>
                            </div>
                          ) : null}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {minuteItem.canBeEdited && minuteItem.userId === activeUserId && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditMinute(minuteItem);
                                  }}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                {minuteItem.editWindowExpiresAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {(() => {
                                      const expiresAt = new Date(minuteItem.editWindowExpiresAt);
                                      const now = new Date();
                                      const diffMs = expiresAt.getTime() - now.getTime();
                                      if (diffMs <= 0) return 'Edit window expired';
                                      const diffMins = Math.floor(diffMs / 60000);
                                      return `${diffMins} min left`;
                                    })()}
                                  </span>
                                )}
                              </>
                            )}
                            {/* Only show recall button if minute can be recalled, is NOT already recalled, and belongs to current user */}
                            {/* Use helper function for defensive check */}
                            {minuteItem.canBeRecalled && 
                             !isMinuteRecalled(minuteItem) &&
                             minuteItem.userId === activeUserId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Double-check before opening modal
                                  if (isMinuteRecalled(minuteItem)) {
                                    logWarn('[MinuteThreadPanel] Attempted to recall already recalled minute:', minuteItem.id);
                                    return;
                                  }
                                  onRecallMinute(minuteItem);
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Recall
                              </Button>
                            )}
                            {isMinuteRecalled(minuteItem) && (
                              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                                Recalled
                              </Badge>
                            )}
                            {!minuteItem.isAdditional && !isCompleted && !isMinuteRecalled(minuteItem) && 
                             (String(minuteItem.userId) === String(activeUserId) || isCurrentUserTurn) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
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
                          {minuteItem.isAdditional && minuteItem.minuteType && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/20">
                                {minuteItem.minuteType === 'instruction' ? 'Additional Instruction' :
                                 minuteItem.minuteType === 'clarification' ? 'Clarification' : 'Addendum'}
                              </Badge>
                              {minuteItem.relatesToMinuteId && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  Related to minute #{minutes.findIndex(m => m.id === minuteItem.relatesToMinuteId) + 1}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
        </ScrollArea>
      </div>
    </main>
  );
};

