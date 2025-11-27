import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import type { Minute, ParallelRoutingGroup } from '@/lib/npa-structure';

interface ParallelBranchStatusProps {
  parallelGroup: ParallelRoutingGroup;
  branches: Minute[];
}

export const ParallelBranchStatus = ({
  parallelGroup,
  branches,
}: ParallelBranchStatusProps) => {
  const [expanded, setExpanded] = useState(false);
  
  const progress = parallelGroup.totalBranches > 0
    ? (parallelGroup.completedBranches / parallelGroup.totalBranches) * 100
    : 0;

  // Group branches by recipient
  const branchMap = new Map<string, { latest: Minute; all: Minute[] }>();
  for (const branch of branches) {
    const key = `${branch.toUserId || ''}::${branch.toOfficeId || ''}`;
    const existing = branchMap.get(key);
    if (!existing) {
      branchMap.set(key, { latest: branch, all: [branch] });
    } else {
      const latest =
        new Date(branch.timestamp).getTime() > new Date(existing.latest.timestamp).getTime()
          ? branch
          : existing.latest;
      branchMap.set(key, { latest, all: [...existing.all, branch] });
    }
  }

  const aggregatedBranches = Array.from(branchMap.values()).map((entry) => entry.latest);

  // If complete, show minimal success state
  if (parallelGroup.isComplete) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-success/10 border border-success/20">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-success">
            All {parallelGroup.totalBranches} recipients responded
          </span>
        </div>
        <Badge variant="default" className="bg-success text-success-foreground text-xs">
          Complete
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      {/* Compact Header - Always Visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Awaiting {parallelGroup.totalBranches - parallelGroup.completedBranches} of {parallelGroup.totalBranches}
            </span>
          </div>
          
          {/* Mini progress dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: parallelGroup.totalBranches }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < parallelGroup.completedBranches 
                    ? 'bg-success' 
                    : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {Math.round(progress)}%
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable Details */}
      {expanded && aggregatedBranches.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-1.5">
          {aggregatedBranches.map((branch, index) => {
            const ordered = branches
              .filter((b) => (b.toUserId || '') === (branch.toUserId || '') && (b.toOfficeId || '') === (branch.toOfficeId || ''))
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const latest = ordered[ordered.length - 1];
            const hasFollowUp = ordered.some((b) => !b.isAdditional && b.id !== branch.id);
            const isRecalled = !!latest.isRecalled;
            const isCompleted =
              parallelGroup.completedBranches >= index + 1 ||
              (!!latest && !isRecalled && hasFollowUp);

            return (
              <div
                key={branch.id}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-background"
              >
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
                  )}
                  <span className="text-xs font-medium">
                    {branch.toUserName || branch.toOfficeName || 'Unknown'}
                  </span>
                  {branch.toOfficeName && branch.toUserName && (
                    <span className="text-xs text-muted-foreground">
                      ({branch.toOfficeName})
                    </span>
                  )}
                </div>
                <span className={`text-xs ${isCompleted ? 'text-success' : 'text-muted-foreground'}`}>
                  {isCompleted ? 'Done' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
