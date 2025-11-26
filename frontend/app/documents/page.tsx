"use client";

import { logError } from '@/lib/client-logger';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import {
  FileText,
  Search,
  Layers,
  Filter,
  Hash,
  User as UserIcon,
  FilePlus,
  Loader2,
  ChevronLeft,
  ChevronRight,
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

const typeLabel = (type: DocumentType) => {
  switch (type) {
    case 'letter': return 'Letter';
    case 'memo': return 'Memo';
    case 'circular': return 'Circular';
    case 'policy': return 'Policy';
    case 'report': return 'Report';
    default: return 'Other';
  }
};

const statusVariant = (status: DocumentStatus): 'outline' | 'default' | 'secondary' => {
  switch (status) {
    case 'draft': return 'outline';
    case 'published': return 'default';
    case 'archived': return 'secondary';
    default: return 'outline';
  }
};

const sensitivityLabel = (value: DocumentRecord['sensitivity']) => {
  switch (value) {
    case 'public': return 'Public';
    case 'internal': return 'Internal';
    case 'confidential': return 'Confidential';
    case 'restricted': return 'Restricted';
    default: return value;
  }
};

const sensitivityBadgeVariant = (value: DocumentRecord['sensitivity']) => {
  switch (value) {
    case 'public': return 'secondary';
    case 'internal': return 'outline';
    case 'confidential': return 'default';
    case 'restricted': return 'destructive';
    default: return 'outline';
  }
};

const MyDocuments = () => {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { users: organizationUsers, divisions, departments } = useOrganization();
  const effectiveUser = useMemo(() => currentUser ?? organizationUsers.find((user) => user.active) ?? null, [currentUser, organizationUsers]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [workspaces, setWorkspaces] = useState<DocumentWorkspace[]>(() => getCachedWorkspaces());
  const workspaceLookup = useMemo(() => {
    const map = new Map<string, DocumentWorkspace>();
    workspaces.forEach((workspace) => map.set(workspace.id, workspace));
    return map;
  }, [workspaces]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<DocumentRecord | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedTypes.length > 0) count++;
    if (divisionFilter !== 'all') count++;
    if (departmentFilter !== 'all') count++;
    return count;
  }, [selectedStatuses, selectedTypes, divisionFilter, departmentFilter]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setDivisionFilter('all');
    setDepartmentFilter('all');
    setSearchQuery('');
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await queryDocuments({
        page,
        pageSize,
        search: searchQuery.trim() || undefined,
        status: selectedStatuses.length === 1 ? selectedStatuses[0] as DocumentStatus : 'all',
        documentType: selectedTypes.length === 1 ? selectedTypes[0] as DocumentType : 'all',
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
  }, [page, pageSize, searchQuery, selectedStatuses, selectedTypes, divisionFilter, departmentFilter]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const spaces = await fetchWorkspaces();
        if (!ignore) setWorkspaces(spaces);
      } catch (error) {
        logError('Failed to load workspaces', error);
      }
    };
    void load();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedStatuses, selectedTypes, divisionFilter, departmentFilter, pageSize]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  const DocumentCard = ({ document }: { document: DocumentRecord }) => {
    const latestVersion = document.versions[0];
    const author = organizationUsers.find((u) => u.id === document.authorId);
    const division = document.divisionId ? divisions.find((div) => div.id === document.divisionId) : undefined;
    const department = document.departmentId ? departments.find((dept) => dept.id === document.departmentId) : undefined;

    const getContrastColor = (bgColor: string): string => {
      const hex = bgColor.replace('#', '');
      if (hex.length !== 6) return '#ffffff';
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#1f2937' : '#ffffff';
    };

    return (
      <div onClick={() => router.push(`/dms/${document.id}`)} className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-semibold text-foreground truncate">{document.title}</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{typeLabel(document.documentType)}</Badge>
                  <Badge variant={statusVariant(document.status)} className="capitalize">{document.status}</Badge>
                  <Badge variant={sensitivityBadgeVariant(document.sensitivity)} className="capitalize">{sensitivityLabel(document.sensitivity)}</Badge>
                  {document.tags?.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Updated {formatDate(document.updatedAt)}</span>
                <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); setShareTarget(document); setShareDialogOpen(true); }}>Share</Button>
              </div>
            </div>
            {(document.description || latestVersion?.contentText) && (
              <p className="text-sm text-muted-foreground line-clamp-2">{document.description || latestVersion?.contentText}</p>
            )}
            {document.workspaceIds?.length ? (
              <div className="flex flex-wrap gap-2">
                {document.workspaceIds.map((workspaceId) => {
                  const workspace = workspaceLookup.get(workspaceId);
                  if (!workspace) return null;
                  return <Badge key={workspaceId} className="text-[10px] font-medium" style={{ backgroundColor: workspace.color, color: getContrastColor(workspace.color) }}>{workspace.name}</Badge>;
                })}
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Hash className="h-3 w-3" /><span>{document.referenceNumber ?? 'No reference'}</span></div>
              <div className="flex items-center gap-2"><Layers className="h-3 w-3" /><span>{division?.name ?? 'Unassigned'}</span></div>
              <div className="flex items-center gap-2"><UserIcon className="h-3 w-3" /><span>{author ? author.name : 'Unknown author'}</span></div>
            </div>
            {latestVersion && <div className="text-xs text-muted-foreground">Last version {latestVersion.versionNumber} uploaded {formatDateTime(latestVersion.uploadedAt)}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">My Documents</h1>
            <p className="text-muted-foreground mt-1">Manage documents you own or have access to within your division and organisation</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
            <Button size="sm" onClick={() => router.push('/dms')}><FilePlus className="h-4 w-4 mr-2" />Go to DMS</Button>
            <ContextualHelp
              title="Manage your personal workspace"
              description="Filter by status, type, and workspace to review your assigned documents. Upload new versions or start new drafts to collaborate with your team."
              steps={['Search within your documents using title, reference, or content.', 'Upload new versions or create documents to keep content up to date.', 'Filter by division, department, or status to focus on relevant work.']}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Manage Your Documents"
          description="Review documents you authored, collaborate on, or have access to through divisional permissions. Filter by status, type, division, and workspace, then open the DMS for version history and collaboration."
          links={[{ label: 'Open DMS', href: '/dms' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Document Filters</CardTitle>
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['draft', 'published', 'archived'].map((status) => (
                      <Badge key={status} variant={selectedStatuses.includes(status) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => toggleStatus(status)}>
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Type</Label>
                  <div className="flex flex-wrap gap-1">
                    {DOCUMENT_TYPES.map((type) => (
                      <Badge key={type} variant={selectedTypes.includes(type) ? 'default' : 'outline'} className="cursor-pointer capitalize text-xs" onClick={() => toggleType(type)}>
                        {typeLabel(type)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Division</Label>
                  <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions.map((division) => <SelectItem key={division.id} value={division.id}>{division.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents by title or reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {error && <Card><CardContent className="py-6 text-sm text-destructive">{error}</CardContent></Card>}

        {loading ? (
          <Card><CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading documents…</CardContent></Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              {searchQuery || activeFilterCount > 0 ? 'No documents match your filters.' : 'No documents found.'}
              {(searchQuery || activeFilterCount > 0) && <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 block mx-auto">Clear Filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{documents.map((doc) => <DocumentCard key={doc.id} document={doc} />)}</div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Showing {totalCount === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(totalCount, (page - 1) * pageSize + documents.length)}`} of {totalCount} documents</p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Per page:</label>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1 || loading}><ChevronLeft className="h-4 w-4" />Previous</Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                if (pageNum > totalPages) return null;
                return <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(pageNum)} disabled={loading}>{pageNum}</Button>;
              })}
            </div>
            {totalPages > 5 && (
              <div className="flex items-center gap-1">
                <Input type="number" min={1} max={totalPages} value={goToPageInput} onChange={(e) => setGoToPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }} placeholder="Page" className="w-16 h-8 text-xs" />
                <Button variant="outline" size="sm" className="h-8" onClick={handleGoToPage} disabled={loading}>Go</Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages || loading}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <ShareDocumentDialog
          open={shareDialogOpen}
          onOpenChange={(open) => { setShareDialogOpen(open); if (!open) setShareTarget(null); }}
          document={shareTarget}
          currentUserId={currentUser?.id}
          onShared={() => { void loadDocuments(); }}
        />
      </div>
    </DashboardLayout>
  );
};

export default MyDocuments;
