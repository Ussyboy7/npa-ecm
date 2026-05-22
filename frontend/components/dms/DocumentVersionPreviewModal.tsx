"use client";

import { logError, logInfo } from '@/lib/client-logger';
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
import { Printer, Download, FileText, Edit2, Save, X } from "lucide-react";
import type { DocumentVersion, DocumentRecord } from "@/lib/dms-storage";
import { createDocumentVersion } from "@/lib/dms-storage";
import mammoth from "mammoth";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface DocumentVersionPreviewModalProps {
  version: DocumentVersion;
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
  onVersionCreated?: (updatedDocument: DocumentRecord) => void;
}

export const DocumentVersionPreviewModal = ({ 
  version, 
  isOpen, 
  onClose,
  documentId,
  onVersionCreated,
}: DocumentVersionPreviewModalProps) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingOCR, setIsEditingOCR] = useState(false);
  const [editedOCRText, setEditedOCRText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
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
        logInfo('DocumentVersionPreviewModal: Fetching file', {
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
        // No fileUrl and no contentHtml
        logInfo('DocumentVersionPreviewModal: No fileUrl or contentHtml', {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPDF, isWordDocx, version.fileUrl, version.contentHtml]);

  // Initialize edited text when version changes or modal opens
  useEffect(() => {
    if (version.ocrText) {
      setEditedOCRText(version.ocrText);
    }
    setIsEditingOCR(false);
  }, [version.ocrText, isOpen]);
  
  const handleStartEdit = () => {
    setEditedOCRText(version.ocrText || '');
    setIsEditingOCR(true);
  };

  const handleCancelEdit = () => {
    setEditedOCRText(version.ocrText || '');
    setIsEditingOCR(false);
  };

  const handleSaveOCRVersion = async () => {
    if (!documentId || !editedOCRText.trim()) {
      toast.error('Please enter some text to save');
      return;
    }

    setIsSaving(true);
    try {
      // Convert plain text to HTML (preserve line breaks)
      const htmlContent = editedOCRText
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
        .join('');

      const updated = await createDocumentVersion(documentId, {
        fileName: `${version.fileName?.replace(/\.[^/.]+$/, '') || 'document'}-edited-v${version.versionNumber + 1}.html`,
        fileType: 'text/html',
        fileSize: new Blob([htmlContent]).size,
        contentHtml: htmlContent,
        notes: `Edited version based on OCR text from version ${version.versionNumber}`,
      });

      toast.success('New version created successfully');
      setIsEditingOCR(false);
      if (onVersionCreated) {
        onVersionCreated(updated);
      }
      onClose();
    } catch (err) {
      logError('Failed to create new version from edited OCR text', err);
      toast.error('Failed to save new version');
    } finally {
      setIsSaving(false);
    }
  };
  
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
      <DialogContent className="max-w-6xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="space-y-1 px-6 pt-6 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Document Preview</DialogTitle>
          <DialogDescription>
            {version.fileName || 'Document'} · Version {version.versionNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 border-t border-b overflow-y-auto" style={{ height: 'calc(90vh - 200px)', maxHeight: 'calc(90vh - 200px)' }}>
          {/* Show tabs if OCR text is available */}
          {version.ocrText && version.ocrText.trim() !== '' ? (
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList className="mx-6 mt-4">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="ocr">
                  <FileText className="h-4 w-4 mr-2" />
                  Extracted Text ({version.ocrText.length} chars)
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="flex-1 overflow-y-auto mt-0">
                {version.contentHtml && version.contentHtml.trim() !== '' ? (
                  // Priority 1: Show HTML content from editor (sanitized)
                  <div className="prose prose-base dark:prose-invert max-w-none p-6">
                    <div 
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(version.contentHtml) }}
                      aria-label="Document content"
                    />
                  </div>
                ) : version.fileUrl && version.fileUrl.trim() !== '' ? (
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
                            aria-label={`Preview of ${version.fileName || 'document'}`}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                            <p className="text-lg font-medium mb-4">Loading PDF preview...</p>
                            <p className="text-sm text-muted-foreground mb-4">
                              If the preview doesn't load, you can download the file instead.
                            </p>
                            <a
                              href={version.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                              aria-label={`Download ${version.fileName || 'PDF document'}`}
                            >
                              <Download className="h-4 w-4" />
                              Download PDF
                            </a>
                          </div>
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
                            <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(wordHtml) }} />
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
              </TabsContent>
              <TabsContent value="ocr" className="flex-1 overflow-y-auto mt-0">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Extracted Text</h3>
                        <p className="text-xs text-muted-foreground">
                          {isEditingOCR ? editedOCRText.length : version.ocrText.length} characters extracted from {version.fileName || 'document'}
                        </p>
                      </div>
                      {documentId && !isEditingOCR && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartEdit}
                          className="gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit & Save as New Version
                        </Button>
                      )}
                    </div>
                    {isEditingOCR ? (
                      <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg border">
                          <Textarea
                            value={editedOCRText}
                            onChange={(e) => setEditedOCRText(e.target.value)}
                            className="min-h-[400px] font-mono text-sm resize-none border-0 bg-transparent"
                            placeholder="Edit the extracted text..."
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveOCRVersion}
                            disabled={isSaving || !editedOCRText.trim()}
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save as New Version'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <pre className="text-sm whitespace-pre-wrap font-mono text-foreground">
                          {version.ocrText}
                        </pre>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : version.contentHtml && version.contentHtml.trim() !== '' ? (
            // Priority 1: Show HTML content from editor (sanitized)
            <div className="prose prose-base dark:prose-invert max-w-none p-6">
              <div 
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(version.contentHtml) }}
                aria-label="Document content"
              />
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
                      aria-label={`Preview of ${version.fileName || 'document'}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                      <p className="text-lg font-medium mb-4">Loading PDF preview...</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        If the preview doesn't load, you can download the file instead.
                      </p>
                      <a
                        href={version.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        aria-label={`Download ${version.fileName || 'PDF document'}`}
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </a>
                    </div>
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
                      <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(wordHtml) }} />
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

