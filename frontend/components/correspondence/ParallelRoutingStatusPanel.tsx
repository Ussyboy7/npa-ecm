"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GitBranch, Loader2 } from "lucide-react";
import { fetchParallelRoutingGroups } from "@/lib/correspondence-parallel";
import type { ParallelRoutingGroup } from "@/lib/npa-structure";

const STRATEGY_LABELS: Record<ParallelRoutingGroup["mergeStrategy"], string> = {
  all: "Wait for all branches",
  independent: "Independent branches",
  any: "Any branch completes",
  majority: "Majority completes",
};

interface ParallelRoutingStatusPanelProps {
  correspondenceId: string;
}

export function ParallelRoutingStatusPanel({ correspondenceId }: ParallelRoutingStatusPanelProps) {
  const [groups, setGroups] = useState<ParallelRoutingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchParallelRoutingGroups(correspondenceId);
        if (!ignore) setGroups(data.filter((g) => !g.isComplete || g.totalBranches > 0));
      } catch {
        if (!ignore) setGroups([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [correspondenceId]);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading parallel routing status…
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Parallel Routing
        </CardTitle>
        <CardDescription>Branch completion status for multi-recipient routes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group) => {
          const progress =
            group.totalBranches > 0
              ? Math.round((group.completedBranches / group.totalBranches) * 100)
              : 0;
          return (
            <div key={group.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {STRATEGY_LABELS[group.mergeStrategy]}
                </span>
                <Badge variant={group.isComplete ? "default" : "secondary"}>
                  {group.isComplete ? "Complete" : "In progress"}
                </Badge>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {group.completedBranches} of {group.totalBranches} branches completed
                {group.createdByName ? ` · created by ${group.createdByName}` : ""}
              </p>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">
          Branches route independently until the merge strategy condition is met. Recall or minute
          within your branch without affecting other recipients until merge completes.
        </p>
      </CardContent>
    </Card>
  );
}
