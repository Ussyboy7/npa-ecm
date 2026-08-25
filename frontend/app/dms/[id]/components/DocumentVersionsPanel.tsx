"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers,
  FilePlus,
  PenTool,
  Eye,
  Download,
  Pencil,
  Scan,
  Loader2,
  GitCompare,
  MoreVertical,
} from "lucide-react";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { formatFileSize } from "@/lib/file-utils";
import type { DocumentRecord, DocumentVersion } from "@/lib/api/dms";
import type { User } from "@/lib/npa-structure";
import type { CaptureJob } from "@/lib/api/capture";
import { DocumentVersionDiffDialog } from "@/components/dms/DocumentVersionDiffDialog";
import { fetchDocumentVersionDiff, type DocumentVersionDiff } from "@/lib/dms-version-diff";
import { canDownloadDocument, downloadDocumentVersion } from "@/lib/dms-documents";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";

type OCRState = Record<string, { isProcessing: boolean; currentJob: CaptureJob | null; error: string | null }>;

interface DocumentVersionsPanelProps {
  document: DocumentRecord;
  versions: DocumentVersion[];
  userLookup: Map<string, User>;
  uploadUser: User | null;
  ocrState: OCRState;
  onCreateVersion?: () => void;
  onQuickVersionUpload: () => void;
  onPreviewVersion: (version: DocumentVersion) => void;
  onReplaceVersion: (versionId: string) => void;
  onVersionOCR: (versionId: string) => void;
  onCancelOCR: (versionId: string) => void;
  onDownloadVersion?: (version: DocumentVersion) => void;
  /** Dense layout for narrow detail rail */
  compact?: boolean;
}

