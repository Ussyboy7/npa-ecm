"use client";

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Download,
  Maximize2,
  X,
  Upload,
  Link as LinkIcon,
  Search,
  Loader2,
  AlertCircle,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileCode,
  ExternalLink,
  Printer,
  Eye,
  PanelRightClose,
  PanelRightOpen,
  FolderOpen,
} from 'lucide-react';
import type { Correspondence } from '@/lib/npa-structure';
import { logDocumentAccess, type DocumentRecord } from '@/lib/api/dms';
import { buildDownloadUrl, forceDownloadMedia } from '@/lib/correspondence-url-utils';
import { getCorrespondencePreviewContext, getPrimaryLinkedDocument, resolveCorrespondenceDmsAccessTarget } from '@/lib/correspondence-preview-target';
import { useDocumentPreview } from '@/hooks/use-document-preview';
import { toast } from "@/components/ui/sonner";
import { logError, logWarn } from '@/lib/client-logger';
import { apiFetch, getStoredAccessToken } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { SecurePdfCanvasPreview } from '@/components/dms/SecurePdfCanvasPreview';
import {
  canDownloadDocument,
  downloadDocumentVersion,
  fetchDocumentVersionContent,
} from '@/lib/dms-documents';
import { corrType } from '../correspondence-type';
import { cn } from '@/lib/utils';
import { sanitizeThemedHtml } from '@/lib/sanitize-html';

