"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logError } from '@/lib/client-logger';
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
import { FileText, Share2, Clock, AlertCircle, Plus, Search, Filter, Scan, Upload, ChevronRight } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { queryDocumentsExtended, type DocumentRecord } from '@/lib/dms-storage';
import { ScanDialog } from '@/components/capture/ScanDialog';
import { BatchUploadDialog } from '@/components/capture/BatchUploadDialog';
import Link from 'next/link';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function MyDocumentsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useCurrentUser();
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
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState({
    myDocuments: 0,
    shared: 0,
    awaiting: 0,
  });
  const statsRequestRef = useRef(0);
  const documentsRequestRef = useRef(0);

  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
    totalCount: count,
  });

  // Get tab from URL or default
  useEffect(() => {
    const tab = searchParams.get('tab') || 'my-documents';
    if (['my-documents', 'shared', 'awaiting'].includes(tab)) {
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

  const ordering = useMemo(() => {
    if (sortBy === 'updated') return sortOrder === 'desc' ? '-updated_at' : 'updated_at';
    if (sortBy === 'created') return sortOrder === 'desc' ? '-created_at' : 'created_at';
    if (sortBy === 'title') return sortOrder === 'desc' ? '-title' : 'title';
    return '-updated_at';
  }, [sortBy, sortOrder]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const requestId = ++statsRequestRef.current;
    const loadStats = async () => {
      try {
        const [mine, shared, awaiting] = await Promise.all([
          queryDocumentsExtended({
            authorId: currentUser.id,
            page: 1,
            pageSize: 1,
            documentTypeIn: ['letter', 'memo', 'circular', 'policy', 'report', 'other'],
          }),
          queryDocumentsExtended({
            sharedWithMe: true,
            page: 1,
            pageSize: 1,
            documentTypeIn: ['letter', 'memo', 'circular', 'policy', 'report', 'other'],
          }),
          queryDocumentsExtended({
            awaitingAction: true,
            page: 1,
            pageSize: 1,
            documentTypeIn: ['letter', 'memo', 'circular', 'policy', 'report', 'other'],
          }),
        ]);

        if (requestId !== statsRequestRef.current) return;
        setStats({
          myDocuments: mine.count || 0,
          shared: shared.count || 0,
          awaiting: awaiting.count || 0,
        });
      } catch (error: unknown) {
        if (requestId !== statsRequestRef.current) return;
        logError('Failed to load document stats', error);
      }
    };

    void loadStats();
  }, [currentUser?.id]);

  // Load documents based on active tab (server-side filtering/pagination)
  useEffect(() => {
    if (!currentUser?.id) return;

    const requestId = ++documentsRequestRef.current;
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        let response: { results: DocumentRecord[]; count: number; next: string | null; previous: string | null } = {
          results: [],
          count: 0,
          next: null,
          previous: null,
        };
        switch (activeTab) {
          case 'my-documents':
            response = await queryDocumentsExtended({
              authorId: currentUser.id,
              search: debouncedSearch || undefined,
              page: pagination.page,
              pageSize: pagination.pageSize,
              ordering,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
              statusIn: selectedStatuses.length > 0 ? selectedStatuses : undefined,
              documentTypeIn: selectedTypes.length > 0 ? selectedTypes : ['letter', 'memo', 'circular', 'policy', 'report', 'other'],
            });
            break;
          case 'shared':
            response = await queryDocumentsExtended({
              sharedWithMe: true,
              search: debouncedSearch || undefined,
              page: pagination.page,
              pageSize: pagination.pageSize,
              ordering,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
              statusIn: selectedStatuses.length > 0 ? selectedStatuses : undefined,
              documentTypeIn: selectedTypes.length > 0 ? selectedTypes : ['letter', 'memo', 'circular', 'policy', 'report', 'other'],
            });
            break;
          case 'awaiting':
            response = await queryDocumentsExtended({
              awaitingAction: true,
              search: debouncedSearch || undefined,
              page: pagination.page,
              pageSize: pagination.pageSize,
              ordering,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
              statusIn: selectedStatuses.length > 0 ? selectedStatuses : undefined,
              documentTypeIn: selectedTypes.length > 0 ? selectedTypes : ['letter', 'memo', 'circular', 'policy', 'report', 'other'],
            });
            break;
          default:
            break;
        }

        if (requestId !== documentsRequestRef.current) return;
        setDocuments(Array.isArray(response.results) ? response.results : []);
        setCount(response.count || 0);
      } catch (error: unknown) {
        if (requestId !== documentsRequestRef.current) return;
        logError('Error loading documents:', error);
        setError('Failed to load documents. Please try again.');
        setDocuments([]);
        setCount(0);
      } finally {
        if (requestId === documentsRequestRef.current) {
          setLoading(false);
        }
      }
    };

    loadDocuments();
  }, [activeTab, currentUser?.id, debouncedSearch, selectedStatuses, selectedTypes, dateFrom, dateTo, ordering, pagination.page, pagination.pageSize]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/documents?tab=${value}`, { scroll: false });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {!currentUser?.id ? (
          <LoadingState message="Loading documents…" />
        ) : (
          <>
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
            <Button size="sm" asChild>
              <Link href="/documents/new">
                <Plus className="h-4 w-4 mr-2" /> Create Document
              </Link>
            </Button>
            <ContextualHelp
              title="Managing your documents"
              description="Organize your documents by category, use filters to find specific items, and create new documents as needed. Use OCR scanning to digitize physical documents."
              steps={['Use tabs to switch between My Documents, Shared, Awaiting Action, and Recent.', 'Search matches title, reference, description, file text, and tags. Use commas for several tags or words (any match).', 'Click any document to view details and take action.', 'Use Scan Document to digitize physical documents with OCR.']}
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
                <CardTitle className="text-lg">My Documents Filters</CardTitle>
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
                    {['letter', 'memo', 'circular', 'policy', 'report', 'other'].map((type) => (
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
          <Input
            placeholder="Search title, reference, content, or tags (e.g. infrastructure, urgent, budget)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search documents"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mt-6">
            {[
              { label: 'My Documents', value: stats.myDocuments, icon: FileText, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
              { label: 'Shared with Me', value: stats.shared, icon: Share2, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
              { label: 'Awaiting Action', value: stats.awaiting, icon: AlertCircle, bgClass: 'bg-warning/10', iconClass: 'text-warning' },
            ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
              <Card key={label}>
                <CardContent className={registryQueueStatCardContentClass}>
                  <div className="flex items-center gap-4">
                    <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                      <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                    </div>
                    <div>
                      <p className={registryQueueStatLabelClass}>{label}</p>
                      <p className={registryQueueStatValueClass}>{value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <TabsContent value="my-documents" className="mt-6">
            <DocumentList
              documents={documents}
              loading={loading}
              error={error}
              emptyMessage="You haven't created any documents yet."
            />
          </TabsContent>

          <TabsContent value="shared" className="mt-6">
            <DocumentList
              documents={documents}
              loading={loading}
              error={error}
              emptyMessage="No documents have been shared with you."
            />
          </TabsContent>

          <TabsContent value="awaiting" className="mt-6">
            <DocumentList
              documents={documents}
              loading={loading}
              error={error}
              emptyMessage="No documents awaiting your action."
            />
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
        </>
      )}
      </div>
    </DashboardLayout>
  );
}

export default function MyDocumentsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <MyDocumentsForm />
    </Suspense>
  );
}

function DocumentList({
  documents,
  loading,
  error,
  emptyMessage,
}: {
  documents: DocumentRecord[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
}) {
  if (loading) {
    return <LoadingState message="Loading documents…" />;
  }

  if (error) {
    return <ErrorState message={error} variant="inline" />;
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className={registryQueueEmptyIconClass} />}
        title="No documents"
        message={emptyMessage}
      />
    );
  }

  return (
    <div className={correspondenceQueueListStackClass}>
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  );
}

function DocumentCard({ doc }: { doc: DocumentRecord }) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-success bg-success/10 border-success/20';
      case 'draft':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'archived':
        return 'text-muted-foreground bg-muted border-border';
      default:
        return 'text-foreground bg-muted border-border';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'letter':
        return 'border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-800 dark:text-blue-400';
      case 'memo':
        return 'border-green-200 bg-green-500/10 text-green-600 dark:border-green-800 dark:text-green-400';
      case 'circular':
        return 'border-purple-200 bg-purple-500/10 text-purple-600 dark:border-purple-800 dark:text-purple-400';
      case 'policy':
        return 'border-orange-200 bg-orange-500/10 text-orange-600 dark:border-orange-800 dark:text-orange-400';
      case 'report':
        return 'border-pink-200 bg-pink-500/10 text-pink-600 dark:border-pink-800 dark:text-pink-400';
      case 'form':
        return 'border-cyan-200 bg-cyan-500/10 text-cyan-600 dark:border-cyan-800 dark:text-cyan-400';
      default:
        return 'border-border bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const docType = doc.documentType || 'other';

  return (
    <ListRowCard
      density="compact"
      href={`/dms/${doc.id}`}
      leading={(
        <div className={cn(correspondenceQueueLeadingBoxClass, getTypeColor(docType))}>
          <FileText className={correspondenceQueueLeadingIconClass} />
        </div>
      )}
      actions={(
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Open document"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/dms/${doc.id}`);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open document</TooltipContent>
        </Tooltip>
      )}
    >
      <h4 className={correspondenceQueueSubjectClass}>{doc.title}</h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className={cn(correspondenceQueueBadgeClass, 'gap-0.5', getTypeColor(docType))}
          >
            <FileText className="h-2.5 w-2.5" />
            {docType}
          </Badge>
          <Badge
            variant="outline"
            className={cn(correspondenceQueueBadgeClass, getStatusColor(doc.status))}
          >
            {doc.status}
          </Badge>
        </div>
        <span className={correspondenceQueueDateClass}>
          {formatDateShort(doc.updatedAt || doc.createdAt)}
        </span>
      </div>
      {doc.description ? (
        <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
          {doc.description}
        </p>
      ) : null}
      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
        {doc.referenceNumber ? (
          <span className={correspondenceQueueMetaItemClass}>
            <FileText className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Ref: {doc.referenceNumber}</span>
          </span>
        ) : null}
        <span className={correspondenceQueueMetaItemClass}>
          <Clock className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Created: {formatDateShort(doc.createdAt)}</span>
        </span>
      </div>
    </ListRowCard>
  );
}
