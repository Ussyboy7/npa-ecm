"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { highlightText, isOcrMatchField } from "@/lib/search-highlight";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  FileText,
  Download,
  Maximize2,
  X,
  PanelRightClose,
  PanelRightOpen,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormDocumentEditor } from "@/components/dms/FormDocumentEditor";
import { formatFileSize } from "@/lib/file-utils";
import type { DocumentRecord, DocumentVersion } from "@/lib/api/dms";
import { DmsVersionPreviewContent } from "./DmsVersionPreviewContent";
import { DocumentVersionStrip } from "./DocumentVersionStrip";
import { DocumentVersionsPanel } from "./DocumentVersionsPanel";
import { detailType } from "@/lib/detail-type";
import { cn } from "@/lib/utils";
import { downloadDocumentVersion } from "@/lib/dms-documents";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";

type VersionsManageProps = Omit<
  ComponentProps<typeof DocumentVersionsPanel>,
  "document" | "versions" | "compact"
>;

interface DocumentPreviewPanelProps {
  document: DocumentRecord;
  documentId: string;
  formDocumentId: string | null;
  versions: DocumentVersion[];
  selectedVersion: DocumentVersion | null;
  onSelectVersion: (version: DocumentVersion) => void;
  onDownload?: (version: DocumentVersion) => void;
  canDownload?: boolean;
  documentFocus?: boolean;
  onToggleDocumentFocus?: () => void;
  /** When set, Preview | Versions toggle and Manage strip open this panel. */
  versionsManage?: VersionsManageProps;
  /** Search highlight from /search?q=…&match=… */
  highlightQuery?: string;
  matchField?: string;
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
  canDownload = true,
  documentFocus = false,
  onToggleDocumentFocus,
  versionsManage,
  highlightQuery = "",
  matchField = "",
}: DocumentPreviewPanelProps) {
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [documentSurface, setDocumentSurface] = useState<"preview" | "manage">("preview");
  const preferOcr =
    Boolean(highlightQuery.trim()) &&
    isOcrMatchField(matchField) &&
    Boolean(selectedVersion?.ocrText?.trim());
  const [previewTab, setPreviewTab] = useState<"preview" | "ocr">(preferOcr ? "ocr" : "preview");
  const ocrPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preferOcr) setPreviewTab("ocr");
  }, [preferOcr, highlightQuery, matchField, selectedVersion?.id]);

  useEffect(() => {
    if (previewTab !== "ocr" || !highlightQuery.trim()) return;
    const timer = window.setTimeout(() => {
      ocrPaneRef.current?.querySelector("mark.search-hit")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [previewTab, highlightQuery, selectedVersion?.id]);

  const isForm = document.documentType === "form";
  const showVersionStrip = versions.length > 1 || Boolean(versionsManage);
  const isManageMode = documentSurface === "manage" && Boolean(versionsManage) && !isForm;
  const hasOcr = Boolean(selectedVersion?.ocrText?.trim());
  const showOcrTab = hasOcr;

  const handleDownload = () => {
    if (!selectedVersion || !canDownload) return;
    if (onDownload) {
      onDownload(selectedVersion);
      return;
    }
    if (!selectedVersion.id) {
      toast.error("No downloadable version");
      return;
    }
    void downloadDocumentVersion(selectedVersion.id, selectedVersion.fileName || "document").catch(
      (err: unknown) => {
        logError("Download failed", err);
        toast.error(err instanceof Error ? err.message : "Download failed");
      },
    );
  };

  return (
    <aside className="w-full flex flex-col flex-1 min-h-0 overflow-hidden bg-muted/10">
      {!isPreviewFullscreen && (
        <div className="px-4 py-2.5 border-b border-border/40 flex-shrink-0 bg-background/80 backdrop-blur-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className={cn(detailType.panelTitle, "flex items-center gap-2")}>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Document
            </h3>
            {versionsManage && !isForm ? (
              <div className="inline-flex items-center rounded-full bg-muted/60 p-0.5">
                <Button
                  variant={documentSurface === "preview" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2.5 text-[11px] rounded-full"
                  onClick={() => setDocumentSurface("preview")}
                >
                  Preview
                </Button>
                <Button
                  variant={documentSurface === "manage" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2.5 text-[11px] rounded-full gap-1"
                  onClick={() => setDocumentSurface("manage")}
                >
                  <FolderOpen className="h-3 w-3" />
                  Versions{versions.length > 0 ? ` · ${versions.length}` : ""}
                </Button>
              </div>
            ) : null}
          </div>
          {onToggleDocumentFocus && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={onToggleDocumentFocus}
              title={documentFocus ? "Show details panel" : "Focus on document"}
            >
              {documentFocus ? (
                <>
                  <PanelRightOpen className="h-3.5 w-3.5" />
                  Show details
                </>
              ) : (
                <>
                  <PanelRightClose className="h-3.5 w-3.5" />
                  Focus
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {isManageMode && versionsManage ? (
        <div className="flex-1 m-3 border border-border/50 rounded-2xl shadow-sm bg-background min-h-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              <DocumentVersionsPanel
                document={document}
                versions={versions}
                compact
                {...versionsManage}
              />
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 p-3 gap-0 overflow-hidden">
          {isForm && formDocumentId ? (
            <ScrollArea className="flex-1 min-h-0 rounded-2xl border border-border/50 bg-background shadow-sm">
              <FormDocumentEditor documentId={documentId} formDocumentId={formDocumentId} />
            </ScrollArea>
          ) : isForm ? (
            <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
              Loading form…
            </div>
          ) : (
            <div
              className={cn(
                "flex flex-col min-w-0 flex-1 min-h-0 overflow-hidden",
                isPreviewFullscreen &&
                  "fixed inset-3 z-50 bg-background border border-border/50 rounded-2xl shadow-2xl",
              )}
            >
              <div
                className={cn(
                  "bg-background border border-border/50 shadow-sm flex flex-col min-w-0 flex-1 min-h-0 overflow-hidden",
                  isPreviewFullscreen
                    ? "border-0 shadow-none rounded-none h-full"
                    : showVersionStrip
                      ? "rounded-t-2xl rounded-b-none border-b-0"
                      : "rounded-2xl",
                )}
              >
                {selectedVersion && (
                  <div className="border-b border-border/40 bg-background/90 px-3 md:px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0 min-w-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(detailType.fileTitle, "truncate")}
                          title={selectedVersion.fileName}
                        >
                          {selectedVersion.fileName || "Document"}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-2 flex-wrap mt-0.5",
                            detailType.caption,
                          )}
                        >
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
                      {selectedVersion.hasFile ||
                      Boolean(selectedVersion.id) ||
                      selectedVersion.contentHtml?.trim() ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleDownload}
                          disabled={!canDownload}
                          title={canDownload ? "Download" : "Download blocked by DRM"}
                          aria-label={canDownload ? "Download" : "Download blocked by DRM"}
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

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  {selectedVersion ? (
                    showOcrTab ? (
                      <Tabs
                        value={previewTab}
                        onValueChange={(v) => setPreviewTab(v as "preview" | "ocr")}
                        className="flex h-full min-h-0 flex-col"
                      >
                        <TabsList className="mx-3 mt-2 w-fit shrink-0">
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                          <TabsTrigger value="ocr">
                            Extracted text
                            {preferOcr ? " · match" : ""}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-y-auto">
                          <DmsVersionPreviewContent
                            version={selectedVersion}
                            expanded={isPreviewFullscreen}
                            allowDownload={canDownload}
                            highlightQuery={isOcrMatchField(matchField) ? "" : highlightQuery}
                          />
                        </TabsContent>
                        <TabsContent value="ocr" className="mt-0 min-h-0 flex-1 overflow-y-auto">
                          <div
                            ref={ocrPaneRef}
                            className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-foreground"
                          >
                            {highlightText(selectedVersion.ocrText || "", highlightQuery)}
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <DmsVersionPreviewContent
                        version={selectedVersion}
                        expanded={isPreviewFullscreen}
                        allowDownload={canDownload}
                        highlightQuery={highlightQuery}
                      />
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-muted-foreground">
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
                  onManageVersions={
                    versionsManage ? () => setDocumentSurface("manage") : undefined
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
