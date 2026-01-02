"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, Pencil, FolderTree, X, Layers, FilePlus, Eye, Download, Clock, User as UserIcon, Scan, Loader2, PenTool } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { formatFileSize } from '@/lib/file-utils';
import type { DocumentRecord, DocumentVersion } from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';
import type { CaptureJob } from '@/lib/capture-storage';
import { DocumentMetadataEditDialog } from './DocumentMetadataEditDialog';

interface DocumentMetadataCardProps {
  document: DocumentRecord;
  divisionLookup: Map<string, string>;
  departmentLookup: Map<string, string>;
  divisions?: Array<{ id: string; name: string }>;
  departments?: Array<{ id: string; name: string }>;
  onDocumentUpdate: (updated: DocumentRecord) => void;
  onLinkCase: () => void;
  onUnlinkCase?: (caseId: string) => Promise<void>;
  // Versions props
  versions?: DocumentVersion[];
  userLookup?: Map<string, User>;
  uploadUser?: User | null;
  versionOCRState?: Record<string, { isProcessing: boolean; currentJob: CaptureJob | null; error: string | null }>;
  onUploadVersion?: () => void;
  onCreateVersion?: () => void;
  onPreviewVersion?: (version: DocumentVersion) => void;
  onDownloadVersion?: (version: DocumentVersion) => void;
  onReplaceVersion?: (versionId: string) => Promise<void>;
  onProcessOCR?: (versionId: string) => Promise<void>;
  onCancelOCR?: (versionId: string) => Promise<void>;
}

const statusLabel = (status: DocumentRecord['status']) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
};

const statusVariant = (status: DocumentRecord['status']): 'outline' | 'default' | 'secondary' => {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'published':
      return 'default';
    case 'archived':
      return 'secondary';
    default:
      return 'outline';
  }
};

