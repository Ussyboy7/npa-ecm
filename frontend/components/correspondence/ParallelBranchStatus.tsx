import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Minute, ParallelRoutingGroup } from '@/lib/npa-structure';

interface ParallelBranchStatusProps {
  parallelGroup: ParallelRoutingGroup;
  branches: Minute[];
}

export const ParallelBranchStatus = ({
  parallelGroup,
  branches,
}: ParallelBranchStatusProps) => {
  const progress = parallelGroup.totalBranches > 0
    ? (parallelGroup.completedBranches / parallelGroup.totalBranches) * 100
    : 0;

  const getMergeStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'all':
        return 'Wait for All';
      case 'independent':
        return 'Independent';
      case 'any':
        return 'Any One';
      case 'majority':
        return 'Majority';
      default:
        return strategy;
    }
  };

  const getMergeStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'all':
        return 'Workflow will continue when all branches complete';
      case 'independent':
        return 'Branches work independently, don\'t block each other';
      case 'any':
        return 'Workflow will continue when first branch completes';
      case 'majority':
        return 'Workflow will continue when majority of branches complete';
      default:
        return '';
    }
  };

  // Group branches by recipient (user + office) so that multiple additional
  // minutes to the same branch are shown as a single row with the latest status.
  const branchMap = new Map<string, { latest: Minute; all: Minute[] }>();
  for (const branch of branches) {
    const key = `${branch.toUserId || ''}::${branch.toOfficeId || ''}`;
    const existing = branchMap.get(key);
    if (!existing) {
      branchMap.set(key, { latest: branch, all: [branch] });
    } else {
      // Keep track of all minutes for potential future use, but ensure `latest` is the most recent
      const latest =
        new Date(branch.timestamp).getTime() > new Date(existing.latest.timestamp).getTime()
          ? branch
          : existing.latest;
      branchMap.set(key, { latest, all: [...existing.all, branch] });
    }
  }

  const aggregatedBranches = Array.from(branchMap.values()).map((entry) => entry.latest);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Parallel Routing Status
          </CardTitle>
          <Badge variant={parallelGroup.isComplete ? 'default' : 'outline'} className="text-xs">
            {parallelGroup.isComplete ? 'Complete' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {parallelGroup.completedBranches} / {parallelGroup.totalBranches} branches
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Merge Strategy</span>
            <Badge variant="outline" className="text-xs">
              {getMergeStrategyLabel(parallelGroup.mergeStrategy)}
            </Badge>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{getMergeStrategyDescription(parallelGroup.mergeStrategy)}</span>
          </div>
        </div>

        {aggregatedBranches.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-foreground mb-2">Branches</p>
            <div className="space-y-1.5">
              {aggregatedBranches.map((branch, index) => {
                // Determine if this branch is completed.
                // We rely primarily on the group completion/progress and whether this branch has any non-additional follow-up minutes.
                const ordered = branches
                  .filter((b) => (b.toUserId || '') === (branch.toUserId || '') && (b.toOfficeId || '') === (branch.toOfficeId || ''))
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                const latest = ordered[ordered.length - 1];
                const hasFollowUp = ordered.some((b) => !b.isAdditional && b.id !== branch.id);
                const isRecalled = !!latest.isRecalled;
                const isCompleted =
                  parallelGroup.isComplete ||
                  parallelGroup.completedBranches >= index + 1 ||
                  (!!latest && !isRecalled && hasFollowUp);

                return (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between p-2 rounded border border-border bg-background"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isCompleted ? (
                        <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {branch.toUserName || branch.toOfficeName || branch.userName || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {branch.purpose && (
                            <span className="text-[10px] text-muted-foreground">
                              {branch.purpose === 'information' ? 'For Information' :
                               branch.purpose === 'action' ? 'For Action' :
                               branch.purpose === 'comment' ? 'For Comment' : 'For Approval'}
                            </span>
                          )}
                          {branch.toOfficeName && branch.toUserName && (
                            <span className="text-[10px] text-muted-foreground">
                              • {branch.toOfficeName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={isCompleted ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {isCompleted ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {parallelGroup.isComplete && (
          <div className="p-2 rounded bg-success/10 border border-success/20 flex items-center gap-2 text-xs text-success">
            <CheckCircle className="h-4 w-4" />
            <span>All branches completed</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
