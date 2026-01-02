/**
 * Custom hook for managing document preview (PDF and Word documents)
 * Handles blob URL creation, cleanup, loading states, and error handling
 */

import { useEffect, useState, useRef } from 'react';
import { logError, logWarn } from '@/lib/client-logger';
import { getStoredAccessToken } from '@/lib/api-client';
import { buildDownloadUrl, fixMediaUrl, ensureAbsoluteUrl } from '@/lib/correspondence-url-utils';
import {
  FILE_LOAD_TIMEOUT,
  PDF_IFRAME_FALLBACK_TIMEOUT,
  FILE_TYPE_PDF,
  FILE_EXTENSION_DOCX,
  COMPLETION_PACKAGE_PATTERNS,
} from '@/lib/correspondence-constants';
import mammoth from 'mammoth';

export interface Attachment {
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

export interface UseDocumentPreviewResult {
  pdfBlobUrl: string | null;
  wordHtml: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for previewing PDF and Word documents from attachments
 * 
 * @param attachment - The attachment object containing fileUrl, fileName, and fileType
 * @returns Object containing pdfBlobUrl, wordHtml, isLoading, and error states
 */
export const useDocumentPreview = (attachment: Attachment | null | undefined): UseDocumentPreviewResult => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset state if no attachment
    if (!attachment?.fileUrl) {
      setPdfBlobUrl(null);
      setWordHtml(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fileName = attachment.fileName || '';
    const isPDF = attachment.fileType === FILE_TYPE_PDF;
    const isWordDocx = fileName.toLowerCase().endsWith(FILE_EXTENSION_DOCX);

    // Only process PDF and Word documents
    if (!isPDF && !isWordDocx) {
      setPdfBlobUrl(null);
      setWordHtml(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Build the proper download URL
    const fileUrl = buildDownloadUrl(attachment.fileUrl);
    
    if (!fileUrl) {
      setError('Invalid file URL');
      setIsLoading(false);
      return;
    }

    // Get authentication token
    const token = getStoredAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    
    // Set up timeout
    timeoutIdRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        logError('File load timeout after 60 seconds:', { fileUrl, fileName });
        setError('File load timeout. The file may be too large or the server is slow. Please try downloading the file.');
        setIsLoading(false);
      }
    }, FILE_LOAD_TIMEOUT);

    fetch(fileUrl, {
      credentials: 'include',
      headers,
      signal: abortControllerRef.current.signal,
    })
      .then((response) => {
        if (!response.ok) {
          // Handle 404 gracefully
          if (response.status === 404) {
            if (timeoutIdRef.current) {
              clearTimeout(timeoutIdRef.current);
              timeoutIdRef.current = null;
            }
            
            logWarn('File not found (404):', { fileUrl, fileName });
            
            // Only show error for non-completion-package files
            const isCompletionPackage = COMPLETION_PACKAGE_PATTERNS.some(
              pattern => fileName.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (!isCompletionPackage) {
              setError(`File "${fileName}" not found on server. It may have been deleted or moved.`);
            } else {
              setError(null);
            }
            setIsLoading(false);
            return null;
          }
          throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then((blob) => {
        // Skip if blob is null (404 case)
        if (!blob) {
          return;
        }

        // Clear timeout on success
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        if (isPDF) {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setPdfBlobUrl(url);
          setWordHtml(null);
          setIsLoading(false);
        } else if (isWordDocx) {
          // Convert Word document to HTML using mammoth
          blob.arrayBuffer()
            .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
            .then((result) => {
              setWordHtml(result.value);
              setPdfBlobUrl(null);
              setIsLoading(false);
            })
            .catch((err) => {
              logError('Error converting Word document:', err);
              setError(`Failed to convert Word document: ${err.message}`);
              setWordHtml(null);
              setIsLoading(false);
            });
        }
      })
      .catch((err) => {
        // Clear timeout on error
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
        
        // Don't show error if request was aborted (cleanup or timeout)
        if (err.name === 'AbortError') {
          logWarn('File load aborted:', { fileUrl, fileName });
          return;
        }
        
        logError('Error loading file', err);
        setError(`Failed to load ${isPDF ? 'PDF' : 'Word document'} preview. Please try downloading the file.`);
        setIsLoading(false);
      });

    // Cleanup on unmount or when attachment changes
    return () => {
      // Clear timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      
      // Abort fetch if in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Cleanup blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setPdfBlobUrl(null);
      setWordHtml(null);
      setIsLoading(false);
    };
  }, [attachment?.fileUrl, attachment?.fileType, attachment?.fileName]);

  // Fallback timeout for iframe loading - clear loading state if iframe onLoad doesn't fire
  useEffect(() => {
    if (pdfBlobUrl && isLoading) {
      const fallbackTimeout = setTimeout(() => {
        logWarn('PDF iframe load timeout - clearing loading state as fallback', { pdfBlobUrl });
        setIsLoading(false);
      }, PDF_IFRAME_FALLBACK_TIMEOUT);
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [pdfBlobUrl, isLoading]);

  return {
    pdfBlobUrl,
    wordHtml,
    isLoading,
    error,
  };
};

