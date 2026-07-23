"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Share2,
  MessageSquare,
  Pencil,
  FolderTree,
  X,
  Download,
  Maximize2,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import type { DocumentRecord } from "@/lib/dms-storage";
import type { User } from "@/lib/npa-structure";
import { DocumentMetadataEditDialog } from "./DocumentMetadataEditDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { detailType } from "@/lib/detail-type";
import { cn } from "@/lib/utils";

interface DocumentHeaderProps {
  document: DocumentRecord;
  author?: User | null;
  currentUser: User | null;
  divisionLookup: Map<string, string>;
  departmentLookup: Map<string, string>;
  divisions?: Array<{ id: string; name: string }>;
  departments?: Array<{ id: string; name: string }>;
  onShare: () => void;
  onMinuteDocument: () => void;
  onDocumentUpdate: (updated: DocumentRecord) => void;
  onLinkCase: () => void;
  onUnlinkCase?: (caseId: string) => Promise<void>;
  onDownload?: () => void;
  onFullscreen?: () => void;
  canDownload?: boolean;
  canFullscreen?: boolean;
  hasLinkedCorrespondence?: boolean;
}

export const DocumentHeader = ({
  document,
  currentUser,
  divisions = [],
  departments = [],
  onShare,
  onMinuteDocument,
  onDocumentUpdate,
  onLinkCase,
  onUnlinkCase,
  onDownload,
  onFullscreen,
  canDownload = false,
  canFullscreen = false,
  hasLinkedCorrespondence = false,
}: DocumentHeaderProps) => {
  const router = useRouter();
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);

  const title = document.title || document.referenceNumber || "Document";
  const refLine =
    document.referenceNumber && document.referenceNumber !== document.title
      ? document.referenceNumber
      : null;

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
        {canDownload && onDownload && (
          <DropdownMenuItem onClick={onDownload}>
            <Download className="h-4 w-4 mr-2 opacity-70" />
            Download
          </DropdownMenuItem>
        )}
        {canFullscreen && onFullscreen && (
          <DropdownMenuItem onClick={onFullscreen}>
            <Maximize2 className="h-4 w-4 mr-2 opacity-70" />
            Expanded viewer
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setMetadataDialogOpen(true)}>
          <Pencil className="h-4 w-4 mr-2 opacity-70" />
          Edit metadata
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLinkCase}>
          <FolderTree className="h-4 w-4 mr-2 opacity-70" />
          Link to case
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onMinuteDocument}
          disabled={!currentUser || !hasLinkedCorrespondence}
        >
          <MessageSquare className="h-4 w-4 mr-2 opacity-70" />
          Minute document
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="border-b border-border/60 bg-background px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 mt-0.5"
              onClick={() => router.push("/dms")}
              aria-label="Back to documents"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              {refLine ? (
                <>
                  <h1 className={cn(detailType.pageTitle, "truncate")}>{refLine}</h1>
                  <p className={cn(detailType.subject, "mt-1 truncate")}>{title}</p>
                </>
              ) : (
                <h1 className={cn(detailType.pageTitle, "truncate")}>{title}</h1>
              )}

              <details className="mt-2 group">
                <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                  <span className="inline-block transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none">
                    ›
                  </span>
                  More details
                </summary>
                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
                  {document.case_links && document.case_links.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {document.case_links.map((link) => (
                        <div key={link.id} className="flex items-center gap-1">
                          <Badge variant="outline" className="gap-1 text-xs">
                            <FolderTree className="h-3 w-3" />
                            <Link
                              href={`/cases/${link.case.id}`}
                              className="hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {link.case.caseNumber}
                            </Link>
                          </Badge>
                          {onUnlinkCase && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-destructive"
                              onClick={async () => {
                                if (!confirm("Unlink this document from the case?")) return;
                                await onUnlinkCase(link.case.id);
                              }}
                              title="Unlink from case"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No case linked.</p>
                  )}
                </div>
              </details>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            <Button
              size="sm"
              className="bg-gradient-primary hover:opacity-90 transition-opacity motion-reduce:transition-none"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {moreMenu}
          </div>
        </div>
      </div>

      {metadataDialogOpen && (
        <DocumentMetadataEditDialog
          open={metadataDialogOpen}
          onOpenChange={setMetadataDialogOpen}
          document={document}
          onDocumentUpdate={onDocumentUpdate}
          divisions={divisions}
          departments={departments}
        />
      )}
    </>
  );
};
