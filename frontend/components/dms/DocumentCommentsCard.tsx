"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ExternalLink } from 'lucide-react';
import type { DocumentComment } from '@/lib/dms-storage';

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
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Comments
            </CardTitle>
            <CardDescription className="mt-1">Discuss, annotate, and collaborate on this document</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">Unresolved</p>
              <p className="text-sm font-semibold">{unresolved}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-sm font-semibold">{comments.length}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={onOpenCommentsDialog}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {comments.length > 0 ? 'View Comments' : 'Add Comment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
