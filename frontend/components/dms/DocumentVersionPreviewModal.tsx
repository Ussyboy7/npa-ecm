"use client";

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
import type { DocumentVersion } from "@/lib/dms-storage";
import mammoth from "mammoth";

interface DocumentVersionPreviewModalProps {
  version: DocumentVersion;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentVersionPreviewModal = ({ 
  version, 
  isOpen, 
  onClose
}: DocumentVersionPreviewModalProps) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Determine file type based on fileName (even if fileUrl is missing)
  const isPDF = version.fileName?.toLowerCase().endsWith('.pdf');
  const isImage = version.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isWordDocx = version.fileName?.toLowerCase().endsWith('.docx');
  const isWordDoc = version.fileName?.toLowerCase().endsWith('.doc');
  
  // Fetch file as blob when modal opens
  useEffect(() => {
    if (isOpen) {
      // If there's HTML content, no need to fetch
      if (version.contentHtml && version.contentHtml.trim() !== '') {
        setLoading(false);
        setError(null);
        return;
      }
      
      // If there's a fileUrl, fetch it
      if (version.fileUrl && version.fileUrl.trim() !== '') {
        console.log('DocumentVersionPreviewModal: Fetching file', {
          fileUrl: version.fileUrl,
          fileName: version.fileName,
          fileType: version.fileType,
          isPDF,
          isWordDocx
        });
        setLoading(true);
        setError(null);
        
        // Fetch the file with authentication
        fetch(version.fileUrl, {
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
                  console.error('Error converting Word document:', err);
                  setError(`Failed to convert Word document: ${err.message}`);
                  setLoading(false);
                });
            } else {
              // For other file types, just reset loading
              setLoading(false);
            }
          })
          .catch(err => {
            console.error('Error loading file:', err);
            setError(err.message);
            setLoading(false);
          });
      } else {
        // No fileUrl and no contentHtml
        console.log('DocumentVersionPreviewModal: No fileUrl or contentHtml', {
          hasFileUrl: !!version.fileUrl,
          fileUrl: version.fileUrl,
          hasContentHtml: !!(version.contentHtml && version.contentHtml.trim() !== ''),
          fileName: version.fileName
        });
        setLoading(false);
        setError(null);
      }
    } else {
      // Reset state when modal closes
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
  }, [isOpen, isPDF, isWordDocx, version.fileUrl, version.contentHtml]);
  
  const handlePrint = () => {
    if (isPDF && pdfBlobUrl) {
      // For PDFs, print directly from blob URL
      const printWindow = window.open(pdfBlobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else if (isWordDocx && wordHtml) {
      // For Word documents, create a print-friendly HTML page
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${version.fileName || 'Document'}</title>
          <style>
            @media print {
              body { margin: 0; }
            }
            body {
              font-family: 'Times New Roman', serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              line-height: 1.6;
            }
            .prose {
              max-width: none;
            }
          </style>
        </head>
        <body>
          <div class="prose">
            ${wordHtml}
          </div>
        </body>
        </html>
      `;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else if (version.contentHtml) {
      // For HTML content, print it
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${version.fileName || 'Document'}</title>
          <style>
            @media print {
              body { margin: 0; }
            }
            body {
              font-family: 'Times New Roman', serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          ${version.contentHtml}
        </body>
        </html>
      `;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
    onClose();
  };

  const handleDownload = () => {
    if (version.fileUrl) {
      const link = document.createElement('a');
      link.href = version.fileUrl;
      link.download = version.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="space-y-1 px-6 pt-6 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Document Preview</DialogTitle>
          <DialogDescription>
            {version.fileName || 'Document'} · Version {version.versionNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 border-t border-b overflow-y-auto" style={{ height: 'calc(90vh - 200px)', maxHeight: 'calc(90vh - 200px)' }}>
          {version.contentHtml && version.contentHtml.trim() !== '' ? (
            // Priority 1: Show HTML content from editor
            <div className="prose prose-base dark:prose-invert max-w-none p-6">
              <div dangerouslySetInnerHTML={{ __html: version.contentHtml }} />
            </div>
          ) : version.fileUrl && version.fileUrl.trim() !== '' ? (
            // Priority 2: Show uploaded file
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
                        href={version.fileUrl}
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
                      data={version.fileUrl}
                      type="application/pdf"
                      className="w-full h-full min-h-[600px] border-0"
                      title="Document Preview"
                    >
                      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                        <p className="text-lg font-medium mb-4">Unable to display PDF</p>
                        <a
                          href={version.fileUrl}
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
                    src={version.fileUrl}
                    alt={version.fileName || 'Document'}
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
                        href={version.fileUrl}
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
                  <p className="text-lg font-medium mb-4">{version.fileName || 'Word Document'}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview is not available for .doc files. Please download to view.
                  </p>
                  <a
                    href={version.fileUrl}
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
                  <p className="text-lg font-medium mb-4">{version.fileName || 'Document'}</p>
                  <a
                    href={version.fileUrl}
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
          ) : (
            // No document available - but show helpful message
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-lg text-muted-foreground mb-2">No document preview available</p>
              <p className="text-sm text-muted-foreground mb-4">
                {version.fileName 
                  ? `File "${version.fileName}" was uploaded but the file URL is not available. This may be a data issue.`
                  : 'No file or content has been uploaded for this version.'}
              </p>
              {version.fileName && (
                <p className="text-xs text-muted-foreground">
                  File Type: {version.fileType || 'Unknown'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pb-6">
          <div className="text-xs text-muted-foreground">
            {version.fileUrl ? 'Previewing uploaded document' : version.contentHtml ? 'Previewing editor content' : 'No preview available'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {version.fileUrl && (
              <Button className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


