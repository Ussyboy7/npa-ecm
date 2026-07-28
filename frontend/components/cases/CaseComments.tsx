"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  getCaseComments,
  createCaseComment,
  resolveCaseComment,
  unresolveCaseComment,
  updateCaseComment,
  deleteCaseComment,
  type CaseComment,
} from "@/lib/api/cases";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Reply,
  AtSign,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAbortController } from "@/hooks/use-abort-controller";

interface CaseCommentsProps {
  caseId: string;
}

export function CaseComments({ caseId }: CaseCommentsProps) {
  const { currentUser } = useCurrentUser();
  const { users } = useOrganization();
  const { getSignal } = useAbortController();
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [_mentionQuery, _setMentionQuery] = useState("");
  const [_showMentions, _setShowMentions] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      return;
    }

    const signal = getSignal();
    
    const loadComments = async () => {
      setLoading(true);
      try {
        const data = await getCaseComments(caseId, signal);
        
        if (signal.aborted) return;
        
        setComments(data);
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        logError("Failed to load comments", err);
        toast.error("Failed to load comments");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    void loadComments();
  }, [caseId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to add comments");
      return;
    }

    setSubmitting(true);
    try {
      // Extract mentions from comment text (@username)
      const mentionMatches = newComment.match(/@(\w+)/g) || [];
      const mentionIds: string[] = [];
      
      for (const match of mentionMatches) {
        const username = match.substring(1);
        const user = users.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (user) mentionIds.push(user.id);
      }

      const comment = await createCaseComment(caseId, newComment, null, mentionIds);
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      toast.success("Comment added");
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      logError("Failed to add comment", err);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !currentUser) return;
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to add replies");
      return;
    }

    setSubmitting(true);
    try {
      const mentionMatches = replyContent.match(/@(\w+)/g) || [];
      const mentionIds: string[] = [];
      
      for (const match of mentionMatches) {
        const username = match.substring(1);
        const user = users.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (user) mentionIds.push(user.id);
      }

      const reply = await createCaseComment(caseId, replyContent, parentId, mentionIds);
      setComments((prev) => {
        const parentIndex = prev.findIndex((c) => c.id === parentId);
        if (parentIndex >= 0) {
          const updated = [...prev];
          updated[parentIndex] = {
            ...updated[parentIndex],
            replies_count: (updated[parentIndex].replies_count || 0) + 1,
          };
          return [reply, ...updated];
        }
        return [reply, ...prev];
      });
      setReplyContent("");
      setReplyingTo(null);
      toast.success("Reply added");
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      logError("Failed to add reply", err);
      toast.error("Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to resolve comments");
      return;
    }
    
    try {
      const updated = await resolveCaseComment(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );
      toast.success("Comment resolved");
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      logError("Failed to resolve comment", err);
      toast.error("Failed to resolve comment");
    }
  };

  const handleUnresolve = async (commentId: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to unresolve comments");
      return;
    }
    
    try {
      const updated = await unresolveCaseComment(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );
      toast.success("Comment unresolved");
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      logError("Failed to unresolve comment", err);
      toast.error("Failed to unresolve comment");
    }
  };
  
  const handleStartEdit = (comment: CaseComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };
  
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };
  
  const handleSaveEdit = async (commentId: string) => {
    
    try {
      const signal = getSignal();
      
      const updated = await updateCaseComment(commentId, editContent, signal);
      
      if (signal.aborted) return;
      
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );
      setEditingCommentId(null);
      setEditContent("");
      toast.success("Comment updated");
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      logError("Failed to update comment", err);
      toast.error("Failed to update comment");
    }
  };
  
  const handleDelete = async (commentId: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to delete comments");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }
    
    try {
      const signal = getSignal();
      
      await deleteCaseComment(commentId, signal);
      
      if (signal.aborted) return;
      
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setDeletingCommentId(null);
      toast.success("Comment deleted");
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      logError("Failed to delete comment", err);
      toast.error("Failed to delete comment");
    }
  };
  
  const canEditOrDelete = (comment: CaseComment) => {
    return currentUser && comment.author?.id === currentUser.id;
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getReplies = (commentId: string) => {
    return comments.filter((c) => c.parent === commentId);
  };

  const topLevelComments = comments.filter((c) => !c.parent);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading comments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Comment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Type your comment... Use @username to mention someone"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            aria-label="New comment"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              aria-label="Post comment"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No comments yet. Be the first to comment!
            </CardContent>
          </Card>
        ) : (
          topLevelComments.map((comment) => {
            const replies = getReplies(comment.id);
            return (
              <Card key={comment.id} className={comment.is_resolved ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getInitials(comment.author?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {comment.author?.name || "Unknown"}
                            </span>
                            {comment.is_resolved && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comment.created_at)}
                            {comment.updated_at !== comment.created_at && (
                              <span className="ml-1">(edited)</span>
                            )}
                          </span>
                        </div>
                        {!comment.is_resolved && currentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(comment.id)}
                            aria-label="Resolve comment"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {comment.is_resolved && currentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnresolve(comment.id)}
                            aria-label="Unresolve comment"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {canEditOrDelete(comment) && editingCommentId !== comment.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(comment)}
                              aria-label="Edit comment"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingCommentId(comment.id);
                                handleDelete(comment.id);
                              }}
                              aria-label="Delete comment"
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingCommentId === comment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            aria-label="Edit comment"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(comment.id)}
                              aria-label="Save changes"
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              aria-label="Cancel editing"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
                      )}
                      {comment.mentions && comment.mentions.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <AtSign className="h-3 w-3 text-muted-foreground" />
                          {comment.mentions.map((mention) => (
                            <Badge key={mention.id} variant="secondary" className="text-xs">
                              {mention.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {replyingTo !== comment.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(comment.id)}
                            aria-label="Reply to comment"
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        )}
                        {replies.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {replies.length} {replies.length === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </div>
                      {replyingTo === comment.id && (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={2}
                            aria-label="Reply content"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReply(comment.id)}
                              aria-label="Post reply"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Posting...
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3 mr-1" />
                                  Reply
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      {replies.length > 0 && (
                        <div className="space-y-2 pt-2 border-t ml-4">
                          {replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {getInitials(reply.author?.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-xs">
                                    {reply.author?.name || "Unknown"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateTime(reply.created_at)}
                                  </span>
                                </div>
                                <div className="text-xs whitespace-pre-wrap mt-1">
                                  {reply.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

