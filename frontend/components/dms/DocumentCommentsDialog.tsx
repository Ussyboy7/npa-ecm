"use client";

import { logError } from "@/lib/client-logger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addDocumentComment,
  deleteDocumentComment,
  getDocumentComments,
  resolveDocumentComment,
  type DocumentComment,
  type DocumentVersion,
} from "@/lib/api/dms";
import { type User } from "@/lib/npa-structure";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/components/ui/sonner";
import { CheckCircle2, Loader2, MessageSquare, Reply, Send, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  version?: DocumentVersion | null;
  currentUser: User | null;
  onCommentsUpdated?: (comments: DocumentComment[]) => void;
}

type Scope = "all" | "version";

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
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export const DocumentCommentsDialog = ({
  open,
  onOpenChange,
  documentId,
  version,
  currentUser,
  onCommentsUpdated,
}: DocumentCommentsDialogProps) => {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [commentToDelete, setCommentToDelete] = useState<DocumentComment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // Always load the whole document so the scope filter can't hide a thread.
  useEffect(() => {
    if (!open) return;
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const results = await getDocumentComments(documentId);
        if (!ignore) {
          setComments(
            [...results].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            ),
          );
        }
      } catch (error: unknown) {
        logError("Failed to load document comments", error);
        if (!ignore) setComments([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [open, documentId]);

  const visible = useMemo(
    () =>
      scope === "version" && version
        ? comments.filter((comment) => comment.versionId === version.id)
        : comments,
    [comments, scope, version],
  );

  const threads = useMemo(() => {
    const topLevel = visible.filter((comment) => !comment.parentId);
    return topLevel.map((parent) => ({
      parent,
      replies: visible.filter((comment) => comment.parentId === parent.id),
    }));
  }, [visible]);

  const openCount = visible.filter((comment) => !comment.resolved).length;
  const versionCount = version
    ? comments.filter((comment) => comment.versionId === version.id).length
    : 0;

  const publish = useCallback(
    (next: DocumentComment[]) => {
      setComments(next);
      onCommentsUpdated?.(next);
    },
    [onCommentsUpdated],
  );

  const submitComment = useCallback(
    async (parentId?: string) => {
      if (!currentUser) {
        toast.error("Select a user before adding comments.");
        return;
      }
      const text = (parentId ? replyText : draft).trim();
      if (!text) return;

      setIsSubmitting(true);
      try {
        // Comments are document-level unless the reader narrowed to one
        // version, so "All versions" really is the whole conversation.
        const created = await addDocumentComment({
          authorId: currentUser.id,
          content: text,
          documentId,
          versionId: scope === "version" ? version?.id ?? null : null,
          parentId: parentId ?? null,
        });
        publish([...comments, created]);
        if (parentId) {
          setReplyText("");
          setReplyingTo(null);
        } else {
          setDraft("");
        }
        toast.success(parentId ? "Reply added" : "Comment added");
      } catch (error: unknown) {
        logError("Failed to add comment", error);
        toast.error("Failed to add comment");
      } finally {
        setIsSubmitting(false);
      }
    },
    [comments, currentUser, documentId, draft, publish, replyText, scope, version?.id],
  );

  const toggleResolved = async (comment: DocumentComment, resolved: boolean) => {
    try {
      const updated = await resolveDocumentComment(comment.id, resolved);
      if (!updated) return;
      publish(comments.map((item) => (item.id === comment.id ? updated : item)));
      toast.success(resolved ? "Comment resolved" : "Comment re-opened");
    } catch (error: unknown) {
      logError("Failed to toggle comment resolution", error);
      toast.error("Unable to update comment status");
    }
  };

  const confirmDelete = async () => {
    if (!commentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocumentComment(commentToDelete.id);
      publish(
        comments.filter(
          (item) => item.id !== commentToDelete.id && item.parentId !== commentToDelete.id,
        ),
      );
      toast.success("Comment removed");
      setCommentToDelete(null);
    } catch (error: unknown) {
      logError("Failed to delete comment", error);
      toast.error("Unable to remove comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComposerKey = (event: React.KeyboardEvent<HTMLTextAreaElement>, parentId?: string) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submitComment(parentId);
    }
  };

  const renderComment = (comment: DocumentComment, isReply: boolean) => {
    const authorName = comment.authorName;
    return (
      <div
        className={cn(
          "space-y-1.5 rounded-xl px-3 py-2.5",
          isReply ? "bg-muted/30" : "bg-muted/50",
          comment.resolved && "opacity-75",
        )}
      >
        <div className="flex items-start gap-2 min-w-0">
          <Avatar className={cn("shrink-0", isReply ? "h-5 w-5" : "h-6 w-6")}>
            <AvatarFallback className="text-[9px]">{initialsForName(authorName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-xs font-medium truncate">{authorName ?? "Unknown"}</p>
              {comment.resolved ? (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] gap-0.5 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                </Badge>
              ) : null}
              <span
                className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap shrink-0"
                title={formatDateTime(comment.createdAt)}
              >
                {relativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-[13px] leading-snug whitespace-pre-line break-words mt-0.5">
              {comment.content}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 pl-8">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] gap-1"
            onClick={() => {
              setReplyingTo(replyingTo === comment.id ? null : comment.id);
              setReplyText("");
            }}
            aria-label={`Reply to ${authorName ?? "comment"}`}
          >
            <Reply className="h-3 w-3" />
            Reply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] gap-1"
            onClick={() => void toggleResolved(comment, !comment.resolved)}
            aria-label={comment.resolved ? "Re-open comment" : "Mark comment as resolved"}
          >
            {comment.resolved ? <Undo2 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {comment.resolved ? "Re-open" : "Resolve"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto text-muted-foreground hover:text-destructive"
            onClick={() => setCommentToDelete(comment)}
            aria-label="Remove comment"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {replyingTo === comment.id ? (
          <div className="pl-8 space-y-1.5">
            <Textarea
              ref={replyRef}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              onKeyDown={(event) => handleComposerKey(event, comment.id)}
              placeholder={`Reply to ${authorName?.split(" ")[0] ?? "this comment"}...`}
              rows={2}
              className="min-h-[52px] resize-none text-[13px]"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => void submitComment(comment.id)}
                disabled={isSubmitting || !replyText.trim()}
              >
                Reply
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg" height="fill" className="gap-3">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
              Comments
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span>
                {openCount} open
                {visible.length > openCount ? ` · ${visible.length} total` : ""}
              </span>
              {version ? (
                <span className="flex items-center gap-1">
                  {(
                    [
                      { value: "all" as const, label: "All versions" },
                      { value: "version" as const, label: `Version ${version.versionNumber}` },
                    ]
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setScope(option.value)}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                        scope === option.value
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {option.label}
                      {option.value === "version" ? ` · ${versionCount}` : ""}
                    </button>
                  ))}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading comments…
              </div>
            ) : threads.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                {scope === "version" && version
                  ? `No comments on version ${version.versionNumber} yet.`
                  : "No comments yet. Start the discussion below."}
              </p>
            ) : (
              <ul className="space-y-2">
                {threads.map(({ parent, replies }) => (
                  <li key={parent.id} className="space-y-1.5">
                    {renderComment(parent, false)}
                    {replies.length > 0 ? (
                      <div className="ml-4 pl-3 border-l-2 border-border/60 space-y-1.5">
                        {replies.map((reply) => (
                          <div key={reply.id}>{renderComment(reply, true)}</div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 space-y-1.5 border-t border-border/60 pt-3">
            <Textarea
              ref={commentRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => handleComposerKey(event)}
              placeholder="Write a comment..."
              rows={2}
              className="min-h-[52px] resize-none text-[13px]"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">
                Ctrl/⌘ + Enter to post
                {version && scope === "version" ? ` · on v${version.versionNumber}` : ""}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => void submitComment()}
                  disabled={isSubmitting || !draft.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(commentToDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCommentToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              The comment and any replies will be deleted for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
