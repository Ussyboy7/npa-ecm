"use client";

import { logError } from '@/lib/client-logger';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import {
  queryDocuments,
  type DocumentRecord,
  type DocumentStatus,
  type DocumentType,
  fetchWorkspaces,
  type DocumentWorkspace,
  getCachedWorkspaces,
} from '@/lib/dms-storage';
import { formatDate, formatDateTime } from '@/lib/correspondence-helpers';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ShareDocumentDialog } from '@/components/dms/ShareDocumentDialog';

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
  const { currentUser } = useCurrentUser();
  const { users: organizationUsers, divisions, departments } = useOrganization();
  const effectiveUser = useMemo(
    () => currentUser ?? organizationUsers.find((user) => user.active) ?? null,
    [currentUser, organizationUsers],
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>(() => getCachedWorkspaces());
  const workspaceLookup = useMemo(() => {
    const map = new Map<string, DocumentWorkspace>();
    workspaces.forEach((workspace) => map.set(workspace.id, workspace));
    return map;
  }, [workspaces]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<DocumentRecord | null>(null);
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await queryDocuments({
        page,
        pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter,
        documentType: typeFilter,
        divisionId: divisionFilter,
        departmentId: departmentFilter,
        ordering: '-updated_at',
      });
      setDocuments(response.results);
      setTotalCount(response.count);
    } catch (err) {
      logError('Failed to load documents', err);
      setDocuments([]);
      setTotalCount(0);
      setError('Unable to load documents right now.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, typeFilter, divisionFilter, departmentFilter]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const spaces = await fetchWorkspaces();
        if (!ignore) {
          setWorkspaces(spaces);
        }
      } catch (error) {
        logError('Failed to load workspaces', error);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, typeFilter, divisionFilter, departmentFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const DocumentCard = ({ document }: { document: DocumentRecord }) => {
    const latestVersion = document.versions[0];
    const author = organizationUsers.find((u) => u.id === document.authorId);
    const division = document.divisionId
      ? divisions.find((div) => div.id === document.divisionId)
      : undefined;
    const department = document.departmentId
      ? departments.find((dept) => dept.id === document.departmentId)
      : undefined;

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
                  // Calculate text color based on background luminance for contrast
                  const getContrastColor = (bgColor: string): string => {
                    const hex = bgColor.replace('#', '');
                    if (hex.length !== 6) return '#ffffff'; // Fallback to white
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    // Calculate relative luminance (0-1)
                    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    // Use dark text on light backgrounds, light text on dark backgrounds
                    return luminance > 0.5 ? '#1f2937' : '#ffffff';
                  };
                  return (
                    <Badge
                      key={workspaceId}
                      className="text-[10px] font-medium"
                      style={{ backgroundColor: workspace.color, color: getContrastColor(workspace.color) }}
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
                <span>{division?.name ?? 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3" />
                <span>{department?.name ?? 'Unassigned'}</span>
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
    <div className="space-y-3">
      {list.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
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
            <ContextualHelp
              title="Manage your personal workspace"
              description="Filter by status, type, and workspace to review your assigned documents. Upload new versions or start new drafts to collaborate with your team."
              steps={[
                'Search within your documents using title, reference, or content.',
                'Upload new versions or create documents to keep content up to date.',
                'Filter by division, department, or status to focus on relevant work.',
              ]}
            />
            <Button variant="default" size="sm" className="gap-1" onClick={() => router.push('/dms')}>
              <FilePlus className="h-4 w-4" />
              Go to DMS
            </Button>
          </div>
        </div>

        <HelpGuideCard
          title="Manage Your Documents"
          description="Review documents you authored, collaborate on, or have access to through divisional permissions. Filter by status, type, division, and workspace, then open the DMS for version history and collaboration."
          links={[{ label: 'Open DMS', href: '/dms' }]}
        />

        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents by title or reference..."
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
              {STATUS_FILTERS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
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

        {error && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading documents…
            </CardContent>
          </Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No documents match the current filters.
            </CardContent>
          </Card>
        ) : (
          renderDocumentList(documents)
        )}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            {totalCount === 0
              ? 0
              : `${(page - 1) * pageSize + 1}-${Math.min(totalCount, (page - 1) * pageSize + documents.length)}`}{' '}
            of {totalCount} documents
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>

      <ShareDocumentDialog
        open={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) setShareTarget(null);
        }}
        document={shareTarget}
        currentUserId={currentUser?.id}
        onShared={() => {
          void loadDocuments();
        }}
      />
      </div>
    </DashboardLayout>
  );
};

export default MyDocuments;