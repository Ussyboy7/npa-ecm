"use client";

import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  FolderTree,
  X,
  MessageSquare,
  Building2,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { unlinkCorrespondenceFromCase } from '@/lib/api/cases';
import { logError } from '@/lib/client-logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadAsPDF, downloadAsWord } from '@/lib/document-generator';
import { toast } from "@/components/ui/sonner";
import type { Correspondence, Minute } from '@/lib/npa-structure';
import { corrType } from '../correspondence-type';
import { cn } from '@/lib/utils';
import type { DocumentRecord } from '@/lib/api/dms';
import { getPrimaryLinkedDocument } from '@/lib/correspondence-preview-target';
import { ShareWithDepartmentButton } from '@/components/correspondence/ShareWithDepartmentButton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CorrespondenceHeaderProps {
  correspondence: Correspondence;
  minutes: Minute[];
  linkedDocuments: DocumentRecord[];
  onOpenPrintPreview: () => void;
  onOpenPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionDisabled?: boolean;
  onCaseUnlinked?: () => void;
  onOpenLinkCaseModal?: () => void;
  onDistributionShared?: () => void;
}

export const CorrespondenceHeader = ({
  correspondence,
  minutes,
  linkedDocuments,
  onOpenPrintPreview,
  onOpenPrimaryAction,
  primaryActionLabel = 'Minute',
  primaryActionDisabled = false,
  onCaseUnlinked,
  onOpenLinkCaseModal,
  onDistributionShared,
}: CorrespondenceHeaderProps) => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { officeMemberships } = useOrganization();

  const isOfficeHolder = officeMemberships.some(
    (membership) =>
      String(membership.userId) === String(currentUser?.id) &&
      membership.assignmentRole === 'principal' &&
      membership.isActive &&
      membership.isPrimary,
  );

  const shareableDistributions =
    correspondence.distribution?.filter(
      (dist) =>
        dist.type === 'department' &&
        dist.purpose === 'information' &&
        isOfficeHolder &&
        dist.departmentId,
    ) || [];

  const handleUnlinkCase = async () => {
    if (!correspondence.caseId) return;

    if (!confirm('Are you sure you want to unlink this correspondence from the case?')) {
      return;
    }

    try {
      await unlinkCorrespondenceFromCase(correspondence.caseId, correspondence.id);
      toast.success('Correspondence unlinked from case');
      onCaseUnlinked?.();
    } catch (err) {
      logError('Failed to unlink correspondence from case', err);
      toast.error('Failed to unlink from case');
    }
  };

  const getExportContext = () => {
    const firstAttachment =
      correspondence.attachments && correspondence.attachments.length > 0
        ? correspondence.attachments[0]
        : null;
    const primaryDoc = getPrimaryLinkedDocument(linkedDocuments);
    const latestVersion = primaryDoc?.versions?.[primaryDoc.versions.length - 1];
    return {
      documentContentHtml: latestVersion?.contentHtml,
      attachmentUrl: firstAttachment?.fileUrl,
      attachmentFileName: firstAttachment?.fileName,
    };
  };

  const handleDownloadPDF = () => {
    const ctx = getExportContext();
    downloadAsPDF({
      correspondence,
      minutes,
      ...ctx,
    });
    toast.success('Downloading as PDF...');
  };

  const handleDownloadWord = () => {
    const ctx = getExportContext();
    downloadAsWord({
      correspondence,
      minutes,
      ...ctx,
    });
    toast.success('Downloading as Word document...');
  };

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onOpenPrintPreview}>
          <Printer className="h-4 w-4 mr-2 opacity-70" />
          Print preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-2 opacity-70" />
          Download as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadWord}>
          <FileText className="h-4 w-4 mr-2 opacity-70" />
          Download as Word
        </DropdownMenuItem>
        {!correspondence.caseId && onOpenLinkCaseModal && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenLinkCaseModal}>
              <FolderTree className="h-4 w-4 mr-2 opacity-70" />
              Link to case
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
            <h1 className={cn(corrType.pageTitle, 'truncate')}>{correspondence.referenceNumber}</h1>
            <p className={cn(corrType.subject, 'mt-1')}>{correspondence.subject}</p>

            <details className="mt-2 group">
              <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                <span className="inline-block transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none">
                  ›
                </span>
                More details
              </summary>
              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
                {correspondence.parentCorrespondence && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">In response to: </span>
                    <button
                      onClick={() =>
                        router.push(`/correspondence/${correspondence.parentCorrespondence?.id}`)
                      }
                      className="text-primary hover:underline font-medium"
                    >
                      {correspondence.parentCorrespondence.reference_number}
                    </button>
                  </div>
                )}
                {correspondence.owningOfficeName && (
                  <div className="text-xs text-muted-foreground">
                    Owning: {correspondence.owningOfficeName}
                  </div>
                )}
                {(correspondence.divisionName || correspondence.departmentName) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>
                      {correspondence.divisionName && correspondence.departmentName
                        ? `${correspondence.divisionName} / ${correspondence.departmentName}`
                        : correspondence.divisionName || correspondence.departmentName}
                    </span>
                  </div>
                )}
                {correspondence.caseId ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <FolderTree className="h-3 w-3" />
                      <Link href={`/cases/${correspondence.caseId}`} className="hover:underline">
                        Case #{correspondence.caseId}
                      </Link>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive"
                      onClick={handleUnlinkCase}
                      title="Unlink from case"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  onOpenLinkCaseModal && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={onOpenLinkCaseModal}
                    >
                      <FolderTree className="h-3.5 w-3.5" />
                      Link to case
                    </Button>
                  )
                )}
                {correspondence.hasPhysicalCopy && (
                  <div className="flex items-center gap-1 text-xs">
                    <Badge
                      variant="outline"
                      className="gap-1 text-xs border-orange-300 text-orange-700"
                    >
                      <FileText className="h-3 w-3" />
                      Physical copy on file
                    </Badge>
                  </div>
                )}
                {correspondence.distribution && correspondence.distribution.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">CC:</span>
                      <div className="flex flex-wrap gap-1">
                        {correspondence.distribution.slice(0, 3).map((recipient) => (
                          <Badge
                            key={recipient.id}
                            variant="outline"
                            className="text-[10px] h-5 px-1.5"
                          >
                            {recipient.name || 'Unknown'}
                          </Badge>
                        ))}
                        {correspondence.distribution.length > 3 && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                            +{correspondence.distribution.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {shareableDistributions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {shareableDistributions.map((dist) => (
                          <div key={dist.id} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">Share {dist.name}:</span>
                            <ShareWithDepartmentButton
                              distribution={dist}
                              correspondenceId={correspondence.id}
                              onShared={() => onDistributionShared?.()}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          {onOpenPrimaryAction && (
            <Button
              size="sm"
              className="bg-gradient-primary hover:opacity-90 transition-opacity motion-reduce:transition-none"
              onClick={onOpenPrimaryAction}
              disabled={primaryActionDisabled}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {primaryActionLabel}
            </Button>
          )}
          {moreMenu}
        </div>
      </div>
    </div>
  );
};
