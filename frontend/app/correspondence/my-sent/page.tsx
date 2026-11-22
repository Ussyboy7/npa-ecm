"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Search,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch, isAbortError } from '@/lib/api-client';
import { mapApiCorrespondence, mapApiMinute } from '@/lib/api/correspondence-mappers';
import type { Minute } from '@/lib/npa-structure';
import { RecallMinuteModal } from '@/components/correspondence/RecallMinuteModal';
import { useRouter } from 'next/navigation';
import { toast } from "@/components/ui/sonner";
import { DocumentRowCard } from '@/components/shared/DocumentRowCard';
import { SentCorrespondenceCard } from './components/SentCorrespondenceCard';
import { correspondenceQueueListStackClass } from '@/components/shared/registry-queue-styles';
import { QueuePageShell } from '@/components/shared/QueuePageShell';
import { StatStrip } from '@/components/shared/StatStrip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { logError } from '@/lib/client-logger';
import { getDocumentsSharedByUser, type DocumentRecord } from '@/lib/api/dms';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

const MySentPageContent = () => {
  const router = useRouter();
  const {currentUser} = useCurrentUser();
  const { divisions } = useOrganization();

  const [activeTab, setActiveTab] = useState<'sent' | 'documents'>('sent');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // Each tab searches its own collection: typing in Sent must not refetch documents.
  const [documentQuery, setDocumentQuery] = useState('');
  const [debouncedDocumentQuery, setDebouncedDocumentQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Use pagination hook
  const [count, setCount] = useState(0);
  const pagination = usePagination({
    initialPage: 1,
    totalCount: count,
  });

  const [sentItems, setSentItems] = useState<Correspondence[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
  const [documentCount, setDocumentCount] = useState(0);
  const documentPagination = usePagination({
    initialPage: 1,
    totalCount: documentCount,
  });
  const [sentLoading, setSentLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Correspondence | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [recallLoading, setRecallLoading] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== '') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedStatus, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
    setQuery('');
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedDocumentQuery(documentQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [documentQuery]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedStatus, sortBy, sortOrder, dateFrom, dateTo, pagination.pageSize]);

  useEffect(() => {
    documentPagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDocumentQuery]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const abortController = new AbortController();

    const fetchMySent = async () => {
      setSentLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.append('search', debouncedQuery);
        if (selectedStatus) params.append('status', selectedStatus);
        if (dateFrom) {
          params.append('date_from', dateFrom);
        }
        if (dateTo) {
          params.append('date_to', dateTo);
        }
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        params.append('page', String(pagination.page));
        params.append('page_size', String(pagination.pageSize));

        const corrResponse = await apiFetch<Record<string, unknown>>(
          `/correspondence/items/my-sent/?${params.toString()}`,
          { signal: abortController.signal },
        );

        const corrResults = Array.isArray(corrResponse.results) ? corrResponse.results : [];
        setSentItems(corrResults.map(mapApiCorrespondence));
        const responseObj = corrResponse as Record<string, unknown>;
        const summaryObj = responseObj.summary as Record<string, unknown> | undefined;
        setSummary({
          total: (summaryObj && typeof summaryObj.total === 'number') ? summaryObj.total : ((responseObj && typeof responseObj.count === 'number') ? responseObj.count : corrResults.length),
          urgent: (summaryObj && typeof summaryObj.urgent === 'number') ? summaryObj.urgent : 0,
          pending: (summaryObj && typeof summaryObj.pending === 'number') ? summaryObj.pending : 0,
          inProgress: (summaryObj && typeof summaryObj.in_progress === 'number') ? summaryObj.in_progress : 0,
        });
        setCount((responseObj && typeof responseObj.count === 'number') ? responseObj.count : corrResults.length);
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return;
        }
        // Handle backend errors gracefully, especially for unsupported params
        const errorMessage = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') ? err.message : 'Failed to load sent items.';
        if (errorMessage.includes('date_from') || errorMessage.includes('date_to')) {
          setError('Date range filtering may not be supported. Please try without date filters.');
        } else {
          setError(errorMessage);
        }
        setSentItems([]);
        setSummary({ total: 0, urgent: 0, pending: 0, inProgress: 0 });
        setCount(0);
      } finally {
        if (!abortController.signal.aborted) {
          setSentLoading(false);
        }
      }
    };

    void fetchMySent();
    return () => { abortController.abort(); };
  }, [currentUser?.id, debouncedQuery, selectedStatus, sortBy, sortOrder, dateFrom, dateTo, pagination.page, pagination.pageSize, refreshKey]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const abortController = new AbortController();

    const fetchSharedDocuments = async () => {
      setDocumentsLoading(true);
      setDocumentsError(null);
      try {
        const response = await getDocumentsSharedByUser(currentUser.id, {
          search: debouncedDocumentQuery || undefined,
          page: documentPagination.page,
          pageSize: documentPagination.pageSize,
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) return;
        setSharedDocuments(response.results || []);
        setDocumentCount(response.count || 0);
      } catch (err: unknown) {
        if (isAbortError(err) || abortController.signal.aborted) return;
        setDocumentsError('Failed to load shared documents.');
        setSharedDocuments([]);
        setDocumentCount(0);
      } finally {
        if (!abortController.signal.aborted) {
          setDocumentsLoading(false);
        }
      }
    };

    void fetchSharedDocuments();
    return () => { abortController.abort(); };
  }, [currentUser?.id, debouncedDocumentQuery, documentPagination.page, documentPagination.pageSize, refreshKey]);

  const handleWithdrawClick = useCallback((item: Correspondence) => {
    if (item.status !== 'pending' && item.status !== 'in-progress') {
      toast.error('Only pending drafts can be cancelled');
      return;
    }
    setSelectedItem(item);
    setWithdrawDialogOpen(true);
  }, []);

  const confirmWithdraw = async () => {
    if (!selectedItem || !withdrawReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    setIsProcessing(true);
    try {
      await apiFetch(`/correspondence/items/${selectedItem.id}/cancel-draft/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });
      toast.success('Draft cancelled successfully. You can edit and resend it later.');
      setWithdrawDialogOpen(false);
      setWithdrawReason('');
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel draft';
      toast.error(`Failed to cancel draft: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendDraft = useCallback(async (item: Correspondence) => {
    if (item.status !== 'withdrawn') {
      toast.error('Only cancelled drafts can be resent');
      return;
    }
    setIsProcessing(true);
    try {
      await apiFetch(`/correspondence/items/${item.id}/resend-draft/`, { method: 'POST' });
      toast.success('Draft restored. You can edit and dispatch it again.');
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend draft';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleRecallClick = useCallback(async (item: Correspondence) => {
    if (!currentUser) {
      toast.error('You must be logged in to recall a minute');
      return;
    }

    setRecallLoading(true);
    try {
      const response = await apiFetch<Record<string, unknown>>(`/correspondence/minutes/?correspondence=${item.id}`);
      const rawMinutes = Array.isArray(response.results) ? response.results : [];
      const minutes = rawMinutes.filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null).map(mapApiMinute);

      const recallable = minutes
        .filter(m => m.userId === currentUser.id && m.canBeRecalled && !m.isRecalled && !m.recalledAt)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (recallable.length === 0) {
        toast.error('No recallable minute found for this correspondence');
        return;
      }

      setSelectedMinute(recallable[0]);
      setRecallModalOpen(true);
    } catch (err: unknown) {
      logError('Failed to fetch minutes for recall', err);
      toast.error('Failed to check recall eligibility');
    } finally {
      setRecallLoading(false);
    }
  }, [currentUser]);

  const handleDeleteClick = useCallback((item: Correspondence) => {
    if (item.status !== 'pending') {
      toast.error('Only pending correspondence can be deleted');
      return;
    }
      setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditCorrespondence = useCallback((item: Correspondence) => {
    router.push(`/correspondence/register?edit=${item.id}`);
  }, [router]);

  const confirmDelete = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      await apiFetch(`/correspondence/items/${selectedItem.id}/`, { method: 'DELETE' });
      toast.success('Correspondence deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete correspondence';
      toast.error(`Failed to delete: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {!currentUser ? null : (
        <QueuePageShell
          title="My Sent"
          subtitle="Correspondence you created and documents you've shared"
          actions={(
            <Button size="compact" asChild>
              <Link href="/correspondence/register">
                <Mail className="h-4 w-4" />Register New
              </Link>
            </Button>
          )}
          stats={(
            <StatStrip
              items={[
                { key: 'total', label: 'Total items', value: summary.total + documentCount },
                { key: 'pending', label: 'Pending action', value: summary.pending },
                { key: 'inProgress', label: 'In progress', value: summary.inProgress },
              ]}
            />
          )}
        >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sent' | 'documents')}>
          <TabsList>
            <TabsTrigger value="sent" className="text-xs px-2.5 py-1">Sent</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs px-2.5 py-1 gap-1.5">
              Shared documents
              {documentCount > 0 && (
                <Badge variant="secondary" className="h-4 min-w-[1rem] px-1 text-[10px]">
                  {documentCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="mt-4 space-y-4">
        {/* Inline Filter Bar */}
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by subject, reference, sender..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [by, order] = value.split('-'); setSortBy(by); setSortOrder(order as 'asc' | 'desc'); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-desc">Priority (Urgent First)</SelectItem>
                <SelectItem value="updated-desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updated-asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="created-desc">Created (Newest)</SelectItem>
                <SelectItem value="subject-asc">Subject (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Clear</Button>}
          </div>
      </div>

        {error && <ErrorState message={error} variant="inline" />}

        {sentLoading ? (
          <ListSkeleton rows={5} />
        ) : sentItems.length === 0 ? (
          error ? null : (
            <EmptyState
              icon="inbox"
              title={debouncedQuery || activeFilterCount > 0 ? 'No items match your filters' : 'No correspondence sent yet'}
              message={debouncedQuery || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Correspondence you create will appear here.'}
              actionLabel={debouncedQuery || activeFilterCount > 0 ? 'Clear Filters' : undefined}
              onAction={debouncedQuery || activeFilterCount > 0 ? clearFilters : undefined}
            />
          )
        ) : (
              <div className="space-y-3">
                <div className={correspondenceQueueListStackClass}>
                  {sentItems.map((item) => (
                    <SentCorrespondenceCard
                      key={item.id}
                      item={item}
                      divisions={divisions}
                      isProcessing={isProcessing}
                      recallLoading={recallLoading}
                      onEdit={handleEditCorrespondence}
                      onResend={handleResendDraft}
                      onWithdraw={handleWithdrawClick}
                      onRecall={handleRecallClick}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
                {count > 0 && (
                  <PaginationControls
                    pagination={pagination}
                    showPageSizeSelector={true}
                    showGoToPage={true}
                    className="border-t border-border/60 pt-4"
                  />
                )}
              </div>
        )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search shared documents..."
                value={documentQuery}
                onChange={(e) => setDocumentQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {documentsError && <ErrorState message={documentsError} variant="inline" />}

            {documentsLoading ? (
              <ListSkeleton rows={5} />
            ) : sharedDocuments.length === 0 ? (
              documentsError ? null : (
                <EmptyState
                  icon="file"
                  title={debouncedDocumentQuery ? 'No documents match your search' : 'No shared documents'}
                  message={debouncedDocumentQuery ? 'Try a different search term.' : 'Documents you share with others will appear here.'}
                  actionLabel={debouncedDocumentQuery ? 'Clear Search' : undefined}
                  onAction={debouncedDocumentQuery ? () => setDocumentQuery('') : undefined}
                />
              )
            ) : (
              <div className="space-y-3">
                <div className={correspondenceQueueListStackClass}>
                  {sharedDocuments.map((doc) => (
                    <DocumentRowCard key={doc.id} doc={doc} />
                  ))}
                </div>
                {documentCount > 0 && (
                  <PaginationControls
                    pagination={documentPagination}
                    compact
                    className="border-t border-border/60 pt-4"
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </QueuePageShell>
      )}

        {/* Cancel Draft Confirmation Dialog */}
        <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Draft</AlertDialogTitle>
              <AlertDialogDescription>
                Cancelling this draft will allow you to edit and resend it later. The draft will be marked as cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="withdraw-reason" className="text-sm font-medium">
                  Reason for Cancellation <span className="text-destructive">*</span>
                </label>
                <Input
                  id="withdraw-reason"
                  placeholder="Please provide a reason for cancelling this draft…"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="mt-2"
                  disabled={isProcessing}
                />
              </div>
              {selectedItem && (
                <div className="text-sm text-muted-foreground">
                  <p><strong>Subject:</strong> {selectedItem.subject}</p>
                  <p><strong>Reference:</strong> {selectedItem.referenceNumber || '—'}</p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setWithdrawReason('');
                  setSelectedItem(null);
                }}
                disabled={isProcessing}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void confirmWithdraw();
                }}
                disabled={!withdrawReason.trim() || isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? 'Cancelling…' : 'Confirm Cancellation'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Correspondence</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete this draft? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedItem && (
              <div className="py-4 text-sm text-muted-foreground">
                <p><strong>Subject:</strong> {selectedItem.subject}</p>
                <p><strong>Reference:</strong> {selectedItem.referenceNumber || '—'}</p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedItem(null)} disabled={isProcessing}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Recall Minute Modal */}
        <RecallMinuteModal
          minute={selectedMinute}
          isOpen={recallModalOpen}
          onClose={() => {
            setRecallModalOpen(false);
            setSelectedMinute(null);
          }}
          onSuccess={() => {
            setSelectedMinute(null);
            setRefreshKey((k) => k + 1);
          }}
        />
    </>
  );
};

export default MySentPageContent;
