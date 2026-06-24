"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Share2,
  MessageSquare,
  User as UserIcon,
  Clock,
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
import { formatDate } from "@/lib/correspondence-helpers";
import { DocumentMetadataEditDialog } from "./DocumentMetadataEditDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const statusLabel = (status: DocumentRecord["status"]) => {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
    default:
      return status;
  }
};

export const DocumentHeader = ({
  document,
  author,
  currentUser,
  divisionLookup,
  departmentLookup,
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

  const desktopActions = (
    <>
      {canDownload && onDownload && (
        <Button variant="outline" size="icon" onClick={onDownload} title="Download latest version">
          <Download className="h-4 w-4" />
        </Button>
      )}
      {canFullscreen && onFullscreen && (
        <Button variant="outline" size="icon" onClick={onFullscreen} title="Full viewer (OCR and tools)">
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={() => setMetadataDialogOpen(true)} title="Edit metadata">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onLinkCase} title="Link case">
        <FolderTree className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onShare} title="Share">
        <Share2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onMinuteDocument}
        disabled={!currentUser || !hasLinkedCorrespondence}
        title={
          hasLinkedCorrespondence
            ? "Minute document"
            : "Minute (link to correspondence first)"
        }
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <>
      <div className="border-b border-border bg-background px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => router.push("/documents")}
              aria-label="Back to documents"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base md:text-xl font-bold text-foreground truncate">
                  {document.referenceNumber || document.title}
                </h1>
                <Badge
                  variant={
                    document.status === "published"
                      ? "default"
                      : document.status === "archived"
                        ? "secondary"
                        : "outline"
                  }
                  className="flex-shrink-0"
                >
                  {statusLabel(document.status).toUpperCase()}
                </Badge>
                <Badge variant="outline" className="capitalize flex-shrink-0 hidden sm:inline-flex">
                  {document.documentType}
                </Badge>
                <Badge
                  variant={document.sensitivity === "restricted" ? "destructive" : "outline"}
                  className="capitalize flex-shrink-0 hidden sm:inline-flex"
                >
                  {document.sensitivity}
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{document.title}</p>
              {document.case_links && document.case_links.length > 0 && (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {document.case_links.map((link) => (
                    <div key={link.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="gap-1">
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
                          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
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
              )}
              <div className="mt-1 hidden md:flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {document.divisionId && (
                  <span>Division: {divisionLookup.get(document.divisionId) || "Not set"}</span>
                )}
                {document.departmentId && (
                  <span>Department: {departmentLookup.get(document.departmentId) || "Not set"}</span>
                )}
                {author && (
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {author.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(document.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 flex-shrink-0">{desktopActions}</div>

          <div className="md:hidden flex items-center gap-1 flex-shrink-0">
            {canDownload && onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canFullscreen && onFullscreen && (
                  <DropdownMenuItem onClick={onFullscreen}>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Expanded viewer
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setMetadataDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit metadata
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLinkCase}>
                  <FolderTree className="h-4 w-4 mr-2" />
                  Link case
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onMinuteDocument}
                  disabled={!currentUser || !hasLinkedCorrespondence}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Minute document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
