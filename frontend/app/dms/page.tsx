"use client";

import { logError } from '@/lib/client-logger';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchDocuments,
  getCachedDocuments,
  getAccessibleDocumentsForUser,
  type DocumentRecord,
  type DocumentType,
  type DocumentStatus,
  fetchWorkspaces,
  getCachedWorkspaces,
  type DocumentWorkspace,
} from '@/lib/dms-storage';
import {
  FileText,
  Search,
  Layers,
  Filter,
  Calendar,
  Hash,
  Tag,
  User as UserIcon,
  BarChart2,
  FilePlus,
  BookOpen,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'other'];
const STATUS_OPTIONS: DocumentStatus[] = ['draft', 'published', 'archived'];

const typeLabel = (type: DocumentType) => {
  switch (type) {
    case 'letter':
      return 'Letter';
    case 'memo':
      return 'Memo';
    case 'circular':
      return 'Circular';
    case 'policy':
      return 'Policy';
    case 'report':
      return 'Report';
    default:
      return 'Other';
  }
};

const statusVariant = (status: DocumentStatus): 'outline' | 'default' | 'secondary' => {
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

const sensitivityLabel = (value: DocumentRecord['sensitivity']) => {
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

const sensitivityBadgeVariant = (value: DocumentRecord['sensitivity']) => {
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

const DocumentManagementPage = () => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { users: organizationUsers, divisions, departments } = useOrganization();
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => getCachedDocuments());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<DocumentRecord | null>(null);
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>(() => getCachedWorkspaces());

  const effectiveUser = useMemo(() => {
    if (currentUser) return currentUser;
    return organizationUsers.find((user) => user.active) ?? null;
  }, [currentUser, organizationUsers]);

  const workspaceLookup = useMemo(() => {
    const map = new Map<string, DocumentWorkspace>();
    workspaces.forEach((workspace) => map.set(workspace.id, workspace));
    return map;
  }, [workspaces]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const [docs, spaces] = await Promise.allSettled([
          fetchDocuments(),
          fetchWorkspaces(),
        ]);

        if (ignore) return;

        if (docs.status === 'fulfilled') {
          setDocuments(docs.value);
        }
        if (spaces.status === 'fulfilled') {
          setWorkspaces(spaces.value);
        }
      } catch (error) {
        logError('Failed to load DMS data', error);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredDocuments = useMemo(() => {
    const list = effectiveUser ? getAccessibleDocumentsForUser(effectiveUser) : documents;
    return list
      .filter((doc) => {
        if (typeFilter !== 'all' && doc.documentType !== typeFilter) return false;
        if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
        if (divisionFilter !== 'all' && doc.divisionId !== divisionFilter) return false;
        if (departmentFilter !== 'all' && doc.departmentId !== departmentFilter) return false;
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(query) ||
          (doc.referenceNumber ?? '').toLowerCase().includes(query) ||
          (doc.description ?? '').toLowerCase().includes(query) ||
          doc.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          doc.versions.some((version) => version.contentText?.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [effectiveUser, documents, searchQuery, typeFilter, statusFilter, divisionFilter, departmentFilter]);

  const draftDocuments = filteredDocuments.filter((doc) => doc.status === 'draft');
  const publishedDocuments = filteredDocuments.filter((doc) => doc.status === 'published');
  const archivedDocuments = filteredDocuments.filter((doc) => doc.status === 'archived');

  const divisionLookup = useMemo(() => new Map(divisions.map((division) => [division.id, division.name])), [divisions]);
  const departmentLookup = useMemo(() => new Map(departments.map((department) => [department.id, department.name])), [departments]);
  const userLookup = useMemo(() => new Map(organizationUsers.map((user) => [user.id, user])), [organizationUsers]);

  const renderDocumentList = (list: DocumentRecord[]) => (
    list.length === 0 ? (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No documents found for the current filters.
        </CardContent>
      </Card>
    ) : (
      list.map((document) => {
        const latestVersion = document.versions[0];
        const author = userLookup.get(document.authorId);
        return (
          <div
            key={document.id}
            onClick={() => router.push(`/dms/${document.id}`)}
            className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-semibold text-foreground truncate">{document.title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {typeLabel(document.documentType)}
                      </Badge>
                      <Badge variant={statusVariant(document.status)} className="capitalize">
                        {document.status}
                      </Badge>
                      <Badge variant={sensitivityBadgeVariant(document.sensitivity)} className="capitalize">
                        {sensitivityLabel(document.sensitivity)}
                      </Badge>
                      {document.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Updated {formatDate(document.updatedAt)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShareTarget(document);
                        setShareDialogOpen(true);
                      }}
                    >
                      Share
                    </Button>
                  </div>
                </div>

                {document.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{document.description}</p>
                )}
                {!document.description && document.versions[0]?.contentText && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {document.versions[0].contentText}
                  </p>
                )}

                {document.workspaceIds?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {document.workspaceIds.map((workspaceId) => {
                      const workspace = workspaceLookup.get(workspaceId);
                      if (!workspace) return null;
                      return (
                        <Badge
                          key={workspaceId}
                          className="text-[10px] font-medium"
                          style={{ backgroundColor: workspace.color, color: '#ffffff' }}
                        >
                          {workspace.name}
                        </Badge>
                      );
                    })}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    <span>{document.referenceNumber ?? 'No reference'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3" />
                    <span>{document.divisionId ? divisionLookup.get(document.divisionId) ?? 'Unknown division' : 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3" />
                    <span>
                      {document.departmentId
                        ? departmentLookup.get(document.departmentId) ?? 'Unknown department'
                        : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-3 w-3" />
                    <span>{author ? author.name : 'Unknown author'}</span>
                  </div>
                </div>

                {latestVersion && (
                  <div className="text-xs text-muted-foreground">
                    Latest version {latestVersion.versionNumber} · Uploaded {formatDateTime(latestVersion.uploadedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })
    )
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Document Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Central workspace for all ECM documents, templates, and collaboration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualHelp
              title="Navigating the DMS"
              description="Search across workspaces, filter by status, document type, division, department, and sensitivity. Open a record to review version history and link it to correspondence."
              steps={[
                'Filter by status, type, or workspace to find the right file.',
                'Create or upload from the actions panel to add new content.',
                'Open a document to edit, comment, compare versions, and manage permissions.'
              ]}
            />
            <Button
              variant="default"
              size="sm"
              className="gap-1"
              onClick={() => setUploadDialogOpen(true)}
              disabled={!effectiveUser}
            >
              <FilePlus className="h-4 w-4" />
              New Document
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Central Document Workspace"
          description="Search across workspaces, filter by status, document type, division, department, and sensitivity. Open a record to review version history and link it to correspondence."
          links={[
            { label: "My Documents", href: "/documents" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, reference, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="published">Published ({publishedDocuments.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({draftDocuments.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedDocuments.length})</TabsTrigger>
            <TabsTrigger value="all">All ({filteredDocuments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="space-y-3">
            {renderDocumentList(publishedDocuments)}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-3">
            {renderDocumentList(draftDocuments)}
          </TabsContent>

          <TabsContent value="archived" className="space-y-3">
            {renderDocumentList(archivedDocuments)}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {renderDocumentList(filteredDocuments)}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4 text-primary" />
              Quick Stats
            </CardTitle>
            <CardDescription>Snapshot of your accessible documents.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">Published</p>
              <p className="text-2xl font-bold text-primary">{publishedDocuments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <p className="text-xs text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold text-warning">{draftDocuments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
              <p className="text-xs text-muted-foreground">Archived</p>
              <p className="text-2xl font-bold text-secondary">{archivedDocuments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {effectiveUser && (
        <DocumentUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          mode="create"
          currentUser={effectiveUser}
          onComplete={() => {
            setDocuments(getCachedDocuments());
          }}
        />
      )}
      <ShareDocumentDialog
        open={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) setShareTarget(null);
        }}
        document={shareTarget}
        currentUserId={currentUser?.id}
        onShared={() => {
          setDocuments(getCachedDocuments());
        }}
      />
    </DashboardLayout>
  );
};

export default DocumentManagementPage;