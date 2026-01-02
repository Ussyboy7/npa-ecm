"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Layers, FilePlus, Eye, Download, Pencil, FileText, Clock, User as UserIcon, Tag, Scan, Loader2, PenTool } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { formatFileSize } from '@/lib/file-utils';
import type { DocumentRecord, DocumentVersion } from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';
import type { CaptureJob } from '@/lib/capture-storage';

interface DocumentVersionsSectionProps {
  document: DocumentRecord;
  versions: DocumentVersion[];
  userLookup: Map<string, User>;
  uploadUser: User | null;
  versionOCRState: Record<string, { isProcessing: boolean; currentJob: CaptureJob | null; error: string | null }>;
  onUploadVersion: () => void;
  onCreateVersion?: () => void;
  onPreviewVersion: (version: DocumentVersion) => void;
  onDownloadVersion: (version: DocumentVersion) => void;
  onReplaceVersion: (versionId: string) => Promise<void>;
  onProcessOCR: (versionId: string) => Promise<void>;
  onCancelOCR: (versionId: string) => Promise<void>;
}

export const DocumentVersionsSection = ({
  document,
  versions,
  userLookup,
  uploadUser,
  versionOCRState,
  onUploadVersion,
  onCreateVersion,
  onPreviewVersion,
  onDownloadVersion,
  onReplaceVersion,
  onProcessOCR,
  onCancelOCR,
}: DocumentVersionsSectionProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Versions
            </CardTitle>
            <CardDescription className="mt-1">
              All uploaded versions of this document
            </CardDescription>
          </div>
          {onCreateVersion ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!uploadUser}
                  aria-label="Add new version"
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  Add Version
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCreateVersion} disabled={!uploadUser}>
                  <PenTool className="h-4 w-4 mr-2" />
                  Create Version
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onUploadVersion} disabled={!uploadUser}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Upload Version
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onUploadVersion}
              disabled={!uploadUser}
              aria-label="Upload new version"
            >
              <FilePlus className="h-4 w-4 mr-2" />
              Upload Version
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium mb-1">No versions uploaded</p>
              <p className="text-xs">Upload the first version to get started.</p>
            </div>
          ) : (
            versions.map((version, index) => {
              const uploader = userLookup.get(version.uploadedBy);
              const isLatest = index === 0;
              const fileSize = version.fileSize ? formatFileSize(version.fileSize) : null;
              const ocrState = versionOCRState[version.id];
              const isProcessing = ocrState?.isProcessing || false;
              const hasOCRText = version.ocrText && version.ocrText.trim() !== '';
              const canShowOCR = (version.fileUrl && version.fileUrl.trim() !== '' &&
                (version.fileType?.startsWith('image/') ||
                  version.fileType === 'application/pdf' ||
                  version.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                  version.fileType === 'application/msword' ||
                  version.fileName?.toLowerCase().endsWith('.docx') ||
                  version.fileName?.toLowerCase().endsWith('.doc')) ||
                (version.contentHtml && version.contentHtml.trim() !== ''));

              return (
                <div
                  key={version.id}
                  className={`p-4 border rounded-lg transition-colors hover:bg-muted/50 ${
                    isLatest ? 'border-primary/40 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant={isLatest ? 'default' : 'outline'} className="flex-shrink-0">
                          v{version.versionNumber}
                        </Badge>
                        {isLatest && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            Latest
                          </Badge>
                        )}
                        <span
                          className="text-sm font-medium text-foreground truncate min-w-0"
                          title={version.fileName}
                        >
                          {version.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Preview button */}
                        {(version.fileName || (version.contentHtml && version.contentHtml.trim() !== '')) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPreviewVersion(version)}
                            title="Preview version"
                            aria-label="Preview version"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Download button */}
                        {version.fileUrl && version.fileUrl.trim() !== '' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onDownloadVersion(version)}
                            title="Download version"
                            aria-label="Download version"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {/* OCR button */}
                        {canShowOCR && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (isProcessing) {
                                onCancelOCR(version.id);
                              } else {
                                onProcessOCR(version.id);
                              }
                            }}
                            title={
                              isProcessing
                                ? 'Cancel OCR processing'
                                : hasOCRText
                                  ? 'Re-process OCR'
                                  : 'Process OCR'
                            }
                            disabled={isProcessing && ocrState?.currentJob?.status === 'processing'}
                            aria-label={isProcessing ? 'Cancel OCR' : 'Process OCR'}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Scan className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {/* Replace version button */}
                        {uploadUser &&
                          (uploadUser.id === version.uploadedBy || uploadUser.id === document.authorId) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onReplaceVersion(version.id)}
                              title="Replace this version"
                              aria-label="Replace version"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        <span className="capitalize">
                          {version.fileType.split('/').pop() || version.fileType}
                        </span>
                      </div>
                      {fileSize && (
                        <div className="flex items-center gap-1.5">
                          <span>•</span>
                          <span>{fileSize}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(version.uploadedAt)}</span>
                      </div>
                      {uploader && (
                        <div className="flex items-center gap-1.5">
                          <span>•</span>
                          <UserIcon className="h-3 w-3" />
                          <span>{uploader.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {version.notes && (
                      <div className="flex items-start gap-2 text-xs">
                        <Tag className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">{version.notes}</span>
                      </div>
                    )}

                    {/* Content Preview */}
                    {version.contentText && (
                      <p className="text-muted-foreground/80 text-xs leading-4 line-clamp-2">
                        {version.contentText}
                      </p>
                    )}

                    {/* Summary */}
                    {version.summary && (
                      <div className="text-xs leading-4 border border-primary/20 bg-primary/5 text-primary-foreground/90 rounded-md p-2">
                        <span className="font-semibold">Summary:</span> {version.summary}
                      </div>
                    )}

                    {/* OCR Status and Text */}
                    {(isProcessing || hasOCRText) && (
                      <div className="flex items-center gap-2 text-xs">
                        {isProcessing && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing OCR...
                          </Badge>
                        )}
                        {hasOCRText && !isProcessing && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            OCR Available
                          </Badge>
                        )}
                      </div>
                    )}
                    {version.ocrText && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          <span className="font-semibold">OCR Text</span> (click to expand)
                        </summary>
                        <div className="mt-2 p-2 border border-border bg-muted/60 rounded-md text-muted-foreground">
                          {version.ocrText}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};


