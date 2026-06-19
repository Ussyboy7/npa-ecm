"use client";

import { logError, logInfo } from '@/lib/client-logger';
import { getStoredAccessToken } from '@/lib/api-client';
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { downloadAsPDF } from "@/lib/document-generator";
import type { Correspondence, Minute } from "@/lib/npa-structure";
import Image from "next/image";
import mammoth from "mammoth";

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

export const DocumentPreviewModal = ({ 
  correspondence, 
  minutes, 
  isOpen, 
  onClose,
  documentContentHtml,
  attachmentUrl,
  attachmentFileName,
  attachmentSource = 'attachment',
}: DocumentPreviewModalProps) => {
  const normalizedMinutes = Array.isArray(minutes) ? minutes : [];
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Determine file type
  const isPDF = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.pdf');
  const isImage = attachmentUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(attachmentFileName || '');
  const isWordDocx = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.docx');
  const isWordDoc = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.doc');
  const isHtml = attachmentUrl && /\.(html|htm)$/i.test(attachmentFileName || '');
  
  // Show treatment response only from dedicated field (no summary fallback).
  const treatmentResponse = correspondence?.treatmentResponse;
  const hasTreatmentSummary = Boolean(treatmentResponse && treatmentResponse.trim().length > 0);
  const sourceLabel = attachmentSource === 'completion-package' ? 'Completion Package' : 'Attached Document';
  const footerPreviewLabel = attachmentSource === 'completion-package' ? 'Previewing completion package' : 'Previewing uploaded document';
  
  // Fetch PDF or Word document as blob when modal opens
  useEffect(() => {
    if (isOpen && attachmentUrl) {
      setLoading(true);
      setError(null);
      
      // Get authentication token
      const token = getStoredAccessToken();
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Debug logging
      logInfo('[DocumentPreviewModal] Fetching attachment:', {
        attachmentUrl,
        attachmentFileName,
        hasToken: !!token,
        isPDF,
        isWordDocx,
      });
      
      // Fetch the file with authentication
      fetch(attachmentUrl, {
        credentials: 'include',
        headers,
      })
        .then(response => {
          logInfo('[DocumentPreviewModal] Fetch response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            url: attachmentUrl,
          });
          
          if (!response.ok) {
            logError('DocumentPreviewModal: Fetch failed', {
              status: response.status,
              statusText: response.statusText,
              url: attachmentUrl,
            });
            throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
          }
          return response.blob();
        })
        .then(blob => {
          if (isPDF) {
            // For PDFs, create blob URL for iframe
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
            setLoading(false);
          } else if (isWordDocx) {
            // For .docx files, convert to HTML using mammoth
            blob.arrayBuffer()
              .then(arrayBuffer => mammoth.convertToHtml({ arrayBuffer }))
              .then(result => {
                setWordHtml(result.value);
                setLoading(false);
              })
              .catch(err => {
                logError('Error converting Word document:', err);
                setError(`Failed to convert Word document: ${err.message}`);
                setLoading(false);
              });
          } else if (isHtml) {
            blob.text()
              .then((text) => {
                setHtmlContent(text);
                setLoading(false);
              })
              .catch((err) => {
                logError('Error loading HTML document:', err);
                setError(`Failed to load HTML document: ${err.message}`);
                setLoading(false);
              });
          } else {
            // For other file types, just reset loading
            setLoading(false);
          }
        })
        .catch(err => {
          logError('Error loading file:', err);
          setError(err.message);
          setLoading(false);
        });
    } else {
      // Reset state when modal closes or attachment changes
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      setWordHtml(null);
      setHtmlContent(null);
      setLoading(false);
      setError(null);
    }
    
    // Cleanup blob URL when component unmounts or dependencies change
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPDF, isWordDocx, isHtml, attachmentUrl]);
  
  const handlePrint = () => {
    downloadAsPDF({ 
      correspondence, 
      minutes: normalizedMinutes,
      documentContentHtml,
      attachmentUrl,
      attachmentFileName
    });
    onClose();
  };

  const handleDownloadPdf = () => {
    downloadAsPDF({ 
      correspondence, 
      minutes: normalizedMinutes,
      documentContentHtml,
      attachmentUrl,
      attachmentFileName
    });
  };

  const renderAttachmentPreview = () => {
    if (!attachmentUrl) return null;

    if (isPDF) {
      return (
        <div className="w-full h-full min-h-[600px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-lg font-medium mb-4 text-destructive">Error loading PDF</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Open PDF in new tab
              </a>
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              className="w-full h-full min-h-[600px] border-0"
              title="Document Preview"
            />
          ) : (
            <object
              data={attachmentUrl}
              type="application/pdf"
              className="w-full h-full min-h-[600px] border-0"
              title="Document Preview"
            >
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                <p className="text-lg font-medium mb-4">Unable to display PDF</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Your browser may not support PDF preview. Please download the file to view it.
                </p>
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Open PDF in new tab
                </a>
              </div>
            </object>
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
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Open Word document in new tab
              </a>
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
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Download HTML
              </a>
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
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Download Word document
          </a>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
        <p className="text-lg font-medium mb-4">{attachmentFileName || 'Document'}</p>
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download to view
        </a>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-6xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="space-y-1 px-6 pt-6 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Document Preview</DialogTitle>
          <DialogDescription>
            {attachmentFileName || correspondence.referenceNumber} · {correspondence.subject}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 border-t border-b overflow-y-auto">
          {/* Show treatment response summary first if it exists */}
          {hasTreatmentSummary ? (
            <div className="flex flex-col">
              <div className="p-6 border-b">
                <div className="mb-2 pb-2 border-b border-border">
                  <h4 className="text-sm font-semibold text-muted-foreground">Treatment Response</h4>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {treatmentResponse}
                </div>
              </div>
              
              {/* Show attachments below treatment response */}
              {attachmentUrl && (
                <div className="p-6 bg-muted/30">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">{sourceLabel}</h4>
                  {renderAttachmentPreview()}
                </div>
              )}
            </div>
          ) : (
            <>{/* Original logic for no summary */}
          {attachmentUrl ? (
            // Priority 1: Show uploaded attachment
            <>{renderAttachmentPreview()}</>
          ) : documentContentHtml ? (
            // Priority 2: Show DMS content
            <div
              className="prose prose-base dark:prose-invert max-w-none p-6"
              dangerouslySetInnerHTML={{ __html: documentContentHtml }}
            />
          ) : (
            // No document available - show treatment response if available
            hasTreatmentSummary ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 pb-4 border-b border-border sticky top-0 bg-background">
                  <h4 className="text-sm font-semibold text-muted-foreground">Treatment Response</h4>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {treatmentResponse}
                </div>
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

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pb-6">
          <div className="text-xs text-muted-foreground">
            {attachmentUrl ? footerPreviewLabel : 'Preview reflects the latest document details and minute thread.'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button className="gap-2" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
