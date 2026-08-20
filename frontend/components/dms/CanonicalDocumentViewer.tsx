"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import mammoth from "mammoth";
import { Loader2, AlertCircle } from "lucide-react";
import { SecurePdfCanvasPreview } from "@/components/dms/SecurePdfCanvasPreview";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { logError } from "@/lib/client-logger";
import {
  type CanonicalDocRef,
  canonicalDocLabel,
  fetchCanonicalContent,
  isDocxFileName,
  isImageFileName,
  isPdfFileName,
} from "@/lib/canonical-document";

interface CanonicalDocumentViewerProps {
  source: CanonicalDocRef;
  /**
   * Controls app-level download affordances / messaging only.
   * PDFs always render via canvas (no browser PDF chrome).
   */
  allowDownload?: boolean;
  fileType?: string | null;
  className?: string;
  minHeightClassName?: string;
}

function sourceKey(source: CanonicalDocRef): string {
  switch (source.kind) {
    case "dms-version":
      return `dms:${source.versionId}`;
    case "corr-attachment":
      return `att:${source.attachmentId}`;
    case "case-package":
      return `case:${source.caseId}`;
    case "html":
      return `html:${source.html.length}:${source.fileName ?? ""}`;
    default:
      return "unknown";
  }
}

/**
 * Renders a document from a canonical DocRef (never raw /media URLs).
 * PDFs always use canvas — never blob iframe (avoids browser Download/Print/Drive chrome).
 */
export function CanonicalDocumentViewer({
  source,
  allowDownload = true,
  fileType,
  className,
  minHeightClassName = "min-h-[480px]",
}: CanonicalDocumentViewerProps) {
  const fileName = canonicalDocLabel(source);
  const isPDF = isPdfFileName(fileName, fileType);
  const isImage = isImageFileName(fileName, fileType);
  const isDocx = isDocxFileName(fileName);
  const key = useMemo(() => sourceKey(source), [source]);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [htmlBody, setHtmlBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      setPdfBytes(null);
      setWordHtml(null);
      setHtmlBody(null);

      try {
        if (source.kind === "html") {
          if (cancelled) return;
          setHtmlBody(source.html);
          setLoading(false);
          return;
        }

        const blob = await fetchCanonicalContent(source);
        if (cancelled) return;

        if (isPDF) {
          setPdfBytes(await blob.arrayBuffer());
        } else if (isDocx) {
          const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
          if (cancelled) return;
          setWordHtml(result.value);
        } else if (blob.type.includes("html") || fileName.toLowerCase().endsWith(".html")) {
          setHtmlBody(await blob.text());
        } else {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        if (cancelled) return;
        logError("CanonicalDocumentViewer load failed", err);
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by sourceKey
  }, [key, isPDF, isDocx, fileName]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 p-12 text-muted-foreground ${minHeightClassName} ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Loading document…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 p-12 text-center ${minHeightClassName} ${className ?? ""}`}>
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">Unable to load document</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (htmlBody) {
    return (
      <div
        className={`prose prose-sm dark:prose-invert max-w-none p-6 ${className ?? ""}`}
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(htmlBody) }}
      />
    );
  }

  if (wordHtml) {
    return (
      <div
        className={`prose prose-sm dark:prose-invert max-w-none p-6 ${className ?? ""}`}
        dangerouslySetInnerHTML={{ __html: wordHtml }}
      />
    );
  }

  if (isPDF && pdfBytes) {
    return (
      <div className={`w-full overflow-auto ${minHeightClassName} ${className ?? ""}`}>
        {!allowDownload ? (
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            View-only — download is disabled by DRM policy.
          </p>
        ) : null}
        <SecurePdfCanvasPreview data={pdfBytes} minHeightClassName={minHeightClassName} />
      </div>
    );
  }

  if (isImage && blobUrl) {
    return (
      <div className={`relative w-full ${minHeightClassName} ${className ?? ""}`}>
        <Image src={blobUrl} alt={fileName} fill className="object-contain" unoptimized />
      </div>
    );
  }

  if (blobUrl) {
    return (
      <iframe
        src={blobUrl}
        className={`w-full border-0 ${minHeightClassName} ${className ?? ""}`}
        title={fileName}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center p-12 text-sm text-muted-foreground ${minHeightClassName}`}>
      No preview available for this file type.
    </div>
  );
}
