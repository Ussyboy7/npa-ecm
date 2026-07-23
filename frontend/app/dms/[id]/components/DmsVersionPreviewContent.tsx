"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, FileText, Loader2, AlertCircle } from "lucide-react";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { sanitizeRichText } from "@/lib/sanitize-html";
import {
  downloadDocumentVersion,
  fetchDocumentVersionContent,
} from "@/lib/dms-documents";
import { SecurePdfCanvasPreview } from "@/components/dms/SecurePdfCanvasPreview";
import type { DocumentVersion } from "@/lib/dms-storage";

interface DmsVersionPreviewContentProps {
  version: DocumentVersion;
  expanded?: boolean;
  allowDownload?: boolean;
}

export function DmsVersionPreviewContent({
  version,
  expanded = false,
  allowDownload = true,
}: DmsVersionPreviewContentProps) {
  const minHeight = expanded ? "min-h-[480px]" : "min-h-[200px]";
  const fileName = version.fileName || "Document";
  const isPDF = fileName.toLowerCase().endsWith(".pdf") || version.fileType === "application/pdf";
  const isImage = Boolean(fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) || version.fileType?.startsWith("image/"));
  const isWordDocx = fileName.toLowerCase().endsWith(".docx");
  const isWordDoc = fileName.toLowerCase().endsWith(".doc");
  const hasHtml = Boolean(version.contentHtml && version.contentHtml.trim() !== "");
  const hasFile = Boolean(version.fileUrl && version.fileUrl.trim() !== "");
  const useDrmPdfStream = Boolean(isPDF && version.id && !hasHtml);
  // View-only: never expose a blob URL (browser PDF chrome has its own Download).
  const useSecureCanvas = useDrmPdfStream && !allowDownload;

  const [drmPdfUrl, setDrmPdfUrl] = useState<string | null>(null);
  const [drmPdfBytes, setDrmPdfBytes] = useState<ArrayBuffer | null>(null);
  const [drmLoading, setDrmLoading] = useState(false);
  const [drmError, setDrmError] = useState<string | null>(null);

  useEffect(() => {
    if (!useDrmPdfStream || !version.id) {
      setDrmPdfUrl(null);
      setDrmPdfBytes(null);
      setDrmLoading(false);
      setDrmError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setDrmLoading(true);
    setDrmError(null);
    setDrmPdfUrl(null);
    setDrmPdfBytes(null);

    fetchDocumentVersionContent(version.id)
      .then(async (blob) => {
        if (cancelled) return;
        if (useSecureCanvas) {
          const bytes = await blob.arrayBuffer();
          if (cancelled) return;
          setDrmPdfBytes(bytes);
        } else {
          objectUrl = URL.createObjectURL(blob);
          setDrmPdfUrl(objectUrl);
        }
        setDrmLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load PDF preview";
        setDrmError(message);
        setDrmLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [useDrmPdfStream, useSecureCanvas, version.id]);

  const { pdfBlobUrl, wordHtml, isLoading, error } = useDocumentPreview({
    fileUrl: hasHtml || useDrmPdfStream ? undefined : version.fileUrl,
    fileName: version.fileName,
    fileType: version.fileType,
  });

  const handleDownload = async () => {
    if (!version.id || !allowDownload) return;
    await downloadDocumentVersion(version.id, fileName);
  };

  const downloadButton = (label: string) =>
    version.id && allowDownload ? (
      <button
        type="button"
        onClick={() => {
          void handleDownload();
        }}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
      >
        <Download className="h-4 w-4" />
        {label}
      </button>
    ) : null;

  if (hasHtml) {
    return (
      <div
        className={`document-print-area bg-white ${expanded ? "overflow-y-auto" : ""} ${expanded ? minHeight : "min-h-full"}`}
        style={{
          fontFamily: "Verdana, Geneva, sans-serif",
          fontSize: "12px",
          lineHeight: "1.5",
          color: "#000",
          padding: expanded ? "40px" : "24px",
          maxWidth: "800px",
          margin: "0 auto",
          textAlign: "left",
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(version.contentHtml!) }}
          aria-label="Document content"
        />
      </div>
    );
  }

  if (!hasFile && !useDrmPdfStream) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${minHeight}`}>
        <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium mb-1">No preview available</p>
        <p className="text-xs text-muted-foreground">Upload a file to preview this version.</p>
      </div>
    );
  }

  if (isPDF) {
    const loading = useDrmPdfStream ? drmLoading : isLoading;
    const previewError = useDrmPdfStream ? drmError : error;
    const blobUrl = useDrmPdfStream ? drmPdfUrl : pdfBlobUrl;

    if (loading) {
      return (
        <div className={`flex items-center justify-center ${minHeight}`}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (previewError) {
      return (
        <div className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${minHeight}`}>
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{previewError}</p>
          {downloadButton("Download PDF")}
        </div>
      );
    }
    if (useSecureCanvas && drmPdfBytes) {
      return (
        <div className={expanded ? minHeight : "h-full min-h-0 overflow-auto"}>
          <p className="px-3 pt-2 text-[11px] text-muted-foreground">
            View-only — download is disabled by DRM policy.
          </p>
          <SecurePdfCanvasPreview
            data={drmPdfBytes}
            minHeightClassName={expanded ? "min-h-[480px]" : "min-h-[240px]"}
          />
        </div>
      );
    }
    if (blobUrl) {
      return (
        <div className={expanded ? minHeight : "h-full min-h-0"}>
          <iframe
            src={blobUrl}
            className={
              expanded
                ? "w-full border-0 h-[calc(100vh-8rem)] min-h-[480px]"
                : "w-full h-full min-h-[240px] border-0"
            }
            title={`Preview of ${fileName}`}
          />
        </div>
      );
    }
    return (
      <div className={`flex flex-col items-center justify-center gap-3 p-8 ${minHeight}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={`flex items-center justify-center p-4 bg-muted/20 ${minHeight}`}>
        <Image
          src={version.fileUrl as string}
          alt={fileName}
          width={800}
          height={600}
          className="max-w-full max-h-[70vh] object-contain"
          unoptimized
        />
      </div>
    );
  }

  if (isWordDocx) {
    if (isLoading) {
      return (
        <div className={`flex items-center justify-center ${minHeight}`}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (error) {
      return (
        <div className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${minHeight}`}>
          <p className="text-sm text-destructive">{error}</p>
          {downloadButton("Download document")}
        </div>
      );
    }
    if (wordHtml) {
      return (
        <div
          className={`document-print-area bg-white ${expanded ? "overflow-y-auto" : ""} ${expanded ? minHeight : "min-h-full"}`}
          style={{
            fontFamily: "Verdana, Geneva, sans-serif",
            fontSize: "12px",
            lineHeight: "1.5",
            color: "#000",
            padding: expanded ? "40px" : "24px",
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "left",
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(wordHtml) }} />
        </div>
      );
    }
  }

  if (isWordDoc) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${minHeight}`}>
        <p className="text-sm font-medium">{fileName}</p>
        <p className="text-xs text-muted-foreground">Preview is not available for .doc files.</p>
        {downloadButton("Download to view")}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${minHeight}`}>
      <FileText className="h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm font-medium">{fileName}</p>
      <p className="text-xs text-muted-foreground">Inline preview is not supported for this file type.</p>
      {downloadButton("Download to view")}
    </div>
  );
}
