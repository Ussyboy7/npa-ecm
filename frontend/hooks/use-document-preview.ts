/**
 * Document preview hook — loads DOCX (and draft data: PDFs) via canonical delivery.
 * Stored PDF previews use SecurePdfCanvasPreview at the call site (no blob iframe).
 */

import { useEffect, useState, useRef } from 'react';
import { logError } from '@/lib/client-logger';
import {
  FILE_LOAD_TIMEOUT,
  FILE_TYPE_PDF,
  FILE_EXTENSION_DOCX,
} from '@/lib/correspondence-constants';
import {
  type CanonicalDocRef,
  fetchCanonicalContent,
} from '@/lib/canonical-document';
import mammoth from 'mammoth';

export interface Attachment {
  /** Prefer id fields — fileUrl is ignored except data: URLs for local drafts. */
  id?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  /** When set, loads as DMS version content. */
  versionId?: string | null;
}

export interface UseDocumentPreviewResult {
  /** @deprecated PDFs use canvas at call sites; always null for stored files. */
  pdfBlobUrl: string | null;
  wordHtml: string | null;
  isLoading: boolean;
  error: string | null;
}

function resolvePreviewRef(attachment: Attachment): CanonicalDocRef | null {
  if (attachment.versionId) {
    return {
      kind: 'dms-version',
      versionId: attachment.versionId,
      fileName: attachment.fileName ?? undefined,
    };
  }
  if (attachment.id) {
    return {
      kind: 'corr-attachment',
      attachmentId: attachment.id,
      fileName: attachment.fileName ?? undefined,
    };
  }
  return null;
}

/**
 * Preview Word (mammoth) from a correspondence attachment id or DMS version id.
 * PDFs are intentionally not loaded here — callers use SecurePdfCanvasPreview.
 */
export const useDocumentPreview = (attachment: Attachment | null | undefined): UseDocumentPreviewResult => {
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (!attachment) {
      setWordHtml(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fileName = attachment.fileName || '';
    const isPDF =
      attachment.fileType === FILE_TYPE_PDF || fileName.toLowerCase().endsWith('.pdf');
    const isWordDocx = fileName.toLowerCase().endsWith(FILE_EXTENSION_DOCX);

    // PDF canvas preview is owned by SecurePdfCanvasPreview call sites.
    if (isPDF || !isWordDocx) {
      setWordHtml(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const ref = resolvePreviewRef(attachment);
    const dataUrl =
      !ref && attachment.fileUrl?.startsWith('data:') ? attachment.fileUrl : null;

    if (!ref && !dataUrl) {
      setWordHtml(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    timeoutIdRef.current = setTimeout(() => {
      logError('File load timeout after 60 seconds:', { fileName });
      if (!cancelledRef.current) {
        setError('File load timeout. Please try downloading the file.');
        setIsLoading(false);
      }
    }, FILE_LOAD_TIMEOUT);

    const load = async () => {
      try {
        let blob: Blob;
        if (ref) {
          blob = await fetchCanonicalContent(ref);
        } else {
          const response = await fetch(dataUrl!);
          if (!response.ok) {
            throw new Error(`Failed to load file: ${response.status}`);
          }
          blob = await response.blob();
        }
        if (cancelledRef.current) return;

        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        if (cancelledRef.current) return;
        setWordHtml(result.value);
        setIsLoading(false);
      } catch (err) {
        if (cancelledRef.current) return;
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
        logError('Error loading file', err);
        setError('Failed to load Word document preview. Please try downloading the file.');
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelledRef.current = true;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      setWordHtml(null);
      setIsLoading(false);
    };
  }, [attachment?.id, attachment?.versionId, attachment?.fileType, attachment?.fileName, attachment?.fileUrl]);

  return {
    pdfBlobUrl: null,
    wordHtml,
    isLoading,
    error,
  };
};
