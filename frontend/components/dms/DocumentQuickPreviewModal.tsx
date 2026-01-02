"use client";

import { useEffect, useState } from "react";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, ExternalLink, FileText, FileCheck, PenTool } from "lucide-react";
import type { DocumentRecord } from "@/lib/dms-storage";
import { formatDate, formatDateTime } from "@/lib/correspondence-helpers";
import { useRouter } from "next/navigation";
import { getFormDocument } from "@/lib/api/dms-forms";
import { sanitizeRichText } from "@/lib/sanitize-html";

interface DocumentQuickPreviewModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentQuickPreviewModal = ({
  document,
  isOpen,
  onClose,
}: DocumentQuickPreviewModalProps) => {
  const router = useRouter();
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown> | null>(null);
  const [loadingFormData, setLoadingFormData] = useState(false);

  const latestVersion = document?.versions?.[0];
  const isPDF = latestVersion?.fileType === 'application/pdf' || latestVersion?.fileName?.toLowerCase().endsWith('.pdf');
  const isForm = document?.documentType === 'form';

  useEffect(() => {
    if (isOpen && document && isPDF && latestVersion?.fileUrl) {
      setLoading(true);
      setError(null);
      
      fetch(latestVersion.fileUrl, {
        credentials: 'include',
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load PDF: ${response.status}`);
          }
          return response.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          setError('Failed to load PDF preview');
          setLoading(false);
        });
    } else {
      setPdfBlobUrl(null);
      setLoading(false);
      setError(null);
    }

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, document, isPDF, latestVersion?.fileUrl]);

  // Load form data if it's a form document
  useEffect(() => {
    if (isOpen && isForm && document?.form_document?.id) {
      setLoadingFormData(true);
      getFormDocument(document.form_document.id)
        .then((formDoc) => {
          setFormData(formDoc.form_data || {});
          setLoadingFormData(false);
        })
        .catch((err) => {
          logError('Failed to load form data:', err);
          setLoadingFormData(false);
        });
    } else {
      setFormData(null);
    }
  }, [isOpen, isForm, document?.form_document?.id]);

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {document.title}
          </DialogTitle>
          <DialogDescription className="mt-2">
            {document.referenceNumber ? `Ref: ${document.referenceNumber}` : 'Document preview'}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize">
              {document.documentType}
            </Badge>
            <Badge variant={document.status === 'published' ? 'default' : 'outline'} className="capitalize">
              {document.status}
            </Badge>
            {isForm && document.form_document?.status && (
              <Badge variant={document.form_document.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                {document.form_document.status.replace('_', ' ')}
              </Badge>
            )}
            {isForm && document.form_document?.template && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileCheck className="h-3 w-3" />
                {document.form_document.template.name}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="font-medium">{formatDate(document.createdAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              <span className="font-medium">{formatDate(document.updatedAt)}</span>
            </div>
            {latestVersion && (
              <>
                <div>
                  <span className="text-muted-foreground">Version:</span>{" "}
                  <span className="font-medium">{latestVersion.versionNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Uploaded:</span>{" "}
                  <span className="font-medium">{formatDateTime(latestVersion.uploadedAt)}</span>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          {document.description && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{document.description}</p>
            </div>
          )}

          {/* Form Data Preview */}
          {isForm && document.form_document && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Form Information</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {document.form_document.template && (
                  <div>
                    <span className="text-muted-foreground">Template:</span>{" "}
                    <span className="font-medium">{document.form_document.template.name}</span>
                  </div>
                )}
                {document.form_document.status && (
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className="font-medium capitalize">{document.form_document.status.replace('_', ' ')}</span>
                  </div>
                )}
                {document.form_document.signature_workflow && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Signatures:</span>{" "}
                    <span className="font-medium">
                      {document.form_document.signature_workflow.completed_signatures ?? 0} / {document.form_document.signature_workflow.total_signatures ?? 0} completed
                    </span>
                  </div>
                )}
              </div>
              {loadingFormData ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading form data...</span>
                </div>
              ) : formData && Object.keys(formData).length > 0 ? (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h5 className="text-xs font-semibold mb-2 text-muted-foreground">Form Data Preview</h5>
                  <div className="space-y-2 text-sm">
                    {Object.entries(formData).slice(0, 10).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium ml-2 text-right max-w-[60%] truncate">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(formData).length > 10 && (
                      <p className="text-xs text-muted-foreground italic pt-2">
                        ... and {Object.keys(formData).length - 10} more fields
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No form data available</div>
              )}
            </div>
          )}

          {/* Preview Content */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-sm text-destructive">
                  {error}
                </div>
              ) : isForm ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Form document preview</p>
                  <p className="text-xs mt-2">Click "Open Full View" to edit and manage this form</p>
                </div>
              ) : isPDF && pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-[600px] border-0"
                  title={`PDF Preview: ${document.title}`}
                  aria-label={`PDF document preview: ${document.title}`}
                />
              ) : latestVersion?.contentHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(latestVersion.contentHtml) }}
                />
              ) : latestVersion?.contentText ? (
                <div className="whitespace-pre-wrap text-sm">
                  {latestVersion.contentText}
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No preview available for this document type.</p>
                  {latestVersion?.fileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => window.open(latestVersion.fileUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (latestVersion?.fileUrl) {
                  window.open(latestVersion.fileUrl, '_blank');
                }
              }}
              disabled={!latestVersion?.fileUrl}
              aria-label="Download document"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => {
                onClose();
                router.push(`/dms/${document.id}`);
              }}
              aria-label="Open full document view"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full View
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

