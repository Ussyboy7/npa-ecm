"use client";

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  GitBranch,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import type { Minute } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { cn } from '@/lib/utils';

interface RoutingFlowProps {
  minutes: Minute[];
  onMinuteClick?: (minute: Minute) => void;
  currentUserId?: string;
  lookupUser?: (userId: string) => { name: string; systemRole?: string } | null;
}

export function RoutingFlow({
  minutes,
  onMinuteClick,
  currentUserId,
  lookupUser,
}: RoutingFlowProps) {
  // Group minutes: main flow + parallel branches
  const { mainFlow, parallelGroups } = useMemo(() => {
    const main: Minute[] = [];
    const parallel: Map<string, Minute[]> = new Map();

    // Sort by timestamp
    const sorted = [...minutes].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sorted.forEach((minute) => {
      if (minute.isParallelBranch && minute.parallelGroupId) {
        if (!parallel.has(minute.parallelGroupId)) {
          parallel.set(minute.parallelGroupId, []);
        }
        parallel.get(minute.parallelGroupId)!.push(minute);
      } else {
        main.push(minute);
      }
    });

    return { mainFlow: main, parallelGroups: parallel };
  }, [minutes]);

  // Find which main minute triggered each parallel group
  const parallelInsertPoints = useMemo(() => {
    const points: Map<number, string[]> = new Map();
    
    parallelGroups.forEach((branches, groupId) => {
      if (branches.length > 0) {
        const firstBranch = branches[0];
        // Find the main minute just before this parallel group started
        let insertIdx = mainFlow.findIndex(
          (m) => new Date(m.timestamp).getTime() > new Date(firstBranch.timestamp).getTime()
        );
        if (insertIdx === -1) insertIdx = mainFlow.length;
        if (insertIdx > 0) insertIdx -= 1;
        
        if (!points.has(insertIdx)) {
          points.set(insertIdx, []);
        }
        points.get(insertIdx)!.push(groupId);
      }
    });
    
    return points;
  }, [mainFlow, parallelGroups]);

  const getStatusIcon = (minute: Minute) => {
    if (minute.isRecalled) return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    if (minute.actionType === 'approve') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
    if (minute.actionType === 'reject') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    if (minute.actionType === 'treat') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'minute': return 'Minuted';
      case 'forward': return 'Forwarded';
      case 'approve': return 'Approved';
      case 'reject': return 'Rejected';
      case 'treat': return 'Treated';
      default: return actionType;
    }
  };

  const renderMinuteCard = (minute: Minute, isLast: boolean, isBranch?: boolean) => {
    const user = lookupUser?.(minute.userId);
    const isCurrentUser = currentUserId === minute.userId;
    const isRecalled = minute.isRecalled ?? false;

    return (
      <div
        key={minute.id}
        onClick={() => onMinuteClick?.(minute)}
        className={cn(
          "relative flex gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
          isCurrentUser && "bg-primary/5 border-primary/30",
          isBranch && "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
          isRecalled && "opacity-60 bg-destructive/5 border-destructive/20",
          !isCurrentUser && !isBranch && !isRecalled && "bg-card hover:bg-accent/30"
        )}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {user?.name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-medium", isRecalled && "line-through")}>
              {user?.name ?? minute.userName ?? 'Unknown'}
            </span>
            
            {/* Direction Badge */}
            <Badge variant="outline" className="h-5 text-[10px] gap-0.5">
              {minute.direction === 'upward' ? (
                <ArrowUp className="h-2.5 w-2.5" />
              ) : (
                <ArrowDown className="h-2.5 w-2.5" />
              )}
              {minute.direction}
            </Badge>

            {/* Action Badge */}
            <Badge 
              variant={minute.actionType === 'approve' ? 'default' : 'secondary'} 
              className="h-5 text-[10px]"
            >
              {getActionLabel(minute.actionType)}
            </Badge>

            {/* Recalled Badge */}
            {isRecalled && (
              <Badge variant="destructive" className="h-5 text-[10px]">
                Recalled
              </Badge>
            )}

            {/* Branch Indicator */}
            {isBranch && (
              <Badge variant="outline" className="h-5 text-[10px] bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300">
                <GitBranch className="h-2.5 w-2.5 mr-0.5" />
                Branch
              </Badge>
            )}
          </div>

          {/* Role & Office */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>{user?.systemRole ?? minute.userSystemRole ?? 'Team Member'}</span>
            {minute.fromOfficeName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Building2 className="h-3 w-3" />
                  {minute.fromOfficeName}
                </span>
              </>
            )}
          </div>

          {/* Routed To */}
          {(minute.toUserName || minute.toOfficeName) && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <span>→</span>
              <span className="font-medium text-foreground">
                {minute.toUserName || minute.toOfficeName}
              </span>
              {minute.purpose && (
                <Badge variant="outline" className="h-4 text-[9px] ml-1">
                  {minute.purpose === 'action' ? 'For Action' :
                   minute.purpose === 'information' ? 'For Info' :
                   minute.purpose === 'comment' ? 'For Comment' :
                   minute.purpose === 'approval' ? 'For Approval' : minute.purpose}
                </Badge>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[10px] text-muted-foreground mt-1">
            {formatDateShort(minute.timestamp)}
            {minute.recalledAt && (
              <span className="text-destructive ml-2">
                • Recalled {formatDateShort(minute.recalledAt)}
              </span>
            )}
          </div>
        </div>

        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon(minute)}
        </div>
      </div>
    );
  };

  const renderParallelGroup = (groupId: string) => {
    const branches = parallelGroups.get(groupId);
    if (!branches || branches.length === 0) return null;

    // Count completed branches
    const completed = branches.filter(
      (b) => b.actionType === 'approve' || b.actionType === 'treat' || b.actionType === 'reject'
    ).length;

    return (
      <div key={groupId} className="relative ml-4 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
        {/* Parallel Header */}
        <div className="flex items-center gap-2 mb-2 -ml-[21px]">
          <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Parallel Routes
          </span>
          <Badge variant="outline" className="h-5 text-[10px] bg-blue-50 dark:bg-blue-950">
            {completed}/{branches.length} complete
          </Badge>
        </div>

        {/* Branch Cards */}
        <div className="space-y-2">
          {branches.map((branch, idx) => 
            renderMinuteCard(branch, idx === branches.length - 1, true)
          )}
        </div>
      </div>
    );
  };

  if (minutes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No routing history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mainFlow.map((minute, idx) => (
        <div key={minute.id}>
          {/* Main Flow Card */}
          <div className="relative">
            {/* Connector Line */}
            {idx < mainFlow.length - 1 && (
              <div className="absolute left-[19px] top-[44px] w-0.5 h-[calc(100%-32px)] bg-border" />
            )}
            {renderMinuteCard(minute, idx === mainFlow.length - 1)}
          </div>

          {/* Parallel Groups After This Minute */}
          {parallelInsertPoints.get(idx)?.map((groupId) => (
            <div key={groupId} className="mt-3">
              {renderParallelGroup(groupId)}
            </div>
          ))}
        </div>
      ))}

      {/* Parallel groups that don't have a clear parent */}
      {mainFlow.length === 0 && Array.from(parallelGroups.keys()).map((groupId) => (
        <div key={groupId} className="mt-3">
          {renderParallelGroup(groupId)}
        </div>
      ))}
    </div>
  );
}

