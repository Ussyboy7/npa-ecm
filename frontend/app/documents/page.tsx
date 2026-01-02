"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Share2, Clock, AlertCircle, Plus, Loader2, Search, Filter, Scan, Upload } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { queryDocumentsExtended, getSharedDocuments, getRecentDocuments, type DocumentRecord } from '@/lib/dms-storage';
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';
import { ScanDialog } from '@/components/capture/ScanDialog';
import { BatchUploadDialog } from '@/components/capture/BatchUploadDialog';
import Link from 'next/link';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

export default function MyDocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, hydrated } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<string>('my-documents');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState({
    myDocuments: 0,
    shared: 0,
    awaiting: 0,
    recent: 0,
  });

  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });

  // Get tab from URL or default
  useEffect(() => {
    const tab = searchParams.get('tab') || 'my-documents';
    if (['my-documents', 'shared', 'awaiting', 'recent'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch, selectedStatuses, selectedTypes, dateFrom, dateTo, sortBy, sortOrder]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedTypes.length > 0) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatuses, selectedTypes, dateFrom, dateTo]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  // Load documents based on active tab
  useEffect(() => {
    if (!hydrated || !currentUser) return;

    const loadDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        let allDocuments: DocumentRecord[] = [];
        let totalCount = 0;

        switch (activeTab) {
          case 'my-documents':
            const myDocs = await queryDocumentsExtended({ 
              authorId: currentUser.id,
              search: debouncedSearch || undefined,
            });
            allDocuments = Array.isArray(myDocs?.results) ? myDocs.results : [];
            totalCount = myDocs?.count || 0;
            setStats(prev => ({ ...prev, myDocuments: totalCount }));
            break;
          case 'shared':
            const shared = await getSharedDocuments(currentUser.id, {
              search: debouncedSearch || undefined,
            });
            allDocuments = Array.isArray(shared?.results) ? shared.results : [];
            totalCount = shared?.count || 0;
            setStats(prev => ({ ...prev, shared: totalCount }));
            break;
          case 'awaiting':
            // TODO: Implement awaiting action (forms needing signatures)
            allDocuments = [];
            totalCount = 0;
            break;
          case 'recent':
            const recent = await getRecentDocuments(currentUser.id, 100);
            allDocuments = Array.isArray(recent) ? recent : [];
            totalCount = allDocuments.length;
            setStats(prev => ({ ...prev, recent: totalCount }));
            break;
        }
        
        // Apply filters
        let filtered = allDocuments;
        if (selectedStatuses.length > 0) {
          filtered = filtered.filter(doc => selectedStatuses.includes(doc.status));
        }
        if (selectedTypes.length > 0) {
          filtered = filtered.filter(doc => selectedTypes.includes(doc.documentType));
        }
        
        // Date filtering
        if (dateFrom) {
          filtered = filtered.filter(doc => {
            const docDate = new Date(doc.createdAt);
            return docDate >= new Date(dateFrom);
          });
        }
        if (dateTo) {
          filtered = filtered.filter(doc => {
            const docDate = new Date(doc.createdAt);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            return docDate <= toDate;
          });
        }
        
        // Sort
        filtered.sort((a, b) => {
          let aVal: number | string = 0;
          let bVal: number | string = 0;
          
          if (sortBy === 'updated') {
            aVal = new Date(a.updatedAt).getTime();
            bVal = new Date(b.updatedAt).getTime();
          } else if (sortBy === 'created') {
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
          } else if (sortBy === 'title') {
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
          }
          
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          }
          return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
        });
        
        // Pagination
        const startIndex = (pagination.page - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const paginated = filtered.slice(startIndex, endIndex);
        
        setDocuments(paginated);
        setCount(filtered.length);
      } catch (error) {
        logError('Error loading documents:', error);
        setError('Failed to load documents. Please try again.');
        setDocuments([]);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [activeTab, currentUser, hydrated, debouncedSearch, selectedStatuses, selectedTypes, dateFrom, dateTo, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/documents?tab=${value}`, { scroll: false });
  };

  const handleDocumentCreated = (document: DocumentRecord) => {
    setUploadDialogOpen(false);
    router.push(`/dms/${document.id}`);
  };

  if (!hydrated) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading documents…</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">My Documents</h1>
            <p className="text-muted-foreground mt-1">Your personal workspace for documents you created, shared with you, or need your attention</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setScanDialogOpen(true)}>
              <Scan className="h-4 w-4 mr-2" /> Scan Document
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBatchUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Batch Upload
            </Button>
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Document
            </Button>
            <ContextualHelp
              title="Managing your documents"
              description="Organize your documents by category, use filters to find specific items, and create new documents as needed. Use OCR scanning to digitize physical documents."
              steps={['Use tabs to switch between My Documents, Shared, Awaiting Action, and Recent.', 'Use search and filters to find specific documents.', 'Click any document to view details and take action.', 'Use Scan Document to digitize physical documents with OCR.']}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Your Personal Document Workspace"
          description="Manage your documents across different categories. Create new documents, view shared items, and track documents that need your attention."
          links={[{ label: 'My Inbox', href: '/inbox' }, { label: 'Help & Guides', href: '/help' }]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Document Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['draft', 'published', 'archived'].map((status) => (
                      <Badge
                        key={status}
                        variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleStatus(status)}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Type</Label>
                  <div className="flex flex-wrap gap-1">
                    {['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'].map((type) => (
                      <Badge
                        key={type}
                        variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium mb-2 block">Date From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium mb-2 block">Date To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                        <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                        <SelectItem value="created-desc">Created (Newest)</SelectItem>
                        <SelectItem value="created-asc">Created (Oldest)</SelectItem>
                        <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                        <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by title, description, or reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="my-documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Documents
              {stats.myDocuments > 0 && (
                <Badge variant="secondary" className="ml-1">{stats.myDocuments > 99 ? '99+' : stats.myDocuments}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Shared with Me
              {stats.shared > 0 && (
                <Badge variant="secondary" className="ml-1">{stats.shared > 99 ? '99+' : stats.shared}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="awaiting" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Awaiting Action
              {stats.awaiting > 0 && (
                <Badge variant="secondary" className="ml-1">{stats.awaiting > 99 ? '99+' : stats.awaiting}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent
              {stats.recent > 0 && (
                <Badge variant="secondary" className="ml-1">{stats.recent > 99 ? '99+' : stats.recent}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mt-6">
            {[
              { label: 'My Documents', value: stats.myDocuments, icon: FileText, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
              { label: 'Shared with Me', value: stats.shared, icon: Share2, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
              { label: 'Awaiting Action', value: stats.awaiting, icon: AlertCircle, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
              { label: 'Recent', value: stats.recent, icon: Clock, bgClass: 'bg-info/10', iconClass: 'text-info' },
            ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${bgClass}`}><Icon className={`h-6 w-6 ${iconClass}`} /></div>
                    <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {error && <Card><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>}

          <TabsContent value="my-documents" className="mt-6">
            <DocumentList documents={documents} loading={loading} emptyMessage="You haven't created any documents yet." />
          </TabsContent>

          <TabsContent value="shared" className="mt-6">
            <DocumentList documents={documents} loading={loading} emptyMessage="No documents have been shared with you." />
          </TabsContent>

          <TabsContent value="awaiting" className="mt-6">
            <DocumentList documents={documents} loading={loading} emptyMessage="No documents awaiting your action." />
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <DocumentList documents={documents} loading={loading} emptyMessage="No recent documents." />
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {count > 0 && (
          <PaginationControls
            pagination={pagination}
            showPageSizeSelector={true}
            showGoToPage={true}
            className="border-t border-border/60 pt-4"
          />
        )}

        {currentUser && (
          <>
            <DocumentUploadDialog
              open={uploadDialogOpen}
              onOpenChange={setUploadDialogOpen}
              mode="create"
              currentUser={currentUser}
              onComplete={handleDocumentCreated}
            />
            <ScanDialog
              open={scanDialogOpen}
              onOpenChange={setScanDialogOpen}
            />
            <BatchUploadDialog
              open={batchUploadOpen}
              onOpenChange={setBatchUploadOpen}
              onComplete={(documents) => {
                setBatchUploadOpen(false);
                if (documents.length > 0) {
                  // Refresh to show new documents
                  window.location.reload();
                }
              }}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function DocumentList({ documents, loading, emptyMessage }: { documents: DocumentRecord[]; loading: boolean; emptyMessage: string }) {
  if (loading) {
    return (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading documents…</CardContent></Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-2">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  );
}

function DocumentCard({ doc }: { doc: DocumentRecord }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-success bg-success/10';
      case 'draft': return 'text-warning bg-warning/10';
      case 'archived': return 'text-muted-foreground bg-muted';
      default: return 'text-foreground bg-muted';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'letter': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'memo': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'circular': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'policy': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'report': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
      case 'form': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Link href={`/dms/${doc.id}`} className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer block">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${getTypeColor(doc.documentType || 'other')}`}>
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate mb-1">{doc.title}</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={getTypeColor(doc.documentType || 'other')}>
                  {doc.documentType || 'other'}
                </Badge>
                <Badge variant="secondary" className={getStatusColor(doc.status)}>
                  {doc.status}
                </Badge>
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(doc.updatedAt || doc.createdAt)}</span>
          </div>
          {doc.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{doc.description}</p>
          )}
          <div className="space-y-1 text-sm text-muted-foreground">
            {doc.referenceNumber && <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /><span>Ref: {doc.referenceNumber}</span></div>}
            <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /><span>Created: {formatDateShort(doc.createdAt)}</span></div>
          </div>
        </div>
      </div>
    </Link>
  );
}
