"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { FileText, Mail, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/correspondence-helpers';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
} from '@/components/shared/registry-queue-styles';
import { useRouter } from 'next/navigation';
import type { DocumentRecord } from '@/lib/dms-storage';

interface InboxDocumentCardProps {
  doc: DocumentRecord;
}

export const InboxDocumentCard = ({ doc }: InboxDocumentCardProps) => {
  const router = useRouter();
  const sharedDate = doc.permissions[0]?.createdAt || doc.updatedAt;

  return (
    <ListRowCard
      density="compact"
      href={`/dms/${doc.id}`}
      leading={
        <div className={cn(correspondenceQueueLeadingBoxClass, 'bg-primary/10')}>
          <FileText className={cn(correspondenceQueueLeadingIconClass, 'text-primary')} />
        </div>
      }
      actions={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Open document"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/dms/${doc.id}`);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open document</TooltipContent>
        </Tooltip>
      }
    >
      <h4 className={correspondenceQueueSubjectClass}>{doc.title}</h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, 'gap-0.5')}>
            <FileText className="h-2.5 w-2.5" />
            Document
          </Badge>
          <Badge variant="secondary" className={correspondenceQueueBadgeClass}>
            {doc.documentType}
          </Badge>
          <Badge
            variant={doc.status === 'published' ? 'default' : 'outline'}
            className={correspondenceQueueBadgeClass}
          >
            {doc.status}
          </Badge>
        </div>
        <span className={correspondenceQueueDateClass}>{formatDateShort(sharedDate)}</span>
      </div>
      {doc.description ? (
        <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
          {doc.description}
        </p>
      ) : null}
      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
        <span className={correspondenceQueueMetaItemClass}>
          <FileText className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Type: {doc.documentType}</span>
        </span>
        {doc.referenceNumber ? (
          <span className={correspondenceQueueMetaItemClass}>
            <Mail className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Ref: {doc.referenceNumber}</span>
          </span>
        ) : null}
      </div>
    </ListRowCard>
  );
};
