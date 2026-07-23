"use client";

import React from "react";
import { Download } from "lucide-react";
import { logError, logInfo } from '@/lib/client-logger';
import { getStoredAccessToken } from '@/lib/api-client';
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Correspondence, Minute } from "@/lib/npa-structure";
import Image from "next/image";
import mammoth from "mammoth";
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import { SecurePdfCanvasPreview } from '@/components/dms/SecurePdfCanvasPreview';
import { forceDownloadMedia } from '@/lib/correspondence-url-utils';
import { Button } from '@/components/ui/button';

interface DocumentPreviewModalProps {
  correspondence: Correspondence;
  minutes: Minute[];
  isOpen: boolean;
  onClose: () => void;
  documentContentHtml?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentSource?: 'attachment' | 'completion-package';
}

const DocumentPreviewModalContent = ({ 
  correspondence, 
  minutes: _minutes, 
  isOpen, 
  onClose,
  documentContentHtml,
  attachmentUrl,
  attachmentFileName,
  attachmentSource = 'attachment',
}: DocumentPreviewModalProps) => {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isPDF = Boolean(attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.pdf'));
  const isImage = Boolean(attachmentUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(attachmentFileName || ''));
  const isWordDocx = Boolean(attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.docx'));
  const isWordDoc = Boolean(attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.doc'));
  const isHtml = Boolean(attachmentUrl && /\.(html|htm)$/i.test(attachmentFileName || ''));
  
  const treatmentResponse = correspondence?.treatmentResponse;
  const hasTreatmentSummary = Boolean(treatmentResponse && treatmentResponse.trim().length > 0);
  const sourceLabel = attachmentSource === 'completion-package' ? 'Completion Package' : 'Attached Document';

  const handleDownload = useCallback(async () => {
    if (!attachmentUrl) return;
    try {
      await forceDownloadMedia(attachmentUrl, attachmentFileName || 'document');
    } catch (err) {
      logError('DocumentPreviewModal download failed', err);
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }, [attachmentUrl, attachmentFileName]);
  
  useEffect(() => {
    if (!isOpen || !attachmentUrl) {
      setPdfBytes(null);
      setWordHtml(null);
      setHtmlContent(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPdfBytes(null);
    setWordHtml(null);
    setHtmlContent(null);

    const token = getStoredAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    logInfo('[DocumentPreviewModal] Fetching attachment:', {
      attachmentUrl,
      attachmentFileName,
      hasToken: !!token,
      isPDF,
      isWordDocx,
    });

    fetch(attachmentUrl, { credentials: 'include', headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then(async (blob) => {
        if (cancelled) return;
        if (isPDF) {
          setPdfBytes(await blob.arrayBuffer());
          setLoading(false);
          return;
        }
        if (isWordDocx) {
          const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
          if (cancelled) return;
          setWordHtml(result.value);
          setLoading(false);
          return;
        }
        if (isHtml) {
          const text = await blob.text();
          if (cancelled) return;
          setHtmlContent(text);
          setLoading(false);
          return;
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        logError('Error loading file:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isPDF, isWordDocx, isHtml, attachmentUrl, attachmentFileName]);
  
  const renderAttachmentPreview = () => {
    if (!attachmentUrl) return null;

    if (isPDF) {
      return (
        <div className="w-full h-full min-h-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
              <p className="text-lg font-medium mb-4 text-destructive">Error loading PDF</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button type="button" onClick={() => void handleDownload()}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          ) : pdfBytes ? (
            <div className="w-full min-h-full overflow-visible bg-muted/20 p-2">
              <SecurePdfCanvasPreview data={pdfBytes} minHeightClassName="min-h-0" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
              <p className="text-lg font-medium mb-4">Unable to display PDF</p>
              <Button type="button" onClick={() => void handleDownload()}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center p-6 min-h-[600px]">
          <Image
            src={attachmentUrl}
            alt={attachmentFileName || 'Document'}
            width={1600}
            height={1200}
            className="max-w-full max-h-[70vh] object-contain"
            unoptimized
          />
        </div>
      );
    }

    if (isWordDocx) {
      return (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-sm text-muted-foreground">Loading Word document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-lg font-medium mb-4 text-destructive">Error loading Word document</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button type="button" onClick={() => void handleDownload()}>
                <Download className="h-4 w-4 mr-2" />
                Download Word document
              </Button>
            </div>
          ) : wordHtml ? (
            <div className="prose prose-base dark:prose-invert max-w-none p-6">
              <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
            </div>
          ) : null}
        </>
      );
    }

    if (isHtml) {
      return (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-sm text-muted-foreground">Loading HTML document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-lg font-medium mb-4 text-destructive">Error loading HTML document</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button type="button" onClick={() => void handleDownload()}>
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
            </div>
          ) : htmlContent ? (
            <div className="prose prose-base dark:prose-invert max-w-none p-6">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          ) : null}
        </>
      );
    }

    if (isWordDoc) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
          <p className="text-lg font-medium mb-4">{attachmentFileName || 'Word Document'}</p>
          <p className="text-sm text-muted-foreground mb-4">
            Preview is not available for .doc files. Please download to view.
          </p>
          <Button type="button" onClick={() => void handleDownload()}>
            <Download className="h-4 w-4 mr-2" />
            Download Word document
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
        <p className="text-lg font-medium mb-4">{attachmentFileName || 'Document'}</p>
        <Button type="button" onClick={() => void handleDownload()}>
          <Download className="h-4 w-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  };

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
          {attachmentUrl ? (
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
              
              {attachmentUrl && (
                <div className="p-6 bg-muted/30">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">{sourceLabel}</h4>
                  {renderAttachmentPreview()}
                </div>
              )}
            </div>
          ) : (
            <>
          {attachmentUrl ? (
            <>{renderAttachmentPreview()}</>
          ) : documentContentHtml ? (
            <div
              className="prose prose-base dark:prose-invert max-w-none p-6"
              dangerouslySetInnerHTML={{ __html: documentContentHtml }}
            />
          ) : (
            hasTreatmentSummary ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 pb-4 border-b border-border sticky top-0 bg-background">
                  <h4 className="text-sm font-semibold text-muted-foreground">Treatment Response</h4>
                </div>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: treatmentResponse! }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                <p className="text-lg text-muted-foreground mb-2">No document preview available</p>
                <p className="text-sm text-muted-foreground">
                  No document has been uploaded or linked to this correspondence.
                </p>
              </div>
            )
          )}
          </>)}
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
