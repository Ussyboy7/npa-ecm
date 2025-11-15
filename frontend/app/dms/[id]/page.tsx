"use client";

import { logError, logInfo, logWarn } from '@/lib/client-logger';
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
  fetchWorkspaces,
  getActiveEditorSessions,
  getEditorSessionForUser,
  createEditorSession,
  endEditorSession,
  getDocumentComments,
  getDocumentDiscussions,
  addDocumentDiscussion,
  updateDocumentWorkspaces,
  getDocumentAccessLogs,
  logDocumentAccess,
  type DocumentRecord,
  type DocumentVersion,
  type DocumentWorkspace,
  type EditorSession,
  type DocumentComment,
  type DocumentDiscussion,
  type DocumentAccessLog,
} from '@/lib/dms-storage';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import { ArrowLeft, FileText, Download, Layers, Filter, User as UserIcon, Tag, Pencil, FilePlus, Clock, Eye, MessageSquare, Users, Plus, X, CheckCircle2, Circle, Activity, Shield } from 'lucide-react';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentVersionPreviewModal } from '@/components/dms/DocumentVersionPreviewModal';
import { DocumentCommentsDialog } from '@/components/dms/DocumentCommentsDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import { Correspondence, Minute } from '@/lib/npa-structure';
import { Link } from 'lucide-react';

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
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [workspaceManageOpen, setWorkspaceManageOpen] = useState(false);
  const [discussionDialogOpen, setDiscussionDialogOpen] = useState(false);
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
  
  // Collaboration state
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>([]);
  const [activeEditorSessions, setActiveEditorSessions] = useState<EditorSession[]>([]);
  const [currentEditorSession, setCurrentEditorSession] = useState<EditorSession | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [discussions, setDiscussions] = useState<DocumentDiscussion[]>([]);
  const [newDiscussionMessage, setNewDiscussionMessage] = useState('');
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [relatedCorrespondence, setRelatedCorrespondence] = useState<Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string }>>([]);

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
  const permissionSummaries = useMemo(() => {
    if (!document) return [];
    return document.permissions.map((permission, index) => ({
      key: permission.id ?? `${permission.access}-${index}`,
      access: permission.access,
      userNames: permission.userIds.map((id) => userLookup.get(id)?.name ?? `User ${id}`),
      divisionNames: permission.divisionIds.map((id) => divisionLookup.get(id) ?? `Division ${id}`),
      departmentNames: permission.departmentIds.map((id) => departmentLookup.get(id) ?? `Department ${id}`),
      gradeLevels: permission.gradeLevels ?? [],
      createdAt: permission.createdAt ?? permission.updatedAt ?? document.updatedAt,
    }));
  }, [document, userLookup, divisionLookup, departmentLookup]);

  // Load workspaces lookup
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const ws = await fetchWorkspaces();
        setWorkspaces(ws);
      } catch (error) {
        logError('Failed to load workspaces', error);
      }
    };
    void loadWorkspaces();
  }, []);

  // Load document and collaboration data
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

        // Load collaboration data
        if (!ignore && currentUser) {
          // Create or reactivate editor session when viewing document
          try {
            // First, check if user already has a session (active or inactive)
            const existingSession = await getEditorSessionForUser(params.id, currentUser.id);
            
            if (existingSession) {
              // Use existing session (backend will reactivate it when we call create)
              // The backend's create method handles reactivation, so we can just call it
              try {
                const session = await createEditorSession(params.id, currentUser.id, 'Viewing document');
                if (!ignore) setCurrentEditorSession(session);
              } catch (createError: any) {
                // If creation still fails, use the existing session we found
                if (!ignore && existingSession) {
                  setCurrentEditorSession(existingSession);
                } else {
                  logError('Failed to create/reactivate editor session', createError);
                }
              }
            } else {
              // No existing session, create new one
              try {
                const session = await createEditorSession(params.id, currentUser.id, 'Viewing document');
                if (!ignore) setCurrentEditorSession(session);
              } catch (createError: any) {
                // If creation fails, it's okay - we'll just not track the session
                logWarn('Failed to create editor session (non-critical)', createError);
              }
            }
          } catch (error) {
            logError('Failed to handle editor session', error);
          }

          // Load active editors
          const editors = await getActiveEditorSessions(params.id);
          logInfo('Loaded active editors:', editors, 'for document:', params.id);
          if (!ignore) {
            setActiveEditorSessions(editors);
            logInfo('Set active editors state:', editors);
          }

          // Load comments
          const cmts = await getDocumentComments(params.id);
          if (!ignore) setComments(cmts);

          // Load discussions
          const disc = await getDocumentDiscussions(params.id);
          if (!ignore) setDiscussions(disc);

          // Log document view
          if (doc) {
            try {
              await logDocumentAccess({
                documentId: params.id,
                userId: currentUser.id,
                action: 'view',
                sensitivity: doc.sensitivity,
              });
            } catch (error) {
              logError('Failed to log document access', error);
            }
          }

          // Load access logs
          const logs = await getDocumentAccessLogs(params.id);
          if (!ignore) setAccessLogs(logs);

          // Load related correspondence
          try {
            const linksResponse = await apiFetch<Array<{ id: string; correspondence: any; notes?: string }>>(
              `/correspondence/document-links/?document=${params.id}`
            );
            const links = Array.isArray(linksResponse) ? linksResponse : [];
            
            if (links.length > 0) {
              // Fetch full correspondence details and minutes for each
              const correspondenceData = await Promise.all(
                links.map(async (link) => {
                  try {
                    const corrId = typeof link.correspondence === 'string' ? link.correspondence : link.correspondence?.id;
                    if (!corrId) return null;

                    const [corrResponse, minutesResponse] = await Promise.all([
                      apiFetch<any>(`/correspondence/items/${corrId}/`),
                      apiFetch<any[]>(`/correspondence/minutes/?correspondence=${corrId}`),
                    ]);

                    // Map minutes to extract user info
                    const minutes: Minute[] = Array.isArray(minutesResponse)
                      ? minutesResponse.map((item: any) => {
                          const normalizeId = (value: unknown): string | undefined => {
                            if (value === null || value === undefined) return undefined;
                            if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
                              return normalizeId((value as Record<string, unknown>).id);
                            }
                            return String(value);
                          };

                          return {
                            id: String(item.id),
                            correspondenceId: String(corrId),
                            userId: normalizeId(item.user ?? item.user_id) ?? '',
                            userName:
                              typeof item.user === 'object' && item.user
                                ? (() => {
                                    const fullName = `${item.user.first_name ?? ''} ${item.user.last_name ?? ''}`.trim();
                                    if (fullName.length > 0) return fullName;
                                    return item.user.username ?? undefined;
                                  })()
                                : undefined,
                            userEmail: typeof item.user === 'object' ? item.user.email ?? undefined : undefined,
                            userSystemRole: undefined, // Can be extracted if needed
                            gradeLevel: item.grade_level ?? '',
                            actionType: item.action_type ?? 'minute',
                            minuteText: item.minute_text ?? '',
                            direction: item.direction ?? 'downward',
                            stepNumber: item.step_number ?? 1,
                            timestamp: item.timestamp ?? new Date().toISOString(),
                            actedBySecretary: item.acted_by_secretary ?? false,
                            actedByAssistant: item.acted_by_assistant ?? false,
                            assistantType: item.assistant_type ?? undefined,
                            readAt: item.read_at ?? undefined,
                            mentions: Array.isArray(item.mentions) ? item.mentions : [],
                            signature: item.signature_payload ?? undefined,
                          };
                        })
                      : [];
                    const correspondence: Correspondence = {
                      id: String(corrResponse.id),
                      referenceNumber: corrResponse.reference_number ?? '',
                      subject: corrResponse.subject ?? '',
                      source: corrResponse.source ?? 'internal',
                      receivedDate: corrResponse.received_date ?? '',
                      senderName: corrResponse.sender_name ?? '',
                      senderOrganization: corrResponse.sender_organization ?? '',
                      status: corrResponse.status ?? 'pending',
                      priority: corrResponse.priority ?? 'medium',
                      divisionId: corrResponse.division ? (typeof corrResponse.division === 'string' ? corrResponse.division : corrResponse.division.id) : undefined,
                      departmentId: corrResponse.department ? (typeof corrResponse.department === 'string' ? corrResponse.department : corrResponse.department.id) : undefined,
                      currentApproverId: corrResponse.current_approver ? (typeof corrResponse.current_approver === 'string' ? corrResponse.current_approver : corrResponse.current_approver.id) : undefined,
                      createdById: corrResponse.created_by ? (typeof corrResponse.created_by === 'string' ? corrResponse.created_by : corrResponse.created_by.id) : undefined,
                      direction: corrResponse.direction ?? 'upward',
                      createdAt: corrResponse.created_at,
                      updatedAt: corrResponse.updated_at,
                    };

                    return {
                      correspondence,
                      minutes,
                      linkNotes: link.notes,
                    };
                  } catch (error) {
                    logError('Failed to load related correspondence', error);
                    return null;
                  }
                })
              );

              const validData = correspondenceData.filter((item) => item !== null) as Array<{ correspondence: Correspondence; minutes: Minute[]; linkNotes?: string }>;
              if (!ignore) setRelatedCorrespondence(validData);
            } else {
              if (!ignore) setRelatedCorrespondence([]);
            }
          } catch (error) {
            logError('Failed to load related correspondence', error);
            if (!ignore) setRelatedCorrespondence([]);
          }
        }
      } catch (error) {
        logError('Failed to load document', error);
        toast.error('Unable to load document');
        router.push('/dms');
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [params?.id, router, currentUser]);

  // End editor session on unmount
  useEffect(() => {
    return () => {
      if (currentEditorSession) {
        endEditorSession(currentEditorSession.id).catch(logError);
      }
    };
  }, [currentEditorSession]);

  // Poll for active editors every 5 seconds
  useEffect(() => {
    if (!params?.id) return;

    const pollEditors = async () => {
      try {
        const editors = await getActiveEditorSessions(params.id);
        logInfo('Polled active editors:', editors, 'for document:', params.id);
        if (editors && editors.length > 0) {
          logInfo('Setting active editors:', editors);
        }
        setActiveEditorSessions(editors);
      } catch (error) {
        logError('Failed to poll active editors', error);
      }
    };

    const interval = setInterval(pollEditors, 5000);
    pollEditors(); // Initial load

    return () => clearInterval(interval);
  }, [params?.id]);

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
      logError('Failed to update metadata', error);
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

  // Workspace management
  const workspaceLookup = useMemo(() => new Map(workspaces.map((ws) => [ws.id, ws])), [workspaces]);
  const documentWorkspaces = useMemo(() => {
    if (!document) return [];
    return document.workspaceIds
      .map((id) => workspaceLookup.get(id))
      .filter((ws): ws is DocumentWorkspace => ws !== undefined);
  }, [document, workspaceLookup]);

  const handleAddWorkspace = async (workspaceId: string) => {
    if (!document) return;
    try {
      const currentIds = document.workspaceIds;
      if (currentIds.includes(workspaceId)) {
        toast.error('Workspace already assigned');
        return;
      }
      const updated = await updateDocumentWorkspaces(document.id, [...currentIds, workspaceId]);
      setDocument(updated);
      toast.success('Workspace added');
    } catch (error) {
      logError('Failed to add workspace', error);
      toast.error('Unable to add workspace');
    }
  };

  const handleRemoveWorkspace = async (workspaceId: string) => {
    if (!document) return;
    try {
      const updated = await updateDocumentWorkspaces(
        document.id,
        document.workspaceIds.filter((id) => id !== workspaceId)
      );
      setDocument(updated);
      toast.success('Workspace removed');
    } catch (error) {
      logError('Failed to remove workspace', error);
      toast.error('Unable to remove workspace');
    }
  };

  // Discussion handlers
  const handleAddDiscussion = async () => {
    if (!document || !currentUser || !newDiscussionMessage.trim()) return;
    try {
      const discussion = await addDocumentDiscussion({
        documentId: document.id,
        authorId: currentUser.id,
        message: newDiscussionMessage.trim(),
      });
      setDiscussions((prev) => [...prev, discussion]);
      setNewDiscussionMessage('');
      toast.success('Discussion message added');
    } catch (error) {
      logError('Failed to add discussion', error);
      toast.error('Unable to add discussion message');
    }
  };

  // Get user initials for avatar
  const getUserInitials = (userId: string) => {
    const user = userLookup.get(userId);
    if (!user) return '?';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
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

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" />
                  Access & Permissions
                </CardTitle>
                <CardDescription>Track who currently has visibility into this record.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
                Manage Access
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {permissionSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No explicit share rules exist yet. Use the Share button to grant targeted access.
                </p>
              ) : (
                permissionSummaries.map((entry) => (
                  <div key={entry.key} className="rounded-lg border border-border/70 p-4 space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">{entry.access} access</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.createdAt ? `Updated ${formatDateTime(entry.createdAt)}` : 'Inherited rule'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{entry.userNames.length} users</span>
                        <span>• {entry.divisionNames.length} divisions</span>
                        <span>• {entry.departmentNames.length} departments</span>
                      </div>
                    </div>
                    <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
                      <div>
                        <p className="font-medium text-foreground text-xs mb-1">Users</p>
                        <p>{entry.userNames.length ? entry.userNames.join(', ') : '—'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-xs mb-1">Divisions</p>
                        <p>{entry.divisionNames.length ? entry.divisionNames.join(', ') : '—'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-xs mb-1">Departments</p>
                        <p>{entry.departmentNames.length ? entry.departmentNames.join(', ') : '—'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-xs mb-1">Grade Levels</p>
                        <p>{entry.gradeLevels.length ? entry.gradeLevels.join(', ') : '—'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
                        {/* Show Preview button if there's a file (fileName) or HTML content */}
                        {(version.fileName || (version.contentHtml && version.contentHtml.trim() !== '')) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => setPreviewVersion(version)}
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        )}
                        {/* Show Download button only if there's a fileUrl */}
                        {version.fileUrl && version.fileUrl.trim() !== '' && (
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

          {/* Collaboration */}
          <Card>
            <CardHeader>
              <CardTitle>Collaboration</CardTitle>
              <CardDescription>Coordinate editing, discussions, and shared workspaces.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Editors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Active Editors</span>
                  <Badge variant="outline" className="text-xs">
                    {activeEditorSessions.length} {activeEditorSessions.length === 1 ? 'editor' : 'editors'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeEditorSessions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No one is currently editing.</span>
                  ) : (
                    activeEditorSessions.map((session) => {
                      const user = userLookup.get(session.userId);
                      const editingSince = session.since ? new Date(session.since) : null;
                      const timeAgo = editingSince
                        ? Math.floor((Date.now() - editingSince.getTime()) / 1000 / 60)
                        : null;
                      
                      return (
                        <div
                          key={session.id}
                          className="flex items-center gap-2 px-2 py-1.5 border border-border rounded-md bg-background"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getUserInitials(session.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {user ? user.name : session.userId}
                            </span>
                            {timeAgo !== null && (
                              <span className="text-[10px] text-muted-foreground">
                                Editing for {timeAgo < 1 ? '<1 min' : `${timeAgo} min`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Workspaces */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Workspaces</span>
                  <Dialog open={workspaceManageOpen} onOpenChange={setWorkspaceManageOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Plus className="h-3 w-3" />
                        Manage
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage Workspaces</DialogTitle>
                        <DialogDescription>
                          Add or remove workspaces for this document.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Available Workspaces</Label>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {workspaces.map((workspace) => {
                              const isAssigned = document.workspaceIds.includes(workspace.id);
                              return (
                                <div
                                  key={workspace.id}
                                  className="flex items-center justify-between p-2 border rounded-md"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: workspace.color }}
                                    />
                                    <span className="text-sm">{workspace.name}</span>
                                    {workspace.description && (
                                      <span className="text-xs text-muted-foreground">
                                        - {workspace.description}
                                      </span>
                                    )}
                                  </div>
                                  {isAssigned ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveWorkspace(workspace.id)}
                                      className="h-7 text-xs gap-1"
                                    >
                                      <X className="h-3 w-3" />
                                      Remove
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddWorkspace(workspace.id)}
                                      className="h-7 text-xs gap-1"
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-wrap gap-2">
                  {documentWorkspaces.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No workspaces assigned.</p>
                  ) : (
                    documentWorkspaces.map((workspace) => (
                      <Badge
                        key={workspace.id}
                        variant="outline"
                        className="gap-1.5 text-xs"
                        style={{ borderColor: workspace.color }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: workspace.color }}
                        />
                        {workspace.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Comments</span>
                  <div className="flex items-center gap-2">
                    {comments.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {comments.filter((c) => !c.resolved).length} unresolved
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setCommentsDialogOpen(true)}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {comments.length > 0 ? `${comments.length} Comments` : 'Add Comment'}
                    </Button>
                  </div>
                </div>
                {comments.length > 0 && (
                  <div className="space-y-1">
                    {comments.slice(0, 3).map((comment) => {
                      const author = userLookup.get(comment.authorId);
                      return (
                        <div key={comment.id} className="flex items-start gap-2 text-xs">
                          {comment.resolved ? (
                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground" />
                          ) : (
                            <Circle className="h-3 w-3 mt-0.5 text-primary" />
                          )}
                          <span className="text-muted-foreground">
                            <span className="font-medium">{author?.name ?? 'Unknown'}</span>:{' '}
                            {comment.content.substring(0, 60)}
                            {comment.content.length > 60 ? '...' : ''}
                          </span>
                        </div>
                      );
                    })}
                    {comments.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setCommentsDialogOpen(true)}
                      >
                        View all {comments.length} comments
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Discussions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Discussions</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setDiscussionDialogOpen(true)}
                  >
                    <Users className="h-3 w-3" />
                    {discussions.length > 0 ? `${discussions.length} Messages` : 'Start Discussion'}
                  </Button>
                </div>
                {discussions.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {discussions.slice(-3).map((discussion) => {
                      const author = userLookup.get(discussion.authorId);
                      return (
                        <div key={discussion.id} className="p-2 border rounded-md text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {getUserInitials(discussion.authorId)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{author?.name ?? 'Unknown'}</span>
                            <span className="text-muted-foreground">
                              {formatDateTime(discussion.createdAt)}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{discussion.message}</p>
                        </div>
                      );
                    })}
                    {discussions.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setDiscussionDialogOpen(true)}
                      >
                        View all {discussions.length} messages
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments Dialog */}
          <DocumentCommentsDialog
            open={commentsDialogOpen}
            onOpenChange={setCommentsDialogOpen}
            documentId={document.id}
            version={primaryVersion}
            currentUser={uploadUser}
            onCommentsUpdated={(updatedComments) => {
              setComments(updatedComments);
            }}
          />

          {/* Discussion Dialog */}
          <Dialog open={discussionDialogOpen} onOpenChange={setDiscussionDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Document Discussion</DialogTitle>
                <DialogDescription>
                  Share thoughts and collaborate on this document.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4">
                {discussions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No discussion messages yet. Start the conversation!
                  </p>
                ) : (
                  discussions.map((discussion) => {
                    const author = userLookup.get(discussion.authorId);
                    return (
                      <div key={discussion.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getUserInitials(discussion.authorId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{author?.name ?? 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(discussion.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{discussion.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="space-y-2 border-t pt-4">
                <Textarea
                  placeholder="Type your message..."
                  value={newDiscussionMessage}
                  onChange={(e) => setNewDiscussionMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddDiscussion}
                    disabled={!newDiscussionMessage.trim()}
                    size="sm"
                  >
                    Send Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Access Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Access Activity
              </CardTitle>
              <CardDescription>Recent views and download attempts for this document.</CardDescription>
            </CardHeader>
            <CardContent>
              {accessLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No access activity recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {accessLogs.slice(0, 20).map((log) => {
                    const user = userLookup.get(log.userId);
                    const actionIcon = log.action === 'download' ? Download : Eye;
                    const actionLabel = log.action === 'download' ? 'Downloaded' : log.action === 'attempted-download' ? 'Attempted Download' : 'Viewed';
                    
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-2 border rounded-md text-sm">
                        <div className="flex items-center gap-2 flex-1">
                          {actionIcon === Download ? (
                            <Download className="h-4 w-4 text-primary" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{user?.name ?? 'Unknown User'}</span>
                          <Badge variant="outline" className="text-xs">
                            {actionLabel}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                  {accessLogs.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 20 of {accessLogs.length} access records
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
              <CardDescription>Latest version content for quick review.</CardDescription>
            </CardHeader>
            <CardContent>
              {primaryVersion ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Version {primaryVersion.versionNumber}</Badge>
                      <span className="text-sm text-foreground">{primaryVersion.fileName}</span>
                    </div>
                    {(primaryVersion.fileName || (primaryVersion.contentHtml && primaryVersion.contentHtml.trim() !== '')) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setPreviewVersion(primaryVersion)}
                      >
                        <Eye className="h-4 w-4" />
                        View Full Preview
                      </Button>
                    )}
                  </div>
                  {primaryVersion.contentHtml && primaryVersion.contentHtml.trim() !== '' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none border border-border rounded-lg p-4 max-h-[400px] overflow-auto">
                      <div dangerouslySetInnerHTML={{ __html: primaryVersion.contentHtml }} />
                    </div>
                  ) : primaryVersion.fileUrl && primaryVersion.fileUrl.trim() !== '' ? (
                    <div className="border border-border rounded-lg p-4 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">File preview available. Click "View Full Preview" to see the document.</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg p-4 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No preview available for this version.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No versions uploaded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Correspondence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Related Correspondence
              </CardTitle>
              <CardDescription>Workflows that reference this document, including minute history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {relatedCorrespondence.length === 0 ? (
                <p className="text-sm text-muted-foreground">No related correspondence found.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {relatedCorrespondence.map(({ correspondence, minutes, linkNotes }) => {
                    const createdBy = userLookup.get(correspondence.createdById ?? '');
                    const currentApprover = userLookup.get(correspondence.currentApproverId ?? '');
                    const divisionName = correspondence.divisionId ? divisionLookup.get(correspondence.divisionId) : undefined;
                    const departmentName = correspondence.departmentId ? departmentLookup.get(correspondence.departmentId) : undefined;

                    return (
                      <div key={correspondence.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Button
                                variant="link"
                                className="h-auto p-0 font-semibold text-left"
                                onClick={() => router.push(`/correspondence/${correspondence.id}`)}
                              >
                                {correspondence.referenceNumber}
                              </Button>
                              <Badge variant={correspondence.status === 'completed' ? 'default' : correspondence.status === 'in-progress' ? 'secondary' : 'outline'}>
                                {correspondence.status}
                              </Badge>
                              <Badge variant="outline">{correspondence.priority}</Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground">{correspondence.subject}</p>
                            {linkNotes && (
                              <p className="text-xs text-muted-foreground mt-1">Link note: {linkNotes}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                              {divisionName && <span>Division: {divisionName}</span>}
                              {departmentName && <span>Department: {departmentName}</span>}
                              {createdBy && <span>Created by: {createdBy.name}</span>}
                              {correspondence.receivedDate && <span>Received: {formatDate(correspondence.receivedDate)}</span>}
                            </div>
                          </div>
                        </div>

                        {minutes.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Minute History ({minutes.length})</p>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {minutes
                                .sort((a, b) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime())
                                .map((minute) => {
                                  const minuteUser = userLookup.get(minute.userId ?? '');
                                  const displayName = minute.userName ?? minuteUser?.name ?? 'Unknown';
                                  return (
                                    <div key={minute.id} className="text-xs bg-muted/50 rounded p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">{displayName}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {minute.actionType === 'minute' ? 'Minute' : minute.actionType === 'approve' ? 'Approval' : minute.actionType}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          {formatDateTime(minute.timestamp ?? '')}
                                        </span>
                                      </div>
                                      {minute.minuteText && (
                                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{minute.minuteText}</p>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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

      {previewVersion && (
        <DocumentVersionPreviewModal
          version={previewVersion}
          isOpen={!!previewVersion}
          onClose={() => setPreviewVersion(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default DocumentDetailPage;