"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchDocumentById,
  updateDocumentMetadata,
  createDocumentVersion,
  type DocumentRecord,
  type DocumentVersion,
} from '@/lib/dms-storage';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import { ArrowLeft, FileText, Download, Layers, Filter, User as UserIcon, Tag, Pencil, FilePlus, Clock } from 'lucide-react';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [metadataDraft, setMetadataDraft] = useState({
    title: '',
    description: '',
    referenceNumber: '',
    divisionId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
    tags: '' as string,
    sensitivity: 'internal' as DocumentRecord['sensitivity'],
    status: 'draft' as DocumentRecord['status'],
  });

  const { currentUser } = useCurrentUser();
  const { users: organizationUsers, divisions, departments } = useOrganization();
  const userLookup = useMemo(() => new Map(organizationUsers.map((user) => [user.id, user])), [organizationUsers]);
  const divisionLookup = useMemo(() => new Map(divisions.map((division) => [division.id, division.name])), [divisions]);
  const departmentLookup = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );
  const uploadUser = useMemo(
    () => currentUser ?? organizationUsers.find((user) => user.active) ?? null,
    [currentUser, organizationUsers],
  );

  useEffect(() => {
    if (!params?.id) return;

    let ignore = false;

    const load = async () => {
      try {
        const doc = await fetchDocumentById(params.id);
        if (!ignore) {
          setDocument(doc);
          setMetadataDraft({
            title: doc.title,
            description: doc.description ?? '',
            referenceNumber: doc.referenceNumber ?? '',
            divisionId: doc.divisionId,
            departmentId: doc.departmentId,
            tags: doc.tags.join(', '),
            sensitivity: doc.sensitivity,
            status: doc.status,
          });
        }
      } catch (error) {
        console.error('Failed to load document', error);
        toast.error('Unable to load document');
        router.push('/dms');
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [params?.id, router]);

  const handleMetadataSave = async () => {
    if (!document) return;

    try {
      const tags = metadataDraft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const updated = await updateDocumentMetadata(document.id, {
        title: metadataDraft.title,
        description: metadataDraft.description,
        referenceNumber: metadataDraft.referenceNumber,
        divisionId: metadataDraft.divisionId,
        departmentId: metadataDraft.departmentId,
        tags,
        sensitivity: metadataDraft.sensitivity,
        status: metadataDraft.status,
      });

      setDocument(updated);
      toast.success('Document details updated');
    } catch (error) {
      console.error('Failed to update metadata', error);
      toast.error('Unable to update document');
    }
  };

  const handleVersionUploadComplete = (updated: DocumentRecord) => {
    setDocument(updated);
    setUploadDialogOpen(false);
  };

  const handleQuickVersionUpload = () => {
    if (!document || !uploadUser) return;
    setUploadDialogOpen(true);
  };

  if (!document) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading document...
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const author = userLookup.get(document.authorId);
  const versions = Array.isArray(document.versions) ? document.versions : [];
  const primaryVersion = versions[0];
  const workspaceIds = Array.isArray(document.workspaceIds) ? document.workspaceIds : [];
  const activeEditors = Array.isArray(document.activeEditors) ? document.activeEditors : [];

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dms')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                <FileText className="h-5 w-5 mr-2" />
                {document.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                document.status === 'published'
                  ? 'default'
                  : document.status === 'archived'
                    ? 'secondary'
                    : 'outline'
              }>
                {statusLabel(document.status)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {document.documentType}
              </Badge>
              <Badge
                variant={document.sensitivity === 'restricted' ? 'destructive' : 'outline'}
                className="capitalize"
              >
                {document.sensitivity}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
              >
                Share
              </Button>
              <Button variant="default" size="sm" onClick={handleQuickVersionUpload} disabled={!uploadUser}>
                <FilePlus className="h-4 w-4 mr-2" />
                Upload Version
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
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
              <CardTitle>Document Details</CardTitle>
              <CardDescription>Overview of metadata and classification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    value={metadataDraft.title}
                    onChange={(e) => setMetadataDraft((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={metadataDraft.status}
                    onValueChange={(value) =>
                      setMetadataDraft((prev) => ({ ...prev, status: value as DocumentRecord['status'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doc-division">Division</Label>
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
                      {divisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-department">Department</Label>
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
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doc-reference">Reference Number</Label>
                  <Input
                    id="doc-reference"
                    value={metadataDraft.referenceNumber}
                    onChange={(e) =>
                      setMetadataDraft((prev) => ({ ...prev, referenceNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sensitivity</Label>
                  <Select
                    value={metadataDraft.sensitivity}
                    onValueChange={(value) =>
                      setMetadataDraft((prev) => ({ ...prev, sensitivity: value as DocumentRecord['sensitivity'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-description">Description</Label>
                <Textarea
                  id="doc-description"
                  rows={4}
                  value={metadataDraft.description}
                  onChange={(e) =>
                    setMetadataDraft((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleMetadataSave}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Versions */}
          <Card>
            <CardHeader>
              <CardTitle>Versions</CardTitle>
              <CardDescription>All uploaded versions of this document.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {versions.length === 0 && (
                <p className="text-sm text-muted-foreground">No versions have been uploaded yet.</p>
              )}
              {versions.map((version) => {
                const uploader = userLookup.get(version.uploadedBy);
                return (
                  <div key={version.id} className="p-3 border border-border rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Version {version.versionNumber}</Badge>
                        <span className="text-sm text-foreground truncate max-w-[200px] sm:max-w-xs" title={version.fileName}>
                          {version.fileName}
                        </span>
                        <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
                          <FileText className="h-3 w-3" /> {version.fileType}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            const link = window.document.createElement('a');
                            link.href = version.fileUrl as string;
                            link.download = version.fileName;
                            window.document.body.appendChild(link);
                            link.click();
                            window.document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
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

          {/* Collaboration */}
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
                  {/* Editing functionality removed as per new_code */}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Workspaces</span>
                <div className="flex flex-wrap gap-2">
                  {workspaceIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No workspaces assigned.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {workspaceIds.map((workspaceId) => (
                        <li key={workspaceId}>{workspaceId}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Discussion and Comments removed as per new_code */}
              {/* Version Compare removed as per new_code */}
            </CardContent>
          </Card>

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
              <CardDescription>Latest published content for quick review.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Content preview logic removed as per new_code */}
            </CardContent>
          </Card>

          {/* Related Correspondence */}
          <Card>
            <CardHeader>
              <CardTitle>Related Correspondence</CardTitle>
              <CardDescription>Workflows that reference this document, including minute history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Related correspondence logic removed as per new_code */}
            </CardContent>
          </Card>

          {/* Access Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Access Activity</CardTitle>
              <CardDescription>Recent views and download attempts for this document.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Access activity logic removed as per new_code */}
            </CardContent>
          </Card>
        </div>
      </div>

      {uploadUser && (
        <DocumentUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          mode="version"
          currentUser={uploadUser}
          document={document}
          onComplete={handleVersionUploadComplete}
        />
      )}

      <ShareDocumentDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        document={document}
        currentUserId={currentUser?.id}
      />
    </DashboardLayout>
  );
};

export default DocumentDetailPage;
