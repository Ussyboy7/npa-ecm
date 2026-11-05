"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, AlertCircle } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { highlightHtml } from "@/lib/search-highlight";
import {
  downloadCanonicalDocument,
  fetchCanonicalContent,
} from "@/lib/canonical-document";
import { SecurePdfCanvasPreview } from "@/components/dms/SecurePdfCanvasPreview";
import { DrmWatermarkOverlay } from "@/components/dms/DrmWatermarkOverlay";
import type { DocumentVersion } from "@/lib/api/dms";
import { convertDocxArrayBufferToHtml } from "@/lib/docx-to-html";

interface DmsVersionPreviewContentProps {
  version: DocumentVersion;
  expanded?: boolean;
  allowDownload?: boolean;
  /** When false, block text selection / copy in the preview surface. */
  allowCopyText?: boolean;
  /** When set (from Search), highlight matches in HTML / Word preview. */
  highlightQuery?: string;
  watermarkText?: string | null;
}

function useScrollToSearchHit(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;
    const timer = window.setTimeout(() => {
      root.querySelector("mark.search-hit")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return containerRef;
}

export function DmsVersionPreviewContent({
  version,
  expanded = false,
  allowDownload = true,
  allowCopyText = true,
  highlightQuery = "",
  watermarkText = null,
}: DmsVersionPreviewContentProps) {
  const minHeight = expanded ? "min-h-[480px]" : "min-h-[200px]";
  const fileName = version.fileName || "Document";
  const isPDF = fileName.toLowerCase().endsWith(".pdf") || version.fileType === "application/pdf";
  const isImage = Boolean(fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) || version.fileType?.startsWith("image/"));
  const isWordDocx = fileName.toLowerCase().endsWith(".docx");
  const isWordDoc = fileName.toLowerCase().endsWith(".doc");
  const hasHtml = Boolean(version.contentHtml && version.contentHtml.trim() !== "");
  const hasBinary = Boolean(version.hasFile || version.id);
  const highlightActive = Boolean(highlightQuery.trim());
  const containerRef = useScrollToSearchHit(highlightActive);

  const [apiBlobUrl, setApiBlobUrl] = useState<string | null>(null);
  const [apiPdfBytes, setApiPdfBytes] = useState<ArrayBuffer | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!version.id || hasHtml || !hasBinary) {
      setApiBlobUrl(null);
      setApiPdfBytes(null);
      setWordHtml(null);
      setApiLoading(false);
      setApiError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setApiLoading(true);
    setApiError(null);
    setApiBlobUrl(null);
    setApiPdfBytes(null);
    setWordHtml(null);

    fetchCanonicalContent({
      kind: "dms-version",
      versionId: version.id,
      fileName: version.fileName,
    })
      .then(async (blob) => {
        if (cancelled) return;
        if (isPDF) {
          setApiPdfBytes(await blob.arrayBuffer());
        } else if (isWordDocx) {
          const html = await convertDocxArrayBufferToHtml(await blob.arrayBuffer());
          if (cancelled) return;
          setWordHtml(html);
        } else {
          objectUrl = URL.createObjectURL(blob);
          setApiBlobUrl(objectUrl);
        }
        setApiLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setApiError(err instanceof Error ? err.message : "Failed to load preview");
        setApiLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [version.id, version.fileName, hasHtml, hasBinary, isPDF, isWordDocx]);

  const handleDownload = async () => {
    if (!version.id || !allowDownload) return;
    await downloadCanonicalDocument({
      kind: "dms-version",
      versionId: version.id,
      fileName,
    });
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

  const renderHighlightedHtml = (html: string) => {
    const sanitized = sanitizeRichText(html);
    const withHits = highlightQuery.trim()
      ? highlightHtml(sanitized, highlightQuery.trim())
      : sanitized;
    return (
      <div
        className={`relative overflow-hidden ${minHeight} ${allowCopyText ? "" : "select-none"}`}
        onCopy={
          allowCopyText
            ? undefined
            : (event) => {
                event.preventDefault();
              }
        }
        onCut={
          allowCopyText
            ? undefined
            : (event) => {
                event.preventDefault();
              }
        }
      >
        <DrmWatermarkOverlay text={watermarkText} />
        <div
          ref={containerRef}
          className={`document-print-area doc-paper relative z-0 ${expanded ? "overflow-y-auto" : ""} ${expanded ? minHeight : "min-h-full"}`}
          style={{
            fontFamily: "Verdana, Geneva, sans-serif",
            fontSize: "12px",
            lineHeight: "1.5",
            padding: expanded ? "40px" : "24px",
            maxWidth: "900px",
            margin: "0 auto",
            textAlign: "left",
            userSelect: allowCopyText ? undefined : "none",
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
                .doc-paper table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
                .doc-paper td, .doc-paper th {
                  border: 1px solid #c4c4c4;
                  padding: 0.35rem 0.5rem;
                  vertical-align: top;
                }
                .doc-paper th { font-weight: 600; background: #f3f4f6; }
                .doc-paper p { margin: 0 0 0.55em; }
                .doc-paper img { max-width: 100%; height: auto; display: inline-block; }
              `,
            }}
          />
          <div dangerouslySetInnerHTML={{ __html: withHits }} />
        </div>
      </div>
    );
  };

  if (hasHtml) {
    return renderHighlightedHtml(version.contentHtml || "");
  }

  if (!version.id) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${minHeight}`}>
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No previewable version.</p>
      </div>
    );
  }

  if (apiLoading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 p-8 ${minHeight}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${minHeight}`}>
        <p className="text-sm text-destructive">{apiError}</p>
        {downloadButton("Download")}
      </div>
    );
  }

  if (isPDF) {
    if (apiPdfBytes) {
      return (
        <div className={`relative w-full overflow-auto ${minHeight}`}>
          <DrmWatermarkOverlay text={watermarkText} />
          {!allowDownload ? (
            <p className="relative z-0 px-4 pt-3 text-xs text-muted-foreground">
              View-only — download is disabled by DRM policy.
            </p>
          ) : null}
          <div className="relative z-0">
            <SecurePdfCanvasPreview data={apiPdfBytes} minHeightClassName={minHeight} />
          </div>
        </div>
      );
    }
  }

  if (isImage && apiBlobUrl) {
    return (
      <div className={`relative flex items-center justify-center p-4 bg-muted/20 ${minHeight} overflow-hidden`}>
        <DrmWatermarkOverlay text={watermarkText} />
        <Image
          src={apiBlobUrl}
          alt={fileName}
          width={800}
          height={600}
          className="relative z-0 max-w-full max-h-[70vh] object-contain"
          unoptimized
        />
      </div>
    );
  }

  if (isWordDocx && wordHtml) {
    return renderHighlightedHtml(wordHtml);
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
