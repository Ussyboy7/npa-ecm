"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { AlertTriangle, Bell, CheckCircle2, GitBranch, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchParallelBranches,
  forceCompleteParallelBranch,
  remindParallelBranch,
} from "@/lib/correspondence-parallel";
import type { ParallelBranch } from "@/lib/npa-structure";
import { formatRoutingDateTime } from '@/lib/datetime';

const STATUS_LABELS: Record<ParallelBranch["status"], string> = {
  pending: "Pending",
  overdue: "Overdue",
  completed: "Completed",
  force_completed: "Force completed",
};

const OUTCOME_LABELS: Record<"respond" | "treat" | "onward", string> = {
  respond: "Respond",
  treat: "Treat document",
  onward: "Minute onward",
};

const statusBadgeVariant = (status: ParallelBranch["status"]) => {
  if (status === "completed" || status === "force_completed") return "default";
  if (status === "overdue") return "destructive";
  return "secondary";
};

interface ParallelRoutingStatusPanelProps {
  correspondenceId: string;
  onRefresh?: () => Promise<unknown> | void;
  /** Reports the branch count so the parent can render an empty state. */
  onBranchCountChange?: (count: number) => void;
  /** Hide reminder/force-complete controls for archived records. */
  readOnly?: boolean;
}

export function ParallelRoutingStatusPanel({
  correspondenceId,
  onRefresh,
  onBranchCountChange,
  readOnly = false,
}: ParallelRoutingStatusPanelProps) {
  const [branches, setBranches] = useState<ParallelBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyBranchId, setBusyBranchId] = useState<string | null>(null);
  const [forceTarget, setForceTarget] = useState<ParallelBranch | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const branchData = await fetchParallelBranches(correspondenceId);
      setBranches(branchData);
      setLoadError(false);
      onBranchCountChange?.(branchData.length);
    } catch {
      // Keep any branches already on screen; do not report 0, which would read as
      // "this record has no assignments" to the parent.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [correspondenceId, onBranchCountChange]);

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

  if (loading && branches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-4 px-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading assignment status...
      </div>
    );
  }

  if (loadError && branches.length === 0) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
          Couldn&apos;t load assignment status
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This record is routed in parallel, so assignments may still be open. Retry to see who still needs to act.
        </p>
        {/* Clicking Retry switches the panel to the loading state above, so this
            button never has to render its own busy state. */}
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-8 gap-1.5 px-2 text-xs"
          onClick={() => void load()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (branches.length === 0) return null;

  return (
    <>
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border/60 px-4 py-3 pb-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Assigned separately
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Each recipient has their own instruction and expected outcome.</p>
      </div>
      <div className="space-y-3 p-4">
        {loadError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              Couldn&apos;t refresh assignment status. Showing the last loaded values.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Retrying..." : "Retry"}
            </Button>
          </div>
        )}
        <div className="space-y-2 rounded-md border border-border/70 p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {summary.complete} of {summary.total} assignments handled
            </span>
            {summary.overdue > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {summary.overdue} overdue
              </Badge>
            )}
          </div>
          <Progress value={summary.progress} className="h-2 bg-muted" />
        </div>

        <div className="space-y-2">
          {branches.map((branch) => {
            const isBusy = busyBranchId === branch.minuteId;
            const isClosed = branch.status === "completed" || branch.status === "force_completed";
            return (
              <div key={branch.minuteId} className="rounded-md border border-border/70 p-3">
                <div className="flex items-start gap-2">
                  {isClosed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  ) : branch.status === "overdue" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  ) : (
                    <GitBranch className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words text-sm font-medium">{branch.targetLabel}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={statusBadgeVariant(branch.status)} className="h-5 text-[10px]">
                        {STATUS_LABELS[branch.status]}
                      </Badge>
                      <span>{branch.targetKind === "office" ? "Office assignment" : "Person assignment"}</span>
                      <span>
                        {branch.completedOutcome
                          ? `Completed: ${OUTCOME_LABELS[branch.completedOutcome]}`
                          : isClosed
                            ? "Closed without a recorded action"
                            : `Expects: ${OUTCOME_LABELS[branch.expectedOutcome]}`}
                      </span>
                      {branch.deadline && (
                        <span className="whitespace-nowrap">Due {formatRoutingDateTime(branch.deadline)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {!isClosed && !readOnly && (
                  <div className="mt-2 flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 min-w-11 px-2 text-xs lg:h-8 lg:min-w-0"
                      aria-label={`Remind ${branch.targetLabel}`}
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
                      className="h-11 min-w-11 px-2 text-xs text-destructive hover:text-destructive lg:h-8 lg:min-w-0"
                      aria-label={`Force complete ${branch.targetLabel}`}
                      onClick={() => setForceTarget(branch)}
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
            );
          })}
        </div>
      </div>
    </div>

    <AlertDialog open={forceTarget !== null} onOpenChange={(next) => { if (!next) setForceTarget(null); }}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Force complete this assignment?</AlertDialogTitle>
          <AlertDialogDescription>
            {forceTarget
              ? `This marks ${forceTarget.targetLabel}'s assignment complete without a response. This cannot be undone.`
              : "This marks the assignment complete without a response. This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              const branch = forceTarget;
              if (branch) void handleForceComplete(branch);
            }}
          >
            Force complete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
