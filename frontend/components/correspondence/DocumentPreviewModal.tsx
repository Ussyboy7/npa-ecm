"use client";

import { logError } from '@/lib/client-logger';
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
import mammoth from "mammoth";

interface DocumentPreviewModalProps {
  correspondence: Correspondence;
  minutes: Minute[];
  isOpen: boolean;
  onClose: () => void;
  documentContentHtml?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
}

export const DocumentPreviewModal = ({ 
  correspondence, 
  minutes, 
  isOpen, 
  onClose,
  documentContentHtml,
  attachmentUrl,
  attachmentFileName
}: DocumentPreviewModalProps) => {
  const normalizedMinutes = Array.isArray(minutes) ? minutes : [];
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Determine file type
  const isPDF = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.pdf');
  const isImage = attachmentUrl && attachmentFileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isWordDocx = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.docx');
  const isWordDoc = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.doc');
  
  // Fetch PDF or Word document as blob when modal opens
  useEffect(() => {
    if (isOpen && attachmentUrl) {
      setLoading(true);
      setError(null);
      
      // Fetch the file with authentication
      fetch(attachmentUrl, {
        credentials: 'include',
      })
        .then(response => {
          if (!response.ok) {
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
      setLoading(false);
      setError(null);
    }
    
    // Cleanup blob URL when component unmounts or dependencies change
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, isPDF, isWordDocx, attachmentUrl]);
  
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="space-y-1 px-6 pt-6 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Document Preview</DialogTitle>
          <DialogDescription>
            {attachmentFileName || correspondence.referenceNumber} · {correspondence.subject}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 border-t border-b overflow-y-auto" style={{ height: 'calc(90vh - 200px)', maxHeight: 'calc(90vh - 200px)' }}>
          {attachmentUrl ? (
            // Priority 1: Show uploaded attachment
            <>
              {isPDF ? (
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
              ) : isImage ? (
                <div className="flex items-center justify-center p-6 min-h-[600px]">
                  <img
                    src={attachmentUrl}
                    alt={attachmentFileName || 'Document'}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              ) : isWordDocx ? (
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
              ) : isWordDoc ? (
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
              ) : (
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
              )}
            </>
          ) : documentContentHtml ? (
            // Priority 2: Show DMS content
            <div
              className="prose prose-base dark:prose-invert max-w-none p-6"
              dangerouslySetInnerHTML={{ __html: documentContentHtml }}
            />
          ) : (
            // No document available
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-lg text-muted-foreground mb-2">No document preview available</p>
              <p className="text-sm text-muted-foreground">
                No document has been uploaded or linked to this correspondence.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pb-6">
          <div className="text-xs text-muted-foreground">
            {attachmentUrl ? 'Previewing uploaded document' : 'Preview reflects the latest document details and minute thread.'}
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