interface DocumentPreviewPanelProps {
  correspondence: Correspondence;
  linkedDocuments: DocumentRecord[];
  selectedLinkedDocVersion: Record<string, number>;
  selectedAttachmentIndex: number | null;
  selectedLinkedDocumentId: string | null;
  attachmentSearchQuery: string;
  isPreviewFullscreen: boolean;
  isCompleted: boolean;
  documentFocus?: boolean;
  onToggleDocumentFocus?: () => void;
  onSetAttachmentSearchQuery: (query: string) => void;
  onSetIsPreviewFullscreen: (fullscreen: boolean) => void;
  onSetSelectedAttachmentIndex: (index: number | null) => void;
  onSetSelectedLinkedDocumentId: (id: string | null) => void;
  onOpenLinkDocument: () => void;
  onOpenDocumentPreview: () => void;
  onOpenPrintPreview: () => void;
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
  selectedAttachmentIndex,
  selectedLinkedDocumentId,
  attachmentSearchQuery,
  isPreviewFullscreen,
  isCompleted,
  documentFocus = false,
  onToggleDocumentFocus,
  onSetAttachmentSearchQuery,
  onSetIsPreviewFullscreen,
  onSetSelectedAttachmentIndex,
  onSetSelectedLinkedDocumentId,
  onOpenLinkDocument,
  onOpenDocumentPreview,
  onOpenPrintPreview,
  onSyncFromApi,
}: DocumentPreviewPanelProps) => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [documentSurface, setDocumentSurface] = useState<'preview' | 'manage'>('preview');

  const previewContext = getCorrespondencePreviewContext(
    correspondence,
    linkedDocuments,
    selectedAttachmentIndex,
    isCompleted,
  );

  const attachments = correspondence?.attachments ?? [];
  const previewLinkedDoc = useMemo(() => {
    if (selectedLinkedDocumentId) {
      return linkedDocuments.find((d) => d.id === selectedLinkedDocumentId) ?? null;
    }
    // No attachment selected for preview: fall back to primary linked DMS doc
    if (selectedAttachmentIndex !== null) return null;
    if (attachments.length > 0) return null;
    return getPrimaryLinkedDocument(linkedDocuments) || linkedDocuments[0] || null;
  }, [
    attachments.length,
    linkedDocuments,
    selectedAttachmentIndex,
    selectedLinkedDocumentId,
  ]);
  const activeAttachment = useMemo(() => {
    if (selectedLinkedDocumentId) return null;
    if (selectedAttachmentIndex !== null && attachments[selectedAttachmentIndex]) {
      return attachments[selectedAttachmentIndex];
    }
    // Linked-only correspondence: don't surface a phantom attachment
    if (attachments.length === 0 && linkedDocuments.length > 0) return null;
    return attachments[0] ?? null;
  }, [
    attachments,
    linkedDocuments.length,
    selectedAttachmentIndex,
    selectedLinkedDocumentId,
  ]);

  const previewLinkedVersion = useMemo(() => {
    if (!previewLinkedDoc?.versions?.length) return null;
    const idx =
      selectedLinkedDocVersion[previewLinkedDoc.id] ?? previewLinkedDoc.versions.length - 1;
    return previewLinkedDoc.versions[idx] ?? previewLinkedDoc.versions[previewLinkedDoc.versions.length - 1];
  }, [previewLinkedDoc, selectedLinkedDocVersion]);

  const { wordHtml, isLoading: documentPreviewLoading, error: documentPreviewError } =
    useDocumentPreview(activeAttachment);

  const [securePdfBytes, setSecurePdfBytes] = useState<ArrayBuffer | null>(null);
  const [securePdfLoading, setSecurePdfLoading] = useState(false);
  const [securePdfError, setSecurePdfError] = useState<string | null>(null);

  // Canvas PDF preview (no browser Download chrome on blob iframe)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSecurePdfBytes(null);
      setSecurePdfError(null);

      // DRM-linked DMS PDF via content API
      if (previewLinkedVersion) {
        const isPdf =
          previewLinkedVersion.fileName?.toLowerCase().endsWith('.pdf') ||
          previewLinkedVersion.fileType === 'application/pdf';
        if (!isPdf || !previewLinkedVersion.id) return;
        setSecurePdfLoading(true);
        try {
          const blob = await fetchDocumentVersionContent(previewLinkedVersion.id);
          if (cancelled) return;
          setSecurePdfBytes(await blob.arrayBuffer());
        } catch (err) {
          if (cancelled) return;
          setSecurePdfError(err instanceof Error ? err.message : 'Failed to load PDF');
        } finally {
          if (!cancelled) setSecurePdfLoading(false);
        }
        return;
      }

      // Correspondence attachment PDF via media URL
      const name = activeAttachment?.fileName?.toLowerCase() || '';
      const isPdf =
        activeAttachment?.fileType === 'application/pdf' || name.endsWith('.pdf');
      if (!isPdf || !activeAttachment?.fileUrl) return;

      const url = buildDownloadUrl(activeAttachment.fileUrl);
      if (!url) return;
      setSecurePdfLoading(true);
      try {
        const token = getStoredAccessToken();
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(url, { credentials: 'include', headers });
        if (!response.ok) throw new Error(`Failed to load PDF (${response.status})`);
        const bytes = await response.arrayBuffer();
        if (cancelled) return;
        setSecurePdfBytes(bytes);
      } catch (err) {
        if (cancelled) return;
        setSecurePdfError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        if (!cancelled) setSecurePdfLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeAttachment, previewLinkedVersion]);

  const effectiveLinkedDoc =
    linkedDocuments.find(d => d.role === 'primary' && d.versions.length > 0) ||
    linkedDocuments.find(d => d.versions.length > 0) ||
    linkedDocuments[0];
  const autoCreatedDocumentId =
    (correspondence as Correspondence & { auto_created_document_id?: string })?.auto_created_document_id ||
    effectiveLinkedDoc?.id;

  const logPreviewPanelDmsAccess = useCallback(async (action: 'view' | 'download' | 'attempted-download') => {
    if (!currentUser?.id) return;
    const target = resolveCorrespondenceDmsAccessTarget(
      correspondence,
      linkedDocuments,
      previewContext.source,
    );
    if (!target) return;

    try {
      await logDocumentAccess({
        documentId: target.documentId,
        userId: currentUser.id,
        action,
        sensitivity: target.sensitivity,
      });
    } catch (error: unknown) {
      logWarn('[DocumentPreviewPanel] Failed to write DMS access log', error);
    }
  }, [correspondence, currentUser?.id, linkedDocuments, previewContext.source]);

  const handleForceDownload = useCallback(
    async (fileUrl: string | null | undefined, fileName?: string) => {
      if (!fileUrl) {
        void logPreviewPanelDmsAccess('attempted-download');
        toast.error('No file available to download');
        return;
      }
      try {
        void logPreviewPanelDmsAccess('download');
        await forceDownloadMedia(fileUrl, fileName || 'document');
      } catch (err) {
        void logPreviewPanelDmsAccess('attempted-download');
        logError('Download failed', err);
        toast.error(err instanceof Error ? err.message : 'Download failed');
      }
    },
    [logPreviewPanelDmsAccess],
  );

  const handleLinkedVersionDownload = useCallback(
    async (versionId: string | undefined, fileUrl: string | null | undefined, fileName?: string) => {
      if (!versionId && !fileUrl) {
        void logPreviewPanelDmsAccess('attempted-download');
        toast.error('No file available to download');
        return;
      }
      try {
        void logPreviewPanelDmsAccess('download');
        if (versionId) {
          await downloadDocumentVersion(versionId, fileName);
          return;
        }
        await forceDownloadMedia(fileUrl!, fileName || 'document');
      } catch (err) {
        void logPreviewPanelDmsAccess('attempted-download');
        logError('Download failed', err);
        toast.error(err instanceof Error ? err.message : 'Download failed');
      }
    },
    [logPreviewPanelDmsAccess],
  );

  const handleViewAttachment = useCallback(
    (index: number) => {
      onSetSelectedLinkedDocumentId(null);
      onSetSelectedAttachmentIndex(index);
    },
    [onSetSelectedAttachmentIndex, onSetSelectedLinkedDocumentId],
  );

  const handleViewLinkedDocument = useCallback(
    (docId: string) => {
      onSetSelectedAttachmentIndex(null);
      onSetSelectedLinkedDocumentId(docId);
    },
    [onSetSelectedAttachmentIndex, onSetSelectedLinkedDocumentId],
  );

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
      const errorMessage = error instanceof Error && error.message ? error.message : 'Please try again.';
      toast.error('Unable to upload files', {
        description: errorMessage,
      });
    }
  }, [correspondence, onSyncFromApi]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  const fileCount =
    (correspondence.attachments?.length ?? 0) + linkedDocuments.length;
  const hasFiles = fileCount > 0 || !isCompleted;
  const isManageMode = documentSurface === 'manage' && !isPreviewFullscreen;

  const openFilePicker = () => {
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
  };

  const filesManagePanel = (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden animate-in fade-in duration-200">
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-2 flex-shrink-0">
        <div>
          <h4 className={corrType.panelTitle}>Manage files</h4>
          <p className={cn(corrType.caption, 'mt-0.5')}>
            Upload, link, or switch the document shown in preview.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isCompleted && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-full" onClick={openFilePicker}>
                <Upload className="h-3.5 w-3.5" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-full"
                onClick={onOpenLinkDocument}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Link
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-5">
        {linkedDocuments.length > 0 && (
          <div className="space-y-2 min-w-0">
            <p className={cn(corrType.sectionLabel, 'px-0.5')}>
              Documents ({linkedDocuments.length})
            </p>
            <div className="space-y-1">
              {linkedDocuments.map((doc) => {
                const isSelected =
                  selectedLinkedDocumentId === doc.id ||
                  (!selectedLinkedDocumentId &&
                    attachments.length === 0 &&
                    previewLinkedDoc?.id === doc.id);
                const versionIdx =
                  selectedLinkedDocVersion[doc.id] ?? Math.max(doc.versions.length - 1, 0);
                const version = doc.versions[versionIdx] ?? doc.versions[doc.versions.length - 1];
                const canDl = canDownloadDocument(doc);
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors cursor-pointer min-w-0',
                      isSelected ? 'bg-primary/6' : 'hover:bg-muted/40',
                    )}
                    onClick={() => {
                      handleViewLinkedDocument(doc.id);
                      setDocumentSurface('preview');
                    }}
                  >
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className={cn(corrType.fileTitle, 'truncate')} title={doc.title}>
                        {doc.title}
                      </p>
                      <div className={cn('flex items-center gap-2 mt-0.5 flex-wrap', corrType.caption)}>
                        <Badge
                          variant={doc.role === 'primary' ? 'default' : 'secondary'}
                          className="text-[10px] h-4 px-1 flex-shrink-0"
                        >
                          {doc.role === 'primary' ? 'Primary' : 'Linked'}
                        </Badge>
                        {version?.versionNumber != null && (
                          <span>v{version.versionNumber}</span>
                        )}
                      </div>
                    </div>
                    {canDl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleLinkedVersionDownload(
                            version?.id,
                            version?.fileUrl,
                            version?.fileName || doc.title,
                          );
                        }}
                        aria-label={`Download ${doc.title}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dms/${doc.id}`);
                      }}
                      aria-label={`Open ${doc.title} in DMS`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {correspondence.attachments && correspondence.attachments.length > 0 && (
          <div className="space-y-2 min-w-0">
            <p className={cn(corrType.sectionLabel, 'px-0.5')}>
              Attachments ({correspondence.attachments.length})
            </p>
            {correspondence.attachments.length > 3 && (
              <div className="relative min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search attachments…"
                  value={attachmentSearchQuery}
                  onChange={(e) => onSetAttachmentSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-full"
                  aria-label="Search attachments"
                />
              </div>
            )}
            <div className="space-y-1">
              {filteredAttachments.map((attachment, idx) => {
                const FileIcon = getFileIcon(attachment.fileType, attachment.fileName);
                const fileTypeLabel = getFileTypeLabel(attachment.fileType, attachment.fileName);
                const originalIndex = correspondence.attachments?.indexOf(attachment) ?? idx;
                const isSelected =
                  !previewLinkedDoc &&
                  (selectedAttachmentIndex === originalIndex ||
                    (selectedAttachmentIndex === null && originalIndex === 0));

                return (
                  <div
                    key={attachment.id || idx}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors cursor-pointer min-w-0',
                      isSelected ? 'bg-primary/6' : 'hover:bg-muted/40',
                    )}
                    onClick={() => {
                      handleViewAttachment(originalIndex);
                      setDocumentSurface('preview');
                    }}
                  >
                    <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p
                        className={cn(corrType.fileTitle, 'truncate')}
                        title={attachment.fileName || 'Attachment'}
                      >
                        {attachment.fileName || 'Attachment'}
                      </p>
                      <div className={cn('flex items-center gap-2 mt-0.5 flex-wrap', corrType.caption)}>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 flex-shrink-0">
                          {fileTypeLabel}
                        </Badge>
                        {attachment.fileSize && (
                          <span>{formatFileSize(attachment.fileSize)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleForceDownload(attachment.fileUrl, attachment.fileName);
                      }}
                      aria-label={`Download ${attachment.fileName}`}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {linkedDocuments.length === 0 && (correspondence.attachments?.length ?? 0) === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className={corrType.itemTitle}>No files yet</p>
            <p className={cn(corrType.caption, 'mt-1')}>Add an attachment or link a DMS document.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <aside className="w-full max-w-full border-0 bg-muted/10 flex flex-col flex-1 min-h-0 overflow-hidden">
      {!isPreviewFullscreen && (
        <div className="px-4 py-2.5 border-b border-border/40 flex-shrink-0 bg-background/80 backdrop-blur-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className={cn(corrType.panelTitle, 'flex items-center gap-2')}>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Document
            </h3>
            {hasFiles && (
              <div className="inline-flex items-center rounded-full bg-muted/60 p-0.5">
                <Button
                  variant={documentSurface === 'preview' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2.5 text-[11px] rounded-full"
                  onClick={() => setDocumentSurface('preview')}
                >
                  Preview
                </Button>
                <Button
                  variant={documentSurface === 'manage' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2.5 text-[11px] rounded-full gap-1"
                  onClick={() => setDocumentSurface('manage')}
                >
                  <FolderOpen className="h-3 w-3" />
                  Files{fileCount > 0 ? ` · ${fileCount}` : ''}
                </Button>
              </div>
            )}
          </div>
          {onToggleDocumentFocus && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={onToggleDocumentFocus}
              title={documentFocus ? 'Show routing panel' : 'Focus on document'}
            >
              {documentFocus ? (
                <>
                  <PanelRightOpen className="h-3.5 w-3.5" />
                  Show routing
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

      {isManageMode ? (
        <div className="flex-1 m-3 border border-border/50 rounded-2xl shadow-sm bg-background min-h-0 overflow-hidden flex flex-col">
          {filesManagePanel}
        </div>
      ) : (
      <>
      {/* Preview fills remaining column height; page content scrolls inside */}
      <div
        className={`flex flex-col min-w-0 min-h-0 overflow-hidden bg-background ${
          isPreviewFullscreen
            ? 'fixed inset-3 z-50 border border-border/50 rounded-2xl shadow-2xl'
            : 'flex-1 m-3 border border-border/50 rounded-2xl shadow-sm'
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
              const linkedDoc = getPrimaryLinkedDocument(linkedDocuments);
              const selectedVersionIndex = linkedDoc ? (selectedLinkedDocVersion[linkedDoc.id] ?? linkedDoc.versions.length - 1) : -1;
              const selectedVersion = linkedDoc && selectedVersionIndex >= 0 ? linkedDoc.versions[selectedVersionIndex] : null;
              
              if (activeAttachment || selectedVersion || previewLinkedVersion) {
                const FileIcon = activeAttachment
                  ? getFileIcon(activeAttachment.fileType, activeAttachment.fileName)
                  : FileText;
                const fileTypeLabel = activeAttachment
                  ? getFileTypeLabel(activeAttachment.fileType, activeAttachment.fileName)
                  : 'DMS Document';
                const displayName =
                  activeAttachment?.fileName ||
                  previewLinkedVersion?.fileName ||
                  selectedVersion?.fileName ||
                  'Document';
                const displaySize = activeAttachment?.fileSize ?? previewLinkedVersion?.fileSize;
                const canDlLinked = previewLinkedDoc ? canDownloadDocument(previewLinkedDoc) : true;
                
                return (
                  <div className="border-b border-border/40 bg-background/90 px-3 md:px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0 min-w-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                      <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden break-words">
                        <p className={cn(corrType.fileTitle, 'break-words min-w-0')} title={displayName}>
                          {displayName}
                        </p>
                        <div className={cn('flex items-center gap-2 flex-wrap mt-1', corrType.caption)}>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {fileTypeLabel}
                          </Badge>
                          {displaySize ? (
                            <span className="flex-shrink-0">{formatFileSize(displaySize)}</span>
                          ) : null}
                          {previewLinkedVersion ? (
                            <span className="flex-shrink-0">• Version {previewLinkedVersion.versionNumber}</span>
                          ) : selectedVersion ? (
                            <span className="flex-shrink-0">• Version {selectedVersion.versionNumber}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(previewLinkedDoc?.id || autoCreatedDocumentId) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => {
                            void logPreviewPanelDmsAccess('view');
                            router.push(`/dms/${previewLinkedDoc?.id || autoCreatedDocumentId}`);
                          }}
                          aria-label="View full document in DMS"
                          title="View full document with versions, comments, and access control"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="hidden sm:inline">View in DMS</span>
                        </Button>
                      )}
                      {activeAttachment?.fileUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            void handleForceDownload(activeAttachment.fileUrl, activeAttachment.fileName);
                          }}
                          aria-label="Download document"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {previewLinkedVersion && canDlLinked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            void handleLinkedVersionDownload(
                              previewLinkedVersion.id,
                              previewLinkedVersion.fileUrl,
                              previewLinkedVersion.fileName,
                            );
                          }}
                          aria-label="Download document"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {previewLinkedVersion && !canDlLinked ? (
                        <span className="text-[10px] text-muted-foreground px-1">View only</span>
                      ) : null}
                      {onOpenPrintPreview && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            void logPreviewPanelDmsAccess('attempted-download'); // log print as access
                            onOpenPrintPreview();
                          }}
                          aria-label="Print document"
                          title="Print"
                        >
                          <Printer className="h-3.5 w-3.5" />
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
              // Letter body / empty — still offer fullscreen controls
              return (
                <div className="border-b border-border bg-muted/30 px-3 md:px-4 py-2 flex items-center justify-between gap-2 flex-shrink-0 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium truncate">
                      {correspondence.subject || 'Document'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
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
            })()}
            
            {/* Preview Content — always fill remaining height; scroll full pages inside */}
            <div className="flex-1 overflow-auto min-h-0 min-w-0 bg-muted/20">
              {(() => {
                const linkedDoc =
                  previewLinkedDoc || getPrimaryLinkedDocument(linkedDocuments) || null;
                const selectedVersion =
                  previewLinkedVersion ||
                  (linkedDoc
                    ? linkedDoc.versions[
                        selectedLinkedDocVersion[linkedDoc.id] ?? linkedDoc.versions.length - 1
                      ] ??
                      linkedDoc.versions[linkedDoc.versions.length - 1] ??
                      null
                    : null);
                const documentContentHtml = selectedVersion?.contentHtml;
                const attachmentIsPdf =
                  !!activeAttachment &&
                  (activeAttachment.fileType === 'application/pdf' ||
                    activeAttachment.fileName?.toLowerCase().endsWith('.pdf'));
                const linkedIsPdf =
                  !!previewLinkedVersion &&
                  (previewLinkedVersion.fileType === 'application/pdf' ||
                    previewLinkedVersion.fileName?.toLowerCase().endsWith('.pdf'));

                if (documentPreviewLoading && !previewLinkedDoc) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Loading document preview...
                      </p>
                    </div>
                  );
                }

                if (documentPreviewError && !previewLinkedDoc) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="alert">
                      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                      <p className="text-sm font-medium text-destructive mb-2">
                        {documentPreviewError}
                      </p>
                      {activeAttachment?.fileUrl && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void handleForceDownload(
                                activeAttachment.fileUrl,
                                activeAttachment.fileName,
                              );
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

                // Secure canvas PDF (attachment or selected linked DMS doc)
                if ((attachmentIsPdf || linkedIsPdf) && (securePdfLoading || securePdfBytes || securePdfError)) {
                  if (securePdfLoading) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                        <p className="text-sm text-muted-foreground">Loading PDF preview...</p>
                      </div>
                    );
                  }
                  if (securePdfError) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-6 text-center" role="alert">
                        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                        <p className="text-sm font-medium text-destructive mb-2">{securePdfError}</p>
                      </div>
                    );
                  }
                  if (securePdfBytes) {
                    return (
                      <div className="w-full min-h-full overflow-visible bg-muted/20">
                        <SecurePdfCanvasPreview
                          data={securePdfBytes}
                          minHeightClassName="min-h-0"
                          className="w-full"
                        />
                      </div>
                    );
                  }
                }

                // Image Preview
                if (activeAttachment?.fileUrl && activeAttachment.fileType?.startsWith('image/')) {
                  const imageUrl = buildDownloadUrl(activeAttachment.fileUrl);
                  return (
                    <div className="h-full flex items-center justify-center p-4 bg-muted/30" aria-label={`Image preview: ${activeAttachment.fileName}`}>
                      <Image
                        src={imageUrl || activeAttachment.fileUrl}
                        alt={activeAttachment.fileName || 'Document image'}
                        width={800}
                        height={600}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  );
                }

                // Word Document Preview
                if (activeAttachment?.fileName?.toLowerCase().endsWith('.docx') && wordHtml) {
                  return (
                    <div
                      className="h-full overflow-auto p-6 prose prose-base dark:prose-invert max-w-none"
                      aria-label={`Word document preview: ${activeAttachment.fileName}`}
                    >
                      <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
                    </div>
                  );
                }

                // DMS Document Content (composed HTML)
                if (documentContentHtml && documentContentHtml.trim().length > 0) {
                  return (
                    <div
                      className="h-full overflow-auto p-6 bg-white text-black max-w-none"
                      aria-label="Document content preview"
                      style={{ colorScheme: 'light' }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: documentContentHtml }} />
                    </div>
                  );
                }

                // Linked DMS Document - render via fileUrl (non-PDF)
                if (selectedVersion?.fileUrl && !linkedIsPdf) {
                  const ft = selectedVersion.fileType?.toLowerCase() || '';
                  const fn = selectedVersion.fileName?.toLowerCase() || '';

                  if (selectedVersion.fileUrl.startsWith('data:')) {
                    if (ft.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(fn)) {
                      return (
                        <div className="h-full flex items-center justify-center p-4 bg-muted/30" aria-label={`Image preview: ${selectedVersion.fileName}`}>
                          <Image
                            src={selectedVersion.fileUrl}
                            alt={selectedVersion.fileName || 'Document image'}
                            width={800}
                            height={600}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      );
                    }

                    if (ft === 'text/html' || fn.endsWith('.html')) {
                      return (
                        <div className="h-full w-full bg-muted/20">
                          <iframe
                            src={selectedVersion.fileUrl}
                            className="w-full h-full border-0"
                            title={`HTML Preview: ${selectedVersion.fileName || 'Document'}`}
                          />
                        </div>
                      );
                    }
                  } else {
                    const downloadUrl = buildDownloadUrl(selectedVersion.fileUrl);

                    if (downloadUrl && (ft.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(fn))) {
                      return (
                        <div className="h-full flex items-center justify-center p-4 bg-muted/30" aria-label={`Image preview: ${selectedVersion.fileName}`}>
                          <Image
                            src={downloadUrl}
                            alt={selectedVersion.fileName || 'Document image'}
                            width={800}
                            height={600}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      );
                    }

                    if (fn.endsWith('.docx') || ft.includes('word') || ft.includes('officedocument') || fn.endsWith('.doc')) {
                      return (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/20">
                          <FileText className="h-12 w-12 text-muted-foreground/60 mb-4" />
                          <p className="text-sm font-medium text-foreground mb-1">
                            Word Document Preview
                          </p>
                          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                            Preview is not available for Word documents. Download the file or view it in DMS.
                          </p>
                          <div className="flex gap-2">
                            {canDownloadDocument(linkedDoc) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  void handleLinkedVersionDownload(
                                    selectedVersion.id,
                                    selectedVersion.fileUrl,
                                    selectedVersion.fileName,
                                  );
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            )}
                            {(previewLinkedDoc?.id || autoCreatedDocumentId) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  void logPreviewPanelDmsAccess('view');
                                  router.push(`/dms/${previewLinkedDoc?.id || autoCreatedDocumentId}`);
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View in DMS
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    }
                  }
                }

                // Correspondence letter body (when no attachment / linked DMS file)
                const bodyHtml = correspondence.bodyHtml?.trim();
                if (bodyHtml) {
                  return (
                    <div
                      className="h-full overflow-auto p-6 bg-white text-black"
                      aria-label="Correspondence body"
                      style={{ colorScheme: 'light' }}
                    >
                      <div className="mb-4 pb-3 border-b border-border/60">
                        <h4 className="text-sm font-semibold text-muted-foreground">Original Document</h4>
                        {correspondence.subject ? (
                          <p className="text-sm font-medium mt-1 text-foreground">{correspondence.subject}</p>
                        ) : null}
                      </div>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                      />
                    </div>
                  );
                }

                // Treatment response fallback
                const treatmentResponse = correspondence.treatmentResponse;
                if (treatmentResponse) {
                  return (
                    <div
                      className="h-full overflow-auto p-6"
                      aria-label="Treatment response content"
                    >
                      <div className="mb-4 pb-4 border-b border-border">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Treatment Response</h4>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden bg-white text-neutral-900 p-4">
                        <div
                          className={cn(
                            'prose prose-sm max-w-none text-neutral-900',
                            '[&_*]:!text-neutral-900 [&_a]:!text-blue-700',
                          )}
                          dangerouslySetInnerHTML={{ __html: sanitizeThemedHtml(treatmentResponse) }}
                        />
                      </div>
                    </div>
                  );
                }

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
                      {autoCreatedDocumentId && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            void logPreviewPanelDmsAccess('view');
                            router.push(`/dms/${autoCreatedDocumentId}`);
                          }}
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

      {!isPreviewFullscreen && fileCount > 0 && (
        <button
          type="button"
          onClick={() => setDocumentSurface('manage')}
          className="mx-3 mb-3 flex-shrink-0 inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {fileCount} file{fileCount === 1 ? '' : 's'} · Manage
        </button>
      )}
      </>
      )}
    </aside>
  );
};
