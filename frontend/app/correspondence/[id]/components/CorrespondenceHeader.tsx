"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Eye,
  Printer,
  Download,
  FileText,
  FolderTree,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { unlinkCorrespondenceFromCase } from '@/lib/api/cases';
import { logError } from '@/lib/client-logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { downloadAsPDF, downloadAsWord } from '@/lib/document-generator';
import { toast } from 'sonner';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import type { DocumentRecord } from '@/lib/dms-storage';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { User as UserIcon, Calendar, Mail, Phone, Building2, Users, Paperclip } from 'lucide-react';
import { ShareWithDepartmentButton } from '@/components/correspondence/ShareWithDepartmentButton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DistributionRecipient } from '@/lib/npa-structure';

interface CorrespondenceHeaderProps {
  correspondence: Correspondence;
  minutes: Minute[];
  linkedDocuments: DocumentRecord[];
  onOpenDocumentPreview: () => void;
  onOpenPrintPreview: () => void;
  onCaseUnlinked?: () => void;
  onOpenLinkCaseModal?: () => void;
  onDistributionShared?: () => void;
}

export const CorrespondenceHeader = ({
  correspondence,
  minutes,
  linkedDocuments,
  onOpenDocumentPreview,
  onOpenPrintPreview,
  onCaseUnlinked,
  onOpenLinkCaseModal,
  onDistributionShared,
}: CorrespondenceHeaderProps) => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { officeMemberships } = useOrganization();

  // Check if current user is office holder (principal) of any department
  const isOfficeHolder = officeMemberships.some(
    (membership) =>
      String(membership.userId) === String(currentUser?.id) &&
      membership.assignmentRole === 'principal' &&
      membership.isActive &&
      membership.isPrimary
  );

  // Get department distribution entries that user can share
  const shareableDistributions = correspondence.distribution?.filter(
    (dist) =>
      dist.type === 'department' &&
      dist.purpose === 'information' &&
      isOfficeHolder &&
      dist.departmentId
  ) || [];

  const handleUnlinkCase = async () => {
    if (!correspondence.caseId) return;

    if (!confirm("Are you sure you want to unlink this correspondence from the case?")) {
      return;
    }

    try {
      await unlinkCorrespondenceFromCase(correspondence.caseId, correspondence.id);
      toast.success("Correspondence unlinked from case");
      onCaseUnlinked?.();
    } catch (err) {
      logError("Failed to unlink correspondence from case", err);
      toast.error("Failed to unlink from case");
    }
  };

  const handleDownloadPDF = () => {
    if (correspondence && minutes) {
      const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
        ? correspondence.attachments[0] 
        : null;
      const latestVersion = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
      const documentContentHtml = latestVersion?.contentHtml;
      
      downloadAsPDF({ 
        correspondence, 
        minutes,
        documentContentHtml,
        attachmentUrl: firstAttachment?.fileUrl,
        attachmentFileName: firstAttachment?.fileName
      });
      toast.success('Downloading as PDF...');
    }
  };

  const handleDownloadWord = () => {
    if (correspondence && minutes) {
      const firstAttachment = correspondence.attachments && correspondence.attachments.length > 0 
        ? correspondence.attachments[0] 
        : null;
      const latestVersion = linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1];
      const documentContentHtml = latestVersion?.contentHtml;
      
      downloadAsWord({ 
        correspondence, 
        minutes,
        documentContentHtml,
        attachmentUrl: firstAttachment?.fileUrl,
        attachmentFileName: firstAttachment?.fileName
      });
      toast.success('Downloading as Word document...');
    }
  };

  return (
    <>
      <div className="border-b border-border bg-background px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => router.push('/correspondence/inbox')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              {/* Line 1: Reference + Priority + Direction */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base md:text-xl font-bold text-foreground truncate">{correspondence.referenceNumber}</h1>
                {/* Priority badge */}
                <Badge
                  variant={
                    correspondence.priority === 'urgent'
                      ? 'destructive'
                      : correspondence.priority === 'high'
                      ? 'default'
                      : 'secondary'
                  }
                  className="flex-shrink-0"
                >
                  {correspondence.priority.toUpperCase()}
                </Badge>
                {/* Direction badge */}
                <Badge variant="outline" className="gap-1 flex-shrink-0">
                  {correspondence.direction === 'downward' ? (
                    <>
                      <ArrowDown className="h-3 w-3 text-info" />
                      <span className="hidden md:inline">Downward</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="hidden md:inline">Upward</span>
                    </>
                  )}
                </Badge>
              </div>

              {/* Line 2: Subject */}
              <p className="text-sm md:text-base font-medium mt-1">{correspondence.subject}</p>

              {/* Line 3: In response to (parent correspondence) */}
              {correspondence.parentCorrespondence && (
                <div className="mt-1 text-xs">
                  <span className="text-muted-foreground">In response to: </span>
                  <button
                    onClick={() => router.push(`/correspondence/${correspondence.parentCorrespondence?.id}`)}
                    className="text-primary hover:underline font-medium"
                  >
                    {correspondence.parentCorrespondence.reference_number}
                  </button>
                </div>
              )}

              {/* Line 4: Sender • Organization */}
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                {correspondence.senderName && (
                  <>
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {correspondence.senderName}
                    </span>
                    {correspondence.senderOrganization && (
                      <span>• {correspondence.senderOrganization}</span>
                    )}
                  </>
                )}
              </div>

              {/* Line 5: Received date + Attachments */}
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {correspondence.receivedDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Received: {formatDateShort(correspondence.receivedDate)}
                  </span>
                )}
                {correspondence.attachments && correspondence.attachments.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    <Paperclip className="h-3 w-3 mr-1" />
                    {correspondence.attachments.length} attachment{correspondence.attachments.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Line 6: Owning + Current Office */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {correspondence.owningOfficeName && (
                  <span>Owning: {correspondence.owningOfficeName}</span>
                )}
                {correspondence.currentOfficeName && (
                  <span>Current: {correspondence.currentOfficeName}</span>
                )}
              </div>

              {/* Line 7: Division/Department */}
              {(correspondence.divisionName || correspondence.departmentName) && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>
                    {correspondence.divisionName && correspondence.departmentName
                      ? `${correspondence.divisionName} / ${correspondence.departmentName}`
                      : correspondence.divisionName || correspondence.departmentName}
                  </span>
                </div>
              )}

              {/* Line 8: Case link */}
              {correspondence.caseId && (
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <FolderTree className="h-3 w-3" />
                    <Link href={`/cases/${correspondence.caseId}`} className="hover:underline">
                      Case #{correspondence.caseId}
                    </Link>
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={handleUnlinkCase} title="Unlink from case">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Line 9: CC (Distribution) */}
              {correspondence.distribution && correspondence.distribution.length > 0 && (
                <div className="mt-1.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="font-medium">CC:</span>
                    <div className="flex flex-wrap gap-1">
                      {correspondence.distribution.slice(0, 3).map((recipient) => (
                        <Badge key={recipient.id} variant="outline" className="text-[10px] h-5 px-1.5">
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
                  {/* Share with Department buttons */}
                  {shareableDistributions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {shareableDistributions.map((dist) => (
                        <div key={dist.id} className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground">Share {dist.name}:</span>
                          <ShareWithDepartmentButton distribution={dist} correspondenceId={correspondence.id} onShared={() => onDistributionShared?.()} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Desktop action buttons */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenDocumentPreview}
              title="Preview Document"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenPrintPreview}
              title="Print Preview"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Download Document">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadWord}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download as Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!correspondence.caseId && onOpenLinkCaseModal && (
              <Button
                variant="outline"
                size="icon"
                onClick={onOpenLinkCaseModal}
                title="Link to Case"
              >
                <FolderTree className="h-4 w-4" />
              </Button>
            )}
            <ContextualHelp
              title="Need help on this correspondence?"
              description="Print previews generate a clean memo view, downloads attach the latest minutes, and the action panel lets you minute, treat, delegate, or archive."
              steps={[
                'Use Print Preview before hard copies or PDF export.',
                'Download to share as PDF or Word outside the ECM.',
                'Use the right-hand actions to minute, treat, delegate, or complete.',
              ]}
            />
          </div>
          {/* Mobile action menu */}
          <div className="md:hidden flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onOpenDocumentPreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenPrintPreview}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
};