export function DocumentVersionsPanel({
  document,
  versions,
  userLookup,
  uploadUser,
  ocrState,
  onCreateVersion,
  onQuickVersionUpload,
  onPreviewVersion,
  onReplaceVersion,
  onVersionOCR,
  onCancelOCR,
  onDownloadVersion,
  compact = false,
}: DocumentVersionsPanelProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [versionDiff, setVersionDiff] = useState<DocumentVersionDiff | null>(null);
  const canDownload = canDownloadDocument(document);

  const handleDownload = async (version: DocumentVersion) => {
    if (!canDownload) {
      toast.error(document.drmRights?.message || "Download blocked by DRM policy");
      return;
    }
    if (onDownloadVersion) {
      onDownloadVersion(version);
      return;
    }
    try {
      await downloadDocumentVersion(version.id, version.fileName || "document");
    } catch (error) {
      logError("Failed to download version", error);
      toast.error(error instanceof Error ? error.message : "Download failed");
    }
  };

  const handleCompareWithPrevious = async (newer: DocumentVersion, older: DocumentVersion) => {
    setDiffOpen(true);
    setDiffLoading(true);
    setVersionDiff(null);
    try {
      const diff = await fetchDocumentVersionDiff(older.id, newer.id);
      setVersionDiff(diff);
    } catch (error) {
      logError("Failed to load version diff", error);
      toast.error("Failed to compare versions");
      setDiffOpen(false);
    } finally {
      setDiffLoading(false);
    }
  };

  const addButton = onCreateVersion ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!uploadUser}
          className="h-7 shrink-0 text-xs rounded-full gap-1 px-2.5"
        >
          <FilePlus className="h-3.5 w-3.5" />
          Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCreateVersion} disabled={!uploadUser}>
          <PenTool className="h-4 w-4 mr-2" />
          Create Version
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onQuickVersionUpload} disabled={!uploadUser}>
          <FilePlus className="h-4 w-4 mr-2" />
          Upload Version
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={onQuickVersionUpload}
      disabled={!uploadUser}
      className="h-7 shrink-0 text-xs rounded-full gap-1 px-2.5"
    >
      <FilePlus className="h-3.5 w-3.5" />
      Upload
    </Button>
  );

  const versionList = (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {versions.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-xl text-xs">
          No versions yet.
        </div>
      ) : (
        versions.map((version, index) => {
          const uploader = userLookup.get(version.uploadedBy);
          const isLatest = index === 0;
          const fileSize = version.fileSize ? formatFileSize(version.fileSize) : null;
          const versionOCR = ocrState?.[version.id];
          const isProcessing = versionOCR?.isProcessing || false;
          const hasOCRText = Boolean(version.ocrText && version.ocrText.trim() !== "");
          const canShowOCR =
            ((version.hasFile || Boolean(version.id)) &&
              (version.fileType?.startsWith("image/") ||
                version.fileType === "application/pdf" ||
                version.fileType ===
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                version.fileType === "application/msword" ||
                version.fileName?.toLowerCase().endsWith(".docx") ||
                version.fileName?.toLowerCase().endsWith(".doc"))) ||
            Boolean(version.contentHtml && version.contentHtml.trim() !== "");
          const olderVersion = index < versions.length - 1 ? versions[index + 1] : null;

          return (
            <div
              key={version.id}
              className={`px-2.5 py-2 rounded-xl text-xs min-w-0 overflow-hidden ${
                isLatest ? "bg-primary/6" : "hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start gap-1.5 min-w-0">
                <div className="min-w-0 flex-1 overflow-hidden space-y-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge
                      variant={isLatest ? "default" : "outline"}
                      className="text-[10px] flex-shrink-0"
                    >
                      v{version.versionNumber}
                    </Badge>
                    {fileSize ? (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {fileSize}
                      </span>
                    ) : null}
                    {isLatest ? (
                      <span className="text-[10px] text-muted-foreground shrink-0">latest</span>
                    ) : null}
                  </div>
                  <p
                    className="font-medium text-[12px] leading-snug break-all line-clamp-2"
                    title={version.fileName}
                  >
                    {version.fileName || `Version ${version.versionNumber}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {formatDateTime(version.uploadedAt)}
                    {uploader ? ` · ${uploader.name}` : ""}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {(version.fileName || version.contentHtml?.trim()) && (
                      <DropdownMenuItem onClick={() => onPreviewVersion(version)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview / OCR tools
                      </DropdownMenuItem>
                    )}
                    {olderVersion && (
                      <DropdownMenuItem
                        onClick={() => void handleCompareWithPrevious(version, olderVersion)}
                      >
                        <GitCompare className="h-4 w-4 mr-2" />
                        Compare to v{olderVersion.versionNumber}
                      </DropdownMenuItem>
                    )}
                    {(version.hasFile || Boolean(version.id)) && (
                      <DropdownMenuItem
                        disabled={!canDownload}
                        onClick={() => void handleDownload(version)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                    )}
                    {canShowOCR && (
                      <DropdownMenuItem
                        onClick={() =>
                          isProcessing ? onCancelOCR(version.id) : onVersionOCR(version.id)
                        }
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Scan className="h-4 w-4 mr-2" />
                        )}
                        {isProcessing ? "Cancel OCR" : "Run OCR"}
                      </DropdownMenuItem>
                    )}
                    {uploadUser &&
                      (uploadUser.id === version.uploadedBy ||
                        uploadUser.id === document.authorId) && (
                        <DropdownMenuItem onClick={() => onReplaceVersion(version.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Replace file
                        </DropdownMenuItem>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {hasOCRText && (
                <button
                  type="button"
                  className="mt-1.5 text-[10px] text-primary hover:underline"
                  onClick={() => onPreviewVersion(version)}
                >
                  OCR text available — view
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-[13px] font-semibold tracking-tight">Versions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Upload, OCR, replace
            </p>
          </div>
          {addButton}
        </div>
        {versionList}
        <DocumentVersionDiffDialog
          open={diffOpen}
          onOpenChange={setDiffOpen}
          diff={versionDiff}
          loading={diffLoading}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border/60 px-4 py-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Version history
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Upload, OCR, and manage versions</p>
          </div>
          {addButton}
        </div>
      </div>
      <div className="space-y-2 max-h-[360px] overflow-y-auto p-4 pr-1">{versionList}</div>
      <DocumentVersionDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        diff={versionDiff}
        loading={diffLoading}
      />
    </div>
  );
}
