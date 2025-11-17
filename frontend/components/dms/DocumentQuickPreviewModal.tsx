"use client";

import { useEffect, useState } from "react";
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
import { Loader2, Download, ExternalLink, FileText } from "lucide-react";
import type { DocumentRecord } from "@/lib/dms-storage";
import { formatDate, formatDateTime } from "@/lib/correspondence-helpers";
import { useRouter } from "next/navigation";

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

  const latestVersion = document?.versions?.[0];
  const isPDF = latestVersion?.fileType === 'application/pdf' || latestVersion?.fileName?.toLowerCase().endsWith('.pdf');

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

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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
                  dangerouslySetInnerHTML={{ __html: latestVersion.contentHtml }}
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

