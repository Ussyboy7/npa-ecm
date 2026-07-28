"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { AlertTriangle, Bell, CheckCircle2, GitBranch, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  fetchParallelBranches,
  forceCompleteParallelBranch,
  remindParallelBranch,
} from "@/lib/correspondence-parallel";
import type { ParallelBranch } from "@/lib/npa-structure";
import { formatDateTime } from '@/lib/datetime';

const STATUS_LABELS: Record<ParallelBranch["status"], string> = {
  pending: "Pending",
  overdue: "Overdue",
  completed: "Completed",
  force_completed: "Force completed",
};

const statusBadgeVariant = (status: ParallelBranch["status"]) => {
  if (status === "completed" || status === "force_completed") return "default";
  if (status === "overdue") return "destructive";
  return "secondary";
};

interface ParallelRoutingStatusPanelProps {
  correspondenceId: string;
  onRefresh?: () => Promise<unknown> | void;
}

export function ParallelRoutingStatusPanel({
  correspondenceId,
  onRefresh,
}: ParallelRoutingStatusPanelProps) {
  const [branches, setBranches] = useState<ParallelBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyBranchId, setBusyBranchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const branchData = await fetchParallelBranches(correspondenceId);
      setBranches(branchData);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [correspondenceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const total = branches.length;
    const complete = branches.filter(
      (b) => b.status === "completed" || b.status === "force_completed",
    ).length;
    const overdue = branches.filter((b) => b.status === "overdue").length;
    return {
      total,
      complete,
      overdue,
      progress: total > 0 ? Math.round((complete / total) * 100) : 0,
    };
  }, [branches]);

  const refreshAfterAction = async () => {
    await load();
    await onRefresh?.();
  };

  const handleRemind = async (branch: ParallelBranch) => {
    setBusyBranchId(branch.minuteId);
    try {
      await remindParallelBranch(correspondenceId, { minute_id: branch.minuteId });
      toast.success(`Reminder sent to ${branch.targetLabel}`);
      await refreshAfterAction();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send branch reminder");
    } finally {
      setBusyBranchId(null);
    }
  };

  const handleForceComplete = async (branch: ParallelBranch) => {
    setBusyBranchId(branch.minuteId);
    try {
      await forceCompleteParallelBranch(correspondenceId, { minute_id: branch.minuteId });
      toast.success(`${branch.targetLabel} marked complete`);
      await refreshAfterAction();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to force-complete branch");
    } finally {
      setBusyBranchId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading parallel routing status...
        </CardContent>
      </Card>
    );
  }

  if (branches.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Parallel Routing
        </CardTitle>
        <CardDescription>Per-branch response status and non-response actions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 rounded-md border border-border/70 p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {summary.complete} of {summary.total} branches complete
            </span>
            {summary.overdue > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {summary.overdue} overdue
              </Badge>
            )}
          </div>
          <Progress value={summary.progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {branches.map((branch) => {
            const isBusy = busyBranchId === branch.minuteId;
            const isClosed = branch.status === "completed" || branch.status === "force_completed";
            return (
              <div key={branch.minuteId} className="rounded-md border border-border/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {isClosed ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
                      ) : branch.status === "overdue" ? (
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
                      ) : (
                        <GitBranch className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <p className="truncate text-sm font-medium">{branch.targetLabel}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={statusBadgeVariant(branch.status)} className="h-5 text-[10px]">
                        {STATUS_LABELS[branch.status]}
                      </Badge>
                      <span>{branch.targetKind === "office" ? "Office branch" : "User branch"}</span>
                      {branch.deadline && <span>Due {formatDateTime(branch.deadline)}</span>}
                    </div>
                  </div>

                  {!isClosed && (
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleRemind(branch)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden lg:inline ml-1">Remind</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleForceComplete(branch)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden lg:inline ml-1">Force</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
