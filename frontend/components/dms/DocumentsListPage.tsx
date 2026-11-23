"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logError } from '@/lib/client-logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditFormsLibrary, type FormsSegment } from '@/components/forms/AuditFormsLibrary';
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
import { FileText, Plus, Search, ChevronRight, ChevronDown, FolderOpen, FileInput, Scan } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSidebarVisibility } from '@/hooks/use-sidebar-visibility';
import { queryDocumentsExtended, type DocumentRecord } from '@/lib/api/dms';
import { listFormDocuments } from '@/lib/api/dms-forms';
import { CreateFormDocumentDialog } from '@/components/dms/CreateFormDocumentDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { DocumentRowCard } from '@/components/shared/DocumentRowCard';
import { ListSkeleton } from '@/components/shared/PageSkeleton';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { StatStrip } from '@/components/shared/StatStrip';
import {
  correspondenceQueueListStackClass,
  registryQueueEmptyIconClass,
} from '@/components/shared/registry-queue-styles';

type TabValue = 'documents' | 'forms';
type DocumentScope = 'mine' | 'shared';

function MyDocumentsForm() {
  const { currentUser } = useCurrentUser();
  const visibility = useSidebarVisibility();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const requestedSegment = searchParams.get('segment');
  const formsSegment =
    tabFromUrl === 'pending-signatures'
      ? 'pending'
      : tabFromUrl === 'signed-by-me'
        ? 'signed'
        : requestedSegment === 'pending' || requestedSegment === 'submissions' || requestedSegment === 'signed'
          ? requestedSegment
          : 'available';
  const initialTab: TabValue =
    visibility.showFormsLibrary &&
    (tabFromUrl === 'forms' || tabFromUrl === 'pending-signatures' || tabFromUrl === 'signed-by-me')
      ? 'forms'
      : 'documents';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [documentScope, setDocumentScope] = useState<DocumentScope>(
    tabFromUrl === 'shared' || searchParams.get('scope') === 'shared' ? 'shared' : 'mine'
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [formsStats, setFormsStats] = useState<{
    available: number;
    pending: number;
    drafts: number;
    submitted: number;
    signed: number;
  } | null>(null);
  const [formsPendingCount, setFormsPendingCount] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const documentsRequestRef = useRef(0);

  // Stats
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0, archived: 0 });
  const [scopeCounts, setScopeCounts] = useState<{ mine: number; shared: number }>({ mine: 0, shared: 0 });

  const [createFormOpen, setCreateFormOpen] = useState(false);

  // Keep the workspace in sync with deep links, mapping the old tab names onto the
  // two-tab layout (documents + forms) and sending ?tab=capture to its own page.
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'capture') {
      router.replace('/capture');
      return;
    }
    if (tab === 'pending-signatures' || tab === 'signed-by-me' || (tab === 'forms' && visibility.showFormsLibrary)) {
      setActiveTab('forms');
      return;
    }
    setActiveTab('documents');
    setDocumentScope(tab === 'shared' || searchParams.get('scope') === 'shared' ? 'shared' : 'mine');
  }, [searchParams, visibility.showFormsLibrary, router]);

  const handleTabChange = (tab: string) => {
    const nextTab: TabValue = tab === 'forms' && visibility.showFormsLibrary ? 'forms' : 'documents';
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('segment');
    if (nextTab === 'forms') params.set('tab', 'forms');
    else params.delete('tab');
    const qs = params.toString();
    router.replace(qs ? `/dms?${qs}` : '/dms', { scroll: false });
  };

  const handleScopeChange = (scope: DocumentScope) => {
    setDocumentScope(scope);
    const params = new URLSearchParams(searchParams.toString());
    if (scope === 'shared') params.set('scope', 'shared');
    else params.delete('scope');
    const qs = params.toString();
    router.replace(qs ? `/dms?${qs}` : '/dms', { scroll: false });
  };

  const handleFormsSegmentChange = (segment: FormsSegment) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'forms');
    if (segment === 'available') params.delete('segment');
    else params.set('segment', segment);
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
  }, [documentScope, debouncedSearch, selectedStatus, selectedType, dateFrom, dateTo, sortBy, sortOrder]);

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

  // Load documents for the active scope
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
        response =
          documentScope === 'shared'
            ? await queryDocumentsExtended({ ...common, sharedWithMe: true })
            : await queryDocumentsExtended({ ...common, authorId: currentUser.id });

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
  }, [documentScope, currentUser?.id, debouncedSearch, selectedStatus, selectedType, dateFrom, dateTo, ordering, pagination.page, pagination.pageSize, refreshKey]);

  // Load stats for the active scope
  useEffect(() => {
    if (!currentUser?.id || activeTab !== 'documents') return;
    const loadStats = async () => {
      const countFor = async (statusIn?: string[]) => {
        const r = await queryDocumentsExtended({
          ...(documentScope === 'shared' ? { sharedWithMe: true } : { authorId: currentUser.id }),
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
  }, [currentUser?.id, activeTab, documentScope, debouncedSearch, refreshKey]);

  // Scope sizes for the Mine / Shared with me sub-tabs (unfiltered, like the Forms badge)
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    const loadScopeCounts = async () => {
      try {
        const [mine, shared] = await Promise.all([
          queryDocumentsExtended({ authorId: currentUser.id, page: 1, pageSize: 1 }),
          queryDocumentsExtended({ sharedWithMe: true, page: 1, pageSize: 1 }),
        ]);
        if (!cancelled) {
          setScopeCounts({ mine: mine.count || 0, shared: shared.count || 0 });
        }
      } catch (err: unknown) {
        if (!cancelled) logError('Failed to load document scope counts', err);
      }
    };
    void loadScopeCounts();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, refreshKey]);

  // Badge the Forms tab with work waiting on this user
  useEffect(() => {
    if (!currentUser?.id || !visibility.showFormsLibrary) return;
    let cancelled = false;
    void listFormDocuments({ page: 1, pageSize: 1, pendingMySignature: true })
      .then((result) => {
        if (!cancelled) setFormsPendingCount(result.count);
      })
      .catch((err: unknown) => {
        if (!cancelled) logError('Failed to load pending signature count', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, visibility.showFormsLibrary, refreshKey]);

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
          title={activeTab === 'forms' ? 'Forms' : 'Documents'}
          subtitle={
            activeTab === 'forms'
              ? 'Start a form, sign what is waiting on you, and revisit your submissions.'
              : documentScope === 'shared'
                ? 'Documents colleagues have shared with you.'
                : 'Create, manage, and find your documents.'
          }
          actions={(
            <>
              {visibility.showContentCapture ? (
                <Button variant="outline" size="compact" onClick={() => router.push('/capture')}>
                  <Scan className="h-4 w-4" /> Capture jobs
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="compact">
                    <Plus className="h-4 w-4" /> Create
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
                title={activeTab === 'forms' ? 'Working with forms' : 'Managing your documents'}
                description={
                  activeTab === 'forms'
                    ? 'Pick a form to start, then track signatures and submissions.'
                    : 'Switch scope, then narrow the list with search and filters.'
                }
                steps={
                  activeTab === 'forms'
                    ? [
                        'Available forms can be started as a draft at any time.',
                        'Pending my signature shows forms waiting on you.',
                        'My submissions holds your drafts and submitted forms.',
                      ]
                    : [
                        'Switch between Mine and Shared with me.',
                        'Search by title, reference, description, file text, or tags.',
                        'Use Status/Type filters to find items faster.',
                      ]
                }
              />
            </>
          )}
          stats={
            activeTab === 'forms' ? (
              <StatStrip
                items={[
                  { key: 'available', label: 'Available forms', value: formsStats?.available ?? '—' },
                  { key: 'pending', label: 'Pending signature', value: formsStats?.pending ?? '—' },
                  { key: 'drafts', label: 'My drafts', value: formsStats?.drafts ?? '—' },
                  { key: 'signed', label: 'Signed', value: formsStats?.signed ?? '—' },
                ]}
              />
            ) : (
              <StatStrip
                items={[
                  { key: 'total', label: 'Total', value: stats.total },
                  { key: 'draft', label: 'Draft', value: stats.draft },
                  { key: 'published', label: 'Published', value: stats.published },
                  { key: 'archived', label: 'Archived', value: stats.archived },
                ]}
              />
            )
          }
        >
        {activeTab === 'forms' ? null : (
        <>
        <Tabs value={documentScope} onValueChange={(value) => handleScopeChange(value as DocumentScope)}>
          <TabsList aria-label="Document scope">
            <TabsTrigger value="mine" className="text-xs px-2.5 py-1 gap-1.5">
              Mine
              <Badge variant="secondary" className="h-4 min-w-[1rem] px-1 text-[10px]">
                {scopeCounts.mine}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="shared" className="text-xs px-2.5 py-1 gap-1.5">
              Shared with me
              <Badge variant="secondary" className="h-4 min-w-[1rem] px-1 text-[10px]">
                {scopeCounts.shared}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
        </>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="documents" className="text-xs px-2.5 py-1">Documents</TabsTrigger>
            {visibility.showFormsLibrary ? (
              <TabsTrigger value="forms" className="text-xs px-2.5 py-1 gap-1.5">
                Forms
                {formsPendingCount > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px]">
                    {formsPendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="documents" className="mt-6">
            <DocumentList
              documents={documents}
              loading={loading}
              error={error}
              emptyMessage={
                documentScope === 'shared'
                  ? 'No documents have been shared with you.'
                  : "You haven't created any documents yet."
              }
            />
          </TabsContent>
          <TabsContent value="forms" className="mt-6">
            <AuditFormsLibrary
              segment={formsSegment}
              onSegmentChange={handleFormsSegmentChange}
              onStatsChange={setFormsStats}
            />
          </TabsContent>
        </Tabs>

        {count > 0 && activeTab === 'documents' ? (
          <PaginationControls
            pagination={pagination}
            showPageSizeSelector={true}
            showGoToPage={true}
            className="border-t border-border/60 pt-4"
          />
        ) : null}
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
    <Suspense fallback={null}>
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
    return <ListSkeleton rows={5} />;
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
                  <DocumentRowCard key={doc.id} doc={doc} showRoleBadge={group.documents.length > 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
