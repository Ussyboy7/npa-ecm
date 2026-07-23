"use client";

import { CollaborationPanel } from "@/components/dms/CollaborationPanel";
import { AccessActivityCard } from "@/components/dms/AccessActivityCard";
import { RelatedCorrespondenceCard } from "@/components/dms/RelatedCorrespondenceCard";
import { DocumentCommentsCard } from "@/components/dms/DocumentCommentsCard";
import { DocumentThreadCard } from "@/components/dms/DocumentThreadCard";
import type {
  DocumentRecord,
  DocumentComment,
  DocumentAccessLog,
} from "@/lib/dms-storage";
import type { Correspondence, Minute, User } from "@/lib/npa-structure";
import { DocumentMetadataCard } from "./DocumentMetadataCard";
import { DocumentSummaryCard } from "@/components/dms/DocumentSummaryCard";
import { RelatedItemsPanel } from "@/components/search/RelatedItemsPanel";
import { DocumentVersionsPanel } from "./DocumentVersionsPanel";
import { DocumentDrmBanner } from "@/components/dms/DocumentDrmBanner";
import type { DocumentVersion } from "@/lib/dms-storage";
import type { OCRState } from "@/app/dms/[id]/hooks/use-document-ocr";

export interface DocumentSidebarProps {
  document: DocumentRecord;
  versions: DocumentVersion[];
  comments: DocumentComment[];
  accessLogs: DocumentAccessLog[];
  relatedCorrespondence: Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string }>;
  userLookup: Map<string, User>;
  uploadUser: User | null;
  ocrState: OCRState;
  onQuickVersionUpload: () => void;
  onCreateVersion?: () => void;
  onOpenCommentsDialog: () => void;
  onViewActivityDetails: (log: DocumentAccessLog) => void;
  onRefreshAccessLogs: () => Promise<void>;
  onPreviewVersion: (version: DocumentVersion) => void;
  onDownloadVersion?: (version: DocumentVersion) => void;
  onReplaceVersion: (versionId: string) => void;
  onVersionOCR: (versionId: string) => void;
  onCancelOCR: (versionId: string) => void;
  getUserInitials: (userId: string) => string;
}

export function DocumentSidebar({
  document,
  versions,
  comments,
  accessLogs,
  relatedCorrespondence,
  userLookup,
  uploadUser,
  ocrState,
  onQuickVersionUpload,
  onCreateVersion,
  onOpenCommentsDialog,
  onViewActivityDetails,
  onRefreshAccessLogs,
  onPreviewVersion,
  onDownloadVersion,
  onReplaceVersion,
  onVersionOCR,
  onCancelOCR,
  getUserInitials,
}: DocumentSidebarProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 bg-muted/10">
      <DocumentMetadataCard document={document} />
      <DocumentDrmBanner rights={document.drmRights ?? null} />
      <DocumentSummaryCard document={document} />
      <RelatedItemsPanel type="document" id={document.id} />

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
        onDownloadVersion={onDownloadVersion}
        onReplaceVersion={onReplaceVersion}
        onVersionOCR={onVersionOCR}
        onCancelOCR={onCancelOCR}
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
