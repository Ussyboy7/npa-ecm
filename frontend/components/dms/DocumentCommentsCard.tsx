"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import type { DocumentComment } from "@/lib/api/dms";

interface DocumentCommentsCardProps {
  comments: DocumentComment[];
  userLookup: Map<string, unknown>;
  getUserInitials: (userId: string) => string;
  onOpenCommentsDialog: () => void;
}

export const DocumentCommentsCard = ({
  comments,
  userLookup: _userLookup,
  getUserInitials: _getUserInitials,
  onOpenCommentsDialog,
}: DocumentCommentsCardProps) => {
  const unresolved = comments.filter((c) => !c.resolved).length;

  return (
    <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-2 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-[13px] font-semibold tracking-tight flex items-center gap-1.5 min-w-0 truncate">
          <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
          Comments
        </p>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {unresolved > 0 ? `${unresolved} open` : `${comments.length}`}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={onOpenCommentsDialog}
      >
        {comments.length > 0 ? "Open comments" : "Add comment"}
      </Button>
    </div>
  );
};
