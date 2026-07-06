"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/client-logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Clock, Plus, Search, ChevronRight } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { queryDocumentsExtended, type DocumentRecord } from '@/lib/dms-storage';
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
} from '@/components/shared/registry-queue-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function MyDocumentsForm() {
  const { currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('my-documents');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const documentsRequestRef = useRef(0);

  // Re-fetch when page gains focus (user navigates back)
  useEffect(() => {
    const handleFocus = () => setRefreshKey(k => k + 1);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch, selectedStatus, selectedType, dateFrom, dateTo, sortBy, sortOrder]);

  const clearFilters = () => {
    setSelectedStatus('');
    setSelectedType('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedStatus || selectedType || dateFrom || dateTo;

  const ordering = useMemo(() => {
    if (sortBy === 'updated') return sortOrder === 'desc' ? '-updated_at' : 'updated_at';
    if (sortBy === 'created') return sortOrder === 'desc' ? '-created_at' : 'created_at';
    if (sortBy === 'title') return sortOrder === 'desc' ? '-title' : 'title';
    return '-updated_at';
  }, [sortBy, sortOrder]);

  // Load documents based on scope
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
        const common = {
          search: debouncedSearch || undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
          ordering,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          statusIn: selectedStatus ? [selectedStatus] : undefined,
          documentTypeIn: selectedType ? [selectedType] : undefined,
        };
        if (activeTab === 'my-documents') {
          response = await queryDocumentsExtended({ ...common, authorId: currentUser.id });
        } else if (activeTab === 'shared') {
          response = await queryDocumentsExtended({ ...common, sharedWithMe: true });
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
  }, [activeTab, currentUser?.id, debouncedSearch, selectedStatus, selectedType, dateFrom, dateTo, ordering, pagination.page, pagination.pageSize, refreshKey]);

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {!currentUser?.id ? (
          <LoadingState message="Loading documents…" />
        ) : (
          <>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">My Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create, manage, and find your documents</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <Link href="/dms/new">
                <Plus className="h-4 w-4 mr-2" /> Create Document
              </Link>
            </Button>
            <ContextualHelp
              title="Managing your documents"
              description="Switch scope, then narrow the list with search and filters."
              steps={['Use tabs to switch between My Documents and Shared with Me.', 'Search by title, reference, description, file text, or tags.', 'Use Status/Type filters to find items faster.']}
            />
          </div>
        </div>

        {/* Workspace Guide */}

        {/* Search + filters bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search title, reference, or content"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
                aria-label="Search documents"
              />
            </div>
            <Select value={selectedStatus || 'all'} onValueChange={(v) => { setSelectedStatus(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType || 'all'} onValueChange={(v) => { setSelectedType(v === 'all' ? '' : v); pagination.goToFirstPage(); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="memo">Memo</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={(v) => { setDateFrom(v); pagination.goToFirstPage(); }}
              onDateToChange={(v) => { setDateTo(v); pagination.goToFirstPage(); }}
            />
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated-desc">Last Updated</SelectItem>
                <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="created-desc">Created</SelectItem>
                <SelectItem value="created-asc">Created (Oldest)</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-documents" className="text-xs px-2.5 py-1">My Documents</TabsTrigger>
            <TabsTrigger value="shared" className="text-xs px-2.5 py-1">Shared with Me</TabsTrigger>
          </TabsList>
          <TabsContent value="my-documents" className="mt-6">
            <DocumentList documents={documents} loading={loading} error={error} emptyMessage="You haven't created any documents yet." />
          </TabsContent>
          <TabsContent value="shared" className="mt-6">
            <DocumentList documents={documents} loading={loading} error={error} emptyMessage="No documents have been shared with you." />
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

        </>
      )}
      </div>
    </>
  );
}

export function DocumentsListPage() {
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
