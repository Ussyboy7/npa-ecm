"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import {
  FileText,
  Search,
  Layers,
  Filter,
  Calendar,
  Hash,
  User as UserIcon,
  FilePlus,
} from 'lucide-react';
import {
  initializeDmsDocuments,
  loadDocuments,
  getAccessibleDocumentsForUser,
  type DocumentRecord,
  type DocumentStatus,
  type DocumentType,
  getDivisionName,
  getDepartmentName,
  listWorkspaces,
  type DocumentWorkspace,
} from '@/lib/dms-storage';
import { MOCK_USERS, DIVISIONS, DEPARTMENTS, type User as NPAUser } from '@/lib/npa-structure';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'other'];
const STATUS_FILTERS: { value: DocumentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

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

const MyDocuments = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<NPAUser | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const workspaces = useMemo(() => listWorkspaces(), []);
  const workspaceLookup = useMemo(() => {
    const map = new Map<string, DocumentWorkspace>();
    workspaces.forEach((workspace) => map.set(workspace.id, workspace));
    return map;
  }, [workspaces]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeDmsDocuments();
    let savedUserId = localStorage.getItem('npa_demo_user_id');
    if (!savedUserId) {
      const md = MOCK_USERS.find((u) => u.gradeLevel === 'MDCS');
      if (md) {
        savedUserId = md.id;
        localStorage.setItem('npa_demo_user_id', md.id);
      }
    }

    if (savedUserId) {
      const user = MOCK_USERS.find((u) => u.id === savedUserId) ?? null;
      setCurrentUser(user);
      if (user) {
        const accessible = getAccessibleDocumentsForUser(user);
        setDocuments(accessible);
      } else {
        setDocuments(loadDocuments());
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredDocuments = useMemo(() => {
    if (!currentUser || !mounted) return [];
    return documents
      .filter((doc) => {
        if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
        if (typeFilter !== 'all' && doc.documentType !== typeFilter) return false;
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
  }, [currentUser, mounted, documents, searchQuery, statusFilter, typeFilter, divisionFilter, departmentFilter]);

  const draftDocuments = filteredDocuments.filter((doc) => doc.status === 'draft');
  const publishedDocuments = filteredDocuments.filter((doc) => doc.status === 'published');
  const archivedDocuments = filteredDocuments.filter((doc) => doc.status === 'archived');

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    );
  }

  const DocumentCard = ({ document }: { document: DocumentRecord }) => {
    const latestVersion = document.versions[0];
    const author = MOCK_USERS.find((u) => u.id === document.authorId);

    return (
      <div
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
                <h4 className="font-semibold text-foreground truncate">{document.title}</h4>
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
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Updated {formatDate(document.updatedAt)}
              </span>
            </div>

            {document.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {document.description}
              </p>
            )}
            {!document.description && latestVersion?.contentText && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {latestVersion.contentText}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span>{document.referenceNumber ?? 'No reference'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-3 w-3" />
                <span>{getDivisionName(document.divisionId)}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-3 w-3" />
                <span>{author ? author.name : 'Unknown author'}</span>
              </div>
            </div>

            {latestVersion && (
              <div className="text-xs text-muted-foreground">
                Last version {latestVersion.versionNumber} uploaded {formatDateTime(latestVersion.uploadedAt)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentList = (list: DocumentRecord[]) => (
    list.length === 0 ? (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          No documents match the current filter.
        </CardContent>
      </Card>
    ) : (
      list.map((doc) => <DocumentCard key={doc.id} document={doc} />)
    )
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              My Documents
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage documents you own or have access to within your division and organisation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/dms')}
              className="gap-2">
              <FilePlus className="h-4 w-4" />
              Open DMS
            </Button>
            <ContextualHelp
              title="How to work with documents"
              description="Search across metadata and full text, then open a record for version history, collaboration, and signature controls."
              steps={[
                'Use filters or tags to narrow documents.',
                'Open a document to view versions and collaborate.',
                'Create or upload new files from the DMS workspace.'
              ]}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Manage Your Documents"
          description="Review documents you authored, collaborate on, or have access to through divisional permissions. Filter by status, type, division, and workspace, then open the DMS for version history and collaboration."
          links={[
            { label: "Open DMS", href: "/dms" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents by title, reference, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
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
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {DIVISIONS.map((division) => (
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
              {DEPARTMENTS.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="drafts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="drafts">Drafts ({draftDocuments.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({publishedDocuments.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedDocuments.length})</TabsTrigger>
            <TabsTrigger value="all">All ({filteredDocuments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="drafts" className="space-y-3">
            {renderDocumentList(draftDocuments)}
          </TabsContent>

          <TabsContent value="published" className="space-y-3">
            {renderDocumentList(publishedDocuments)}
          </TabsContent>

          <TabsContent value="archived" className="space-y-3">
            {renderDocumentList(archivedDocuments)}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {renderDocumentList(filteredDocuments)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MyDocuments;
