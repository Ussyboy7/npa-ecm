"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  addDocumentComment,
  deleteDocumentComment,
  getDocumentComments,
  resolveDocumentComment,
  type DocumentComment,
  type DocumentVersion,
} from '@/lib/dms-storage';
import { type User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { toast } from 'sonner';
import { CheckCircle2, MessageCircle, Undo2, XCircle } from 'lucide-react';

interface DocumentCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  version?: DocumentVersion | null;
  currentUser: User | null;
  onCommentsUpdated?: (comments: DocumentComment[]) => void;
}

export const DocumentCommentsDialog = ({
  open,
  onOpenChange,
  documentId,
  version,
  currentUser,
  onCommentsUpdated,
}: DocumentCommentsDialogProps) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { users } = useOrganization();

  const userLookup = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  useEffect(() => {
    if (!open) return;

    const loadComments = async () => {
      try {
        const results = await getDocumentComments(documentId, version?.id ?? null);
        const ordered = [...results].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
    setComments(ordered);
    onCommentsUpdated?.(ordered);
      } catch (error) {
        console.error('Failed to load document comments', error);
        setComments([]);
      }
    };

    void loadComments();
  }, [open, documentId, version?.id, onCommentsUpdated]);

  const resolvedCount = useMemo(() => comments.filter((item) => item.resolved).length, [comments]);

  const handleAddComment = async () => {
    if (!currentUser) {
      toast.error('Select a user before adding comments.');
      return;
    }
    if (!comment.trim()) {
      toast.error('Comment cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    try {
      const newComment = await addDocumentComment({
        authorId: currentUser.id,
        content: comment.trim(),
        documentId,
        versionId: version?.id ?? null,
      });
      setComments((prev) => {
        const next = [...prev, newComment];
        onCommentsUpdated?.(next);
        return next;
      });
      setComment('');
      toast.success('Comment added');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveToggle = async (commentId: string, resolved: boolean) => {
    try {
      const updated = await resolveDocumentComment(commentId, resolved);
    if (!updated) return;
    setComments((prev) => {
      const next = prev.map((item) => (item.id === commentId ? updated : item));
      onCommentsUpdated?.(next);
      return next;
    });
    toast.success(resolved ? 'Comment marked as resolved' : 'Comment re-opened');
    } catch (error) {
      console.error('Failed to toggle comment resolution', error);
      toast.error('Unable to update comment status');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDocumentComment(commentId);
    setComments((prev) => {
      const next = prev.filter((item) => item.id !== commentId && item.parentId !== commentId);
      onCommentsUpdated?.(next);
      return next;
    });
    toast.success('Comment removed');
    } catch (error) {
      console.error('Failed to delete comment', error);
      toast.error('Unable to delete comment');
    }
  };

  const heading = version ? `Comments for Version ${version.versionNumber}` : 'Document Comments';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            Collaborate with your team using threaded comments. {resolvedCount}/{comments.length} resolved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add a comment or select text from the document to annotate."
              rows={4}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setComment('')}
                disabled={!comment}
                className="gap-1"
              >
                <Undo2 className="h-4 w-4" />
                Clear
              </Button>
              <Button onClick={handleAddComment} disabled={isSubmitting}>
                Add Comment
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[320px] rounded-md border border-border">
            <div className="divide-y">
              {comments.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No comments yet. Start the discussion above.
                </div>
              ) : (
                comments.map((item) => {
                  const author = userLookup.get(item.authorId);
                  return (
                    <div key={item.id} className="p-4 space-y-2 bg-background/60">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                            <MessageCircle className="h-3.5 w-3.5 text-primary" />
                            <span>{author ? author.name : 'Unknown User'}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(item.createdAt)}
                            </span>
                            {item.resolved && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{item.content}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleResolveToggle(item.id, !item.resolved)}
                            title={item.resolved ? 'Re-open comment' : 'Mark as resolved'}
                          >
                            {item.resolved ? (
                              <Undo2 className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(item.id)}
                            title="Delete comment"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
