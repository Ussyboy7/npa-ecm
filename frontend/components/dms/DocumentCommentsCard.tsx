"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageSquare } from "lucide-react";
import type { DocumentComment } from "@/lib/api/dms";

/** How many comments the rail previews before deferring to the dialog. */
const PREVIEW_COUNT = 3;

interface DocumentCommentsCardProps {
  comments: DocumentComment[];
  onOpenCommentsDialog: () => void;
}

function initialsForName(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, includeSeconds: false });
  } catch {
    return "";
  }
}

export const DocumentCommentsCard = ({
  comments,
  onOpenCommentsDialog,
}: DocumentCommentsCardProps) => {
  const unresolved = comments.filter((comment) => !comment.resolved).length;

  const recent = useMemo(
    () =>
      [...comments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, PREVIEW_COUNT),
    [comments],
  );

  return (
    <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-2 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-[13px] font-semibold tracking-tight flex items-center gap-1.5 min-w-0 truncate">
          <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
          Comments
        </p>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {unresolved > 0 ? `${unresolved} open` : `${comments.length} total`}
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {recent.map((comment) => {
            const authorName = comment.authorName;
            return (
              <li key={comment.id}>
                <button
                  type="button"
                  onClick={onOpenCommentsDialog}
                  className="w-full text-left flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/60 transition-colors min-w-0"
                >
                  <Avatar className="h-5 w-5 shrink-0 mt-0.5">
                    <AvatarFallback className="text-[9px]">
                      {initialsForName(authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-[11px] font-medium truncate">
                        {authorName ?? "Unknown"}
                      </p>
                      {comment.resolved ? (
                        <CheckCircle2
                          className="h-2.5 w-2.5 shrink-0 text-emerald-500"
                          aria-label="Resolved"
                        />
                      ) : null}
                      <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {relativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 break-words">
                      {comment.parentId ? "↳ " : ""}
                      {comment.content}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={onOpenCommentsDialog}
      >
        {comments.length > 0
          ? `Open all ${comments.length} ${comments.length === 1 ? "comment" : "comments"}`
          : "Add comment"}
      </Button>
    </div>
  );
};
