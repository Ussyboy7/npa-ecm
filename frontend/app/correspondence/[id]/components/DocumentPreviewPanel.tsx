"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Info,
  Users,
  Download,
  Maximize2,
  X,
  Upload,
  Link as LinkIcon,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import type { Correspondence, DistributionRecipient } from '@/lib/npa-structure';
import type { DocumentRecord } from '@/lib/dms-storage';
import { buildDownloadUrl } from '@/lib/correspondence-url-utils';
import { useDocumentPreview } from '@/hooks/use-document-preview';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface DocumentPreviewPanelProps {
  correspondence: Correspondence;
  linkedDocuments: DocumentRecord[];
  selectedLinkedDocVersion: Record<string, number>;
  attachmentSearchQuery: string;
  isPreviewFullscreen: boolean;
  isCompleted: boolean;
  division: { name: string } | null;
  department: { name: string } | null;
  directorates: Array<{ id: string; name: string }>;
  divisions: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  onSetSelectedLinkedDocVersion: (version: Record<string, number>) => void;
  onSetAttachmentSearchQuery: (query: string) => void;
  onSetIsPreviewFullscreen: (fullscreen: boolean) => void;
  onSetSelectedAttachmentIndex: (index: number | null) => void;
  onOpenLinkDocument: () => void;
  onOpenDocumentPreview: () => void;
  onSyncFromApi: () => Promise<void>;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType?: string, fileName?: string) => {
  if (!fileType && !fileName) return FileText;
  
  const type = fileType?.toLowerCase() || '';
  const ext = fileName?.toLowerCase().split('.').pop() || '';
  
  if (type.includes('pdf') || ext === 'pdf') return FileText;
  if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return FileImage;
  if (type.includes('spreadsheet') || type.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (type.includes('word') || ['doc', 'docx'].includes(ext)) return FileText;
  if (type.includes('video') || ['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return FileVideo;
  if (type.includes('code') || ['js', 'ts', 'py', 'html', 'css', 'json', 'xml'].includes(ext)) return FileCode;
  return FileText;
};

const getFileTypeLabel = (fileType?: string, fileName?: string) => {
  if (!fileType && !fileName) return 'Document';
  
  const type = fileType?.toLowerCase() || '';
  const ext = fileName?.toLowerCase().split('.').pop() || '';
  
  if (type.includes('pdf') || ext === 'pdf') return 'PDF';
  if (type.includes('image')) return 'Image';
  if (type.includes('spreadsheet') || type.includes('excel') || ['xls', 'xlsx'].includes(ext)) return 'Spreadsheet';
  if (type.includes('word') || ['doc', 'docx'].includes(ext)) return 'Word Document';
  if (type.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'Presentation';
  if (type.includes('text') || ext === 'txt') return 'Text';
  return 'Document';
};

export const DocumentPreviewPanel = ({
  correspondence,
  linkedDocuments,
  selectedLinkedDocVersion,
  attachmentSearchQuery,
  isPreviewFullscreen,
  isCompleted,
  division,
  department,
  directorates,
  divisions,
  departments,
  onSetSelectedLinkedDocVersion,
  onSetAttachmentSearchQuery,
  onSetIsPreviewFullscreen,
  onSetSelectedAttachmentIndex,
  onOpenLinkDocument,
  onOpenDocumentPreview,
  onSyncFromApi,
}: DocumentPreviewPanelProps) => {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  
  const firstAttachment = correspondence?.attachments?.[0];
  const { pdfBlobUrl, wordHtml, isLoading: documentPreviewLoading, error: documentPreviewError } = useDocumentPreview(firstAttachment);
  
  // Get the auto-created document ID (first linked document, or use correspondence's auto_created_document_id if available)
  const autoCreatedDocumentId = (correspondence as Correspondence & { auto_created_document_id?: string })?.auto_created_document_id || linkedDocuments[0]?.id;

  const resolveDistributionName = (recipient: DistributionRecipient) => {
    if (recipient.type === 'directorate') {
      if (recipient.directorateId) {
        const directorate = directorates.find((dir) => dir.id === recipient.directorateId);
        if (directorate) return directorate.name;
      }
      return recipient.name ?? 'Directorate';
    }

    if (recipient.type === 'department') {
      if (recipient.departmentId) {
        const departmentRecord = departments.find((dept) => dept.id === recipient.departmentId);
        if (departmentRecord) return departmentRecord.name;
      }
    }

    if (recipient.divisionId) {
      const divisionRecord = divisions.find((div) => div.id === recipient.divisionId);
      if (divisionRecord) return divisionRecord.name;
    }

    return recipient.name ?? 'Recipient';
  };

  const handleAttachmentUpload = useCallback(async (files: File[]) => {
    if (!correspondence || files.length === 0) return;

    try {
      await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('correspondence', correspondence.id);
          
          // Use the attachments endpoint instead of PATCH on correspondence
          await apiFetch('/correspondence/attachments/', {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set Content-Type for FormData
          });
        })
      );

      toast.success(`${files.length} file(s) uploaded successfully`);
      await onSyncFromApi();
    } catch (error: unknown) {
      logError('Failed to upload attachments', error);
      let errorMessage = 'Please try again.';
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorMessage = (data.detail as string) || errorMessage;
          }
        }
        if (errorMessage === 'Please try again.') {
          errorMessage = (errorObj.message as string) || errorMessage;
        }
      }
      toast.error('Unable to upload files', {
        description: errorMessage,
      });
    }
  }, [correspondence, onSyncFromApi]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      void handleAttachmentUpload(files);
    }
  };

  const filteredAttachments = correspondence.attachments?.filter((att) => {
    if (!attachmentSearchQuery) return true;
    const query = attachmentSearchQuery.toLowerCase();
    return att.fileName?.toLowerCase().includes(query) || att.fileType?.toLowerCase().includes(query);
  }) || [];

  return (
    <aside className="w-full max-w-full border-0 bg-transparent flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-4 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Original Document
        </h3>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 flex flex-col gap-4 overflow-x-hidden min-w-0">
          {/* Metadata card removed - information moved to header */}

          {/* Document Preview Area */}
          <div
            className={`bg-white dark:bg-background border border-border rounded-lg overflow-hidden shadow-sm flex flex-col min-w-0 flex-1 min-h-[400px] ${
              isPreviewFullscreen
                ? 'fixed inset-4 z-50'
                : ''
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            aria-label="Document preview area"
            aria-live="polite"
            aria-busy={documentPreviewLoading}
          >
            {/* Header bar with file info and actions */}
            {(() => {
              const linkedDoc = linkedDocuments[0];
              const selectedVersionIndex = linkedDoc ? (selectedLinkedDocVersion[linkedDoc.id] ?? linkedDoc.versions.length - 1) : -1;
              const selectedVersion = linkedDoc && selectedVersionIndex >= 0 ? linkedDoc.versions[selectedVersionIndex] : null;
              
              if (firstAttachment || selectedVersion) {
                const FileIcon = firstAttachment ? getFileIcon(firstAttachment.fileType, firstAttachment.fileName) : FileText;
                const fileTypeLabel = firstAttachment ? getFileTypeLabel(firstAttachment.fileType, firstAttachment.fileName) : 'DMS Document';
                
                return (
                  <div className="border-b border-border bg-muted/30 px-3 md:px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0 min-w-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                      <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden break-words">
                        <p className="text-sm font-medium break-words min-w-0" title={firstAttachment?.fileName || selectedVersion?.fileName || 'Document'}>
                          {firstAttachment?.fileName || selectedVersion?.fileName || 'Document'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {fileTypeLabel}
                          </Badge>
                          {firstAttachment?.fileSize && (
                            <span className="flex-shrink-0">{formatFileSize(firstAttachment.fileSize)}</span>
                          )}
                          {selectedVersion && (
                            <span className="flex-shrink-0">• Version {selectedVersion.versionNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* View Full Document in DMS - Only show if auto-created document exists */}
                      {autoCreatedDocumentId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => router.push(`/dms/${autoCreatedDocumentId}`)}
                          aria-label="View full document in DMS"
                          title="View full document with versions, comments, and access control"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="hidden sm:inline">View in DMS</span>
                        </Button>
                      )}
                      {firstAttachment?.fileUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            if (firstAttachment.fileUrl) {
                              const url = buildDownloadUrl(firstAttachment.fileUrl);
                              if (url) {
                                window.open(url, '_blank');
                              }
                            }
                          }}
                          aria-label="Download document"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!isPreviewFullscreen && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onSetIsPreviewFullscreen(true)}
                          aria-label="Expand preview"
                          title="Fullscreen"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isPreviewFullscreen && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onSetIsPreviewFullscreen(false)}
                          aria-label="Close fullscreen"
                          title="Exit fullscreen"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Preview Content */}
            <div className="flex-1 overflow-hidden min-h-0 min-w-0">
              {(() => {
                const linkedDoc = linkedDocuments.length > 0 ? linkedDocuments[0] : null;
                const selectedVersionIndex = linkedDoc ? (selectedLinkedDocVersion[linkedDoc.id] ?? linkedDoc.versions.length - 1) : -1;
                const selectedVersion = linkedDoc && selectedVersionIndex >= 0 && linkedDoc.versions[selectedVersionIndex] 
                  ? linkedDoc.versions[selectedVersionIndex]
                  : (linkedDoc?.versions && linkedDoc.versions.length > 0 ? linkedDoc.versions[linkedDoc.versions.length - 1] : null);
                const documentContentHtml = selectedVersion?.contentHtml;

                // Loading state
                if (documentPreviewLoading) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Loading document preview...
                      </p>
                    </div>
                  );
                }

                // Error state
                if (documentPreviewError) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="alert">
                      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                      <p className="text-sm font-medium text-destructive mb-2">
                        {documentPreviewError}
                      </p>
                      {firstAttachment?.fileUrl && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = buildDownloadUrl(firstAttachment.fileUrl!);
                              if (url) {
                                window.open(url, '_blank');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                }

                // PDF Preview
                if (firstAttachment?.fileUrl && firstAttachment.fileType === 'application/pdf') {
                  if (pdfBlobUrl) {
                    const pdfSrc = `${pdfBlobUrl}#zoom=page-fit`;
                    return (
                      <div className="h-full w-full bg-muted/20">
                        <iframe
                          src={pdfSrc}
                          className="w-full h-full border-0"
                          title={`PDF Preview: ${firstAttachment.fileName || 'Document'}`}
                          aria-label={`PDF document preview: ${firstAttachment.fileName || 'Document'}`}
                        />
                      </div>
                    );
                  }
                  // PDF loading state
                  return (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Loading PDF preview...
                      </p>
                    </div>
                  );
                }

                // Image Preview
                if (firstAttachment?.fileUrl && firstAttachment.fileType?.startsWith('image/')) {
                  const imageUrl = buildDownloadUrl(firstAttachment.fileUrl);
                  return (
                    <div className="h-full flex items-center justify-center p-4 bg-muted/30" aria-label={`Image preview: ${firstAttachment.fileName}`}>
                      <img
                        src={imageUrl || firstAttachment.fileUrl}
                        alt={firstAttachment.fileName || 'Document image'}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  );
                }

                // Word Document Preview
                if (firstAttachment?.fileName?.toLowerCase().endsWith('.docx') && wordHtml) {
                  return (
                    <div 
                      className="h-full overflow-auto p-6 prose prose-base dark:prose-invert max-w-none"
                      aria-label={`Word document preview: ${firstAttachment.fileName}`}
                    >
                      <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
                    </div>
                  );
                }

                // DMS Document Content
                if (documentContentHtml) {
                  return (
                    <div 
                      className="h-full overflow-auto p-6 prose prose-base dark:prose-invert max-w-none"
                      aria-label="Document content preview"
                    >
                      <div dangerouslySetInnerHTML={{ __html: documentContentHtml }} />
                    </div>
                  );
                }

                // No document available
                return (
                  <div 
                    className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/20"
                    aria-label="No document available"
                  >
                    <div className="mb-4 p-4 rounded-full bg-muted/50">
                      <FileText className="h-10 w-10 text-muted-foreground/60" />
                    </div>
                    <p className="text-base font-semibold text-foreground mb-2">
                      No document available
                    </p>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                      Upload an attachment or link a DMS document to view it here
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      {/* Show "View in DMS" if auto-created document exists */}
                      {autoCreatedDocumentId && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/dms/${autoCreatedDocumentId}`)}
                          className="w-full sm:w-auto"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Full Document in DMS
                        </Button>
                      )}
                      {!isCompleted && (
                        <>
                          <Button
                            variant={autoCreatedDocumentId ? "outline" : "default"}
                            size="sm"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif';
                              input.onchange = (e) => {
                                const files = Array.from((e.target as HTMLInputElement).files || []);
                                if (files.length > 0) {
                                  void handleAttachmentUpload(files);
                                }
                              };
                              input.click();
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Document
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenLinkDocument}
                            className="w-full sm:w-auto"
                          >
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Link Document
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Attachments List */}
          {correspondence.attachments && correspondence.attachments.length > 1 && (
            <div className="space-y-3 flex-shrink-0 min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center justify-between mb-2 min-w-0 max-w-full gap-2">
                <h4 className="text-sm font-semibold truncate min-w-0">
                  All Attachments ({correspondence.attachments.length})
                </h4>
                {!isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif';
                      input.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || []);
                        if (files.length > 0) {
                          void handleAttachmentUpload(files);
                        }
                      };
                      input.click();
                    }}
                    aria-label="Upload additional document"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Add
                  </Button>
                )}
              </div>
              
              {correspondence.attachments.length > 3 && (
                <div className="mb-2 min-w-0 max-w-full">
                  <div className="relative min-w-0 max-w-full">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <Input
                      type="text"
                      placeholder="Search attachments..."
                      value={attachmentSearchQuery}
                      onChange={(e) => onSetAttachmentSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs min-w-0 max-w-full"
                      aria-label="Search attachments"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-1.5 min-w-0 max-w-full">
                {filteredAttachments.map((attachment, idx) => {
                  const FileIcon = getFileIcon(attachment.fileType, attachment.fileName);
                  const fileTypeLabel = getFileTypeLabel(attachment.fileType, attachment.fileName);
                  
                  return (
                    <div
                      key={attachment.id || idx}
                      className="flex items-center gap-2 p-2 border border-border rounded-md hover:bg-muted/50 transition-colors cursor-pointer min-w-0 max-w-full overflow-hidden"
                      onClick={() => {
                        onSetSelectedAttachmentIndex(idx);
                        onOpenDocumentPreview();
                      }}
                    >
                      <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                        <p className="text-xs font-medium truncate min-w-0" title={attachment.fileName || 'Attachment'}>
                          {attachment.fileName || 'Attachment'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-0 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-4 px-1 flex-shrink-0">
                            {fileTypeLabel}
                          </Badge>
                          {attachment.fileSize && (
                            <span className="flex-shrink-0">{formatFileSize(attachment.fileSize)}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (attachment.fileUrl) {
                            const url = buildDownloadUrl(attachment.fileUrl);
                            if (url) {
                              window.open(url, '_blank');
                            }
                          }
                        }}
                        aria-label={`Download ${attachment.fileName}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

