"use client";

import { logError, logInfo } from '@/lib/client-logger';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CheckCircle2, MessageCircle, Undo2, XCircle, Reply } from 'lucide-react';

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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { users } = useOrganization();

  const userLookup = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  // Load comments when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadComments = async () => {
      try {
        const results = await getDocumentComments(documentId, version?.id ?? null);
        const ordered = [...results].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setComments(ordered);
      } catch (error: unknown) {
        logError('Failed to load document comments', error);
        setComments([]);
      }
    };

    void loadComments();
  }, [open, documentId, version?.id]);

  // Sync comments to parent component after state updates
  // Use a ref to track if this is the initial load to avoid calling on mount
  const isInitialLoad = useRef(true);
  
  useEffect(() => {
    if (!open) {
      isInitialLoad.current = true;
      return;
    }
    
    // Skip callback on initial load (comments are loaded separately)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    
    // Call callback after state updates (not during render)
    if (onCommentsUpdated) {
      onCommentsUpdated(comments);
    }
  }, [comments, onCommentsUpdated, open]);

  const resolvedCount = useMemo(() => comments.filter((item) => item.resolved).length, [comments]);

  // Organize comments into threads (top-level comments with their replies)
  const commentThreads = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parentId);
    return topLevel.map((parent) => ({
      parent,
      replies: comments.filter((c) => c.parentId === parent.id),
    }));
  }, [comments]);

  const handleAddComment = async (parentId?: string | null) => {
    if (!currentUser) {
      toast.error('Select a user before adding comments.');
      return;
    }
    
    // Ensure parentId is actually a string or null/undefined, not an event object
    const actualParentId = typeof parentId === 'string' ? parentId : (parentId === null ? null : undefined);
    
    // Get the value directly from the textarea ref as a fallback, or from state
    const textareaRef = actualParentId ? replyTextareaRef : commentTextareaRef;
    const stateValue = actualParentId ? replyText : comment;
    const directValue = textareaRef.current?.value || '';
    
    // Use direct value from textarea if state is empty (handles race conditions)
    const textToSubmit = stateValue || directValue;
    
    // Check if textToSubmit exists and has content after trimming
    if (!textToSubmit || typeof textToSubmit !== 'string') {
      toast.error('Comment cannot be empty.');
      return;
    }
    
    const trimmedText = textToSubmit.trim();
    if (!trimmedText || trimmedText.length === 0) {
      toast.error('Comment cannot be empty.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newComment = await addDocumentComment({
        authorId: currentUser.id,
        content: trimmedText,
        documentId,
        versionId: version?.id ?? null,
        parentId: actualParentId ?? null,
      });
      setComments((prev) => {
        return [...prev, newComment];
      });
      if (actualParentId) {
        setReplyText('');
        setReplyingTo(null);
      } else {
        setComment('');
      }
      toast.success(actualParentId ? 'Reply added' : 'Comment added');
    } catch (error: unknown) {
      logError('Error adding comment:', error);
      // Check if backend returned a validation error
      const backendError =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'response' in error &&
              typeof (error as { response?: unknown }).response === 'object' &&
              (error as { response?: { data?: unknown } }).response?.data &&
              typeof (error as { response: { data: { detail?: unknown } } }).response.data.detail === 'string'
            ? (error as { response: { data: { detail: string } } }).response.data.detail
            : undefined;
      
      if (backendError && (backendError.includes('empty') || backendError.includes('required'))) {
        toast.error(backendError);
      } else if (backendError) {
        toast.error(`Failed to add comment: ${backendError}`);
      } else {
        toast.error('Failed to add comment. Please try again.');
      }
      logError('Failed to add comment', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const handleResolveToggle = async (commentId: string, resolved: boolean) => {
    try {
      const updated = await resolveDocumentComment(commentId, resolved);
    if (!updated) return;
    setComments((prev) => {
      return prev.map((item) => (item.id as string === commentId ? updated : item));
    });
    toast.success(resolved ? 'Comment marked as resolved' : 'Comment re-opened');
      } catch (error: unknown) {
      logError('Failed to toggle comment resolution', error);
      toast.error('Unable to update comment status');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This will also delete all replies.')) {
      return;
    }
    try {
      await deleteDocumentComment(commentId);
      // Remove the comment and all its replies
      setComments((prev) => {
        return prev.filter((item) => item.id as string !== commentId && item.parentId !== commentId);
      });
      toast.success('Comment and replies removed');
      } catch (error: unknown) {
      logError('Failed to delete comment', error);
      toast.error('Unable to delete comment');
    }
  };

  const heading = version ? `Comments for Version ${version.versionNumber}` : 'Document Comments';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            Collaborate with your team using threaded comments. {resolvedCount}/{comments.length} resolved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              ref={commentTextareaRef}
              value={comment}
              onChange={(event) => {
                const value = event.target.value;
                setComment(value);
                logInfo('Comment onChange:', value);
              }}
              placeholder="Add a comment to discuss this document..."
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
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  handleAddComment();
                }} 
                disabled={isSubmitting || !comment.trim()}
              >
                Add Comment
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[400px] rounded-md border border-border">
            <div className="divide-y">
              {commentThreads.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No comments yet. Start the discussion above.
                </div>
              ) : (
                commentThreads.map(({ parent, replies }) => {
                  const parentAuthor = userLookup.get(parent.authorId);
                  return (
                    <div key={parent.id} className="p-4 space-y-3 bg-background/60">
                      {/* Parent Comment */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                              <MessageCircle className="h-3.5 w-3.5 text-primary" />
                              <span>{parentAuthor ? parentAuthor.name : 'Unknown User'}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(parent.createdAt)}
                              </span>
                              {parent.resolved && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Resolved
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{parent.content}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStartReply(parent.id)}
                              title="Reply to comment"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleResolveToggle(parent.id, !parent.resolved)}
                              title={parent.resolved ? 'Re-open comment' : 'Mark as resolved'}
                            >
                              {parent.resolved ? (
                                <Undo2 className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(parent.id)}
                              title="Delete comment"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Reply Input */}
                        {replyingTo === parent.id && (
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-primary/20 pl-4">
                            <Textarea
                              ref={replyTextareaRef}
                              value={replyText}
                              onChange={(e) => {
                                const value = e.target.value;
                                setReplyText(value);
                                logInfo('Reply onChange:', value);
                              }}
                              placeholder="Write a reply..."
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelReply}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(parent.id)}
                                disabled={isSubmitting || !replyText.trim()}
                              >
                                Reply
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Replies */}
                        {replies.length > 0 && (
                          <div className="ml-6 space-y-2 border-l-2 border-muted pl-4">
                            {replies.map((reply) => {
                              const replyAuthor = userLookup.get(reply.authorId);
                              return (
                                <div key={reply.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-foreground">
                                        <Reply className="h-3 w-3 text-muted-foreground" />
                                        <span>{replyAuthor ? replyAuthor.name : 'Unknown User'}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {formatDateTime(reply.createdAt)}
                                        </span>
                                        {reply.resolved && (
                                          <Badge variant="secondary" className="h-4 text-[10px] gap-1">
                                            <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground whitespace-pre-line">{reply.content}</p>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleResolveToggle(reply.id, !reply.resolved)}
                                        title={reply.resolved ? 'Re-open reply' : 'Mark as resolved'}
                                      >
                                        {reply.resolved ? (
                                          <Undo2 className="h-3 w-3" />
                                        ) : (
                                          <CheckCircle2 className="h-3 w-3 text-success" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => handleDelete(reply.id)}
                                        title="Delete reply"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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