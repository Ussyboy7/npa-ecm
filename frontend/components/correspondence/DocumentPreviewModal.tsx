"use client";

import React, { useCallback, useMemo } from "react";
import { Download } from "lucide-react";
import { logError } from '@/lib/client-logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Correspondence, Minute } from "@/lib/npa-structure";
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import { CanonicalDocumentViewer } from '@/components/dms/CanonicalDocumentViewer';
import {
  type CanonicalDocRef,
  downloadCanonicalDocument,
} from '@/lib/canonical-document';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface DocumentPreviewModalProps {
  correspondence: Correspondence;
  minutes: Minute[];
  isOpen: boolean;
  onClose: () => void;
  documentContentHtml?: string;
  attachmentFileName?: string;
  attachmentSource?: 'attachment' | 'completion-package';
  documentVersionId?: string;
  attachmentId?: string;
  caseId?: string;
  allowDownload?: boolean;
}

const DocumentPreviewModalContent = ({ 
  correspondence, 
  minutes: _minutes, 
  isOpen, 
  onClose,
  documentContentHtml,
  attachmentFileName,
  attachmentSource = 'attachment',
  documentVersionId,
  attachmentId,
  caseId,
  allowDownload = true,
}: DocumentPreviewModalProps) => {
  const treatmentResponse = correspondence?.treatmentResponse;
  const isFallbackOnly = treatmentResponse && /^Response to [A-Z]{2,4}\/[A-Z]{2,4}\/\d{4}\/[A-F0-9]+$/i.test(treatmentResponse.trim());
  const hasTreatmentSummary = Boolean(treatmentResponse && treatmentResponse.trim().length > 0 && !isFallbackOnly);
  const sourceLabel = attachmentSource === 'completion-package' ? 'Completion Package' : 'Attached Document';

  const docRef = useMemo((): CanonicalDocRef | null => {
    if (documentVersionId) {
      return {
        kind: 'dms-version',
        versionId: documentVersionId,
        fileName: attachmentFileName,
      };
    }
    if (attachmentId) {
      return {
        kind: 'corr-attachment',
        attachmentId,
        fileName: attachmentFileName,
      };
    }
    if (caseId) {
      return {
        kind: 'case-package',
        caseId,
        fileName: attachmentFileName || 'completion-package.pdf',
      };
    }
    if (documentContentHtml?.trim()) {
      return {
        kind: 'html',
        html: documentContentHtml,
        fileName: attachmentFileName || 'document.html',
      };
    }
    return null;
  }, [documentVersionId, attachmentId, caseId, documentContentHtml, attachmentFileName]);

  const handleDownload = useCallback(async () => {
    if (!docRef || docRef.kind === 'html') {
      toast.error('No downloadable file');
      return;
    }
    try {
      await downloadCanonicalDocument(docRef);
    } catch (err) {
      logError('DocumentPreviewModal download failed', err);
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }, [docRef]);

  const canDownload = Boolean(allowDownload && docRef && docRef.kind !== 'html');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent size="full" height="screen" density="flush">
        <DialogHeader className="px-4 pt-3 pb-1 flex-shrink-0 flex-row items-center justify-between gap-2 space-y-0">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm font-medium truncate">
              {attachmentFileName || correspondence.referenceNumber}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview of {attachmentSource === "completion-package" ? "completion package" : "attached document"}
              {attachmentFileName ? `: ${attachmentFileName}` : ""} for correspondence{" "}
              {correspondence.referenceNumber || correspondence.subject || "item"}.
            </DialogDescription>
          </div>
          {canDownload ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0"
              onClick={() => void handleDownload()}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          ) : null}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto border-t">
          {hasTreatmentSummary ? (
            <div className="flex flex-col">
              <div className="p-6 border-b">
                <div className="mb-2 pb-2 border-b border-border">
                  <h4 className="text-sm font-semibold text-muted-foreground">Treatment Response</h4>
                </div>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: treatmentResponse! }}
                />
              </div>
              
              {docRef && docRef.kind !== 'html' && (
                <div className="p-6 bg-muted/30">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">{sourceLabel}</h4>
                  <CanonicalDocumentViewer
                    source={docRef}
                    allowDownload={allowDownload}
                    minHeightClassName="min-h-[50vh]"
                  />
                </div>
              )}
            </div>
          ) : docRef ? (
            <CanonicalDocumentViewer
              source={docRef}
              allowDownload={allowDownload}
              minHeightClassName="min-h-[70vh]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-lg text-muted-foreground mb-2">No document preview available</p>
              <p className="text-sm text-muted-foreground">
                No document has been uploaded or linked to this correspondence.
              </p>
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export const DocumentPreviewModal = React.memo((props: DocumentPreviewModalProps) => (
  <ModalErrorBoundary onClose={props.onClose}>
    <DocumentPreviewModalContent {...props} />
  </ModalErrorBoundary>
));
DocumentPreviewModal.displayName = 'DocumentPreviewModal';
