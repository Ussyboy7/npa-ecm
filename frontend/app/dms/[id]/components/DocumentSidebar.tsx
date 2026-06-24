"use client";

import { Button } from "@/components/ui/button";
import { Share2, FolderTree, FilePlus, MessageSquare } from "lucide-react";
import { CollaborationPanel } from "@/components/dms/CollaborationPanel";
import { AccessActivityCard } from "@/components/dms/AccessActivityCard";
import { RelatedCorrespondenceCard } from "@/components/dms/RelatedCorrespondenceCard";
import { DocumentCommentsCard } from "@/components/dms/DocumentCommentsCard";
import { DocumentThreadCard } from "@/components/dms/DocumentThreadCard";
import type {
  DocumentRecord,
  DocumentWorkspace,
  DocumentComment,
  DocumentAccessLog,
} from "@/lib/dms-storage";
import type { Correspondence, Minute, User } from "@/lib/npa-structure";
import type { CaptureJob } from "@/lib/capture-storage";
import { DocumentMetadataCard } from "./DocumentMetadataCard";
import { DocumentVersionsPanel } from "./DocumentVersionsPanel";
import type { DocumentVersion } from "@/lib/dms-storage";

type OCRState = Record<string, { isProcessing: boolean; currentJob: CaptureJob | null; error: string | null }>;

export interface DocumentSidebarProps {
  document: DocumentRecord;
  versions: DocumentVersion[];
  documentWorkspaces: DocumentWorkspace[];
  workspaces: DocumentWorkspace[];
  comments: DocumentComment[];
  accessLogs: DocumentAccessLog[];
  relatedCorrespondence: Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string }>;
  userLookup: Map<string, User>;
  divisionLookup: Map<string, string>;
  departmentLookup: Map<string, string>;
  uploadUser: User | null;
  ocrState: OCRState;
  workspaceManageOpen: boolean;
  onWorkspaceManageOpenChange: (open: boolean) => void;
  onShare: () => void;
  onLinkCase: () => void;
  onQuickVersionUpload: () => void;
  onCreateVersion?: () => void;
  onAddWorkspace: (workspaceId: string) => Promise<void>;
  onRemoveWorkspace: (workspaceId: string) => Promise<void>;
  onWorkspacesRefreshed: () => Promise<void>;
  onOpenCommentsDialog: () => void;
  onViewActivityDetails: (log: DocumentAccessLog) => void;
  onRefreshAccessLogs: () => Promise<void>;
  onPreviewVersion: (version: DocumentVersion) => void;
  onReplaceVersion: (versionId: string) => void;
  onVersionOCR: (versionId: string) => void;
  onCancelOCR: (versionId: string) => void;
  getUserInitials: (userId: string) => string;
}

export function DocumentSidebar({
  document,
  versions,
  documentWorkspaces,
  workspaces,
  comments,
  accessLogs,
  relatedCorrespondence,
  userLookup,
  divisionLookup,
  departmentLookup,
  uploadUser,
  ocrState,
  workspaceManageOpen,
  onWorkspaceManageOpenChange,
  onShare,
  onLinkCase,
  onQuickVersionUpload,
  onCreateVersion,
  onAddWorkspace,
  onRemoveWorkspace,
  onWorkspacesRefreshed,
  onOpenCommentsDialog,
  onViewActivityDetails,
  onRefreshAccessLogs,
  onPreviewVersion,
  onReplaceVersion,
  onVersionOCR,
  onCancelOCR,
  getUserInitials,
}: DocumentSidebarProps) {
  return (
    <div className="space-y-4 overflow-y-auto min-h-0 flex-1 p-4">
      <div className="hidden md:flex flex-wrap gap-2">
          <Button variant="default" size="sm" className="text-xs" onClick={onShare}>
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={onLinkCase}>
            <FolderTree className="h-3.5 w-3.5 mr-1" />
            Link case
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={onQuickVersionUpload} disabled={!uploadUser}>
            <FilePlus className="h-3.5 w-3.5 mr-1" />
            Add version
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={onOpenCommentsDialog}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Comments
          </Button>
      </div>

      <DocumentMetadataCard document={document} />

      {relatedCorrespondence.length > 0 && (
        <RelatedCorrespondenceCard
          relatedCorrespondence={relatedCorrespondence}
          userLookup={userLookup}
        />
      )}

      <DocumentThreadCard
        documentId={document.id}
        parentDocumentId={
          (document as DocumentRecord & { parent_document?: { id: string }; parent_document_id?: string }).parent_document
            ?.id ||
          (document as DocumentRecord & { parent_document_id?: string }).parent_document_id
        }
      />

      <DocumentVersionsPanel
        document={document}
        versions={versions}
        userLookup={userLookup}
        uploadUser={uploadUser}
        ocrState={ocrState}
        onCreateVersion={onCreateVersion}
        onQuickVersionUpload={onQuickVersionUpload}
        onPreviewVersion={onPreviewVersion}
        onReplaceVersion={onReplaceVersion}
        onVersionOCR={onVersionOCR}
        onCancelOCR={onCancelOCR}
      />

      <CollaborationPanel
        document={document}
        documentWorkspaces={documentWorkspaces}
        workspaces={workspaces}
        onAddWorkspace={onAddWorkspace}
        onRemoveWorkspace={onRemoveWorkspace}
        workspaceManageOpen={workspaceManageOpen}
        onWorkspaceManageOpenChange={onWorkspaceManageOpenChange}
        onWorkspacesRefreshed={onWorkspacesRefreshed}
      />

      <DocumentCommentsCard
        comments={comments}
        userLookup={userLookup}
        getUserInitials={getUserInitials}
        onOpenCommentsDialog={onOpenCommentsDialog}
      />

      <AccessActivityCard
        documentId={document.id}
        accessLogs={accessLogs}
        userLookup={userLookup}
        getUserInitials={getUserInitials}
        onViewActivityDetails={onViewActivityDetails}
        onRefresh={onRefreshAccessLogs}
      />
    </div>
  );
}
