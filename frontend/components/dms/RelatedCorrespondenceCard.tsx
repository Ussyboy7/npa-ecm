"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDateShort } from '@/lib/correspondence-helpers';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import type { User } from '@/lib/npa-structure';

interface RelatedCorrespondenceCardProps {
  relatedCorrespondence: Array<{
    correspondence: Correspondence;
    minutes: Minute[];
    linkNotes?: string;
  }>;
  userLookup: Map<string, User>;
}

export const RelatedCorrespondenceCard = ({
  relatedCorrespondence,
  userLookup,
}: RelatedCorrespondenceCardProps) => {
  const router = useRouter();

  const getPriorityVariant = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="flex flex-col flex-1 min-h-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link className="h-4 w-4 text-primary" />
              Related Correspondence
              <Badge variant="secondary" className="ml-2 text-xs">
                {relatedCorrespondence.length}
              </Badge>
            </CardTitle>
            <CardDescription>Workflows that reference this document, including minute history.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 min-h-0 flex flex-col">
        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
          {relatedCorrespondence.map(({ correspondence, minutes, linkNotes }) => {
            const createdBy = userLookup.get(correspondence.createdById ?? '');

            return (
              <div
                key={correspondence.id}
                className="border rounded-lg p-2.5 space-y-1.5 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/correspondence/${correspondence.id}`)}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <Badge
                    variant={getStatusVariant(correspondence.status)}
                    className="text-[10px] h-4 shrink-0 mt-0.5 capitalize"
                  >
                    {correspondence.status?.replace('-', ' ') || 'Unknown'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-primary">{correspondence.referenceNumber || 'N/A'}</span>
                      <Badge variant={getPriorityVariant(correspondence.priority)} className="text-[10px] h-4">
                        {correspondence.priority?.toUpperCase() || 'MEDIUM'}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{correspondence.subject}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {createdBy ? `by ${createdBy.name}` : ''}
                      {createdBy && correspondence.receivedDate ? ' · ' : ''}
                      {correspondence.receivedDate ? formatDateShort(correspondence.receivedDate) : ''}
                      {minutes.length > 0 ? ` · ${minutes.length} ${minutes.length === 1 ? 'minute' : 'minutes'}` : ''}
                    </p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                </div>
                {linkNotes && (
                  <p className="text-[10px] text-muted-foreground italic truncate">Link: {linkNotes}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