export const DocumentMetadataCard = ({
  document,
  divisionLookup,
  departmentLookup,
  divisions = [],
  departments = [],
  onDocumentUpdate,
  onLinkCase,
  onUnlinkCase,
  versions = [],
  userLookup = new Map(),
  uploadUser = null,
  versionOCRState = {},
  onUploadVersion,
  onCreateVersion,
  onPreviewVersion,
  onDownloadVersion,
  onReplaceVersion,
  onProcessOCR,
  onCancelOCR,
}: DocumentMetadataCardProps) => {
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Document Information
              </CardTitle>
              <CardDescription className="mt-1">
                Document details, linked cases, and versions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMetadataDialogOpen(true)}
              aria-label="Edit document metadata"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Reference Number */}
          {document?.referenceNumber && (
            <div className="mb-4 pb-4 border-b">
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Reference Number</Label>
              <p className="text-sm font-medium">{document.referenceNumber}</p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
                <Badge variant={statusVariant(document?.status || 'draft')}>
                  {statusLabel(document?.status || 'draft')}
                </Badge>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sensitivity</Label>
                <Badge
                  variant={document?.sensitivity === 'restricted' ? 'destructive' : 'outline'}
                  className="capitalize"
                >
                  {document?.sensitivity || 'internal'}
                </Badge>
              </div>
              {document?.divisionId && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Division</Label>
                  <p className="text-sm">{divisionLookup.get(document.divisionId) || 'Unknown'}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {document?.departmentId && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Department</Label>
                  <p className="text-sm">{departmentLookup.get(document.departmentId) || 'Unknown'}</p>
                </div>
              )}
              {document?.tags && document.tags.length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {document.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {document?.description && (
            <div className="mb-6 pb-6 border-b">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Description</Label>
              <p className="text-sm leading-relaxed text-muted-foreground">{document.description}</p>
            </div>
          )}

          {/* Case Links */}
          {document?.case_links && document.case_links.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-muted-foreground">Linked Cases</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLinkCase}
                  aria-label="Link case to document"
                >
                  <FolderTree className="h-3 w-3 mr-1" />
                  Link Case
                </Button>
              </div>
              <div className="space-y-2">
                {document.case_links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <FolderTree className="h-3 w-3" />
                      <Link
                        href={`/cases/${link.case.id}`}
                        className="hover:underline"
                      >
                        {link.case.caseNumber}
                      </Link>
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {link.case.title}
                    </span>
                    {onUnlinkCase && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive ml-auto"
                        onClick={async () => {
                          if (!confirm("Are you sure you want to unlink this document from the case?")) {
                            return;
                          }
                          await onUnlinkCase(link.case.id);
                        }}
                        title="Unlink from case"
                        aria-label="Unlink from case"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!document?.case_links || document.case_links.length === 0) && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Linked Cases</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLinkCase}
                  aria-label="Link case to document"
                >
                  <FolderTree className="h-3 w-3 mr-1" />
                  Link Case
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">No cases linked to this document</p>
            </div>
          )}

          {/* Versions Section */}
          {versions && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Versions
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">All uploaded versions of this document</p>
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
                ) : onUploadVersion ? (
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
                ) : null}
              </div>
              <div className="space-y-3">
                {versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium mb-1">No versions uploaded</p>
                    <p className="text-xs">Upload the first version to get started.</p>
                  </div>
                ) : (
                  versions.map((version, index) => {
                    const uploader = userLookup.get(version.uploadedBy);
                    const isLatest = index === 0;
                    const fileSize = version.fileSize ? formatFileSize(version.fileSize) : null;
                    const ocrState = versionOCRState?.[version.id];
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
                        className={`p-3 border rounded-lg transition-colors hover:bg-muted/50 ${
                          isLatest ? 'border-primary/40 bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Badge variant={isLatest ? 'default' : 'outline'} className="flex-shrink-0 text-xs">
                                v{version.versionNumber}
                              </Badge>
                              {isLatest && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  Latest
                                </Badge>
                              )}
                              <span className="text-sm font-medium text-foreground truncate min-w-0" title={version.fileName}>
                                {version.fileName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {onPreviewVersion && (version.fileName || (version.contentHtml && version.contentHtml.trim() !== '')) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onPreviewVersion(version)}
                                  title="Preview version"
                                  aria-label="Preview version"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {onDownloadVersion && version.fileUrl && version.fileUrl.trim() !== '' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onDownloadVersion(version)}
                                  title="Download version"
                                  aria-label="Download version"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {onProcessOCR && canShowOCR && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    if (isProcessing && onCancelOCR) {
                                      onCancelOCR(version.id);
                                    } else if (onProcessOCR) {
                                      onProcessOCR(version.id);
                                    }
                                  }}
                                  title={isProcessing ? 'Cancel OCR processing' : hasOCRText ? 'Re-process OCR' : 'Process OCR'}
                                  disabled={isProcessing && ocrState?.currentJob?.status === 'processing'}
                                  aria-label={isProcessing ? 'Cancel OCR' : 'Process OCR'}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Scan className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                              {onReplaceVersion && uploadUser &&
                                (uploadUser.id === version.uploadedBy || uploadUser.id === document.authorId) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => onReplaceVersion(version.id)}
                                    title="Replace this version"
                                    aria-label="Replace version"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">
                              {version.fileType?.split('/').pop() || version.fileType || 'Unknown'}
                            </span>
                            {fileSize && (
                              <>
                                <span>•</span>
                                <span>{fileSize}</span>
                              </>
                            )}
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatDateTime(version.uploadedAt)}</span>
                            {uploader && (
                              <>
                                <span>•</span>
                                <UserIcon className="h-3 w-3" />
                                <span>{uploader.name}</span>
                              </>
                            )}
                          </div>
                          {version.notes && (
                            <p className="text-xs text-muted-foreground">{version.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentMetadataEditDialog
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        document={document}
        onDocumentUpdate={onDocumentUpdate}
        divisions={divisions}
        departments={departments}
      />
    </>
  );
};

