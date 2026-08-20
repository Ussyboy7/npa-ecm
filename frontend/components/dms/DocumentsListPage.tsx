"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { FileText, Clock, Plus, Search, ChevronRight, ChevronDown, FolderOpen, FileCheck, Users, FileInput, CheckCircle2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { queryDocumentsExtended, type DocumentRecord } from '@/lib/api/dms';
import { listFormDocuments, type FormDocument } from '@/lib/api/dms-forms';
import { CreateFormDocumentDialog } from '@/components/dms/CreateFormDocumentDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { StatStrip } from '@/components/shared/StatStrip';
import { fetchAllPaginatedResults } from '@/lib/pagination-utils';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab =
    tabFromUrl === 'pending-signatures' ||
    tabFromUrl === 'signed-by-me' ||
    tabFromUrl === 'shared' ||
    tabFromUrl === 'my-documents'
      ? tabFromUrl
      : 'my-documents';
  const [activeTab, setActiveTab] = useState(initialTab);
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

  // Stats
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0, archived: 0 });

  // Pending signatures state
  const [pendingForms, setPendingForms] = useState<FormDocument[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pendingRequestRef = useRef(0);
  // Signed by me state
  const [signedForms, setSignedForms] = useState<FormDocument[]>([]);
  const [signedLoading, setSignedLoading] = useState(false);
  const [signedCount, setSignedCount] = useState(0);
  const signedRequestRef = useRef(0);
  const [createFormOpen, setCreateFormOpen] = useState(false);

  // Keep tab in sync with ?tab= for deep links (e.g. pending signatures)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (
      tab === 'pending-signatures' ||
      tab === 'signed-by-me' ||
      tab === 'shared' ||
      tab === 'my-documents'
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'my-documents') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `/dms?${qs}` : '/dms', { scroll: false });
  };

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

  // Load stats
  useEffect(() => {
    if (!currentUser?.id || activeTab !== 'my-documents') return;
    const loadStats = async () => {
      const countFor = async (statusIn?: string[]) => {
        const r = await queryDocumentsExtended({
          authorId: currentUser.id,
          page: 1,
          pageSize: 1,
          statusIn,
          search: debouncedSearch || undefined,
        });
        return r.count || 0;
      };
      const [total, draft, published, archived] = await Promise.all([
        countFor(),
        countFor(['draft']),
        countFor(['published']),
        countFor(['archived']),
      ]);
      setStats({ total, draft, published, archived });
    };
    loadStats();
  }, [currentUser?.id, activeTab, debouncedSearch, refreshKey]);

  // Prefetch badge counts for signature tabs
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    const loadCounts = async () => {
      try {
        const [pending, signed] = await Promise.all([
          listFormDocuments({ page: 1, pageSize: 1, pendingMySignature: true }),
          listFormDocuments({ page: 1, pageSize: 1, signedByMe: true }),
        ]);
        if (cancelled) return;
        setPendingCount(pending.count);
        setSignedCount(signed.count);
      } catch (err: unknown) {
        if (!cancelled) {
          logError('Failed to load signature tab counts', err);
        }
      }
    };
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, refreshKey]);

  // Load pending signatures
  useEffect(() => {
    if (activeTab !== 'pending-signatures' || !currentUser?.id) return;

    const requestId = ++pendingRequestRef.current;
    const loadPending = async () => {
      setPendingLoading(true);
      try {
        // Single backend filter: forms where this user still has a pending signature.
        const matched = await fetchAllPaginatedResults<FormDocument>(
          (page, ps) => listFormDocuments({ page, pageSize: ps, pendingMySignature: true }),
        );

        if (requestId !== pendingRequestRef.current) return;

        setPendingForms(matched);
        setPendingCount(matched.length);
      } catch (err: unknown) {
        if (requestId === pendingRequestRef.current) {
          logError('Failed to load pending signatures', err);
          setPendingForms([]);
          setPendingCount(0);
        }
      } finally {
        if (requestId === pendingRequestRef.current) setPendingLoading(false);
      }
    };
    loadPending();
  }, [activeTab, currentUser?.id, refreshKey]);

  // Load forms the current user has already signed
  useEffect(() => {
    if (activeTab !== 'signed-by-me' || !currentUser?.id) return;

    const requestId = ++signedRequestRef.current;
    const loadSigned = async () => {
      setSignedLoading(true);
      try {
        const matched = await fetchAllPaginatedResults<FormDocument>(
          (page, ps) => listFormDocuments({ page, pageSize: ps, signedByMe: true }),
        );

        if (requestId !== signedRequestRef.current) return;

        setSignedForms(matched);
        setSignedCount(matched.length);
      } catch (err: unknown) {
        if (requestId === signedRequestRef.current) {
          logError('Failed to load signed forms', err);
          setSignedForms([]);
          setSignedCount(0);
        }
      } finally {
        if (requestId === signedRequestRef.current) setSignedLoading(false);
      }
    };
    loadSigned();
  }, [activeTab, currentUser?.id, refreshKey]);

  const pendingPagination = usePagination({ initialPage: 1, totalCount: pendingCount });

  return (
    <>
      {!currentUser?.id ? (
        <QueuePageShell
          title="My Documents"
          subtitle="Create, manage, and find your documents"
        >
          <LoadingState message="Loading documents…" />
        </QueuePageShell>
      ) : (
        <QueuePageShell
          title="My Documents"
          subtitle="Create, manage, and find your documents"
          actions={(
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/dms/new')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateFormOpen(true)}>
                    <FileInput className="mr-2 h-4 w-4" />
                    Form
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ContextualHelp
                title="Managing your documents"
                description="Switch scope, then narrow the list with search and filters."
                steps={['Use tabs to switch between My Documents, Shared, Pending Signatures, and Signed by Me.', 'Search by title, reference, description, file text, or tags.', 'Use Status/Type filters to find items faster.']}
              />
            </>
          )}
          stats={(
            <StatStrip
              items={[
                { key: 'total', label: 'Total', value: stats.total },
                { key: 'draft', label: 'Draft', value: stats.draft },
                { key: 'published', label: 'Published', value: stats.published },
                { key: 'archived', label: 'Archived', value: stats.archived },
              ]}
            />
          )}
        >
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
                <SelectItem value="form">Form</SelectItem>
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
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="my-documents" className="text-xs px-2.5 py-1">My Documents</TabsTrigger>
            <TabsTrigger value="shared" className="text-xs px-2.5 py-1">Shared with Me</TabsTrigger>
            <TabsTrigger value="pending-signatures" className="text-xs px-2.5 py-1 relative">
              Pending Signatures
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-[1rem] px-1 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signed-by-me" className="text-xs px-2.5 py-1 relative">
              Signed by Me
              {signedCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1rem] px-1 text-[10px]">
                  {signedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my-documents" className="mt-6">
            <DocumentList documents={documents} loading={loading} error={error} emptyMessage="You haven't created any documents yet." />
          </TabsContent>
          <TabsContent value="shared" className="mt-6">
            <DocumentList documents={documents} loading={loading} error={error} emptyMessage="No documents have been shared with you." />
          </TabsContent>
          <TabsContent value="pending-signatures" className="mt-6">
            <PendingSignaturesList forms={pendingForms} loading={pendingLoading} />
          </TabsContent>
          <TabsContent value="signed-by-me" className="mt-6">
            <SignedByMeList forms={signedForms} loading={signedLoading} />
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
        </QueuePageShell>
      )}

      <CreateFormDocumentDialog
        open={createFormOpen}
        onOpenChange={setCreateFormOpen}
        onComplete={(documentId) => {
          setCreateFormOpen(false);
          router.push(`/forms/${documentId}`);
        }}
      />
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group documents by correspondence
  const groups = useMemo(() => {
    const grouped: Array<{
      key: string;
      label: string;
      documents: DocumentRecord[];
    }> = [];
    const seen = new Set<string>();

    for (const doc of documents) {
      const links = doc.correspondence_links;
      if (links && links.length > 0) {
        const corr = links[0].correspondence;
        const key = `corr-${corr.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          grouped.push({
            key,
            label: `${corr.reference_number || 'Correspondence'}`,
            documents: [],
          });
        }
        const group = grouped.find((g) => g.key === key)!;
        group.documents.push(doc);
      } else {
        const key = `singleton-${doc.id}`;
        seen.add(key);
        grouped.push({
          key,
          label: '',
          documents: [doc],
        });
      }
    }

    // Sort each group: primary first, then alphabetically
    for (const group of grouped) {
      group.documents.sort((a, b) => {
        if (a.role === 'primary' && b.role !== 'primary') return -1;
        if (a.role !== 'primary' && b.role === 'primary') return 1;
        return a.title.localeCompare(b.title);
      });
    }

    return grouped;
  }, [documents]);

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
      {groups.map((group) => {
        const isGroup = group.documents.length > 1 || (group.documents.length === 1 && group.documents[0].role);
        const isExpanded = expandedGroups.has(group.key);

        return (
          <div key={group.key}>
            {group.label && (
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-md mb-1"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <FolderOpen className="h-3.5 w-3.5" />
                {group.label}
                <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto">
                  {group.documents.length}
                </Badge>
              </button>
            )}
            {(!group.label || isExpanded) && (
              <div className={group.label ? 'ml-4 space-y-1' : 'space-y-1'}>
                {group.documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} showRoleBadge={group.documents.length > 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DocumentCard({ doc, showRoleBadge }: { doc: DocumentRecord; showRoleBadge?: boolean }) {
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
  const openHref = docType === 'form' ? `/forms/${doc.id}` : `/dms/${doc.id}`;

  return (
    <ListRowCard
      density="compact"
      href={openHref}
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
                router.push(openHref);
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
          {doc.role && showRoleBadge && (
            <Badge
              variant={doc.role === 'primary' ? 'default' : 'secondary'}
              className={cn(correspondenceQueueBadgeClass)}
            >
              {doc.role === 'primary' ? 'Primary' : 'Attach'}
            </Badge>
          )}
        </div>
        <span className={correspondenceQueueDateClass}>
          {formatDateShort(doc.updatedAt || doc.createdAt)}
        </span>
      </div>
      {doc.description ? (
        <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
          {doc.description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}
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

function PendingSignaturesList({ forms, loading }: { forms: FormDocument[]; loading: boolean }) {
  if (loading) {
    return <LoadingState message="Loading pending signatures…" />;
  }

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={<FileCheck className={registryQueueEmptyIconClass} />}
        title="All caught up"
        message="No documents require your signature."
        variant="dashed"
      />
    );
  }

  return (
    <div className={correspondenceQueueListStackClass}>
      {forms.map((form) => (
        <FormSignatureRow
          key={form.id}
          form={form}
          tone="pending"
          badge="Action required"
          meta="Awaiting your signature"
        />
      ))}
    </div>
  );
}

function SignedByMeList({ forms, loading }: { forms: FormDocument[]; loading: boolean }) {
  if (loading) {
    return <LoadingState message="Loading forms you signed…" />;
  }

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className={registryQueueEmptyIconClass} />}
        title="No signed forms yet"
        message="Forms you sign will appear here after you complete your signature step."
        variant="dashed"
      />
    );
  }

  return (
    <div className={correspondenceQueueListStackClass}>
      {forms.map((form) => (
        <FormSignatureRow
          key={form.id}
          form={form}
          tone="signed"
          badge={form.status === 'completed' ? 'Completed' : 'Signed by you'}
          meta={form.status === 'completed' ? 'Workflow complete' : 'Your signature recorded'}
        />
      ))}
    </div>
  );
}

function FormSignatureRow({
  form,
  tone,
  badge,
  meta,
}: {
  form: FormDocument;
  tone: 'pending' | 'signed';
  badge: string;
  meta: string;
}) {
  const leadingClass =
    tone === 'pending'
      ? 'bg-amber-500/10'
      : 'bg-emerald-500/10';
  const iconClass =
    tone === 'pending'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';
  const badgeClass =
    tone === 'pending'
      ? 'bg-amber-500'
      : 'bg-emerald-600';
  const Icon = tone === 'pending' ? FileCheck : CheckCircle2;

  return (
    <ListRowCard
      density="compact"
      href={`/forms/${form.document.id}`}
      leading={(
        <div className={cn(correspondenceQueueLeadingBoxClass, leadingClass)}>
          <Icon className={cn(correspondenceQueueLeadingIconClass, iconClass)} />
        </div>
      )}
    >
      <h4 className={correspondenceQueueSubjectClass}>{form.document.title}</h4>
      <p className="text-xs text-muted-foreground truncate mt-0.5">
        {form.template?.name || 'Form'}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Badge variant="default" className={cn(correspondenceQueueBadgeClass, badgeClass)}>
          {badge}
        </Badge>
        <span className={correspondenceQueueDateClass}>
          Updated {formatDateTime(form.updated_at)}
        </span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
        <span className={correspondenceQueueMetaItemClass}>
          <FileText className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Form ID: {form.id.slice(0, 8).toUpperCase()}</span>
        </span>
        <span className={correspondenceQueueMetaItemClass}>
          <Users className={correspondenceQueueMetaIconClass} />
          <span>{meta}</span>
        </span>
      </div>
    </ListRowCard>
  );
}
