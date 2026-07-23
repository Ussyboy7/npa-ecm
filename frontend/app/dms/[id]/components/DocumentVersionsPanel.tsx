"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Clock,
  User as UserIcon,
  FileText,
  GitCompare,
} from "lucide-react";
import { formatDateTime } from "@/lib/correspondence-helpers";
import { formatFileSize } from "@/lib/file-utils";
import type { DocumentRecord, DocumentVersion } from "@/lib/dms-storage";
import type { User } from "@/lib/npa-structure";
import type { CaptureJob } from "@/lib/capture-storage";
import { DocumentVersionDiffDialog } from "@/components/dms/DocumentVersionDiffDialog";
import { fetchDocumentVersionDiff, type DocumentVersionDiff } from "@/lib/dms-version-diff";
import { canDownloadDocument, downloadDocumentVersion } from "@/lib/dms-documents";
import { logError } from "@/lib/client-logger";
import { toast } from "sonner";

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

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Version history
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Upload, OCR, and manage versions</CardDescription>
          </div>
          {onCreateVersion ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!uploadUser} className="h-8 text-xs">
                  <FilePlus className="h-3.5 w-3.5 mr-1" />
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
            <Button variant="outline" size="sm" onClick={onQuickVersionUpload} disabled={!uploadUser} className="h-8 text-xs">
              <FilePlus className="h-3.5 w-3.5 mr-1" />
              Upload
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {versions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg text-xs">
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
              (version.fileUrl &&
                version.fileUrl.trim() !== "" &&
                (version.fileType?.startsWith("image/") ||
                  version.fileType === "application/pdf" ||
                  version.fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                  version.fileType === "application/msword" ||
                  version.fileName?.toLowerCase().endsWith(".docx") ||
                  version.fileName?.toLowerCase().endsWith(".doc"))) ||
              Boolean(version.contentHtml && version.contentHtml.trim() !== "");
            const olderVersion = index < versions.length - 1 ? versions[index + 1] : null;

            return (
              <div
                key={version.id}
                className={`p-2.5 border rounded-lg text-xs ${
                  isLatest ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={isLatest ? "default" : "outline"} className="text-[10px]">
                        v{version.versionNumber}
                      </Badge>
                      <span className="font-medium truncate" title={version.fileName}>
                        {version.fileName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                      {fileSize ? <span>{fileSize}</span> : null}
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(version.uploadedAt)}</span>
                      {uploader ? (
                        <>
                          <UserIcon className="h-3 w-3" />
                          <span>{uploader.name}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {(version.fileName || version.contentHtml?.trim()) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreviewVersion(version)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {olderVersion ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={`Compare to v${olderVersion.versionNumber}`}
                        onClick={() => void handleCompareWithPrevious(version, olderVersion)}
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {version.fileUrl?.trim() && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!canDownload}
                        title={canDownload ? "Download" : "Download blocked by DRM"}
                        aria-label={canDownload ? "Download" : "Download blocked by DRM"}
                        onClick={() => {
                          void handleDownload(version);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canShowOCR && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => (isProcessing ? onCancelOCR(version.id) : onVersionOCR(version.id))}
                        disabled={isProcessing && versionOCR?.currentJob?.status === "processing"}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Scan className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    {uploadUser &&
                      (uploadUser.id === version.uploadedBy || uploadUser.id === document.authorId) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onReplaceVersion(version.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                  </div>
                </div>
                {hasOCRText && (
                  <div className="flex items-center gap-2 mt-2 p-1.5 bg-muted/50 rounded text-[10px]">
                    <FileText className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground flex-1">OCR text available</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => onPreviewVersion(version)}>
                      View
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
      <DocumentVersionDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        diff={versionDiff}
        loading={diffLoading}
      />
    </Card>
  );
}
