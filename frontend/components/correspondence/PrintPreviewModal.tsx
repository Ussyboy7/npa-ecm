"use client";

import React from 'react';
import { logError } from '@/lib/client-logger';
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { generateDocumentHTML } from '@/lib/document-generator';
import {
  type CanonicalDocRef,
  fetchCanonicalPrint,
  printCanonicalDocument,
} from '@/lib/canonical-document';
import { SecurePdfCanvasPreview } from '@/components/dms/SecurePdfCanvasPreview';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import { toast } from '@/components/ui/sonner';

interface PrintPreviewModalProps {
  correspondence: Correspondence;
  minutes: Minute[];
  isOpen: boolean;
  onClose: () => void;
  documentContentHtml?: string;
  attachmentFileName?: string;
  documentVersionId?: string;
  attachmentId?: string;
  onPrintLogged?: () => void;
}

const PrintPreviewModalContent = ({ 
  correspondence, 
  minutes, 
  isOpen, 
  onClose,
  documentContentHtml,
  attachmentFileName,
  documentVersionId,
  attachmentId,
  onPrintLogged,
}: PrintPreviewModalProps) => {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printRef = useMemo((): CanonicalDocRef | null => {
    if (documentVersionId) {
      return { kind: 'dms-version', versionId: documentVersionId, fileName: attachmentFileName };
    }
    if (attachmentId) {
      return { kind: 'corr-attachment', attachmentId, fileName: attachmentFileName };
    }
    return null;
  }, [documentVersionId, attachmentId, attachmentFileName]);

  useEffect(() => {
    if (!isOpen) {
      setPdfBytes(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (!printRef) {
        setLoading(false);
        setError(null);
        setPdfBytes(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const blob = await fetchCanonicalPrint(printRef);
        if (cancelled) return;
        setPdfBytes(await blob.arrayBuffer());
      } catch (err) {
        if (cancelled) return;
        logError('Error loading print preview file:', err);
        const message = err instanceof Error ? err.message : 'Failed to load file';
        setError(message);
        toast.error(
          message.includes('403') || /print blocked|DRM|Forbidden/i.test(message)
            ? 'Print blocked by DRM policy'
            : message,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, printRef]);

  const handlePrint = async () => {
    try {
      if (printRef) {
        await printCanonicalDocument(printRef);
        onPrintLogged?.();
        return;
      }
      // HTML composition print (no binary print stream)
      const html = generateDocumentHTML({
        correspondence,
        minutes,
        documentContentHtml,
        attachmentFileName,
      });
      await printCanonicalDocument({ kind: 'html', html, fileName: attachmentFileName || 'document.html' });
      onPrintLogged?.();
    } catch (err) {
      logError('Print failed', err);
      toast.error(err instanceof Error ? err.message : 'Print failed');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="2xl" height="fill">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Print Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border border-border rounded-lg bg-background">
          {printRef ? (
            <>
              {loading ? (
                <div className="flex items-center justify-center p-12 min-h-[600px]">
                  <p className="text-sm text-muted-foreground">Loading document…</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
                  <p className="text-lg font-medium mb-4 text-destructive">Error loading document</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                </div>
              ) : pdfBytes ? (
                <SecurePdfCanvasPreview data={pdfBytes} minHeightClassName="min-h-[600px]" />
              ) : null}
            </>
          ) : (
            <iframe
              srcDoc={generateDocumentHTML({ 
                correspondence, 
                minutes,
                documentContentHtml,
                attachmentFileName
              })}
              className="w-full h-full min-h-[600px] border-0"
              title="Print Preview"
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {printRef
              ? 'Use Print to open the system dialog (logged). Preview has no browser save chrome.'
              : 'Preview reflects the latest document details and minute thread.'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void handlePrint()} className="gap-2" disabled={Boolean(error && printRef)}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const PrintPreviewModal = React.memo((props: PrintPreviewModalProps) => (
  <ModalErrorBoundary onClose={props.onClose}>
    <PrintPreviewModalContent {...props} />
  </ModalErrorBoundary>
));
PrintPreviewModal.displayName = 'PrintPreviewModal';
