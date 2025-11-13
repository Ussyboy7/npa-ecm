"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { generateDocumentHTML, downloadAsPDF } from '@/lib/document-generator';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import mammoth from 'mammoth';

interface PrintPreviewModalProps {
  correspondence: Correspondence;
  minutes: Minute[];
  isOpen: boolean;
  onClose: () => void;
  documentContentHtml?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
}

export const PrintPreviewModal = ({ 
  correspondence, 
  minutes, 
  isOpen, 
  onClose,
  documentContentHtml,
  attachmentUrl,
  attachmentFileName
}: PrintPreviewModalProps) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isPDF = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.pdf');
  const isWordDocx = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.docx');
  const isWordDoc = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.doc');
  
  // Fetch PDF or Word document as blob when modal opens
  useEffect(() => {
    if (isOpen && attachmentUrl) {
      setLoading(true);
      setError(null);
      
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
                console.error('Error converting Word document:', err);
                setError(`Failed to convert Word document: ${err.message}`);
                setLoading(false);
              });
          } else {
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Error loading file:', err);
          setError(err.message);
          setLoading(false);
        });
    } else {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      setWordHtml(null);
      setLoading(false);
      setError(null);
    }
    
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, isPDF, isWordDocx, attachmentUrl]);
  
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
          <title>${attachmentFileName || 'Document'}</title>
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
    } else {
      // For other content, use the document generator
      downloadAsPDF({ 
        correspondence, 
        minutes,
        documentContentHtml,
        attachmentUrl,
        attachmentFileName
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Print Preview & Download
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border border-border rounded-lg bg-background">
          {isPDF && attachmentUrl ? (
            <>
              {loading ? (
                <div className="flex items-center justify-center p-12 min-h-[600px]">
                  <p className="text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                  <p className="text-lg font-medium mb-4 text-destructive">Error loading PDF</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <iframe
                    srcDoc={generateDocumentHTML({ 
                      correspondence, 
                      minutes,
                      documentContentHtml,
                      attachmentUrl,
                      attachmentFileName
                    })}
                    className="w-full h-full min-h-[600px] border-0"
                    title="Print Preview"
                  />
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Print Preview"
                />
              ) : (
                <iframe
                  srcDoc={generateDocumentHTML({ 
                    correspondence, 
                    minutes,
                    documentContentHtml,
                    attachmentUrl,
                    attachmentFileName
                  })}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Print Preview"
                />
              )}
            </>
          ) : isWordDocx && attachmentUrl ? (
            <>
              {loading ? (
                <div className="flex items-center justify-center p-12 min-h-[600px]">
                  <p className="text-sm text-muted-foreground">Loading Word document...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                  <p className="text-lg font-medium mb-4 text-destructive">Error loading Word document</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                </div>
              ) : wordHtml ? (
                <div className="prose prose-base dark:prose-invert max-w-none p-6">
                  <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
                </div>
              ) : null}
            </>
          ) : isWordDoc && attachmentUrl ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <p className="text-lg font-medium mb-4">{attachmentFileName || 'Word Document'}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Print preview is not available for .doc files. Please download to view.
              </p>
            </div>
          ) : (
            <iframe
              srcDoc={generateDocumentHTML({ 
                correspondence, 
                minutes,
                documentContentHtml,
                attachmentUrl,
                attachmentFileName
              })}
              className="w-full h-full min-h-[600px] border-0"
              title="Print Preview"
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {(isPDF || isWordDocx) && attachmentUrl ? 'Previewing uploaded document' : 'Preview reflects the latest document details and minute thread.'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

