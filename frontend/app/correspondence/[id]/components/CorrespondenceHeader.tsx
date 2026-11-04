"use client";

import { ArrowLeft, FolderTree } from 'lucide-react';
import Link from 'next/link';
import type { Correspondence } from '@/lib/npa-structure';
import { corrType } from '../correspondence-type';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CorrespondenceHeaderProps {
  correspondence: Correspondence;
  isAuditCase?: boolean;
  onCaseUnlinked?: () => void;
  onDistributionShared?: () => void;
}

export const CorrespondenceHeader = ({
  correspondence,
  isAuditCase = false,
}: CorrespondenceHeaderProps) => {
  const router = useRouter();

  return (
    <div className="border-b border-border/60 bg-background px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 mt-0.5"
            onClick={() => router.push('/correspondence/inbox')}
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            {isAuditCase && correspondence.caseId && (
              <Link href={`/cases/${correspondence.caseId}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mb-1">
                <FolderTree className="h-3.5 w-3.5" />
                View Audit Case
                <span className="text-muted-foreground">· {correspondence.caseId.slice(0,8)}</span>
              </Link>
            )}
            <h1 className={cn(corrType.pageTitle, 'truncate')}>{correspondence.referenceNumber}</h1>
            <p className={cn(corrType.subject, 'mt-1')}>{correspondence.subject}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
