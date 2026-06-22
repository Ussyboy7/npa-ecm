"use client";

import { useState, useEffect } from 'react';
import { logInfo } from '@/lib/client-logger';
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
  divisionLookup: Map<string, string>;
  departmentLookup: Map<string, string>;
}

export const RelatedCorrespondenceCard = ({
  relatedCorrespondence,
  userLookup,
  divisionLookup: _divisionLookup,
  departmentLookup: _departmentLookup,
}: RelatedCorrespondenceCardProps) => {
  const router = useRouter();
  // Expand all correspondence by default to show routing history immediately
  const [expandedCorrespondence, setExpandedCorrespondence] = useState<Set<string>>(() => 
    new Set(relatedCorrespondence.map(item => item.correspondence.id))
  );
  
  // Update expanded state when relatedCorrespondence changes - ensure all are expanded by default
  useEffect(() => {
    if (relatedCorrespondence.length > 0) {
      // Always expand all correspondence by default to show routing history immediately
      const allIds = new Set(relatedCorrespondence.map(item => item.correspondence.id));
      setExpandedCorrespondence(allIds);
    }
  }, [relatedCorrespondence]);

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

  // Debug logging
  useEffect(() => {
    logInfo('[RelatedCorrespondenceCard] Rendering with:', {
      relatedCorrespondenceCount: relatedCorrespondence.length,
      expandedCount: expandedCorrespondence.size,
      relatedCorrespondence: relatedCorrespondence.map(item => ({
        id: item.correspondence.id,
        referenceNumber: item.correspondence.referenceNumber,
        minutesCount: item.minutes.length,
        minutes: item.minutes.map(m => ({
          id: m.id,
          actionType: m.actionType,
          minuteText: m.minuteText?.substring(0, 50),
          userId: m.userId,
          timestamp: m.timestamp
        }))
      }))
    });
  }, [relatedCorrespondence, expandedCorrespondence]);

  return (
    <Card className="flex flex-col flex-1 min-h-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link className="h-4 w-4 text-primary" />
              Related Correspondence
              {relatedCorrespondence.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {relatedCorrespondence.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Workflows that reference this document, including minute history.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 min-h-0 flex flex-col">
        {relatedCorrespondence.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">No related correspondence</p>
            <p className="text-xs">This document hasn't been linked to any correspondence workflows.</p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};
