"use client";

import { useState } from "react";
import { FileText, Download, Maximize2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormDocumentEditor } from "@/components/dms/FormDocumentEditor";
import { formatFileSize } from "@/lib/file-utils";
import type { DocumentRecord, DocumentVersion } from "@/lib/dms-storage";
import { DmsVersionPreviewContent } from "./DmsVersionPreviewContent";
import { DocumentVersionStrip } from "./DocumentVersionStrip";

interface DocumentPreviewPanelProps {
  document: DocumentRecord;
  documentId: string;
  formDocumentId: string | null;
  versions: DocumentVersion[];
  selectedVersion: DocumentVersion | null;
  onSelectVersion: (version: DocumentVersion) => void;
  onDownload?: (version: DocumentVersion) => void;
}

function fileTypeLabel(version: DocumentVersion): string {
  const name = version.fileName?.toLowerCase() || "";
  if (name.endsWith(".pdf") || version.fileType === "application/pdf") return "PDF";
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "Image";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "Word";
  if (version.contentHtml?.trim()) return "HTML";
  return "Document";
}

export function DocumentPreviewPanel({
  document,
  documentId,
  formDocumentId,
  versions,
  selectedVersion,
  onSelectVersion,
  onDownload,
}: DocumentPreviewPanelProps) {
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const isForm = document.documentType === "form";
  const showVersionStrip = versions.length > 1;

  const handleDownload = () => {
    if (!selectedVersion) return;
    if (onDownload) {
      onDownload(selectedVersion);
      return;
    }
    if (!selectedVersion.fileUrl?.trim()) return;
    const link = window.document.createElement("a");
    link.href = selectedVersion.fileUrl;
    link.download = selectedVersion.fileName || "document";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <aside className="w-full flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      <div className="flex flex-col flex-1 min-h-0 p-3 md:p-4 gap-0">
        {isForm && formDocumentId ? (
          <ScrollArea className="flex-1">
            <FormDocumentEditor documentId={documentId} formDocumentId={formDocumentId} />
          </ScrollArea>
        ) : isForm ? (
          <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">Loading form…</div>
        ) : (
          <div
            className={`flex flex-col min-w-0 flex-1 min-h-[400px] ${
              isPreviewFullscreen
                ? "fixed inset-4 z-50 bg-white dark:bg-background border border-border rounded-lg overflow-hidden shadow-lg"
                : "min-h-0"
            }`}
          >
            <div
              className={`bg-white dark:bg-background border border-border shadow-sm flex flex-col min-w-0 flex-1 min-h-0 overflow-hidden ${
                isPreviewFullscreen ? "border-0 shadow-none rounded-none h-full" : showVersionStrip ? "rounded-t-lg rounded-b-none border-b-0" : "rounded-lg"
              }`}
            >
              {selectedVersion && (
                <div className="border-b border-border bg-muted/30 px-3 md:px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" title={selectedVersion.fileName}>
                        {selectedVersion.fileName || "Document"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {fileTypeLabel(selectedVersion)}
                        </Badge>
                        {selectedVersion.fileSize ? (
                          <span>{formatFileSize(selectedVersion.fileSize)}</span>
                        ) : null}
                        <span>v{selectedVersion.versionNumber}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {selectedVersion.fileUrl?.trim() || selectedVersion.contentHtml?.trim() ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleDownload}
                        title="Download"
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {!isPreviewFullscreen ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setIsPreviewFullscreen(true)}
                        title="Expand preview"
                        aria-label="Expand preview"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setIsPreviewFullscreen(false)}
                        title="Exit expanded preview"
                        aria-label="Exit expanded preview"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto">
                {selectedVersion ? (
                  <DmsVersionPreviewContent
                    version={selectedVersion}
                    compact={!isPreviewFullscreen}
                    expanded={isPreviewFullscreen}
                  />
                ) : (
                  <div className="flex items-center justify-center min-h-[320px] text-sm text-muted-foreground">
                    Select a version to preview.
                  </div>
                )}
              </div>
            </div>

            {!isPreviewFullscreen && showVersionStrip && (
              <DocumentVersionStrip
                versions={versions}
                selectedVersionId={selectedVersion?.id ?? null}
                onSelectVersion={onSelectVersion}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
