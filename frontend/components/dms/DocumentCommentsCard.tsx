"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, CheckCircle2, Circle } from 'lucide-react';
import { formatDateTime } from '@/lib/correspondence-helpers';
import type { DocumentComment } from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';

interface DocumentCommentsCardProps {
  comments: DocumentComment[];
  userLookup: Map<string, User>;
  getUserInitials: (userId: string) => string;
  onOpenCommentsDialog: () => void;
}

export const DocumentCommentsCard = ({
  comments,
  userLookup,
  getUserInitials,
  onOpenCommentsDialog,
}: DocumentCommentsCardProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Comments
            </CardTitle>
            <CardDescription className="mt-1">
              Discuss, annotate, and collaborate on this document
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={onOpenCommentsDialog}
            aria-label={comments.length > 0 ? `View ${comments.length} comments` : 'Add comment'}
          >
            <MessageSquare className="h-3 w-3" />
            {comments.length > 0 ? `${comments.length}` : 'Add'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {comments.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {comments.filter((c) => !c.resolved).length} unresolved
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {comments.length} total
              </Badge>
            </div>
          )}
          {comments.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {comments.map((comment) => {
                const author = userLookup.get(comment.authorId);
                return (
                  <div
                    key={comment.id}
                    className="flex items-start gap-2.5 p-2.5 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getUserInitials(comment.authorId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{author?.name ?? 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(comment.createdAt)}
                        </span>
                        {comment.resolved ? (
                          <Badge variant="secondary" className="h-4 text-[10px] gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 text-[10px] gap-1">
                            <Circle className="h-2.5 w-2.5" />
                            Open
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground mb-1">No comments yet</p>
              <p className="text-xs text-muted-foreground">Start the conversation</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


