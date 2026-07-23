"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getCaseComments } from "@/lib/api/cases";
import { detailType } from "@/lib/detail-type";
import { cn } from "@/lib/utils";
import { CaseRailCard } from "./CaseRailCard";

interface CaseCommentsSummaryCardProps {
  caseId: string;
  refreshKey?: number;
  onOpenCommentsDialog: () => void;
  onCountChange?: (count: number) => void;
}

export function CaseCommentsSummaryCard({
  caseId,
  refreshKey = 0,
  onOpenCommentsDialog,
  onCountChange,
}: CaseCommentsSummaryCardProps) {
  const [count, setCount] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [latestPreview, setLatestPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getCaseComments(caseId);
        if (cancelled) return;
        setCount(data.length);
        setOpenCount(data.filter((c) => !c.is_resolved).length);
        const latest = data[0]?.content?.trim();
        setLatestPreview(latest ? latest.slice(0, 120) : null);
        onCountChange?.(data.length);
      } catch {
        if (!cancelled) {
          setCount(0);
          setOpenCount(0);
          setLatestPreview(null);
          onCountChange?.(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, refreshKey, onCountChange]);

  return (
    <CaseRailCard
      title="Comments"
      icon={<MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />}
      action={
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {openCount > 0 ? `${openCount} open` : `${count}`}
        </span>
      }
    >
      {latestPreview ? (
        <p className={cn(detailType.caption, "line-clamp-2 break-words [overflow-wrap:anywhere]")}>
          {latestPreview}
          {latestPreview.length >= 120 ? "…" : ""}
        </p>
      ) : (
        <p className={detailType.caption}>No comments yet.</p>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="w-full h-8 text-xs rounded-lg"
        onClick={onOpenCommentsDialog}
      >
        {count > 0 ? "Open comments" : "Add comment"}
      </Button>
    </CaseRailCard>
  );
}
