"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  getDocumentById,
  updateDocumentMetadata,
  updateDocumentWorkspaces,
  addActiveEditor,
  removeActiveEditor,
  getDiscussionMessages,
  addDiscussionMessage,
  getDocumentComments,
  listWorkspaces,
  type DocumentRecord,
  type DocumentVersion,
  type DocumentDiscussionMessage,
  type ActiveEditor,
  type DocumentWorkspace,
  type DocumentComment,
  type DocumentSensitivity,
  isSensitiveAccessAllowed,
  logDocumentAccess,
  updateDocumentVersionMeta,
  getDivisionName,
  getDepartmentName,
  initializeDmsDocuments,
  getAccessLogsForDocument,
} from '@/lib/dms-storage';
import { DIVISIONS, DEPARTMENTS, type User as NPAUser } from '@/lib/npa-structure';
import type { Minute } from '@/lib/npa-structure';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import {
  FileText,
  Download,
  Clock,
  Layers,
  Filter,
  User as UserIcon,
  Tag,
  FilePlus,
  Pencil,
  FileType,
  Link as LinkIcon,
  MessageSquare,
  ArrowRight,
  GitCompare,
  CheckCircle,
  Scan,
  Sparkles,
  Eye,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { DocumentCommentsDialog } from '@/components/dms/DocumentCommentsDialog';
import { VersionCompareDialog } from '@/components/dms/VersionCompareDialog';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserPermissions } from '@/hooks/use-user-permissions';

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

const DocumentDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const { users: organizationUsers } = useOrganization();
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [metadataDraft, setMetadataDraft] = useState({
    title: '',
    description: '',
    status: 'draft' as DocumentRecord['status'],
    divisionId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
    tags: '' as string,
    referenceNumber: '' as string,
    sensitivity: 'internal' as DocumentSensitivity,
  });
  const { correspondence: allCorrespondence, minutes: allMinutes } = useCorrespondence();
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>(document?.activeEditors ?? []);
  const [isEditing, setIsEditing] = useState(false);
  const [discussionMessages, setDiscussionMessages] = useState<DocumentDiscussionMessage[]>([]);
  const [discussionDraft, setDiscussionDraft] = useState('');
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [selectedCommentVersion, setSelectedCommentVersion] = useState<DocumentVersion | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareBaseVersion, setCompareBaseVersion] = useState<DocumentVersion | null>(null);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const workspaces = useMemo(() => listWorkspaces(), []);

  useEffect(() => {
    initializeDmsDocuments();
    if (params?.id) {
      const record = getDocumentById(params.id);
      if (!record) {
        toast.error('Document not found');
        router.push('/dms');
        return;
      }
      setDocument(record);
    }
  }, [params?.id, router]);

  useEffect(() => {
    if (!document) return;
    setMetadataDraft({
      title: document.title,
      description: document.description ?? '',
      status: document.status,
      divisionId: document.divisionId,
      departmentId: document.departmentId,
      tags: document.tags?.join(', ') ?? '',
      referenceNumber: document.referenceNumber ?? '',
      sensitivity: document.sensitivity ?? 'internal',
    });
  }, [document]);

  useEffect(() => {
    if (!document) return;
    setActiveEditors(document.activeEditors ?? []);
    setSelectedWorkspaces(document.workspaceIds ?? []);
    setDiscussionMessages(getDiscussionMessages(document.id));
    const counts: Record<string, number> = {};
    document.versions.forEach((version) => {
      counts[version.id] = getDocumentComments(document.id, version.id).length;
    });
    setCommentCounts(counts);
  }, [document]);

  useEffect(() => {
    if (!document || !currentUser) {
      setIsEditing(false);
      return;
    }
    const editing = (document.activeEditors ?? []).some((editor) => editor.userId === currentUser.id);
    setIsEditing(editing);
  }, [document, currentUser]);

  useEffect(() => {
    if (!document || !currentUser) return;
    return () => {
      if (isEditing) {
        removeActiveEditor(document.id, currentUser.id);
      }
    };
  }, [document?.id, currentUser?.id, isEditing]);

  const handleMetadataSave = () => {
    if (!document) return;
    const updated = updateDocumentMetadata(document.id, {
      title: metadataDraft.title,
      description: metadataDraft.description || undefined,
      status: metadataDraft.status,
      divisionId: metadataDraft.divisionId,
      departmentId: metadataDraft.departmentId,
      tags: metadataDraft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      referenceNumber: metadataDraft.referenceNumber || undefined,
      sensitivity: metadataDraft.sensitivity,
    });

    if (updated) {
      setDocument(updated);
      toast.success('Document metadata updated');
      setMetadataDialogOpen(false);
    } else {
      toast.error('Failed to update document metadata');
    }
  };

  const handleVersionUploadComplete = (updated: DocumentRecord) => {
    setDocument(updated);
    setUploadDialogOpen(false);
  };

  const handleStartEditing = () => {
    if (!document || !currentUser) return;
    const updated = addActiveEditor(document.id, {
      userId: currentUser.id,
      since: new Date().toISOString(),
    });
    if (updated) {
      setDocument({ ...updated });
      setActiveEditors(updated.activeEditors ?? []);
      setIsEditing(true);
      toast.success('You are now editing this document');
    }
  };

  const handleStopEditing = () => {
    if (!document || !currentUser) return;
    const updated = removeActiveEditor(document.id, currentUser.id);
    if (updated) {
      setDocument({ ...updated });
      setActiveEditors(updated.activeEditors ?? []);
      setIsEditing(false);
      toast.success('Editing session ended');
    }
  };

  const handleWorkspaceToggle = (workspaceId: string) => {
    if (!document) return;
    const next = selectedWorkspaces.includes(workspaceId)
      ? selectedWorkspaces.filter((id) => id !== workspaceId)
      : [...selectedWorkspaces, workspaceId];
    setSelectedWorkspaces(next);
    const updated = updateDocumentWorkspaces(document.id, next);
    if (updated) {
      setDocument({ ...updated });
      toast.success('Workspace assignments updated');
    }
  };

  const handleAddDiscussionMessage = () => {
    if (!document || !currentUser) {
      toast.error('Select a user to post in the discussion.');
      return;
    }
    if (!discussionDraft.trim()) {
      toast.error('Message cannot be empty.');
      return;
    }
    const message = addDiscussionMessage({
      documentId: document.id,
      authorId: currentUser.id,
      message: discussionDraft.trim(),
    });
    setDiscussionMessages((prev) => [...prev, message]);
    setDiscussionDraft('');
    toast.success('Update shared with collaborators');
  };

  const handleOpenComments = (version: DocumentVersion | null) => {
    if (!document) return;
    setSelectedCommentVersion(version);
    const comments = getDocumentComments(document.id, version?.id);
    const key = version?.id ?? 'document';
    setCommentCounts((prev) => ({ ...prev, [key]: comments.length }));
    setCommentsDialogOpen(true);
  };

  const handleCommentsUpdated = (updatedComments: DocumentComment[]) => {
    const key = selectedCommentVersion?.id ?? 'document';
    setCommentCounts((prev) => ({ ...prev, [key]: updatedComments.length }));
  };

  const handleOpenCompare = (version: DocumentVersion) => {
    setCompareBaseVersion(version);
    setCompareDialogOpen(true);
  };

  const stripHtml = (html?: string) => {
    if (!html) return undefined;
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const summarize = (text?: string) => {
    if (!text) return undefined;
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return undefined;
    if (clean.length <= 200) return clean;
    return `${clean.slice(0, 197)}...`;
  };

  const handleGenerateSummary = (version: DocumentVersion) => {
    if (!document) return;
    const baseText = version.contentText ?? stripHtml(version.contentHtml) ?? version.ocrText;
    const summary = summarize(baseText);
    if (!summary) {
      toast.error('No text available to summarize.');
      return;
    }
    const updatedVersion = updateDocumentVersionMeta(document.id, version.id, {
      summary,
      contentText: baseText ?? version.contentText,
    });
    if (updatedVersion) {
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              versions: prev.versions.map((item) => (item.id === updatedVersion.id ? updatedVersion : item)),
            }
          : prev,
      );
      toast.success('Summary generated');
    }
  };

  const handleRunOcr = (version: DocumentVersion) => {
    if (!document) return;
    const text =
      stripHtml(version.contentHtml) ??
      version.contentText ??
      version.ocrText ??
      `OCR transcription placeholder for ${version.fileName}`;
    const summary = summarize(text);
    const updatedVersion = updateDocumentVersionMeta(document.id, version.id, {
      ocrText: text,
      contentText: text ?? version.contentText,
      summary: summary ?? version.summary,
    });
    if (updatedVersion) {
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              versions: prev.versions.map((item) => (item.id === updatedVersion.id ? updatedVersion : item)),
            }
          : prev,
      );
      toast.success('OCR text generated');
    }
  };

  const divisionOptions = useMemo(() => DIVISIONS, []);
  const departmentOptions = useMemo(() => DEPARTMENTS, []);

  const userLookup = useMemo(() => new Map(organizationUsers.map((user) => [user.id, user])), [organizationUsers]);

  const author = document ? userLookup.get(document.authorId) : null;
  const accessLogs = useMemo(() => (document ? getAccessLogsForDocument(document.id, 25) : []), [document?.id]);

  const relatedCorrespondence = useMemo(() => {
    if (!document) return [];
    return allCorrespondence.filter((corr) => (corr.linkedDocumentIds ?? []).includes(document.id));
  }, [document, allCorrespondence]);

  const minutesByCorrespondence = useMemo(() => {
    return relatedCorrespondence.reduce<Record<string, Minute[]>>((acc, corr) => {
      acc[corr.id] = allMinutes.filter((minute) => minute.correspondenceId === corr.id);
      return acc;
    }, {});
  }, [relatedCorrespondence, allMinutes]);

  const currentDocument = document;

  const sensitivityLabel = (value: DocumentSensitivity) => {
    switch (value) {
      case 'public':
        return 'Public';
      case 'internal':
        return 'Internal';
      case 'confidential':
        return 'Confidential';
      case 'restricted':
        return 'Restricted';
      default:
        return value;
    }
  };

  const sensitivityBadgeVariant = (value: DocumentSensitivity) => {
    switch (value) {
      case 'public':
        return 'secondary';
      case 'internal':
        return 'outline';
      case 'confidential':
        return 'default';
      case 'restricted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const sensitivityAllowed = useMemo(
    () => (document ? isSensitiveAccessAllowed(document, currentUser) : true),
    [document, currentUser],
  );

  useEffect(() => {
    if (!document || !currentUser) return;
    logDocumentAccess({
      documentId: document.id,
      userId: currentUser.id,
      action: 'view',
      sensitivity: document.sensitivity,
    });
  }, [document?.id, currentUser?.id]);

  useEffect(() => {
    return () => {
      if (document && currentUser) {
        removeActiveEditor(document.id, currentUser.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id, currentUser?.id]);

  const buildPrintableHtml = (doc: DocumentRecord, version: DocumentVersion) => {
    const divisionName = getDivisionName(doc.divisionId);
    const departmentName = getDepartmentName(doc.departmentId);
    const authorName = author?.name ?? 'Author';
    const metaRows = [
      { label: 'Document', value: doc.title ?? '' },
      { label: 'Version', value: `v${version.versionNumber}` },
      { label: 'Status', value: statusLabel(doc.status ?? 'draft') },
      { label: 'Reference', value: doc.referenceNumber ?? 'Not assigned' },
      { label: 'Division', value: divisionName },
      { label: 'Department', value: departmentName },
      { label: 'Author', value: authorName },
      { label: 'Uploaded', value: formatDateTime(version.uploadedAt) },
    ];

    const metadataTable = metaRows
      .map(
        (row) => `
          <tr>
            <th style="text-align:left;padding:6px 8px;background:#f2f2f2;border:1px solid #d0d0d0;width:160px;">
              ${row.label}
            </th>
            <td style="padding:6px 8px;border:1px solid #d0d0d0;">
              ${row.value}
            </td>
          </tr>
        `,
      )
      .join('');

    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${doc.title ?? 'Document'} - v${version.versionNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2933; margin: 24px; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { font-size: 18px; margin-top: 24px; }
            table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
            .content { margin-top: 24px; font-size: 15px; line-height: 1.6; }
            .content img { max-width: 100%; height: auto; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            .badge { padding: 4px 10px; background: #004aad; color: #fff; border-radius: 999px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${doc.title ?? 'Document'}</h1>
              <div>Document Management System · Nigerian Ports Authority</div>
            </div>
            <div class="badge">Version ${version.versionNumber}</div>
          </div>
          <table>${metadataTable}</table>
          <div class="content">${version.contentHtml ?? ''}</div>
        </body>
      </html>`;
  };

  const handleDownloadBlocked = () => {
    toast.error('Downloads are restricted for this document sensitivity level.');
    if (currentDocument && currentUser) {
      logDocumentAccess({
        documentId: currentDocument.id,
        userId: currentUser.id,
        action: 'attempted-download',
        sensitivity: currentDocument.sensitivity,
      });
    }
  };

  const downloadAsWord = (version: DocumentVersion) => {
    if (!currentDocument) return;
    if (!sensitivityAllowed) {
      handleDownloadBlocked();
      return;
    }
    const html = buildPrintableHtml(currentDocument, version);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${currentDocument.title.replace(/\s+/g, '_')}-v${version.versionNumber}.doc`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    if (currentUser) {
      logDocumentAccess({
        documentId: currentDocument.id,
        userId: currentUser.id,
        action: 'download',
        sensitivity: currentDocument.sensitivity,
      });
    }
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const openPdfPrint = (version: DocumentVersion) => {
    if (typeof window === 'undefined') return;
    if (!currentDocument) return;
    if (!sensitivityAllowed) {
      handleDownloadBlocked();
      return;
    }
    const html = buildPrintableHtml(currentDocument, version);
    const iframe = window.document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    window.document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      window.document.body.removeChild(iframe);
      toast.error('Unable to open print preview. Please refresh and try again.');
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(html);
    frameWindow.document.close();

    const triggerPrint = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch (error) {
        console.error(error);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 400);
      }
    };

    if (frameWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 150);
    } else {
      iframe.onload = () => setTimeout(triggerPrint, 150);
    }

    if (currentUser) {
      logDocumentAccess({
        documentId: currentDocument.id,
        userId: currentUser.id,
        action: 'print',
        sensitivity: currentDocument.sensitivity,
      });
    }
  };

  const renderAccessIcon = (action: 'view' | 'download' | 'attempted-download') => {
    switch (action) {
      case 'view':
        return <Eye className="h-3.5 w-3.5 text-info" />;
      case 'download':
        return <Download className="h-3.5 w-3.5 text-success" />;
      case 'attempted-download':
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return null;
    }
  };

  const accessLabel: Record<'view' | 'download' | 'attempted-download', string> = {
    view: 'Viewed document',
    download: 'Downloaded document',
    'attempted-download': 'Blocked download',
  };

  if (!document || !currentUser) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading document...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              {document.title}
            </h1>
            <div className="flex flex-wrap gap-2 items-center text-muted-foreground text-xs">
              <span>Created {formatDate(document.createdAt)}</span>
              <span>•</span>
              <span>Last updated {formatDate(document.updatedAt)}</span>
              {author && (
                <>
                  <span>•</span>
                  <span>Author: {author.name}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dms')}>
              Back to DMS
            </Button>
            {currentUser && (
              <Button variant="outline" onClick={() => setMetadataDialogOpen(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit Metadata
              </Button>
            )}
            {currentUser && (
              <Button className="gap-2" onClick={() => setUploadDialogOpen(true)}>
                <FilePlus className="h-4 w-4" />
                Add Version
              </Button>
            )}
          </div>
        </div>

        <HelpGuideCard
          title="Document Workspace Overview"
          description="Review metadata, apply workspace tags, invite collaborators, comment on specific versions, and compare edits side by side. Use the actions on the right to edit metadata, upload a new version, or return to the library."
          links={[
            { label: "Document Library", href: "/dms" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>Document details and classification.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Sensitivity</span>
              <Badge variant={sensitivityBadgeVariant(document.sensitivity)} className="capitalize">
                {sensitivityLabel(document.sensitivity)}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge variant={statusVariant(document.status)} className="capitalize">
                {statusLabel(document.status)}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Type</span>
              <Badge variant="outline" className="capitalize">
                {document.documentType}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Division</span>
              <span>{getDivisionName(document.divisionId)}</span>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Department</span>
              <span>{getDepartmentName(document.departmentId)}</span>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Reference Number</span>
              <span>{document.referenceNumber ?? 'Not assigned'}</span>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-2">
                {document.tags?.length ? (
                  document.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No tags</span>
                )}
              </div>
            </div>
            {document.description && (
              <div className="sm:col-span-2 space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Description</span>
                <p className="text-muted-foreground">{document.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collaboration</CardTitle>
            <CardDescription>Coordinate editing, discussions, and shared workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Active Editors</span>
                <div className="flex flex-wrap gap-2">
                  {activeEditors.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No one is currently editing.</span>
                  ) : (
                    activeEditors.map((editor) => {
                      const user = userLookup.get(editor.userId);
                      return (
                        <Badge key={editor.userId} variant="outline" className="gap-1 text-xs">
                          <UserIcon className="h-3 w-3" />
                          {user ? user.name : editor.userId}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <Button variant="outline" onClick={handleStopEditing} className="gap-2">
                    <CheckCircle className="h-4 w-4" /> Done Editing
                  </Button>
                ) : (
                  <Button onClick={handleStartEditing} className="gap-2">
                    <FileType className="h-4 w-4" /> Start Editing
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Workspaces</span>
              <div className="flex flex-wrap gap-2">
                {workspaces.map((workspace) => {
                  const isActive = selectedWorkspaces.includes(workspace.id);
                  return (
                    <Button
                      key={workspace.id}
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => handleWorkspaceToggle(workspace.id)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: workspace.color }}
                      />
                      {workspace.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Discussion</span>
                <span className="text-xs text-muted-foreground">{discussionMessages.length} message(s)</span>
              </div>
              <ScrollArea className="max-h-[200px] border border-border rounded-md">
                <div className="divide-y">
                  {discussionMessages.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No messages yet. Start a thread below.
                    </div>
                  ) : (
                    discussionMessages.map((message) => {
                      const author = userLookup.get(message.authorId);
                      return (
                        <div key={message.id} className="p-3 text-xs space-y-1 bg-background/60">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{author ? author.name : message.authorId}</span>
                            <span className="text-muted-foreground">{formatDateTime(message.createdAt)}</span>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-line">{message.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <div className="flex flex-col gap-2 md:flex-row">
                <Textarea
                  value={discussionDraft}
                  onChange={(event) => setDiscussionDraft(event.target.value)}
                  placeholder="Share updates with your collaborators"
                  rows={3}
                  className="md:flex-1"
                />
                <Button onClick={handleAddDiscussionMessage} className="md:self-end">
                  Send Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
            <CardDescription>Latest published content for quick review.</CardDescription>
          </CardHeader>
          <CardContent>
            {!sensitivityAllowed ? (
              <div className="border border-destructive/40 bg-destructive/10 text-destructive-foreground p-6 rounded-lg text-sm">
                You do not have permission to view the contents of this document. Contact the document owner or an Executive Director for access.
              </div>
            ) : document.versions[0]?.contentHtml ? (
              <ScrollArea className="max-h-[480px] border border-border rounded-lg">
                <div className="relative">
                  <div className="prose prose-sm dark:prose-invert max-w-none p-6" dangerouslySetInnerHTML={{ __html: document.versions[0].contentHtml ?? '' }} />
                  {document.sensitivity !== 'public' && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl font-semibold uppercase tracking-[0.5em] text-primary/10 rotate-[-30deg]">
                        {sensitivityLabel(document.sensitivity)}
                      </span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                No inline content available. Download a version to view the document.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related Correspondence</CardTitle>
            <CardDescription>Workflows that reference this document, including minute history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {relatedCorrespondence.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This document has not been linked to any correspondence yet. Link it from the correspondence detail page.
              </p>
            ) : (
              relatedCorrespondence.map((corr) => {
                const corrMinutes = minutesByCorrespondence[corr.id] ?? [];
                return (
                  <div key={corr.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <LinkIcon className="h-4 w-4 text-primary" />
                          <span>{corr.referenceNumber}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{corr.subject}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="capitalize">
                            {corr.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            Priority: {corr.priority}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            Direction: {corr.direction}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => router.push(`/correspondence/${corr.id}`)}
                      >
                        Open Correspondence
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {corrMinutes.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Minute Trail</p>
                        <div className="space-y-2">
                          {corrMinutes.map((minute) => {
                            const actor = userLookup.get(minute.userId);
                            return (
                              <div key={minute.id} className="rounded-md border border-border bg-background p-3 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-medium text-foreground">
                                    <MessageSquare className="h-3.5 w-3.5 text-secondary" />
                                    <span>{actor ? actor.name : 'Unknown User'}</span>
                                  </div>
                                  <span className="text-muted-foreground">{formatDateTime(minute.timestamp)}</span>
                                </div>
                                <p className="text-muted-foreground whitespace-pre-line">{minute.minuteText}</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="capitalize">
                                    {minute.actionType}
                                  </Badge>
                                  <Badge variant="outline" className="capitalize">
                                    {minute.direction}
                                  </Badge>
                                  {minute.signature && (
                                    <Badge variant="secondary" className="capitalize">
                                      Signed
                                    </Badge>
                                  )}
                                </div>
                                {minute.signature?.renderedText && (
                                  <p className="text-muted-foreground italic">
                                    {minute.signature.renderedText}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No minutes recorded yet.</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versions</CardTitle>
            <CardDescription>All uploaded versions of this document.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {document.versions.map((version) => {
              const uploader = userLookup.get(version.uploadedBy);
              const isHtmlContent = Boolean(version.contentHtml);
              const commentCount = commentCounts[version.id] ?? 0;
              return (
                <div key={version.id} className="p-3 border border-border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Version {version.versionNumber}</Badge>
                      <span className="text-sm text-foreground truncate max-w-[200px] sm:max-w-xs" title={version.fileName}>
                        {version.fileName}
                      </span>
                      {isHtmlContent && (
                        <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
                          <FileType className="h-3 w-3" /> Rich Content
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleOpenComments(version)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Comments ({commentCount})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleOpenCompare(version)}
                      >
                        <GitCompare className="h-4 w-4" />
                        Compare
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleGenerateSummary(version)}
                        disabled={!sensitivityAllowed}
                        title="Generate a concise summary"
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                        Summarize
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleRunOcr(version)}
                        disabled={!sensitivityAllowed}
                        title="Run OCR to capture text"
                      >
                        <Scan className="h-4 w-4 text-primary" />
                        Run OCR
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          if (!sensitivityAllowed) {
                            handleDownloadBlocked();
                            return;
                          }
                          if (isHtmlContent || version.fileUrl) {
                            setPreviewVersion(version);
                          } else {
                            toast.error('No preview available for this version');
                          }
                        }}
                        disabled={!sensitivityAllowed}
                        title="Preview document"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      {isHtmlContent ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" disabled={!sensitivityAllowed}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                openPdfPrint(version);
                              }}
                            >
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                downloadAsWord(version);
                              }}
                            >
                              Download Word (.doc)
                            </DropdownMenuItem>
                            {version.fileUrl && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (!sensitivityAllowed) {
                                      handleDownloadBlocked();
                                      return;
                                    }
                                    const link = window.document.createElement('a');
                                    link.href = version.fileUrl as string;
                                    link.download = version.fileName;
                                    window.document.body.appendChild(link);
                                    link.click();
                                    window.document.body.removeChild(link);
                                  }}
                                >
                                  Download Original HTML
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!sensitivityAllowed) {
                              handleDownloadBlocked();
                              return;
                            }
                            if (!version.fileUrl) {
                              toast.error('No download available for this version');
                              return;
                            }
                            const link = window.document.createElement('a');
                            link.href = version.fileUrl;
                            link.download = version.fileName;
                            window.document.body.appendChild(link);
                            link.click();
                            window.document.body.removeChild(link);
                            if (currentUser) {
                              logDocumentAccess({
                                documentId: currentDocument.id,
                                userId: currentUser.id,
                                action: 'download',
                                sensitivity: currentDocument.sensitivity,
                              });
                            }
                          }}
                          className="gap-2"
                          disabled={!sensitivityAllowed}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Uploaded {formatDateTime(version.uploadedAt)}</span>
                    </div>
                    {uploader && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-3 w-3" />
                        <span>By {uploader.name}</span>
                      </div>
                    )}
                    {version.notes && (
                      <div className="flex items-start gap-2">
                        <Tag className="h-3 w-3 mt-0.5" />
                        <span>{version.notes}</span>
                      </div>
                    )}
                    {version.contentText && (
                      <p className="text-muted-foreground/80 text-[11px] leading-4 line-clamp-3">
                        {version.contentText}
                      </p>
                    )}
                    {version.summary && (
                      <div className="text-[11px] leading-4 border border-primary/20 bg-primary/5 text-primary-foreground/90 rounded-md p-2">
                        <span className="font-semibold">Summary:</span> {version.summary}
                      </div>
                    )}
                    {version.ocrText && (
                      <div className="text-[11px] leading-4 border border-border bg-muted/60 rounded-md p-2">
                        <span className="font-semibold text-muted-foreground">OCR Text:</span>{' '}
                        <span className="text-muted-foreground">{version.ocrText}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Activity</CardTitle>
            <CardDescription>Recent views and download attempts for this document.</CardDescription>
          </CardHeader>
          <CardContent>
            {accessLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No access history recorded yet. Activity will appear here as collaborators view or download the document.
              </p>
            ) : (
              <div className="space-y-3">
                {accessLogs.map((log) => {
                  const user = userLookup.get(log.userId);
                  return (
                    <div key={log.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                      <span className="mt-0.5">{renderAccessIcon(log.action)}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-foreground font-medium">
                          <span>{user ? user.name : log.userId}</span>
                          <Badge variant="outline" className="uppercase">
                            {log.action === 'attempted-download' ? 'Restricted' : log.action}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          {accessLabel[log.action]} — {formatDateTime(log.timestamp)}
                        </div>
                        {log.action === 'attempted-download' && (
                          <div className="flex items-center gap-2 text-destructive text-[11px]">
                            <Shield className="h-3 w-3" />
                            Download blocked by DRM policy (sensitivity: {log.sensitivity})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {currentUser && (
        <DocumentUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          mode="version"
          currentUser={currentUser}
          document={document}
          onComplete={(updated) => {
            setDocument(updated);
            toast.success('New version added');
          }}
        />
      )}

      <DocumentCommentsDialog
        open={commentsDialogOpen}
        onOpenChange={setCommentsDialogOpen}
        documentId={document.id}
        version={selectedCommentVersion}
        currentUser={currentUser}
        onCommentsUpdated={handleCommentsUpdated}
      />

      <VersionCompareDialog
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
        versions={document.versions}
        baseVersion={compareBaseVersion}
      />

      <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Document Metadata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-title">Title</Label>
              <Input
                id="meta-title"
                value={metadataDraft.title}
                onChange={(e) => setMetadataDraft((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-description">Description</Label>
              <Textarea
                id="meta-description"
                value={metadataDraft.description}
                onChange={(e) =>
                  setMetadataDraft((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={metadataDraft.status}
                  onValueChange={(value) =>
                    setMetadataDraft((prev) => ({ ...prev, status: value as DocumentRecord['status'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sensitivity</Label>
                <Select
                  value={metadataDraft.sensitivity}
                  onValueChange={(value) =>
                    setMetadataDraft((prev) => ({ ...prev, sensitivity: value as DocumentSensitivity }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sensitivity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Select
                  value={metadataDraft.divisionId ?? 'none'}
                  onValueChange={(value) =>
                    setMetadataDraft((prev) => ({ ...prev, divisionId: value === 'none' ? undefined : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {divisionOptions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={metadataDraft.departmentId ?? 'none'}
                  onValueChange={(value) =>
                    setMetadataDraft((prev) => ({ ...prev, departmentId: value === 'none' ? undefined : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {departmentOptions.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-reference">Reference Number</Label>
                <Input
                  id="meta-reference"
                  value={metadataDraft.referenceNumber}
                  onChange={(e) =>
                    setMetadataDraft((prev) => ({ ...prev, referenceNumber: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-tags">Tags</Label>
              <Input
                id="meta-tags"
                value={metadataDraft.tags}
                onChange={(e) => setMetadataDraft((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="Comma separated e.g. operations, marine"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMetadataDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMetadataSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewVersion} onOpenChange={(open) => !open && setPreviewVersion(null)}>
        <DialogContent className="max-w-6xl w-full">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold">Document Preview</DialogTitle>
            {previewVersion && (
              <DialogDescription>
                {previewVersion.fileName} · Version {previewVersion.versionNumber}
              </DialogDescription>
            )}
          </DialogHeader>
          {previewVersion ? (
            previewVersion.contentHtml ? (
              <ScrollArea className="max-h-[80vh] border border-border rounded-md bg-background">
                <div
                  className="prose prose-base dark:prose-invert max-w-none p-6"
                  dangerouslySetInnerHTML={{ __html: previewVersion.contentHtml }}
                />
              </ScrollArea>
            ) : previewVersion.fileType === 'application/pdf' && previewVersion.fileUrl ? (
              <iframe
                src={previewVersion.fileUrl}
                title={previewVersion.fileName}
                className="w-full h-[80vh] rounded-md border border-border"
              />
            ) : previewVersion.fileUrl && previewVersion.fileType?.startsWith('image/') ? (
              <div className="flex items-center justify-center bg-muted/30 border border-border rounded-md">
                <img
                  src={previewVersion.fileUrl}
                  alt={previewVersion.fileName}
                  className="max-h-[80vh] w-auto object-contain"
                />
              </div>
            ) : previewVersion.fileUrl ? (
              <div className="p-6 text-sm text-muted-foreground space-y-4">
                <p>Preview for this file type is not available.</p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const link = window.document.createElement('a');
                    link.href = previewVersion.fileUrl ?? '#';
                    link.download = previewVersion.fileName;
                    window.document.body.appendChild(link);
                    link.click();
                    window.document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download to view locally
                </Button>
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                No preview available for this version.
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DocumentDetailPage;
