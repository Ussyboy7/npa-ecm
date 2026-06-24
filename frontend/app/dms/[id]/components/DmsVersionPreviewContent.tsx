"use client";

import Image from "next/image";
import { Download, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { sanitizeRichText } from "@/lib/sanitize-html";
import type { DocumentVersion } from "@/lib/dms-storage";

interface DmsVersionPreviewContentProps {
  version: DocumentVersion;
  expanded?: boolean;
}

export function DmsVersionPreviewContent({
  version,
  expanded = false,
}: DmsVersionPreviewContentProps) {
  const { pdfBlobUrl, wordHtml, isLoading, error } = useDocumentPreview({
    fileUrl: version.fileUrl,
    fileName: version.fileName,
    fileType: version.fileType,
  });

  const minHeight = expanded ? "min-h-[480px]" : "min-h-[200px]";
  const fileName = version.fileName || "Document";
  const isPDF = fileName.toLowerCase().endsWith(".pdf") || version.fileType === "application/pdf";
  const isImage = Boolean(fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) || version.fileType?.startsWith("image/"));
  const isWordDocx = fileName.toLowerCase().endsWith(".docx");
  const isWordDoc = fileName.toLowerCase().endsWith(".doc");
  const hasHtml = Boolean(version.contentHtml && version.contentHtml.trim() !== "");
  const hasFile = Boolean(version.fileUrl && version.fileUrl.trim() !== "");

  const downloadButton = (label: string) =>
    hasFile ? (
      <a
        href={version.fileUrl as string}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
      >
        <Download className="h-4 w-4" />
        {label}
      </a>
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

  if (!hasFile) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${minHeight}`}>
        <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium mb-1">No preview available</p>
        <p className="text-xs text-muted-foreground">Upload a file to preview this version.</p>
      </div>
    );
  }

  if (isPDF) {
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
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          {downloadButton("Download PDF")}
        </div>
      );
    }
    if (pdfBlobUrl) {
      return (
        <div className={expanded ? minHeight : "h-full min-h-0"}>
          <iframe
            src={pdfBlobUrl}
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
        <div className={`prose prose-sm dark:prose-invert max-w-none p-6 ${expanded ? `overflow-y-auto ${minHeight}` : ""}`}>
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
