"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  MessageSquare,
  ArrowRight,
  User,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { Minute } from '@/lib/npa-structure';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { cn } from '@/lib/utils';

interface TreeViewNode {
  minute: Minute;
  children: TreeViewNode[];
  consultationRequests: TreeViewNode[];
  consultationResponses: TreeViewNode[];
  level: number;
  isBranch: boolean;
  branchGroupId?: string;
}

interface CorrespondenceTreeViewProps {
  minutes: Minute[];
  onMinuteClick?: (minute: Minute) => void;
  currentUserId?: string;
  lookupUser?: (userId: string) => { name: string; email?: string } | null;
}

export function CorrespondenceTreeView({
  minutes,
  onMinuteClick,
  currentUserId,
  lookupUser,
}: CorrespondenceTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showHistorical, setShowHistorical] = useState(true);

  // Build tree structure from minutes
  const tree = useMemo(() => {
    const nodes: Map<string, TreeViewNode> = new Map();
    const rootNodes: TreeViewNode[] = [];
    const branchGroups: Map<string, TreeViewNode[]> = new Map();

    // First pass: create all nodes
    minutes.forEach((minute) => {
      const node: TreeViewNode = {
        minute,
        children: [],
        consultationRequests: [],
        consultationResponses: [],
        level: 0,
        isBranch: minute.isParallelBranch ?? false,
        branchGroupId: minute.parallelGroupId,
      };
      nodes.set(minute.id, node);

      // Group parallel branches
      if (minute.isParallelBranch && minute.parallelGroupId) {
        if (!branchGroups.has(minute.parallelGroupId)) {
          branchGroups.set(minute.parallelGroupId, []);
        }
        branchGroups.get(minute.parallelGroupId)!.push(node);
      }
    });

    // Second pass: build relationships
    minutes.forEach((minute) => {
      const node = nodes.get(minute.id)!;

      // Handle sequential routing (parent-child)
      if (minute.parentMinuteId) {
        const parent = nodes.get(minute.parentMinuteId);
        if (parent) {
          parent.children.push(node);
          node.level = parent.level + 1;
        }
      }

      // Handle consultation requests
      if (minute.isConsultation && minute.consultationFromBranchId) {
        const fromBranch = nodes.get(minute.consultationFromBranchId);
        if (fromBranch) {
          fromBranch.consultationRequests.push(node);
          node.level = fromBranch.level;
        }
      }

      // Handle consultation responses
      if (minute.consultationToBranchId) {
        const toBranch = nodes.get(minute.consultationToBranchId);
        if (toBranch) {
          toBranch.consultationResponses.push(node);
          node.level = toBranch.level;
        }
      }

      // If no parent and not a parallel branch, it's a root node
      if (!minute.parentMinuteId && !minute.isParallelBranch) {
        rootNodes.push(node);
      }
    });

    // Add parallel branch groups as children of their parent
    branchGroups.forEach((branchNodes, groupId) => {
      // Find the minute that created this parallel group (first branch's user)
      const firstBranch = branchNodes[0];
      if (firstBranch) {
        // Find the minute that routed to create this parallel group
        const creatingMinute = minutes.find(
          (m) =>
            m.userId === firstBranch.minute.userId &&
            !m.isParallelBranch &&
            m.timestamp <= firstBranch.minute.timestamp
        );
        if (creatingMinute) {
          const parentNode = nodes.get(creatingMinute.id);
          if (parentNode) {
            branchNodes.forEach((branch) => {
              if (!parentNode.children.includes(branch)) {
                parentNode.children.push(branch);
                branch.level = parentNode.level + 1;
              }
            });
          }
        } else {
          // No parent found, add as root
          rootNodes.push(...branchNodes);
        }
      }
    });

    return rootNodes;
  }, [minutes]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: TreeViewNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.minute.id);
        if (node.children.length > 0 || node.consultationRequests.length > 0) {
          collectIds(node.children);
          collectIds(node.consultationRequests);
        }
      });
    };
    collectIds(tree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const getMinuteStatus = (minute: Minute) => {
    if (minute.isRecalled) return { icon: XCircle, label: 'Recalled', color: 'destructive' };
    if (minute.actionType === 'approve') return { icon: CheckCircle2, label: 'Approved', color: 'default' };
    if (minute.actionType === 'reject') return { icon: XCircle, label: 'Rejected', color: 'destructive' };
    if (minute.actionType === 'treat') return { icon: CheckCircle2, label: 'Treated', color: 'default' };
    return { icon: Clock, label: 'Pending', color: 'secondary' };
  };

  const renderNode = (node: TreeViewNode): JSX.Element => {
    const { minute } = node;
    const isExpanded = expandedNodes.has(minute.id);
    const hasChildren = node.children.length > 0 || node.consultationRequests.length > 0;
    const user = lookupUser?.(minute.userId);
    const status = getMinuteStatus(minute);
    const StatusIcon = status.icon;
    const isCurrentUser = currentUserId === minute.userId;

    return (
      <div key={minute.id} className="relative">
        <div
          className={cn(
            "flex items-start gap-1.5 p-1.5 rounded border transition-colors cursor-pointer hover:bg-accent/50",
            isCurrentUser && "bg-primary/5 border-primary/20",
            node.isBranch && "bg-blue-50/50 border-blue-200",
            minute.isConsultation && "bg-purple-50/50 border-purple-200"
          )}
          onClick={() => onMinuteClick?.(minute)}
        >
          {/* Expand/Collapse Icon */}
          <div className="mt-1">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(minute.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="h-6 w-6" />
            )}
          </div>

          {/* Branch/Consultation Indicator */}
          <div className="mt-0.5">
            {node.isBranch ? (
              <GitBranch className="h-3 w-3 text-blue-600" />
            ) : minute.isConsultation ? (
              <MessageSquare className="h-3 w-3 text-purple-600" />
            ) : (
              <div className="h-3 w-3" />
            )}
          </div>

          {/* Avatar */}
          <Avatar className="h-6 w-6">
            <AvatarFallback>
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
              <span className="font-medium text-xs">{user?.name || 'Unknown User'}</span>
              {minute.gradeLevel && (
                <Badge variant="outline" className="text-xs">
                  {minute.gradeLevel}
                </Badge>
              )}
              <StatusIcon className={cn("h-4 w-4", status.color === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />
              <Badge variant={status.color === 'destructive' ? 'destructive' : 'secondary'} className="text-xs">
                {status.label}
              </Badge>
              {node.isBranch && (
                <Badge variant="outline" className="text-xs bg-blue-100">
                  Branch
                </Badge>
              )}
              {minute.isConsultation && (
                <Badge variant="outline" className="text-xs bg-purple-100">
                  Consultation
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{minute.minuteText}</p>
            <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(minute.timestamp)}
              </span>
              {minute.toOfficeName && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {minute.toOfficeName}
                </span>
              )}
              {minute.toUserName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {minute.toUserName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Children */}
        {isExpanded && (
          <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-3">
            {/* Consultation Requests */}
            {node.consultationRequests.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <MessageSquare className="h-3 w-3" />
                  Consultation Requests
                </div>
                {node.consultationRequests.map((consultation) => renderNode(consultation))}
              </div>
            )}

            {/* Sequential Children */}
            {node.children.length > 0 && (
              <div className="space-y-2">
                {node.children.map((child) => renderNode(child))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {tree.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No routing history</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setShowHistorical(!showHistorical)}
              >
                {showHistorical ? 'Hide' : 'Show'} Historical
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {tree.map((node) => renderNode(node))}
          </div>
        </>
      )}
    </div>
  );
}

